import { positionCaption } from "@/lib/position-display";
import {
  type Position,
  type PositionSection,
  type Snapshot,
  categoryRank,
  institutionOrPropertyAddress,
  positionSection,
  propertyTypeOf,
} from "@/lib/portfolio-view";

/**
 * 明細ごとの年度推移。年度をまたいだ「同じ明細」は系統キー（Position.lineageKey、lib/position-lineage.ts）で
 * つなぐ。名称や所在を直してもキーは変わらないので、名前が変わった明細も1行にまとまる。
 *
 * 年度比較の画面の3期（右端が最新）と同じ並びの配列を受け取り、期ごとの評価額を返す。
 * 期そのものが無い（データなし）ときと、期はあるがその明細が無いときは、どちらも値を null にし、
 * 前年度差は期が両方あるときだけ「無い明細は0円」として求める（売却・解約で消えた明細は全額のマイナス）。
 */

/** 前年度差のセルの色分け。年度推移表・明細ごとの推移・明細の推移ダイアログで同じにする。 */
export const changeTone = (change: number | null) => change === null ? "" : change > 0 ? "positive" : change < 0 ? "negative" : "neutral";
/** 前年度差の表示。増えたら「+」を付ける（減ったときの「△」は format が付ける）。差が出せなければ「—」。 */
export const changeText = (change: number | null, format: (value: number) => string) => change === null ? "—" : `${change > 0 ? "+" : ""}${format(change)}`;

export type PositionTrendStatus = "new" | "ended";

export type PositionTrendRow = {
  lineageKey: string;
  section: PositionSection;
  /** 科目（不動産は「・土地」「・建物」まで） */
  caption: string;
  /** いちばん新しい期の名称 */
  name: string;
  /** 選んだ期の中で、今の名称と違う名称（古い順） */
  formerNames: string[];
  /** 金融機関・所在など、名称の下に添える1行（いちばん新しい期のもの） */
  detail: string;
  /** 期ごとの評価額。期が無い・その期に明細が無いときは null */
  values: Array<number | null>;
  /** 最新 − 直前。どちらかの期が無いときは null */
  change: number | null;
  /** 直前の期に無く最新の期にある＝new、直前にあって最新に無い＝ended */
  status: PositionTrendStatus | null;
};

/** 保存前の明細（キーが無い）は他とつながないよう、明細の id で仮のキーを作る。 */
export const lineageKeyOf = (position: Position) => position.lineageKey ?? `position-${position.id}`;

const sectionRank: Record<PositionSection, number> = { ASSET: 0, LIABILITY: 1, CONTINGENT: 2 };
const propertyRank = (position: Position) => propertyTypeOf(position) === "BUILDING" ? 1 : 0;

export function positionTrendRows(periods: Array<Snapshot | null>): PositionTrendRow[] {
  const latestIndex = periods.length - 1;
  const lineages = new Map<string, { positions: Array<Position | null>; order: number[] }>();
  periods.forEach((snapshot, periodIndex) => {
    snapshot?.positions.forEach((position, positionIndex) => {
      const key = lineageKeyOf(position);
      let entry = lineages.get(key);
      if (!entry) {
        entry = { positions: periods.map(() => null), order: [] };
        lineages.set(key, entry);
      }
      entry.positions[periodIndex] = position;
      // 並びは「その明細が出てくるいちばん新しい期」の中の位置。期が新しいほうを先にする
      entry.order = [-periodIndex, positionIndex];
    });
  });

  const latestPeriod = periods[latestIndex];
  const previousPeriod = periods[latestIndex - 1];
  const rows = [...lineages.entries()].map(([lineageKey, { positions, order }]) => {
    const current = positions.findLast((position): position is Position => position !== null)!;
    const values = positions.map((position) => position?.valueJpy ?? null);
    const latestValue = positions[latestIndex]?.valueJpy ?? null;
    const previousValue = positions[latestIndex - 1]?.valueJpy ?? null;
    const change = latestPeriod && previousPeriod ? (latestValue ?? 0) - (previousValue ?? 0) : null;
    const status: PositionTrendStatus | null = !latestPeriod || !previousPeriod ? null
      : latestValue !== null && previousValue === null ? "new"
        : latestValue === null && previousValue !== null ? "ended" : null;
    const formerNames = [...new Set(positions.flatMap((position) => position && position.name !== current.name ? [position.name] : []))];
    return {
      row: {
        lineageKey,
        section: positionSection(current),
        caption: positionCaption(current),
        name: current.name,
        formerNames,
        detail: institutionOrPropertyAddress(current),
        values,
        change,
        status,
      } satisfies PositionTrendRow,
      sortKey: [sectionRank[positionSection(current)], categoryRank.get(current.category) ?? Number.MAX_SAFE_INTEGER, propertyRank(current), ...order],
    };
  });
  rows.sort((left, right) => {
    for (let index = 0; index < left.sortKey.length; index += 1) {
      const difference = left.sortKey[index] - right.sortKey[index];
      if (difference !== 0) return difference;
    }
    return 0;
  });
  return rows.map(({ row }) => row);
}

export type LineageHistoryEntry = {
  snapshot: Snapshot;
  /** その年度に明細が無ければ null（売却・解約した・その年度だけ登録していない） */
  position: Position | null;
  /** 1つ前の年度との差。どちらかの年度に明細が無いときは null */
  change: number | null;
};

/**
 * 1つの明細の、登録してある全年度の推移（古い順）。初めて出てくる年度から最新の年度まで並べ、
 * 途中で無くなった年度は position を null にして残す（「いつ無くなったか」を見せるため）。
 */
export function lineageHistory(snapshots: Snapshot[], lineageKey: string): LineageHistoryEntry[] {
  const ordered = [...snapshots].sort((a, b) => a.fiscalYear - b.fiscalYear || a.id - b.id);
  const found = ordered.map((snapshot) => snapshot.positions.find((position) => lineageKeyOf(position) === lineageKey) ?? null);
  const first = found.findIndex((position) => position !== null);
  if (first < 0) return [];
  return ordered.slice(first).map((snapshot, offset) => {
    const index = first + offset;
    const position = found[index];
    const previous = offset > 0 ? found[index - 1] : null;
    return { snapshot, position, change: position && previous ? position.valueJpy - previous.valueJpy : null };
  });
}
