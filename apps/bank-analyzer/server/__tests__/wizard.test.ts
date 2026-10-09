// 取込ウィザード（プレビュー → 取込）を、Django 版で記録した手順（test-data/golden/expected/scenarios）
// どおりに流して突き合わせる。DB の代わりに取り込んだ行を配列に貯め、各手順のプレビューは
// その時点の中身を既存データとして判定する。
//
// 比べるもの:
//   - プレビュー: ファイル名・行数・重複の件数と連続・注意・推測した口座・残高列の有無・各行
//   - 取込: その手順で増えた件数（Django 版の transaction_count の差）
//   - 最後に残った取引: 分類・多額・資金移動・要確認とメモ（transactions.json）
//
// 正解と違ってよいのは計画書 §3 で「直す」と決めたものだけ（DEVIATIONS）。
// Django 版ではエラーだったが React 版では読めるファイル（#3・#4 など）は、その手順で
// 取り込まない ── 後の手順の DB の中身を Django 版とそろえるため。

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_ANALYSIS_SETTINGS, detectTransfers, isLargeAmount } from '../lib/analyze.js';
import { DEFAULT_FUZZY_CONFIG, DEFAULT_GIFT_THRESHOLD, DEFAULT_PATTERNS, type Patterns } from '../lib/categories.js';
import { classifyTransactions, type ClassifierSettings } from '../lib/classify.js';
import { buildExistingIndex, type DedupFields } from '../lib/dedup.js';
import { StatementImportError } from '../lib/import/errors.js';
import { normalizeText } from '../lib/text.js';
import { buildPreview, selectRowsToCommit, type PreviewFile } from '../lib/wizard.js';

const GOLDEN_DIR = path.resolve('test-data/golden');
const INPUT_DIR = path.join(GOLDEN_DIR, 'inputs/files');
const SCENARIO_DIR = path.join(GOLDEN_DIR, 'expected/scenarios');

type Json = Record<string, unknown>;
type ScenarioSpec = {
  name: string;
  case: { custom_patterns?: Patterns };
  steps: { parse?: string[]; commit?: 'skip' | 'import'; flag?: Record<string, string> }[];
};
type DjangoStep = {
  parse?: string[];
  status?: number;
  response?: { success: boolean; files?: Json[] };
  commit?: string;
  transaction_count?: number;
};

const scenarios = JSON.parse(
  fs.readFileSync(path.join(GOLDEN_DIR, 'inputs/scenarios.json'), 'utf8'),
) as ScenarioSpec[];

// ---------------------------------------------------------------------------
// Django 版と違ってよいもの
// ---------------------------------------------------------------------------

// Django 版はエラー、React 版は読めるファイル（このときは取り込まない）
const READABLE_IN_REACT = new Set([
  'e03_mixed_wareki_seireki.csv', // #3
  'e13_wareki_variants.csv', // #3
  'e13b_seireki_only.csv', // #3
  'e14_kanji_era.csv', // #10
  'e15_amount_formats.csv', // #10
  'e16_header_variants.csv', // #10
  'e21_blank_row.csv', // #3
  'e22_excel.xlsx', // #3
]);
// Django 版は読めた、React 版はエラーにするファイル
const REJECTED_IN_REACT = new Set([
  'e04_decimal_amount.csv', // #4 小数
  'e05_us_date.csv', // #5 米国式の日付
]);

const duplicateRows = (rows: Json[], lowAt: number[], count: number) =>
  rows.map((r, i) => ({
    ...r,
    is_duplicate: i < count,
    dup_confidence: i < count ? (lowAt.includes(i) ? 'low' : 'high') : null,
  }));

const runWarning = (run: number, dup: number, rows: number) => ({
  max_run: run,
  ratio: Math.round((dup / rows) * 100) / 100,
  duplicate_count: dup,
  message: `既存データと ${run} 行連続で一致しています。重複インポートの可能性が高いです。`,
});

// overlap_a.csv は transfer_a.csv の先頭6行（3行目だけ残高を "1" に変えてある）+ 新しい2行。
// #6 で口座番号が文字列どうしで比べられるようになるので、6行が重複として出る。
const overlapA = (file: Json): Json => ({
  ...file,
  duplicate_count: 6,
  duplicate_run: 6,
  warning: runWarning(6, 6, 8),
  rows: duplicateRows(file.rows as Json[], [2], 6),
});

// scenario/手順番号(1始まり)/ファイル番号 → 正解の書き換え
const DEVIATIONS: Record<string, (file: Json) => Json> = {
  // #1 口座番号の先頭の 0 を落とさない
  'edge_files/1/0': (file) => ({
    ...file,
    detected_account: { ...(file.detected_account as Json), account_number: '0012345' },
    rows: (file.rows as Json[]).map((r) => ({ ...r, account_number: '0012345' })),
  }),
  // #2 残高の空欄は「残高なし」
  'edge_files/2/0': (file) => ({
    ...file,
    rows: (file.rows as Json[]).map((r, i) => ({
      ...r,
      balance: i === 1 ? null : r.balance,
      calc_balance: [90000, 290000, 287000][i],
      is_balance_error: false,
    })),
  }),
  // #6 プレビューで重複が出る
  'transfer/2/0': overlapA,
  'overlap_import_all/2/0': overlapA,
  // 1手順目に取り込んだ transfer_a.csv をもう一度。全行が残高まで一致する。
  'transfer/3/0': (file) => ({
    ...file,
    duplicate_count: 25,
    duplicate_run: 25,
    warning: runWarning(25, 25, 25),
    rows: duplicateRows(file.rows as Json[], [], 25),
  }),
};

// 取込で増える件数が Django 版と違う手順
const COMMIT_DELTA: Record<string, number> = {
  // #7 「重複を除外」を外したので、重複の6行も取り込む（Django 版は 2）
  'overlap_import_all/2': 8,
};

// ---------------------------------------------------------------------------
// 比べられる形にそろえる（Django 版の JSON の形へ寄せる）
// ---------------------------------------------------------------------------

const META = ['bank_name', 'branch_name', 'account_number', 'account_type'] as const;

// Django 版は列が無いキーを行に入れず、口座番号は数値で持っていた。
function normalizeDjangoFile(file: Json): Json {
  const det = file.detected_account as Json;
  return {
    ...file,
    detected_account: Object.fromEntries(Object.entries(det).map(([k, v]) => [k, String(v)])),
    rows: (file.rows as Json[]).map((r) => ({
      ...Object.fromEntries(META.map((k) => [k, r[k] === undefined || r[k] === null ? null : String(r[k])])),
      date: r.date,
      description: r.description ?? null,
      amount_out: r.amount_out,
      amount_in: r.amount_in,
      balance: r.balance ?? null,
      calc_balance: r.calc_balance ?? null,
      is_balance_error: r.is_balance_error,
      is_duplicate: r.is_duplicate,
      dup_confidence: r.dup_confidence,
    })),
  };
}

function toDjangoShape(f: PreviewFile): Json {
  return {
    filename: f.filename,
    ...(f.originalFilename !== undefined && { original_filename: f.originalFilename }),
    row_count: f.rowCount,
    duplicate_count: f.duplicateCount,
    duplicate_run: f.duplicateRun,
    warning: f.warning && {
      max_run: f.warning.maxRun,
      ratio: f.warning.ratio,
      duplicate_count: f.warning.duplicateCount,
      message: f.warning.message,
    },
    detected_account: {
      bank_name: f.detectedAccount.bankName,
      branch_name: f.detectedAccount.branchName,
      account_type: f.detectedAccount.accountType,
      account_number: f.detectedAccount.accountNumber,
    },
    has_balance: f.hasBalance,
    rows: f.rows.map((r) => ({
      bank_name: r.bankName,
      branch_name: r.branchName,
      account_number: r.accountNumber,
      account_type: r.accountType,
      date: r.date,
      description: r.description,
      amount_out: r.amountOut,
      amount_in: r.amountIn,
      balance: r.balance,
      calc_balance: r.calcBalance,
      is_balance_error: r.isBalanceError,
      is_duplicate: r.isDuplicate,
      dup_confidence: r.dupConfidence,
    })),
    ...(f.isSplit && { is_split: true }),
  };
}

// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 取り込んだ取引（transactions.json）
// ---------------------------------------------------------------------------

// Django 版と結果が違ってよい取引（id は Django 版の番号）
const TX_DEVIATIONS: Record<string, Record<number, Json>> = {
  edge_files: {
    // 相手だった e04_decimal_amount.csv の「利息 100円」の入金を React 版は取り込まない（#4）
    24: { is_transfer: false, transfer_to: null },
  },
};

type TxRecord = DedupFields & {
  id: number;
  // Django 版の取引の番号。Django 版に無い取引（#7 で増えた重複）は null
  djangoId: number | null;
  // 取り込んだ手順で、残高の列の無いファイルがあったか
  stepHasNoBalance: boolean;
  description: string | null;
  category: string;
  classificationScore: number;
  isLarge: boolean;
  isTransfer: boolean;
  transferTo: string | null;
  isFlagged: boolean;
  memo: string | null;
};

// Django 版の画面は取込のとき行を表から作り直していた: 摘要の空欄は ''、残高の空欄は 0
// （1ファイルでも残高列が無ければ全部 null）。React 版はどちらも null のまま入れる。
function txToDjangoShape(t: TxRecord): Json {
  return {
    id: t.djangoId,
    date: t.date,
    description: t.description ?? '',
    description_search: normalizeText(t.description ?? ''),
    amount_out: t.amountOut,
    amount_in: t.amountIn,
    balance: t.balance ?? (t.stepHasNoBalance ? null : 0),
    is_large: t.isLarge,
    is_transfer: t.isTransfer,
    transfer_to: t.transferTo,
    category: t.category,
    classification_score: t.classificationScore,
    is_flagged: t.isFlagged,
    memo: t.memo,
  };
}

// ---------------------------------------------------------------------------
// 手順を流す
// ---------------------------------------------------------------------------

// Django 版の commit_import と同じ順番で、ファイルごとに: 重複の判定 → 分類 → 多額 →
// 案件の全取引で資金移動。資金移動は印を付けるだけで外さない（Django 版のとおり）。
function replay(name: string, spec: ScenarioSpec, djangoSteps: DjangoStep[], checkSteps: boolean) {
  const db: TxRecord[] = [];
  const classifier: ClassifierSettings = {
    globalPatterns: DEFAULT_PATTERNS,
    casePatterns: spec.case.custom_patterns ?? null,
    giftThreshold: DEFAULT_GIFT_THRESHOLD,
    fuzzy: DEFAULT_FUZZY_CONFIG,
  };
  const analysis = DEFAULT_ANALYSIS_SETTINGS;
  let djangoCount = 0;
  // Django 版の番号は取り込んだ順。React 版が取り込まない手順の分は飛ばす。
  let nextDjangoId = 1;

  spec.steps.forEach((step, i) => {
    const stepNo = i + 1;
    const django = djangoSteps[i]!;
    const prevDjangoCount = djangoCount;
    if (django.transaction_count !== undefined) djangoCount = django.transaction_count;

    if (step.flag) {
      for (const [n, memo] of Object.entries(step.flag)) {
        const t = db.find((x) => x.djangoId === Number(n))!;
        t.isFlagged = !t.isFlagged;
        if (memo) t.memo = memo.trim() || null;
      }
    }
    if (!step.parse) return;
    const where = `${name} 手順${stepNo} ${step.parse.join(', ')}`;

    const djangoOk = django.status === 200;
    const reactOk = step.parse.every((f) =>
      READABLE_IN_REACT.has(f) ? true : REJECTED_IN_REACT.has(f) ? false : djangoOk,
    );

    // プレビュー
    const index = buildExistingIndex(db);
    let previews: PreviewFile[] | null = null;
    try {
      previews = step.parse.flatMap((f) => buildPreview(f, fs.readFileSync(path.join(INPUT_DIR, f)), index));
    } catch (e) {
      if (!(e instanceof StatementImportError)) throw e;
    }
    if (checkSteps) {
      expect(previews !== null, where).toBe(reactOk);
      if (previews && djangoOk) {
        const expected = django.response!.files!.map((f, j) =>
          (DEVIATIONS[`${name}/${stepNo}/${j}`] ?? ((x: Json) => x))(normalizeDjangoFile(f)),
        );
        expect(previews.map(toDjangoShape), where).toEqual(expected);
      }
    }

    // 取込
    const djangoAdded = djangoCount - prevDjangoCount;
    if (!step.commit || !previews || !djangoOk) {
      nextDjangoId += djangoAdded;
      return;
    }

    const commitIndex = buildExistingIndex(db);
    const stepHasNoBalance = previews.some((f) => !f.hasBalance);
    const before = db.length;
    for (const f of previews) {
      const account = {
        bankName: f.detectedAccount.bankName,
        branchName: f.detectedAccount.branchName,
        accountType: f.detectedAccount.accountType,
        // 口座番号を読み取れなかったファイルは、画面で手入力した想定の番号（記録時と同じ）
        accountNumber: f.detectedAccount.accountNumber || `9${String(stepNo).padStart(6, '0')}`,
      };
      const { rows } = selectRowsToCommit(f.rows, account, commitIndex, step.commit === 'skip');
      const classes = classifyTransactions(rows, classifier);
      rows.forEach((r, k) => {
        db.push({
          id: db.length + 1,
          // #7 で増えた重複の行は Django 版には無い
          djangoId: r.isDuplicate ? null : nextDjangoId++,
          stepHasNoBalance,
          accountNumber: r.accountNumber,
          date: r.date,
          description: r.description,
          amountOut: r.amountOut,
          amountIn: r.amountIn,
          balance: r.balance,
          category: classes[k]!.category,
          // 取込時の点数は保存しない（Django 版の commit_import のとおり）
          classificationScore: 0,
          isLarge: isLargeAmount(r.amountOut, r.amountIn, analysis.largeAmountThreshold),
          isTransfer: false,
          transferTo: null,
          isFlagged: false,
          memo: null,
        });
      });
      for (const m of detectTransfers(db.map((t) => ({ ...t, accountNumber: t.accountNumber ?? '' })), analysis)) {
        const t = db.find((x) => x.id === m.id)!;
        t.isTransfer = true;
        t.transferTo = m.transferTo;
      }
    }
    if (checkSteps) {
      expect(db.length - before, `${where} の取込件数`).toBe(COMMIT_DELTA[`${name}/${stepNo}`] ?? djangoAdded);
    }
  });
  return db;
}

describe.each(scenarios.map((s) => [s.name, s] as const))('%s', (name, spec) => {
  const djangoSteps = JSON.parse(
    fs.readFileSync(path.join(SCENARIO_DIR, name, 'steps.json'), 'utf8'),
  ) as DjangoStep[];

  it('プレビューと取込の件数が Django 版と一致する（計画書 §3 の違いを除く）', () => {
    expect(djangoSteps).toHaveLength(spec.steps.length);
    replay(name, spec, djangoSteps, true);
  });

  it('取り込んだ取引（分類・多額・資金移動・要確認）が Django 版と一致する', () => {
    const db = replay(name, spec, djangoSteps, false);
    const djangoTxs = JSON.parse(
      fs.readFileSync(path.join(SCENARIO_DIR, name, 'transactions.json'), 'utf8'),
    ) as Json[];
    const actual = db.filter((t) => t.djangoId !== null).map(txToDjangoShape);
    const ids = new Set(actual.map((t) => t.id));
    const deviations = TX_DEVIATIONS[name] ?? {};
    const expected = djangoTxs
      .filter((t) => ids.has(t.id as number))
      .map((t) => ({ ...t, ...deviations[t.id as number] }));
    expect(actual).toEqual(expected);
  });
});
