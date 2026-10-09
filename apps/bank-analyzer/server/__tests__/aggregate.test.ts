// 月次の入出金表と分析画面の集計を、Django 版で記録した正解（test-data/golden/expected/scenarios）と
// 突き合わせる。入力は Django 版に最後に残った取引そのもの（transactions.json）で、取込の違い
// （計画書 §3）はここには入ってこない ── 取込の側は wizard.test.ts が見ている。
//
// transactions.json には口座が無い（*_id は記録時に落としてある）ので、JSON エクスポート
// （exports.json）の取引から拾う。エクスポートは (日付, id) の順なので、同じ順に並べた
// transactions.json と1行ずつ対応する（日付・摘要・金額が一致することも確かめる）。

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  analysisData,
  classificationPreview,
  duplicateTransactions,
  groupSuggestions,
  monthlyCashflow,
  parseAmountInput,
  parseSort,
  sortTransactions,
  transferPairs,
  unclassifiedGroups,
  type AnalysisAccount,
  type AnalysisTx,
  type TransactionFilter,
  type TransferEndpoint,
} from '../lib/aggregate.js';
import { DEFAULT_ANALYSIS_SETTINGS } from '../lib/analyze.js';
import { DEFAULT_FUZZY_CONFIG, DEFAULT_GIFT_THRESHOLD, DEFAULT_PATTERNS, UNCATEGORIZED, type Patterns } from '../lib/categories.js';
import type { ClassifierSettings } from '../lib/classify.js';

// 実データの正解（リポジトリ外）で回すときは、そのディレクトリを渡す:
//   BANK_ANALYZER_GOLDEN_DIR=/golden（~/.tax-apps/bank-analyzer-golden を -v で入れる）
const SCENARIO_DIR = path.resolve(process.env.BANK_ANALYZER_GOLDEN_DIR ?? 'test-data/golden/expected/scenarios');

type Json = Record<string, unknown>;
type Row = AnalysisTx & { raw: Json };

const read = (name: string, file: string) =>
  JSON.parse(fs.readFileSync(path.join(SCENARIO_DIR, name, file), 'utf8'));

// (日付, id) の順。日付の無い行は最後（PostgreSQL の昇順）
const byDateId = (a: Partial<Record<'date' | 'id', unknown>>, b: Partial<Record<'date' | 'id', unknown>>) =>
  a.date === b.date
    ? (a.id as number) - (b.id as number)
    : a.date === null ? 1 : b.date === null ? -1 : (a.date as string) < (b.date as string) ? -1 : 1;

const ACCOUNT_FIELDS = ['bank_name', 'branch_name', 'account_number', 'account_type', 'holder'] as const;

function loadScenario(name: string) {
  const caseInfo = read(name, 'case.json') as { reference_date: string | null; custom_patterns: Patterns | null };
  const txs = read(name, 'transactions.json') as Json[];
  const exported = read(name, 'exports.json').json.body as { accounts: Json[]; transactions: Json[] };

  const accounts: AnalysisAccount[] = exported.accounts.map((a, i) => ({
    id: i + 1,
    accountNumber: a.account_number as string,
    holder: a.holder as string | null,
    bankName: a.bank_name as string | null,
    branchName: a.branch_name as string | null,
    accountType: a.account_type as string | null,
  }));

  const ordered = [...txs].sort(byDateId);
  expect(ordered).toHaveLength(exported.transactions.length);
  const rows: Row[] = ordered.map((t, i) => {
    const e = exported.transactions[i]!;
    for (const k of ['date', 'description', 'amount_out', 'amount_in'] as const) expect(e[k], `${name} ${k}`).toEqual(t[k]);
    const account = accounts.find((a) => a.accountNumber === e.account_number)!;
    return {
      id: t.id as number,
      accountId: account.id,
      date: t.date as string | null,
      description: t.description as string | null,
      amountOut: t.amount_out as number,
      amountIn: t.amount_in as number,
      category: t.category as string,
      isFlagged: t.is_flagged as boolean,
      bankName: account.bankName,
      branchName: account.branchName,
      accountNumber: account.accountNumber,
      raw: { ...t, ...Object.fromEntries(ACCOUNT_FIELDS.map((k) => [k, e[k]])) },
    };
  });
  // 入力の並びに頼っていないことを確かめるため、id の順に戻して渡す
  rows.sort((a, b) => a.id - b.id);

  const classifier: ClassifierSettings = {
    globalPatterns: DEFAULT_PATTERNS,
    casePatterns: caseInfo.custom_patterns,
    giftThreshold: DEFAULT_GIFT_THRESHOLD,
    fuzzy: DEFAULT_FUZZY_CONFIG,
  };
  return { caseInfo, rows, accounts, classifier };
}

// ---------------------------------------------------------------------------
// Django 版の形へ
// ---------------------------------------------------------------------------

// 記録時の絞り込み（dump_golden.py の FILTER_VARIANTS）
const FILTER_VARIANTS: Record<string, TransactionFilter> = {
  default: {},
  keyword_halfwidth: { keyword: 'ﾌﾘｺﾐ' },
  keyword_multi: { keyword: '振替 本店' },
  amount_out_range: { amountType: 'out', amountMin: '10,000', amountMax: '300000' },
  amount_both_min: { amountMin: '500000' },
  amount_both_max: { amountMax: '1000' },
  category_exclude: { category: [UNCATEGORIZED], categoryMode: 'exclude' },
  date_range: { dateFrom: '2024-04-15', dateTo: '2024-05-15' },
  sort_amount_desc: { sort: '-amount_out' },
};

// Django 版は資金移動の日付を pandas の Timestamp のまま出していた
const endpointShape = (e: TransferEndpoint) => ({
    id: e.id,
    date: `${e.date}T00:00:00`,
    bank_name: e.bankName,
    branch_name: e.branchName,
    account_number: e.accountNumber,
    amount: e.amount,
    description: e.description,
    category: e.category,
  });

const scoreShape = (s: { category: string; score: number }) => ({ category: s.category, score: s.score });

function analysisShape(data: ReturnType<typeof analysisData<Row>>): Json {
  if (data.noData) return { no_data: true };
  const shaped: Json = {
    account_summary: data.accountSummary.map((a) => ({
      account_number: a.accountNumber,
      holder: a.holder,
      bank_name: a.bankName,
      branch_name: a.branchName,
      account_type: a.accountType,
      count: a.count,
      last_date: a.lastDate,
    })),
    // 相手の入金は Django 版と意図して変えた（下の「資金移動の相手」）。突き合わせるのは出金側だけ
    transfer_pairs: data.transferPairs.map((p) => ({ source: endpointShape(p.source) })),
    all_txs: data.allTxs.map((t) => t.id),
    duplicate_txs: data.duplicateTxs.map((t) => ({ ...t.raw, dup_group_idx: t.dupGroupIdx })),
    flagged_txs: data.flaggedTxs.map((t) => t.id),
    banks: data.banks,
    branches: data.branches,
    accounts: data.accounts,
    categories: data.categories,
    bank_to_accounts: data.bankToAccounts,
    ai_suggestions: data.aiSuggestions.map((s) => ({
      tx_id: s.txId,
      date: s.date,
      description: s.description,
      amount_out: s.amountOut,
      amount_in: s.amountIn,
      suggested_category: s.suggestedCategory,
      score: s.score,
      alternative_suggestions: s.alternativeSuggestions.map(scoreShape),
    })),
    ai_groups: data.aiGroups.map((g) => ({
      description: g.description,
      suggested_category: g.suggestedCategory,
      score: g.score,
      alternative_suggestions: g.alternativeSuggestions.map(scoreShape),
      tx_ids: g.txIds,
      total_out: g.totalOut,
      total_in: g.totalIn,
      count: g.count,
      sample_date: g.sampleDate,
    })),
    suggestions_count: data.suggestionsCount,
    unclassified_count: data.unclassifiedCount,
    fuzzy_threshold: data.fuzzyThreshold,
  };
  // Django 版は未分類が0件のとき ai_groups を出さなかった（React 版は空の配列）
  if (data.unclassifiedCount === 0) delete shaped.ai_groups;
  return shaped;
}

// 分析画面の候補（AI 分類の一覧とそのまとめ）から #8 で増えた分を取り除く。
// 絞り込みで外れた取引は候補にも出ないので、増えた分は N8_ADDED の一部でよい
function withoutN8(name: string, shape: Json): Json {
  const added = N8_ADDED[name] ?? {};
  type Suggestion = { tx_id: number; suggested_category: string };
  type Group = { tx_ids: number[]; suggested_category: string };
  const s = splitN8(name, shape.ai_suggestions as Suggestion[], (x) => [x.tx_id], (x) => x.suggested_category);
  for (const [id, category] of Object.entries(s.removed)) expect(category).toBe(added[Number(id)]);
  const out: Json = { ...shape, ai_suggestions: s.rest, suggestions_count: (shape.suggestions_count as number) - Object.keys(s.removed).length };
  if (shape.ai_groups) {
    const g = splitN8(name, shape.ai_groups as Group[], (x) => x.tx_ids, (x) => x.suggested_category);
    expect(g.removed).toEqual(s.removed);
    out.ai_groups = g.rest;
  }
  return out;
}

// 資金移動の一覧の同じ日どうしの並びは問わない。Django 版は pandas の sort_values("date")
// （安定でない quicksort）で並べていたので、同じ日の順は決まった規則を持たない
// （実データの1案件で入れ替わっていた）。React 版は (日付, id) の順。
type PairJson = { source: { id: number; date: string } };
const byPairDateId = (a: PairJson, b: PairJson) =>
  a.source.date === b.source.date ? a.source.id - b.source.id : a.source.date < b.source.date ? -1 : 1;
const sameDayUnordered = (shape: Json): Json =>
  shape.transfer_pairs
    ? { ...shape, transfer_pairs: (shape.transfer_pairs as PairJson[]).map(({ source }) => ({ source })).sort(byPairDateId) }
    : shape;

// 計画書 §3 #8（切替後に直した）: 分類の照合は摘要とキーワードの両方を normalizeText でそろえる。
// Django 版では全角の「ａｕ　料金」・半角カナの「ｾﾌﾞﾝｲﾚﾌﾞﾝ」がキーワードに当たらず、記録の正解にも
// 候補として出てこない。ここに書いた取引だけは React 版で候補に増えてよい ── 増えた分を取り除いた
// 残りが Django 版と一致し、増えた分がここに書いたとおりであることを確かめる。
// （transactions.json は取込を Django 版で済ませた後の形なので、分類そのものは未分類のまま）
const N8_ADDED: Record<string, Record<number, string>> = {
  transfer: { 16: '生活費' },
  overlap_import_all: { 14: '生活費', 16: '生活費' },
};

// 増えた候補を取り除き、取り除いたもの（取引の id → カテゴリー）を返す
function splitN8<T>(name: string, items: T[], idOf: (t: T) => number[], categoryOf: (t: T) => string) {
  const added = N8_ADDED[name] ?? {};
  const rest: T[] = [];
  const removed: Record<number, string> = {};
  for (const item of items) {
    const ids = idOf(item).filter((id) => id in added);
    if (ids.length === 0) rest.push(item);
    else for (const id of ids) removed[id] = categoryOf(item);
  }
  return { rest, removed };
}

// ---------------------------------------------------------------------------

const SCENARIOS = fs.readdirSync(SCENARIO_DIR).filter((d) => fs.existsSync(path.join(SCENARIO_DIR, d, 'analysis.json')));

describe.each(SCENARIOS)('%s', (name) => {
  const { caseInfo, rows, accounts, classifier } = loadScenario(name);

  it('月次の入出金表', () => {
    const actual = monthlyCashflow(rows, caseInfo.reference_date).map((m) => ({
      month: m.month,
      total_out: m.totalOut,
      total_in: m.totalIn,
    }));
    expect(actual).toEqual(read(name, 'monthly_cashflow.json'));
  });

  it('ルール適用のプレビュー', () => {
    const actual = classificationPreview(rows, classifier).map((p) => ({
      tx_id: p.txId,
      date: p.date,
      description: p.description,
      amount_out: p.amountOut,
      amount_in: p.amountIn,
      current_category: p.currentCategory,
      proposed_category: p.proposedCategory,
      matched_keyword: p.matchedKeyword,
      match_type: p.matchType,
      score: p.score,
    }));
    const { rest, removed } = splitN8(name, actual, (p) => [p.tx_id], (p) => p.proposed_category);
    expect(rest).toEqual(read(name, 'classification_preview.json'));
    expect(removed).toEqual(N8_ADDED[name] ?? {});
  });

  const expectedAnalysis = read(name, 'analysis.json') as Record<string, Json>;
  it.each(Object.keys(FILTER_VARIANTS))('分析画面（%s）', (variant) => {
    const data = analysisData(
      { transactions: rows, accounts, classifier, analysis: DEFAULT_ANALYSIS_SETTINGS },
      FILTER_VARIANTS[variant],
    );
    const actual = withoutN8(name, analysisShape(data));
    // 記録の絞り込みはどれも日付順（sort_amount_desc も読めずに日付順になる）
    expect(actual.transfer_pairs ?? []).toEqual(sameDayUnordered(actual).transfer_pairs ?? []);
    expect(sameDayUnordered(actual)).toEqual(sameDayUnordered(expectedAnalysis[variant]!));
  });

  // Django 版は相手に「同じ口座・金額が許容誤差以内の最初の入金」を並べていた。React 版は判定で
  // 組んだ入金なので、別の口座・許容誤差・期間内に収まり、同じ入金を2つの出金が指すことは無い
  it('資金移動の相手は判定で組んだ入金', () => {
    const S = DEFAULT_ANALYSIS_SETTINGS;
    const pairs = transferPairs(rows, S);
    const day = (d: string) => Date.parse(`${d}T00:00:00Z`) / 86_400_000;
    for (const { source, destination } of pairs) {
      expect(destination.accountNumber).not.toBe(source.accountNumber);
      expect(Math.abs(destination.amount - source.amount)).toBeLessThanOrEqual(S.transferTolerance);
      const days = day(destination.date) - day(source.date);
      expect(days).toBeGreaterThanOrEqual(0);
      expect(days).toBeLessThanOrEqual(S.transferDaysWindow);
    }
    const destIds = pairs.map((p) => p.destination.id);
    expect(new Set(destIds).size).toBe(destIds.length);
  });

  it.each(['', '振替', 'ATM'])('未分類のまとめ（キーワード "%s"）', (keyword) => {
    // 画面は未分類の取引を (日付, id) の順で渡す
    const { groups, txTotal, maxGroupCount } = unclassifiedGroups([...rows].sort(byDateId), keyword);
    const actual = {
      groups: groups.map((g) => ({
        description: g.description,
        count: g.count,
        total_out: g.totalOut,
        total_in: g.totalIn,
        tx_ids: g.txIds,
        first_tx_id: g.firstTxId,
        samples: g.samples.map((s) => ({ date: s.date, bank_name: s.bankName, amount_out: s.amountOut, amount_in: s.amountIn })),
      })),
      tx_total: txTotal,
      max_group_count: maxGroupCount,
      group_suggestions: groupSuggestions(groups, classifier),
    };
    // #8 で増えた候補（摘要ごと）を取り除いて比べる
    const n8Descriptions = new Set(
      groups.filter((g) => g.txIds.some((id) => id in (N8_ADDED[name] ?? {}))).map((g) => g.description),
    );
    const suggestions = actual.group_suggestions;
    for (const d of n8Descriptions) if (d in suggestions) expect(suggestions[d]!.category).toBe('生活費');
    actual.group_suggestions = Object.fromEntries(Object.entries(suggestions).filter(([d]) => !n8Descriptions.has(d)));
    expect(actual).toEqual(read(name, 'unclassified_groups.json')[keyword || '(none)']);
  });
});

describe('案件に取引が無い', () => {
  it('no_data だけを返す', () => {
    const data = analysisData({
      transactions: [],
      accounts: [],
      classifier: { globalPatterns: DEFAULT_PATTERNS, casePatterns: null, fuzzy: DEFAULT_FUZZY_CONFIG },
      analysis: DEFAULT_ANALYSIS_SETTINGS,
    });
    expect(data).toEqual({ noData: true });
  });
});

describe('画面の入力の読み方', () => {
  it.each([
    ['', null],
    ['10,000', 10000],
    [' 500 ', 500],
    // Python の int() と同じく全角の数字は読む。全角のカンマは外さない
    ['１０００', 1000],
    ['１，０００', null],
    ['1_000', 1000],
    ['-5', -5],
    ['1.5', null],
    ['abc', null],
    ['1__0', null],
  ])('金額 %j → %j', (input, expected) => {
    expect(parseAmountInput(input)).toBe(expected);
  });

  it.each([
    ['', { field: 'date', direction: 'asc' }],
    ['date_desc', { field: 'date', direction: 'desc' }],
    ['amount_out_desc', { field: 'amountOut', direction: 'desc' }],
    ['amount_in_asc', { field: 'amountIn', direction: 'asc' }],
    // Django 版の画面が送っていた形。読めないので日付順になる（記録の sort_amount_desc もこれ）
    ['-amount_out', { field: 'date', direction: 'asc' }],
    ['amount_out', { field: 'date', direction: 'asc' }],
  ])('並び替え %j', (input, expected) => {
    expect(parseSort(input)).toEqual(expected);
  });
});

// 記録した正解では出てこない形（日付の無い行・重複が2組以上・同じ相手への同額の移動）
describe('記録に無い形', () => {
  const tx = (id: number, over: Partial<AnalysisTx> = {}): AnalysisTx => ({
    id,
    accountId: 1,
    date: '2024-04-01',
    description: '摘要',
    amountOut: 0,
    amountIn: 0,
    category: UNCATEGORIZED,
    isFlagged: false,
    bankName: 'A銀行',
    branchName: '本店',
    accountNumber: '111',
    ...over,
  });

  it('日付の無い行は昇順で最後、降順で最初（PostgreSQL のとおり）', () => {
    const txs = [tx(1, { date: null }), tx(2, { date: '2024-04-02' }), tx(3)];
    expect(sortTransactions(txs, parseSort('date_asc')).map((t) => t.id)).toEqual([3, 2, 1]);
    expect(sortTransactions(txs, parseSort('date_desc')).map((t) => t.id)).toEqual([1, 2, 3]);
  });

  it('重複の組ごとに 0 / 1 を交互に振る', () => {
    const txs = [
      tx(1, { amountOut: 100 }), tx(2, { amountOut: 100 }),
      tx(3, { amountOut: 200 }), tx(4, { amountOut: 200 }),
      tx(5, { amountOut: 300 }), tx(6, { amountOut: 300 }),
      tx(7, { amountOut: 400 }),
    ];
    expect(duplicateTransactions(txs).map((t) => [t.id, t.dupGroupIdx])).toEqual([
      [1, 0], [2, 0], [3, 1], [4, 1], [5, 0], [6, 0],
    ]);
  });

  it('同じ口座へ同じ額を2回移すと、それぞれ自分の入金と組む（Django 版は2回目にも1回目の入金を並べた）', () => {
    const other = { accountNumber: '222', bankName: 'B銀行' };
    const txs = [
      tx(1, { amountOut: 50000 }),
      tx(2, { ...other, amountIn: 50000 }),
      tx(3, { date: '2024-05-01', amountOut: 50000 }),
      tx(4, { ...other, date: '2024-05-01', amountIn: 50000 }),
    ];
    const pairs = transferPairs(txs, DEFAULT_ANALYSIS_SETTINGS);
    expect(pairs.map((p) => [p.source.id, p.destination.id])).toEqual([[1, 2], [3, 4]]);
  });
});
