/**
 * 不動産の譲渡に関する契約書の印紙税（印紙税法 第1号文書）
 *
 * 契約書に記載された金額（＝売買代金）で税額が決まる階段方式。
 * 平成26年4月1日〜令和9年3月31日に作成された契約書には軽減措置（措法91）があり、
 * 本則の半分前後になる。判定は**契約書の作成日**なので、譲渡日（引渡日）で
 * 代用している点には注意（契約は期限内・引渡しは期限後、という組合せは拾えない）。
 *
 * 返すのは契約書1通分。売主・買主が各1通保存する場合、譲渡費用になるのは
 * 自分が負担した分だけ。
 */

/** 軽減措置の適用期限（この日までに作成された契約書） */
export const STAMP_DUTY_REDUCTION_DEADLINE = '2027-03-31';

/** 記載金額がこの額未満の契約書は非課税 */
const TAX_FREE_LIMIT = 10_000;

/** 階段表。`limit` はその区分の上限（「◯円を超え limit 円以下」） */
const STAMP_DUTY_BRACKETS = [
    { limit: 100_000, normal: 200, reduced: 200 },
    { limit: 500_000, normal: 400, reduced: 200 },
    { limit: 1_000_000, normal: 1_000, reduced: 500 },
    { limit: 5_000_000, normal: 2_000, reduced: 1_000 },
    { limit: 10_000_000, normal: 10_000, reduced: 5_000 },
    { limit: 50_000_000, normal: 20_000, reduced: 10_000 },
    { limit: 100_000_000, normal: 60_000, reduced: 30_000 },
    { limit: 500_000_000, normal: 100_000, reduced: 60_000 },
    { limit: 1_000_000_000, normal: 200_000, reduced: 160_000 },
    { limit: 5_000_000_000, normal: 400_000, reduced: 320_000 },
    { limit: Infinity, normal: 600_000, reduced: 480_000 },
];

/** 契約書の作成日が軽減措置の期間内か（未入力なら期間内として扱う） */
export const isStampDutyReduced = (contractDate: string): boolean =>
    contractDate === '' || contractDate <= STAMP_DUTY_REDUCTION_DEADLINE;

/**
 * 売買代金から印紙税額（契約書1通分）を求める。
 * `contractDate` が軽減措置の期間内なら軽減後の額を返す。
 */
export const calcStampDuty = (price: number, contractDate = ''): number => {
    if (price < TAX_FREE_LIMIT) return 0;
    const bracket = STAMP_DUTY_BRACKETS.find((b) => price <= b.limit) ?? STAMP_DUTY_BRACKETS[STAMP_DUTY_BRACKETS.length - 1];
    return isStampDutyReduced(contractDate) ? bracket.reduced : bracket.normal;
};
