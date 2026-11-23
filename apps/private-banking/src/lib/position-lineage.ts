import { randomUUID } from "node:crypto";

/**
 * 明細の系統キー（Position.lineageKey）。年度をまたいで「同じ明細」を1つとして扱うための UUID。
 *
 * - 前年度コピーで年度を作ると、明細と一緒にキーも写る。同じ年度の中では重複しない（DB の一意制約）。
 * - 新しく登録した明細には DB が新しいキーを振る。名称や所在を後から直してもキーは変わらない。
 * - キーを持たない明細（列を足す前のデータ・旧いバックアップ）は、隣り合う年度で「確実に同じ」と
 *   言えるものだけを結ぶ。区分・科目・名称・金融機関・不動産の種類・所在の原文がすべて一致し、
 *   しかも両方の年度でその組が1件しかないとき。迷うもの（同じ名前が2件以上ある・名前を変えた）は
 *   結ばずに別のキーを振る。誤って結ぶより、結ばずに残すほうが後から直しやすい。
 *
 * 既存データへの適用は migration（20261123000000_position_lineage_key）の SQL が同じ規則で行う。
 */

export type LineagePosition = {
  lineageKey?: string | null;
  side: string;
  category: string;
  name: string;
  institution: string;
  assetDetails?: unknown;
};

export type LineageSnapshot<P extends LineagePosition = LineagePosition> = { fiscalYear: number; positions: P[] };

/** SQL の `assetDetails->>'key'` と同じく、文字列はそのまま・無ければ空文字にする。 */
function detailText(details: unknown, key: string) {
  if (!details || typeof details !== "object" || Array.isArray(details)) return "";
  const value = (details as Record<string, unknown>)[key];
  if (value === undefined || value === null) return "";
  return typeof value === "string" ? value : JSON.stringify(value);
}

/** 「同じ明細」とみなす項目の組。ここが一致し、年度の中で1件だけのものを結ぶ。 */
export function lineageMatchKey(position: LineagePosition) {
  return JSON.stringify([
    position.side,
    position.category,
    position.name,
    position.institution,
    detailText(position.assetDetails, "propertyType"),
    detailText(position.assetDetails, "propertyAddress"),
  ]);
}

function countBy<T>(items: T[], key: (item: T) => string) {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1);
  return counts;
}

/**
 * 顧客1人ぶんの年度（明細つき）に系統キーを決める。持っているキーはそのまま使い、
 * 無いもの・同じ年度で重複したものだけを補う。戻り値は snapshots[i].positions[j] と同じ並び。
 */
export function assignLineageKeys(snapshots: LineageSnapshot[], newKey: () => string = randomUUID): string[][] {
  const order = snapshots.map((snapshot, index) => ({ snapshot, index })).sort((a, b) => a.snapshot.fiscalYear - b.snapshot.fiscalYear);
  const result: string[][] = snapshots.map((snapshot) => new Array<string>(snapshot.positions.length));
  let previous: { counts: Map<string, number>; keyOf: Map<string, string> } | null = null;

  for (const { snapshot, index } of order) {
    const keys = result[index];
    const used = new Set<string>();
    const matchKeys = snapshot.positions.map(lineageMatchKey);
    const counts = countBy(matchKeys, (key) => key);
    // 持っているキーを先に押さえる（同じ年度で重複していれば2件目からは振り直す）
    snapshot.positions.forEach((position, positionIndex) => {
      if (position.lineageKey && !used.has(position.lineageKey)) {
        keys[positionIndex] = position.lineageKey;
        used.add(position.lineageKey);
      }
    });
    snapshot.positions.forEach((position, positionIndex) => {
      if (keys[positionIndex]) return;
      const matchKey = matchKeys[positionIndex];
      const inherited = position.lineageKey ? undefined
        : counts.get(matchKey) === 1 && previous?.counts.get(matchKey) === 1 ? previous.keyOf.get(matchKey) : undefined;
      let key = inherited && !used.has(inherited) ? inherited : newKey();
      while (used.has(key)) key = newKey();
      keys[positionIndex] = key;
      used.add(key);
    });
    const keyOf = new Map<string, string>();
    matchKeys.forEach((matchKey, positionIndex) => { if (counts.get(matchKey) === 1) keyOf.set(matchKey, keys[positionIndex]); });
    previous = { counts, keyOf };
  }
  return result;
}
