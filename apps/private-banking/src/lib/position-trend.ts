import { positionCaption } from "@/lib/position-display";
import {
  type Position,
  type PositionSection,
  type Snapshot,
  categoryRank,
  deemedBenefit,
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

export type CarriedOverPositions = {
  /** 比べた前の年度（その顧客の、この年度より前で最も新しい年度）。無ければ null */
  previous: Snapshot | null;
  /** 前の年度と金額が同じ明細の ID */
  ids: ReadonlySet<number>;
};

/**
 * 「前年のまま」の明細。翌期更新は前年度をコピーしてから直すので、直し忘れた明細は前年の金額のまま残る。
 * 前の年度に同じ系統キーの明細があり、金額（通貨と外貨建ての額。保険・退職金は給付額も）が同じものを返す。
 * 円換算額は比べない（為替だけ直した外貨預金も、残高は前年のままなので印を残す）。名称・所在など
 * 金額以外の違いは見ない（名称だけ直して金額を直し忘れたものを拾うため）。
 * 判定は保存された値だけで行い、DB に「確認済み」を持たない。前年と同じ金額が正しい明細（路線価が
 * 据え置きの土地など）にも印は出たままになる ── 印は事実（前年と同じ金額）を示すだけで、誤りを意味しない。
 */
export function carriedOverPositions(snapshots: Snapshot[], snapshot: Snapshot): CarriedOverPositions {
  const previous = snapshots
    .filter((candidate) => candidate.fiscalYear < snapshot.fiscalYear)
    .reduce<Snapshot | null>((latest, candidate) => latest === null || candidate.fiscalYear > latest.fiscalYear ? candidate : latest, null);
  const ids = new Set<number>();
  if (!previous) return { previous, ids };
  const previousByKey = new Map(previous.positions.filter((position) => position.lineageKey).map((position) => [position.lineageKey, position]));
  for (const position of snapshot.positions) {
    const before = position.lineageKey ? previousByKey.get(position.lineageKey) : undefined;
    if (before && before.currency === position.currency && before.originalAmount === position.originalAmount && deemedBenefit(before) === deemedBenefit(position)) ids.add(position.id);
  }
  return { previous, ids };
}
