// 取込ウィザードで画面が持つ行と、その検査（日付・金額・残高の突き合わせ）。
// 規則はサーバと同じ関数を使う（server/input.ts・server/lib/balance.ts）。画面だけ別の規則で
// 赤くすると、画面では通ったのに取込で弾かれる／その逆が起きるため。
//
// Django 版との違い:
// - 金額は文字のまま持つ。Django 版は parseInt(...) || 0 で読んだので、残高を消すと 0 円になった
// - 残高の誤差は直すたびに数え直す（Django 版は「残高を再計算」ボタンを押すまで古いままだった）
// - 行は key で追う。Django 版は挿入した行の番号（10000〜）と配列の位置がずれ、
//   挿入より後の行を直すと別の行に書き込まれていた
// - 何も書いていない行（日付だけの行も。挿入した行は上の日付を写すので）は「未入力」として
//   見せて送らない。Django 版は日付だけの行を 0 円の取引として登録していた。
//   逆に日付だけ空で他が埋まっている行はエラーにする（Django 版は黙って捨てていた）
// - 「既存データと N 行連続で一致しています」の注意は、いまの行から数え直す（duplicateWarning）。
//   Django 版は読み込んだときの文をそのまま持っていたので、重複の行を消しても注意が残った
//
// 分類・メモ・付箋（依頼24）: CSV の「分類」「メモ」「要確認」の列から来る。分類は出どころ
// （CSV・自動・人が直した）を持ち、送るのは CSV と人が選んだものだけ（自動はサーバが付ける）

import { parseAmountValue, parseDateValue } from '../../../server/input';
import { chainBalance } from '../../../server/lib/balance';
import { buildDuplicateWarning } from '../../../server/lib/dedup';
import type { PreviewFile } from '../../../server/lib/wizard';

// プレビューの行に、サーバが分類の列を照らした結果が付いてくる（routes/imports.ts の parse）
export type PreviewCategoryFields = { category?: string; autoCategory?: string; unknownCategory?: string };
export type ParsedPreviewFile = Omit<PreviewFile, 'rows'> & { rows: (PreviewFile['rows'][number] & PreviewCategoryFields)[] };

export type CategoryOrigin = 'csv' | 'auto' | 'manual';

export type AccountFields = {
  bankName: string;
  branchName: string;
  accountType: string;
  accountNumber: string;
};

export const EMPTY_ACCOUNT: AccountFields = { bankName: '', branchName: '', accountType: '', accountNumber: '' };

export type EditRow = {
  key: number;
  date: string;
  description: string;
  amountOut: string;
  amountIn: string;
  balance: string;
  // プレビューでの重複の判定。行を直したら消す（取込時にサーバがもう一度判定する）
  dup: 'high' | 'low' | null;
  // 取り込む分類。'' は自動分類（取込時にサーバが付ける）
  category: string;
  categoryOrigin: CategoryOrigin;
  // 自動分類なら付く分類の見込み。摘要を直したら分からなくなるので null
  autoCategory: string | null;
  // CSV に書かれていた知らない分類名（読み替え先を選ぶまで自動分類）
  unknownCategory: string | null;
  memo: string;
  flagged: boolean;
  // CSV の「要確認」の読めない値（付箋なしとして扱う。知らせるだけ）
  flagUnreadable: string | null;
};

export type EditFile = {
  key: number;
  filename: string;
  isSplit: boolean;
  // 口座番号をファイルから読めたか
  detected: boolean;
  hasBalance: boolean;
  // CSV にメモ・要確認が1行でも入っていたか（入っていなければ列を出さない）
  hasMemo: boolean;
  hasFlag: boolean;
  account: AccountFields;
  rows: EditRow[];
};

export type CheckedRow = EditRow & {
  // 何も書いていない行。取り込まない
  blank: boolean;
  error: string | null;
  calcBalance: number | null;
  isBalanceError: boolean;
};

const MAX_DESCRIPTION = 255;

let nextKey = 1;
export const newKey = () => nextKey++;

// 出金・入金の 0 は空欄で見せる（通帳と同じ）。残高の 0 は 0 と書く
export const isBlankRow = (r: EditRow) => [r.description, r.amountOut, r.amountIn, r.balance].every((v) => v.trim() === '');

export const blankRow = (date = ''): EditRow => ({
  key: newKey(),
  date,
  description: '',
  amountOut: '',
  amountIn: '',
  balance: '',
  dup: null,
  category: '',
  categoryOrigin: 'auto',
  autoCategory: null,
  unknownCategory: null,
  memo: '',
  flagged: false,
  flagUnreadable: null,
});

const amountText = (n: number) => (n === 0 ? '' : String(n));

export function toEditFiles(previews: ParsedPreviewFile[]): EditFile[] {
  return previews.map((p) => ({
    key: newKey(),
    filename: p.filename,
    isSplit: p.isSplit === true,
    detected: p.detectedAccount.accountNumber !== '',
    hasBalance: p.hasBalance,
    hasMemo: p.rows.some((r) => r.memo),
    hasFlag: p.rows.some((r) => r.flagged || r.flagUnreadable),
    account: { ...p.detectedAccount },
    rows: p.rows.map((r) => ({
      key: newKey(),
      date: r.date,
      description: r.description ?? '',
      amountOut: amountText(r.amountOut),
      amountIn: amountText(r.amountIn),
      balance: r.balance === null ? '' : String(r.balance),
      dup: r.isDuplicate ? (r.dupConfidence ?? 'high') : null,
      category: r.category ?? '',
      categoryOrigin: r.category ? 'csv' : 'auto',
      autoCategory: r.autoCategory ?? null,
      unknownCategory: r.unknownCategory ?? null,
      memo: r.memo ?? '',
      flagged: r.flagged === true,
      flagUnreadable: r.flagUnreadable ?? null,
    })),
  }));
}

function rowError(r: EditRow): { error: string | null; amountOut: number; amountIn: number; balance: number | null } {
  const date = parseDateValue(r.date);
  const amountOut = parseAmountValue(r.amountOut.trim(), '出金額', 0);
  const amountIn = parseAmountValue(r.amountIn.trim(), '入金額', 0);
  const balance = parseAmountValue(r.balance.trim(), '残高', null);
  const error = !date.ok
    ? date.error
    : !date.value
      ? '日付を入力してください'
      : r.description.length > MAX_DESCRIPTION
        ? `摘要は${MAX_DESCRIPTION}文字以内にしてください`
        : !amountOut.ok
          ? amountOut.error
          : !amountIn.ok
            ? amountIn.error
            : !balance.ok
              ? balance.error
              : null;
  return {
    error,
    amountOut: amountOut.ok ? amountOut.value : 0,
    amountIn: amountIn.ok ? amountIn.value : 0,
    balance: balance.ok ? balance.value : null,
  };
}

// 画面の並び順のまま突き合わせる（行を動かしたら、その順で数え直す）。未入力の行は飛ばす
export function checkRows(rows: EditRow[], hasBalance: boolean): CheckedRow[] {
  const filled = rows.filter((r) => !isBlankRow(r));
  const parsed = filled.map(rowError);
  const chained = hasBalance ? chainBalance(parsed) : parsed.map((p) => ({ ...p, calcBalance: null, isBalanceError: false }));
  const byKey = new Map(filled.map((r, i) => [r.key, chained[i]!]));
  return rows.map((r) => {
    const c = byKey.get(r.key);
    return { ...r, blank: !c, error: c?.error ?? null, calcBalance: c?.calcBalance ?? null, isBalanceError: c?.isBalanceError ?? false };
  });
}

// 取込（POST /cases/:id/import/commit）に送る形。金額は文字のまま送り、サーバが同じ規則で読む。
// 分類は CSV と人が選んだものだけ送る（自動分類はサーバが付ける）。メモ・付箋は入っているときだけ
const categorySourceOf = (origin: CategoryOrigin, unknown: string | null) =>
  unknown !== null ? 'remap' : origin === 'csv' ? 'csv' : 'manual';

export const toCommitFile = (f: EditFile) => ({
  account: f.account,
  rows: f.rows
    .filter((r) => !isBlankRow(r))
    .map(({ date, description, amountOut, amountIn, balance, category, categoryOrigin, unknownCategory, memo, flagged }) => ({
      date,
      description,
      amountOut,
      amountIn,
      balance,
      // categorySource は取込の結果の内訳（依頼25）にだけ使う: CSV のまま／知らない名前の読み替え／人が選んだ
      ...(category ? { category, categorySource: categorySourceOf(categoryOrigin, unknownCategory) } : {}),
      ...(memo.trim() ? { memo } : {}),
      ...(flagged ? { flagged } : {}),
    })),
});

// 知らない分類名ごとの行数（手順3の「知らない分類」の欄）。chosen は読み替え先（'' = 自動分類）
export function unknownCategories(files: readonly EditFile[]): { name: string; count: number; chosen: string }[] {
  const out = new Map<string, { name: string; count: number; chosen: string }>();
  for (const f of files)
    for (const r of f.rows) {
      if (r.unknownCategory === null || isBlankRow(r)) continue;
      const e = out.get(r.unknownCategory) ?? { name: r.unknownCategory, count: 0, chosen: r.category };
      e.count += 1;
      out.set(r.unknownCategory, e);
    }
  return [...out.values()];
}

// CSV の「要確認」に読めない値が入っていた行の数（付箋なしで取り込む。知らせるだけ）
export const unreadableFlagCount = (files: readonly EditFile[]) =>
  files.reduce((n, f) => n + f.rows.filter((r) => r.flagUnreadable !== null && !isBlankRow(r)).length, 0);

// 重複の注意（サーバのプレビューと同じ規則）。未入力の行は数えない
export function duplicateWarning(rows: CheckedRow[]): string | null {
  const filled = rows.filter((r) => !r.blank);
  const marks = filled.map((r) => ({ isDuplicate: r.dup !== null }));
  const count = marks.filter((m) => m.isDuplicate).length;
  return buildDuplicateWarning(marks, count, filled.length)?.message ?? null;
}
