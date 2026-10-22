import { normalizePersonSearchText } from "@/lib/person-search";

/** 検索付き選択欄（SearchableSelect）の候補1件。 */
export interface SearchableOption {
  value: string;
  label: string;
  /** ラベルの右に小さく出す補足（部署名など）。検索の対象にも入れる。 */
  hint?: string;
}

/** 候補のまとまり。見出し（部署名・会社名）ごとに分ける。`<optgroup>` と同じ役目。 */
export interface SearchableOptionGroup {
  label: string;
  options: SearchableOption[];
}

/**
 * 項目の配列から、見出し付きの候補を組み立てる。
 *
 * 見出しの並びは `groupOrder`（部署の sortOrder など）、無ければ見出し名の順。
 * 見出しの中は**常にラベル順**にする ── 呼び出し側が渡した並び（API の `orderBy` や登録順の
 * id 順）に引きずられず、どこから開いても同じ順で出るようにするため。
 *
 * ただし**これは読み順ではない**。漢字の並びは照合の都合で決まるので「山田」が「青木」より
 * 先に来る（実測）。読みで並べるには氏名のカナが要るが `Assignee` は持っていないので、
 * 人を見つける手段は並びではなく検索のほうに寄せている。
 */
export function buildSearchableOptionGroups<T>(
  items: T[],
  { group, groupOrder, option }: {
    group: (item: T) => string;
    groupOrder?: (item: T) => number;
    option: (item: T) => SearchableOption;
  },
): SearchableOptionGroup[] {
  const map = new Map<string, { order: number; options: SearchableOption[] }>();
  for (const item of items) {
    const label = group(item);
    const order = groupOrder?.(item) ?? Number.MAX_SAFE_INTEGER;
    if (!map.has(label)) map.set(label, { order, options: [] });
    map.get(label)!.options.push(option(item));
  }
  return [...map.entries()]
    .sort(([aLabel, a], [bLabel, b]) => a.order - b.order || aLabel.localeCompare(bLabel, "ja"))
    .map(([label, { options }]) => ({
      label,
      options: options.sort((a, b) => a.label.localeCompare(b.label, "ja")),
    }));
}

/**
 * 候補を検索語で絞り込む。空の語なら全件。
 *
 * 照合は人物検索と同じ正規化を通す（ひらがな→カタカナ・NFKC・空白と記号を落とす）ので、
 * 「山田太郎」と空白を詰めて打っても「山田 太郎」に当たり、補足がカナなら「やまだ」でも当たる。
 * 見出しも対象に入れてあり、部署名を打てばその部署がまるごと残る。
 */
export function filterSearchableOptionGroups(
  groups: SearchableOptionGroup[],
  query: string,
): SearchableOptionGroup[] {
  const needle = normalizePersonSearchText(query);
  if (!needle) return groups;
  const hits = (value: string | undefined) => normalizePersonSearchText(value ?? "").includes(needle);
  return groups
    .map((group) => ({
      label: group.label,
      options: hits(group.label) ? group.options : group.options.filter((option) => hits(option.label) || hits(option.hint)),
    }))
    .filter((group) => group.options.length > 0);
}

/** 候補を上から1本に並べる（↑↓の移動と Enter の確定はこの並びで数える）。 */
export function flattenSearchableOptions(groups: SearchableOptionGroup[]): SearchableOption[] {
  return groups.flatMap((group) => group.options);
}

/** いま選ばれている候補。候補に無い値なら null。 */
export function findSearchableOption(groups: SearchableOptionGroup[], value: string): SearchableOption | null {
  if (!value) return null;
  return flattenSearchableOptions(groups).find((option) => option.value === value) ?? null;
}
