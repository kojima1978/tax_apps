// 相続税の観点の集計（依頼22）。基準日（相続開始日）から、申告の検討に使う3つの見方を作る。
//
//   1. 生前贈与の検討 … 加算対象期間の中の「贈与・教育費」の出金を、相手先（摘要）×暦年で
//   2. 相続開始直前の出金 … 基準日の前 N か月の現金の引出しと多額の出金（手許現金の検討）
//   3. 口座の外への多額の移動 … 資金移動の相手が案件の口座に見つからなかった多額の振込・振替
//
// どれも「検討の材料」で、加算するか・贈与かどうかの判定はしない（受贈者が相続・遺贈で財産を
// 取得したかはアプリでは分からない）。分類・付箋・設定の既存データだけから作り、DB は増やさない。
//
// 期間は相続開始日から日単位でさかのぼる。月次グラフの「3年／7年」（最後の月から数えた表示期間）
// とは別物なので、画面でも「加算対象期間」と呼び分ける。

import { GIFT_CATEGORY } from './categories.js';
import { toIsoDate, warekiFull } from './dates.js';
import { matchesAllKeywords, normalizeText } from './text.js';

// ---------------------------------------------------------------------------
// 生前贈与加算の対象期間（相続税法19条・令和5年度改正。国税庁タックスアンサー No.4161）
//
//   相続開始日 〜R8.12.31        → 相続開始前3年以内（3年前の日から死亡の日まで）
//   相続開始日 R9.1.1〜R12.12.31 → R6.1.1 から死亡の日まで（経過措置）
//   相続開始日 R13.1.1〜         → 相続開始前7年以内（7年前の日から死亡の日まで）
//
// 「3年前の日」は応当日（死亡日と同じ月日）で、その日も期間に入る。応当日が無い（2/29 の
// 3年前など）ときはその月の末日（2/28）── 期間を広めに取る側（検討の材料なので漏らさない）。
// 3年以内より前の部分（延びた部分）は、受贈者ごとに合計から100万円を控除する（R9.1.2 以後の
// 相続開始で生じる。R9.1.1 は3年前の日が R6.1.1 なので延びた部分が無い）。
// ---------------------------------------------------------------------------

export type GiftPeriodKind = 'three' | 'transition' | 'seven';

export const GIFT_PERIOD_KIND_LABEL: Record<GiftPeriodKind, string> = {
  three: '相続開始前3年以内',
  transition: '経過措置（令和6年1月1日から）',
  seven: '相続開始前7年以内',
};

export type GiftAdditionPeriod = {
  kind: GiftPeriodKind;
  start: string; // 加算対象期間の初日
  end: string; // 相続開始日（その日も含む）
  threeYearStart: string; // 3年以内の部分の初日（3年前の応当日）
  // 延びた部分（100万円控除の対象）。無ければ null
  extended: { from: string; to: string } | null;
};

const TRANSITION_FROM = '2027-01-01';
const SEVEN_FROM = '2031-01-01';
const TRANSITION_START = '2024-01-01';

// n 年前の応当日。無ければその月の末日（2/29 → 2/28）
export function yearsBefore(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return toIsoDate(y - n, m, d) ?? toIsoDate(y - n, m, d - 1)!;
}

// n か月前の応当日。無ければその月の末日（5/31 の3か月前 → 2/28・2/29）
export function monthsBefore(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const total = y * 12 + (m - 1) - n;
  const yy = Math.floor(total / 12);
  const mm = (total % 12) + 1;
  for (let dd = d; dd >= 28; dd--) {
    const hit = toIsoDate(yy, mm, dd);
    if (hit) return hit;
  }
  return toIsoDate(yy, mm, d)!;
}

export function addDays(iso: string, n: number): string {
  const t = new Date(`${iso}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}

export function giftAdditionPeriod(referenceDate: string): GiftAdditionPeriod {
  const threeYearStart = yearsBefore(referenceDate, 3);
  const kind: GiftPeriodKind = referenceDate < TRANSITION_FROM ? 'three' : referenceDate < SEVEN_FROM ? 'transition' : 'seven';
  const start = kind === 'three' ? threeYearStart : kind === 'transition' ? TRANSITION_START : yearsBefore(referenceDate, 7);
  return {
    kind,
    start,
    end: referenceDate,
    threeYearStart,
    extended: start < threeYearStart ? { from: start, to: addDays(threeYearStart, -1) } : null,
  };
}

// 「令和6年1月1日〜令和9年6月30日（経過措置）」
export function giftPeriodLabel(p: GiftAdditionPeriod): string {
  return `${warekiFull(p.start)}〜${warekiFull(p.end)}（${GIFT_PERIOD_KIND_LABEL[p.kind]}）`;
}

// 暦年課税の基礎控除（目安として並べるだけ）と、延びた部分の控除額
export const ANNUAL_GIFT_EXEMPTION = 1_100_000;
export const EXTENDED_PART_DEDUCTION = 1_000_000;

// ---------------------------------------------------------------------------
// 集計の入力（ExportRow と同じ形の一部）
// ---------------------------------------------------------------------------

export type ReviewTx = {
  id: number;
  accountId: number | null;
  date: string | null;
  bankName: string | null;
  branchName: string | null;
  accountType: string | null;
  accountNumber: string | null;
  description: string | null;
  amountOut: number;
  amountIn: number;
  category: string;
  isFlagged: boolean;
};

export type ReviewRow = {
  id: number;
  date: string;
  description: string;
  amountOut: number;
  category: string;
  accountId: number | null;
  accountLabel: string;
  accountNumber: string;
  isFlagged: boolean;
};

const accountText = (t: ReviewTx) => [t.bankName, t.branchName, t.accountType, t.accountNumber].filter(Boolean).join(' ');

const toRow = (t: ReviewTx & { date: string }): ReviewRow => ({
  id: t.id,
  date: t.date,
  description: t.description ?? '',
  amountOut: t.amountOut,
  category: t.category,
  accountId: t.accountId,
  accountLabel: accountText(t) || '口座なし',
  accountNumber: t.accountNumber ?? '',
  isFlagged: t.isFlagged,
});

const dated = (txs: readonly ReviewTx[]) => txs.filter((t): t is ReviewTx & { date: string } => t.date !== null);
const sumOut = (rows: readonly { amountOut: number }[]) => rows.reduce((n, r) => n + r.amountOut, 0);

// ---------------------------------------------------------------------------
// 1. 生前贈与の検討
// ---------------------------------------------------------------------------

export type GiftYearRow = {
  year: number;
  from: string; // その暦年のうち加算対象期間に入る初日〜末日（取引一覧の絞り込みに使う）
  to: string;
  total: number;
  count: number;
  within3: number; // 3年以内の部分
  extended: number; // 延びた部分
  overExemption: boolean; // 110万円を超えるか（目安）
  ids: number[];
};

export type GiftCounterparty = {
  counterparty: string; // 摘要（空なら「摘要なし」）
  keyword: string; // 取引一覧の絞り込みに使う摘要（空なら ''）
  years: GiftYearRow[];
  total: number;
  within3: number;
  extended: number;
  // 延びた部分から100万円を引いた残り（受贈者ごとの控除。相手先＝受贈者とは限らないので参考）
  extendedAfterDeduction: number;
};

export type GiftReview = {
  period: GiftAdditionPeriod;
  counterparties: GiftCounterparty[];
  total: number;
  within3: number;
  extended: number;
  count: number;
  ids: number[];
  // 期間より前の贈与候補（名義預金の検討に。件数と合計だけ）
  before: { count: number; total: number; from: string | null; to: string };
};

const NO_DESCRIPTION = '摘要なし';

export function giftReview(txs: readonly ReviewTx[], referenceDate: string): GiftReview {
  const period = giftAdditionPeriod(referenceDate);
  const gifts = dated(txs).filter((t) => t.category === GIFT_CATEGORY && t.amountOut > 0);
  const inPeriod = gifts.filter((t) => t.date >= period.start && t.date <= period.end);
  const before = gifts.filter((t) => t.date < period.start);

  // 相手先は摘要の正規化（全角半角・かなの違いを寄せる）でまとめ、見出しは最初に出た摘要
  const groups = new Map<string, { label: string; rows: (ReviewTx & { date: string })[] }>();
  for (const t of inPeriod) {
    const desc = (t.description ?? '').trim();
    const key = normalizeText(desc);
    const g = groups.get(key) ?? { label: desc, rows: [] };
    groups.set(key, g);
    g.rows.push(t);
  }

  const counterparties = [...groups.values()].map(({ label, rows }): GiftCounterparty => {
    const byYear = new Map<number, (ReviewTx & { date: string })[]>();
    for (const r of rows) {
      const y = Number(r.date.slice(0, 4));
      byYear.set(y, [...(byYear.get(y) ?? []), r]);
    }
    const years = [...byYear.entries()]
      .sort(([a], [b]) => a - b)
      .map(([year, list]): GiftYearRow => {
        const within3 = sumOut(list.filter((r) => r.date >= period.threeYearStart));
        const total = sumOut(list);
        const yFrom = `${year}-01-01`;
        const yTo = `${year}-12-31`;
        return {
          year,
          from: yFrom < period.start ? period.start : yFrom,
          to: yTo > period.end ? period.end : yTo,
          total,
          count: list.length,
          within3,
          extended: total - within3,
          overExemption: total > ANNUAL_GIFT_EXEMPTION,
          ids: list.map((r) => r.id),
        };
      });
    const total = years.reduce((n, y) => n + y.total, 0);
    const within3 = years.reduce((n, y) => n + y.within3, 0);
    const extended = total - within3;
    return {
      counterparty: label || NO_DESCRIPTION,
      keyword: label,
      years,
      total,
      within3,
      extended,
      extendedAfterDeduction: Math.max(0, extended - EXTENDED_PART_DEDUCTION),
    };
  });
  // 合計の大きい相手先から（同額は摘要の順）
  counterparties.sort((a, b) => b.total - a.total || (a.counterparty < b.counterparty ? -1 : a.counterparty > b.counterparty ? 1 : 0));

  const total = sumOut(inPeriod);
  const within3 = sumOut(inPeriod.filter((t) => t.date >= period.threeYearStart));
  return {
    period,
    counterparties,
    total,
    within3,
    extended: total - within3,
    count: inPeriod.length,
    ids: inPeriod.map((t) => t.id),
    before: {
      count: before.length,
      total: sumOut(before),
      from: before.length ? before.reduce((m, t) => (t.date < m ? t.date : m), before[0]!.date) : null,
      to: addDays(period.start, -1),
    },
  };
}

// ---------------------------------------------------------------------------
// 2. 相続開始直前の出金（手許現金の検討）
// ---------------------------------------------------------------------------

// 現金の引出しと見なす摘要（正規化して部分一致。ATM・CD は半角全角・大小文字を問わない）。
// 「カード」は摘要の先頭にあるときだけ（ATM の引出しの印字。「〇〇カード」の引落しは現金ではない）
export const CASH_KEYWORDS = ['ATM', 'CD', '現金', '引出', '引き出', '払戻', '払出'] as const;
const CASH_NORMALIZED = CASH_KEYWORDS.map(normalizeText);
const CARD_PREFIX = normalizeText('カード');
export const isCashWithdrawal = (description: string | null): boolean => {
  const n = normalizeText((description ?? '').trim());
  return n.startsWith(CARD_PREFIX) || CASH_NORMALIZED.some((k) => n.includes(k));
};

// 既定は3か月（葬式費用の準備などの引出しが集まる時期。設定で 1〜36 か月に変えられる）
export const DEFAULT_PRE_DEATH_MONTHS = 3;

export type WithdrawalRow = ReviewRow & { cash: boolean; large: boolean };

export type AccountSubtotal = { accountId: number | null; accountLabel: string; accountNumber: string; count: number; total: number; cash: number };

export type WithdrawalList = { rows: WithdrawalRow[]; total: number; cashTotal: number; largeTotal: number; byAccount: AccountSubtotal[]; ids: number[] };

export type WithdrawalReview = {
  months: number;
  from: string; // 基準日の N か月前の応当日
  to: string; // 基準日の前日
  before: WithdrawalList;
  // 基準日当日・以後（相続開始後の引出し）
  after: WithdrawalList & { from: string; to: string | null };
};

function withdrawalList(rows: WithdrawalRow[]): WithdrawalList {
  const accounts = new Map<string, AccountSubtotal>();
  for (const r of rows) {
    const key = String(r.accountId);
    const a = accounts.get(key) ?? { accountId: r.accountId, accountLabel: r.accountLabel, accountNumber: r.accountNumber, count: 0, total: 0, cash: 0 };
    accounts.set(key, a);
    a.count++;
    a.total += r.amountOut;
    if (r.cash) a.cash += r.amountOut;
  }
  return {
    rows,
    total: sumOut(rows),
    cashTotal: sumOut(rows.filter((r) => r.cash)),
    largeTotal: sumOut(rows.filter((r) => r.large)),
    byAccount: [...accounts.values()].sort((a, b) => b.total - a.total),
    ids: rows.map((r) => r.id),
  };
}

export function withdrawalReview(txs: readonly ReviewTx[], referenceDate: string, months: number, largeThreshold: number): WithdrawalReview {
  const from = monthsBefore(referenceDate, months);
  const to = addDays(referenceDate, -1);
  const pick = (t: ReviewTx & { date: string }): WithdrawalRow | null => {
    if (!(t.amountOut > 0)) return null;
    const cash = isCashWithdrawal(t.description);
    const large = largeThreshold > 0 && t.amountOut >= largeThreshold;
    return cash || large ? { ...toRow(t), cash, large } : null;
  };
  const rows = dated(txs);
  const before = rows.filter((t) => t.date >= from && t.date <= to).flatMap((t) => pick(t) ?? []);
  const after = rows.filter((t) => t.date >= referenceDate).flatMap((t) => pick(t) ?? []);
  const lastAfter = after.length ? after[after.length - 1]!.date : null;
  return {
    months,
    from,
    to,
    before: withdrawalList(before),
    after: { ...withdrawalList(after), from: referenceDate, to: lastAfter },
  };
}

// ---------------------------------------------------------------------------
// 3. 口座の外への多額の移動
// ---------------------------------------------------------------------------

// 振込・振替と見なす摘要（現金の引出しは 2. で見るのでここには入れない）
export const OUTWARD_KEYWORDS = ['振込', '振替', '送金', 'ふりこみ', 'ふりかえ', '為替'] as const;
const OUTWARD_NORMALIZED = OUTWARD_KEYWORDS.map(normalizeText);
export const isOutwardTransfer = (description: string | null): boolean => matchesAnyNormalized(description, OUTWARD_NORMALIZED);

function matchesAnyNormalized(text: string | null, keywords: readonly string[]): boolean {
  return keywords.some((k) => matchesAllKeywords(text, [k]));
}

export type OutwardReview = { threshold: number; rows: (ReviewRow & { side: '前' | '当日' | '後' })[]; total: number; ids: number[] };

// pairedIds: 資金移動（transferPairs）で組になった取引。組になったものは案件の口座の間の移動
export function outwardReview(txs: readonly ReviewTx[], referenceDate: string, largeThreshold: number, pairedIds: ReadonlySet<number>): OutwardReview {
  const rows = dated(txs)
    .filter(
      (t) =>
        largeThreshold > 0 &&
        t.amountOut >= largeThreshold &&
        !pairedIds.has(t.id) &&
        !isCashWithdrawal(t.description) &&
        isOutwardTransfer(t.description),
    )
    .map((t) => ({ ...toRow(t), side: t.date < referenceDate ? ('前' as const) : t.date === referenceDate ? ('当日' as const) : ('後' as const) }))
    // 新しい順（相続開始に近いものから見る）
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id));
  return { threshold: largeThreshold, rows, total: sumOut(rows), ids: rows.map((r) => r.id) };
}

// ---------------------------------------------------------------------------
// まとめ
// ---------------------------------------------------------------------------

export type InheritanceReview = {
  referenceDate: string;
  gift: GiftReview;
  withdrawal: WithdrawalReview;
  outward: OutwardReview;
};

export function inheritanceReview(
  txs: readonly ReviewTx[],
  referenceDate: string,
  opts: { preDeathMonths: number; largeThreshold: number; pairedIds: ReadonlySet<number> },
): InheritanceReview {
  return {
    referenceDate,
    gift: giftReview(txs, referenceDate),
    withdrawal: withdrawalReview(txs, referenceDate, opts.preDeathMonths, opts.largeThreshold),
    outward: outwardReview(txs, referenceDate, opts.largeThreshold, opts.pairedIds),
  };
}

export const REVIEW_DISCLAIMER = 'この集計は申告の検討の材料です。生前贈与加算の対象か・贈与に当たるかの判定はしていません（受贈者が相続・遺贈で財産を取得したかなどは人が確かめてください）。';
