/**
 * 不動産の仲介手数料（宅地建物取引業法の報酬上限）
 *
 * 国土交通省告示による上限額を「速算式」で求める。返すのは上限額であって、
 * 実際に支払った額ではない点に注意（入力欄は手で書き換えられるようにしてある）。
 */

/** 仲介手数料に課される消費税率 */
export const BROKER_FEE_TAX_RATE = 0.1;

/**
 * 速算式のブラケット。`limit` はその区分の上限（以下）。
 * 上限額（税抜） = 売買代金 × rate + add
 */
const BROKER_FEE_BRACKETS = [
    { limit: 2_000_000, rate: 0.05, add: 0 },
    { limit: 4_000_000, rate: 0.04, add: 20_000 },
    { limit: Infinity, rate: 0.03, add: 60_000 },
];

/**
 * 売買代金から仲介手数料の上限額（消費税込み・円未満切捨て）を求める。
 * 0以下のときは0を返す。
 */
export const calcBrokerFee = (price: number): number => {
    if (price <= 0) return 0;
    const { rate, add } = BROKER_FEE_BRACKETS.find((b) => price <= b.limit) ?? BROKER_FEE_BRACKETS[BROKER_FEE_BRACKETS.length - 1];
    return Math.floor((price * rate + add) * (1 + BROKER_FEE_TAX_RATE));
};
