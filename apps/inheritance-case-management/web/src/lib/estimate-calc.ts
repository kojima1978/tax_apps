/**
 * 見積額の自動計算ロジック
 *
 * 【基本報酬】遺産総額 × 0.8%
 * 【加算報酬】
 *   ① 土地評価（1利用区分につき）: 路線価 10,000円 / 倍率 3,000円
 *   ② 非上場株式評価（1社につき）: 100,000円
 *   ③ 相続人が複数の場合: 50,000円 ×（相続人数 - 1）※5名以上は加算対象外
 */

export interface EstimateParams {
  propertyValue: number;      // 取得財産の価格（遺産総額）
  landRosenkaCount: number;   // 土地数（路線価）
  landBairitsuCount: number;  // 土地数（倍率）
  unlistedStockCount: number; // 非上場株式の数
  heirCount: number;          // 相続人の数
}

export interface EstimateBreakdown {
  baseFee: number;            // 基本報酬
  landRosenkaFee: number;     // 加算①路線価
  landBairitsuFee: number;    // 加算①倍率
  unlistedStockFee: number;   // 加算②
  heirFee: number;            // 加算③
  total: number;              // 合計
}

const BASE_RATE = 0.008;          // 0.8%
const ROSENKA_UNIT = 10000;       // 路線価 1区分あたり
const BAIRITSU_UNIT = 3000;       // 倍率 1区分あたり
const STOCK_UNIT = 100000;        // 非上場株式 1社あたり
const HEIR_UNIT = 50000;          // 相続人加算 1人あたり
const HEIR_MAX_ADDITIONAL = 4;    // 加算上限（5名以上は4人分まで）

export function calcEstimate(params: EstimateParams): EstimateBreakdown {
  const baseFee = Math.floor(params.propertyValue * BASE_RATE);
  const landRosenkaFee = params.landRosenkaCount * ROSENKA_UNIT;
  const landBairitsuFee = params.landBairitsuCount * BAIRITSU_UNIT;
  const unlistedStockFee = params.unlistedStockCount * STOCK_UNIT;
  const heirAdditional = Math.max(0, Math.min(params.heirCount - 1, HEIR_MAX_ADDITIONAL));
  const heirFee = heirAdditional * HEIR_UNIT;
  const total = baseFee + landRosenkaFee + landBairitsuFee + unlistedStockFee + heirFee;

  return { baseFee, landRosenkaFee, landBairitsuFee, unlistedStockFee, heirFee, total };
}
