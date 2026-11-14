// 取込のあとの「取込の結果」（依頼25）。確定（commitWizard）が入れた取引から組み立てる純粋な関数。
//
// 取込の中身（重複判定・分類・付箋）には触らず、入ったものを数えるだけ。履歴は残さない
// （画面がこの結果を受け取って見せる。DB にもバックアップ JSON にも載らない）。
//
// 「今回の取込で入った取引」は ID の範囲（idFrom〜idTo）で指せる: 取込は案件のロックを取って
// 入れるので、その間に同じ案件へ別の行は入らない（他の案件の行が範囲に混じっても、絞り込みも
// 範囲削除も案件の中だけを見る）。画面のリンクはこの範囲と各条件で取引一覧へ移る。
//
// 数え方:
// - 分類の出どころ: CSV（AI）／手順3で人が選んだ（うち知らない分類名の読み替え）／自動。
//   「未分類のまま」は入った分類が未分類の行（自動分類でどれにも当たらなかったもの）
// - 残高のつながり: ファイルごとに、入った行を送られた並び（手順3の表の並び）で突き合わせる
//   （lib/balance.ts の chainBalance。手順3の赤い行と同じ規則）。重複で除いた行は入っていないので数えない。
//   繰越の残高（依頼26）は、ファイルの先頭の行が入ったときだけ出発点にする（先頭が重複で除かれたら使わない）
// - 手順3の確認（依頼26）: 読み飛ばした行・問題の行を直した／このままにした／除いた数。画面が数えて送り、そのまま載せる
// - 相手の見つからない通帳間移動: 分類が通帳間移動なのに資金移動の印が付かなかった行
//   （全ファイルを入れ終えた後の状態で数える）
// - 通帳の抜け: 口座ごとに、前から入っていた取引と今回の取引を日付順に並べ、隣り合う取引の間が GAP_DAYS 日を
//   超えて空いている所のうち、片側が今回の取引のものを知らせる（前の期間と今回の間・今回の中の間のどちらも拾う。
//   前からある間は今回の取込のせいではないので出さない）。2か月ごとの年金だけの口座でも出ないよう3か月にしている。
//   取引の無い年は通帳有無一覧表の自動の○（その年に取引があるか）と同じ数え方

import { GIFT_CATEGORY, TRANSFER_CATEGORY, UNCATEGORIZED } from '../categories.js';
import { chainBalance } from '../balance.js';

export type CategorySource = 'csv' | 'manual' | 'remap' | 'auto';

export type InsertedRow = {
  id: number;
  accountId: number;
  date: string; // 'YYYY-MM-DD'
  amountOut: number;
  amountIn: number;
  balance: number | null;
  category: string;
  categorySource: CategorySource;
  memo: string | null;
  isFlagged: boolean;
  isLarge: boolean;
  isTransfer: boolean;
};

export type SummaryAccountInfo = {
  id: number;
  bankName: string | null;
  branchName: string | null;
  accountNumber: string;
  accountType: string | null;
};

type Period = { from: string; to: string };
type Gap = Period & { days: number };

export type AccountResult = SummaryAccountInfo & {
  count: number;
  period: Period;
  totalOut: number;
  totalIn: number;
  // 日付の一番新しい行（同じ日は後に入った行）のうち残高の書いてあるもの
  lastBalance: { date: string; amount: number } | null;
  balanceErrors: number;
  // 残高が合わない行の ID（取引一覧へ移るリンク用。多すぎるときは先頭から）
  balanceErrorIds: number[];
  // 前から入っていた取引（今回の取込の前）。無ければ新しく入った口座
  before: (Period & { count: number }) | null;
  overlap: Period | null;
  // 間が空いている所（古い順・多すぎるときは先頭から MAX_GAPS 件）
  gaps: Gap[];
  // 前からの分と合わせた期間の中で、取引が1件も無い年（西暦）
  emptyYears: number[];
};

// 手順3の確認（依頼26）。取引でない行の読み飛ばしと、問題の行（読めない値・壊れた行の疑い）の始末
export type ImportReview = {
  skippedRows: number;
  problemFixed: number;
  problemAccepted: number;
  problemRemoved: number;
};

export type ImportSummary = {
  files: number;
  imported: number;
  skipped: number;
  idFrom: number | null;
  idTo: number | null;
  accounts: AccountResult[];
  categories: { csv: number; manual: number; remap: number; auto: number; uncategorized: number };
  attention: { flagged: number; memo: number; large: number; transferUnmatched: number; gift: number };
  review?: ImportReview;
};

// 間がこの日数を超えて空いていれば「通帳の抜け」かもしれないと知らせる
export const GAP_DAYS = 90;
export const MAX_GAPS = 10;
export const MAX_ERROR_IDS = 100;

const DAY_MS = 86_400_000;
const toTime = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const shift = (iso: string, days: number) => new Date(toTime(iso) + days * DAY_MS).toISOString().slice(0, 10);
const daysBetween = (from: string, to: string) => Math.round((toTime(to) - toTime(from)) / DAY_MS);

function periodOf(dates: readonly string[]): Period | null {
  if (dates.length === 0) return null;
  let from = dates[0]!;
  let to = dates[0]!;
  for (const d of dates) {
    if (d < from) from = d;
    if (d > to) to = d;
  }
  return { from, to };
}

// 前からの取引と今回の取引を合わせた日付の並びで、片側が今回の取引の間のうち GAP_DAYS 日を超えるもの
function gapsOf(before: readonly string[], now: readonly string[]): Gap[] {
  const isNew = new Map<string, boolean>();
  for (const d of before) if (!isNew.has(d)) isNew.set(d, false);
  for (const d of now) isNew.set(d, true);
  const dates = [...isNew.keys()].sort();
  const gaps: Gap[] = [];
  for (let i = 1; i < dates.length; i++) {
    const [a, b] = [dates[i - 1]!, dates[i]!];
    if (!isNew.get(a) && !isNew.get(b)) continue;
    const days = daysBetween(a, b) - 1; // 間の日数（両端の取引日を除く）
    if (days > GAP_DAYS) gaps.push({ from: shift(a, 1), to: shift(b, -1), days });
  }
  return gaps;
}

function overlapOf(a: Period, b: Period): Period | null {
  const from = a.from > b.from ? a.from : b.from;
  const to = a.to < b.to ? a.to : b.to;
  return from <= to ? { from, to } : null;
}

export function buildImportSummary(input: {
  // 送られたファイルごとの、入った行（送られた並び）
  files: readonly (readonly InsertedRow[])[];
  // ファイルごとの残高の出発点（繰越。先頭の行が入らなかったファイルは null）
  openings?: readonly (number | null)[];
  review?: ImportReview;
  fileCount: number;
  skipped: number;
  accounts: readonly SummaryAccountInfo[];
  // 取込の前から案件に入っていた取引（日付のあるもの）
  existing: readonly { accountId: number | null; date: string }[];
}): ImportSummary {
  const rows = input.files.flat();
  const errorIds = new Set<number>();
  input.files.forEach((f, fi) => {
    // 口座ごとに突き合わせる（1ファイルは1口座だが、複数口座の CSV は口座ごとのファイルに分かれて届く）
    const byAccount = new Map<number, InsertedRow[]>();
    for (const r of f) byAccount.set(r.accountId, [...(byAccount.get(r.accountId) ?? []), r]);
    const opening = byAccount.size === 1 ? (input.openings?.[fi] ?? null) : null;
    for (const list of byAccount.values()) {
      for (const c of chainBalance(list, opening)) if (c.isBalanceError) errorIds.add(c.id);
    }
  });

  const existingByAccount = new Map<number, string[]>();
  for (const e of input.existing) {
    if (e.accountId === null) continue;
    existingByAccount.set(e.accountId, [...(existingByAccount.get(e.accountId) ?? []), e.date]);
  }

  const info = new Map(input.accounts.map((a) => [a.id, a]));
  const grouped = new Map<number, InsertedRow[]>();
  for (const r of rows) grouped.set(r.accountId, [...(grouped.get(r.accountId) ?? []), r]);

  const accounts: AccountResult[] = [...grouped.entries()].map(([accountId, list]) => {
    const period = periodOf(list.map((r) => r.date))!;
    const beforeDates = existingByAccount.get(accountId) ?? [];
    const beforePeriod = periodOf(beforeDates);
    const newest = [...list].filter((r) => r.balance !== null).sort((a, b) => (a.date === b.date ? a.id - b.id : a.date < b.date ? -1 : 1)).at(-1);
    const years = new Set([...beforeDates, ...list.map((r) => r.date)].map((d) => Number(d.slice(0, 4))));
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    const emptyYears: number[] = [];
    for (let y = minYear; y <= maxYear; y++) if (!years.has(y)) emptyYears.push(y);
    const errors = list.filter((r) => errorIds.has(r.id)).map((r) => r.id);
    return {
      ...(info.get(accountId) ?? { id: accountId, bankName: null, branchName: null, accountNumber: '', accountType: null }),
      count: list.length,
      period,
      totalOut: list.reduce((n, r) => n + r.amountOut, 0),
      totalIn: list.reduce((n, r) => n + r.amountIn, 0),
      lastBalance: newest ? { date: newest.date, amount: newest.balance! } : null,
      balanceErrors: errors.length,
      balanceErrorIds: errors.slice(0, MAX_ERROR_IDS),
      before: beforePeriod ? { ...beforePeriod, count: beforeDates.length } : null,
      overlap: beforePeriod ? overlapOf(beforePeriod, period) : null,
      gaps: gapsOf(
        beforeDates,
        list.map((r) => r.date),
      ).slice(0, MAX_GAPS),
      emptyYears,
    };
  });
  accounts.sort(
    (a, b) =>
      (a.bankName ?? '').localeCompare(b.bankName ?? '', 'ja') ||
      (a.branchName ?? '').localeCompare(b.branchName ?? '', 'ja') ||
      a.accountNumber.localeCompare(b.accountNumber, 'ja', { numeric: true }),
  );

  const count = (pred: (r: InsertedRow) => boolean) => rows.filter(pred).length;
  const ids = rows.map((r) => r.id);
  return {
    files: input.fileCount,
    imported: rows.length,
    skipped: input.skipped,
    idFrom: ids.length ? Math.min(...ids) : null,
    idTo: ids.length ? Math.max(...ids) : null,
    accounts,
    categories: {
      csv: count((r) => r.categorySource === 'csv'),
      manual: count((r) => r.categorySource === 'manual'),
      remap: count((r) => r.categorySource === 'remap'),
      auto: count((r) => r.categorySource === 'auto' && r.category !== UNCATEGORIZED),
      uncategorized: count((r) => r.category === UNCATEGORIZED),
    },
    attention: {
      flagged: count((r) => r.isFlagged),
      memo: count((r) => (r.memo ?? '').trim() !== ''),
      large: count((r) => r.isLarge),
      transferUnmatched: count(isUnmatchedTransfer),
      gift: count((r) => r.category === GIFT_CATEGORY),
    },
    ...(input.review ? { review: input.review } : {}),
  };
}

// 取引一覧の ?mark=transfer_unmatched と同じ判定（件数と移った先を一致させる）
export const isUnmatchedTransfer = (t: { category: string; isTransfer: boolean }) => t.category === TRANSFER_CATEGORY && !t.isTransfer;
