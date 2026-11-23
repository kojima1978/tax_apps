import { type CarriedOverPositions } from "@/lib/position-trend";

/**
 * 「前年のまま」の印（画面だけ・印刷しない）。翌期更新で前の年度からコピーしたまま、
 * 金額を直していない明細を見分けるためのもの。金額が実際に変わらない明細にも付く（事実の表示であって警告ではない）。
 */
export function CarryoverBadge({ carriedOver, positionId }: { carriedOver: CarriedOverPositions | null | undefined; positionId: number }) {
  if (!carriedOver?.previous || !carriedOver.ids.has(positionId)) return null;
  return <span className="carryover-badge" title={`${carriedOver.previous.fiscalYear}年度と同じ金額です`}>前年のまま</span>;
}
