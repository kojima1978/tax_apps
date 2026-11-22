/**
 * 市区町村の照合と、所在・地番の原文からの分解。
 *
 * 表 data/municipalities.json は 都道府県 → { 団体コード上5桁: 市区町村名 }。
 * 出所は日本郵便の郵便番号データ（utf_ken_all.zip、2026-11 時点）の
 * 「全国地方公共団体コード・都道府県名・市区町村名」の重複を除いたもの（1892件）。
 * 政令市は区ごとに載り、市そのもの（例: 札幌市）は載らない。町村は郡名から書く（例: 余市郡余市町）。
 * 作り直し方は SPEC.md「土地・建物の所在」。合併で名前が変わったときは表を入れ替える
 * （保存済みのコードは保存し直すまで古いまま ── 原文と名前は残るので照合し直せる）。
 */
import municipalityTable from "@/lib/data/municipalities.json";
import {
  hasStoredPropertyLocation, normalizeAza, normalizeLocationText, normalizeLotNumber,
  storedPropertyLocation, type PropertyLocation,
} from "@/lib/property-location";

export type Municipality = {
  code: string;
  prefecture: string;
  /** 都道府県を除いた名前（例: 港区、札幌市中央区、余市郡余市町） */
  city: string;
  /** 都道府県から書いた名前（例: 東京都港区）。保存する名前はこれ */
  name: string;
};

const table = municipalityTable as Record<string, Record<string, string>>;

export const municipalities: Municipality[] = Object.entries(table).flatMap(([prefecture, cities]) =>
  Object.entries(cities).map(([code, city]) => ({ code, prefecture, city, name: `${prefecture}${city}` })));

const prefectures = Object.keys(table);

/** 照合用のキー。空白を除き、全角英数を半角へ、「ヶ」「ケ」の揺れを「ケ」へ寄せる（表は「鎌ケ谷市」の形）。 */
const matchKey = (value: string) => value.normalize("NFKC").replace(/\s+/g, "").replace(/[ヶヵ]/g, "ケ");

/** 町村の名前から郡名を外したもの（余市郡余市町 → 余市町）。郡の無い名前は null。 */
const withoutCounty = (city: string) => {
  const match = /^.+?郡(.+[町村])$/.exec(city);
  return match ? match[1] : null;
};

/** 都道府県を除いた名前の呼び方（郡を付けたもの・外したもの）→ 該当する市区町村。 */
const byCityAlias = new Map<string, Municipality[]>();
for (const municipality of municipalities) {
  for (const alias of [municipality.city, withoutCounty(municipality.city)]) {
    if (!alias) continue;
    const key = matchKey(alias);
    byCityAlias.set(key, [...(byCityAlias.get(key) ?? []), municipality]);
  }
}
/** 前方一致で探すときの、長い順の呼び方。 */
const cityAliasesLongestFirst = [...byCityAlias.keys()].sort((a, b) => b.length - a.length);

const splitPrefecture = (key: string) => {
  const prefecture = prefectures.find((name) => key.startsWith(name));
  return prefecture ? { prefecture, rest: key.slice(prefecture.length) } : { prefecture: null, rest: key };
};

const candidatesFor = (alias: string, prefecture: string | null) =>
  (byCityAlias.get(alias) ?? []).filter((municipality) => prefecture === null || municipality.prefecture === prefecture);

/**
 * 市区町村名に当たる表の候補。都道府県から書いた名前・都道府県を除いた名前・郡名を外した町村名の
 * どれでも引ける。同じ名前が複数の都道府県にあれば（府中市など）全部返す。
 */
export function findMunicipalityCandidates(name: string): Municipality[] {
  const key = matchKey(name);
  if (!key) return [];
  const { prefecture, rest } = splitPrefecture(key);
  return rest ? candidatesFor(rest, prefecture) : [];
}

/** 市区町村名から表の1件を探す。見つからない・1つに絞れないときは null。 */
export function findMunicipality(name: string): Municipality | null {
  const candidates = findMunicipalityCandidates(name);
  return candidates.length === 1 ? candidates[0] : null;
}

export type ParsedPropertyLocation = { location: PropertyLocation; problems: string[] };

const emptyLocation = (source: string): PropertyLocation => ({
  municipalityCode: "", municipalityName: "", townName: "", aza: "", lotNumber: "", houseNumber: "", source,
});

/**
 * 町名と字を分ける。「字」は地名の一部にも出る（十文字町など）ので、分けるのは
 * 先頭が「字」・「大字…」の後ろの「字」・「町」「村」の直後の「字」だけ。
 */
function splitAza(town: string) {
  if (town.startsWith("字")) return { townName: "", aza: town.slice(1) };
  for (let index = 1; index < town.length - 1; index += 1) {
    if (town[index] !== "字" || town[index - 1] === "大") continue;
    if (town.startsWith("大字") || /[町村]/.test(town[index - 1])) {
      return { townName: town.slice(0, index), aza: town.slice(index + 1) };
    }
  }
  return { townName: town, aza: "" };
}

/**
 * 所在・地番の原文を、市区町村・大字町名・字・地番の案に分ける。分け切れなかった点は problems に出す。
 * 画面では保存前に人が原文と見比べる前提の「案」── 迷う形（住居表示・市区町村が絞れない）は分けずに空で返す。
 */
export function parsePropertyLocation(source: string): ParsedPropertyLocation {
  const original = source.trim();
  const location = emptyLocation(original);
  const problems: string[] = [];
  if (!original) return { location, problems };

  const normalized = normalizeLocationText(original);
  const [head, ...restParts] = normalized.split(/\s+/);
  if (restParts.length > 0) problems.push(`後ろの「${restParts.join(" ")}」は分けていません。`);

  const key = matchKey(head);
  const { prefecture, rest } = splitPrefecture(key);
  const alias = cityAliasesLongestFirst.find((candidate) => rest.startsWith(candidate) && candidatesFor(candidate, prefecture).length > 0);
  const candidates = alias ? candidatesFor(alias, prefecture) : [];
  if (candidates.length !== 1) {
    problems.unshift(candidates.length > 1
      ? "同じ名前の市区町村が複数あります。都道府県から入力してください。"
      : "市区町村を照合できませんでした。");
    return { location, problems };
  }
  const municipality = candidates[0];
  location.municipalityCode = municipality.code;
  location.municipalityName = municipality.name;

  // 町名以降は元の表記のまま切り出す（照合キーは「ヶ」を「ケ」へ寄せているので使わない。長さは同じ）
  const remainder = head.slice((prefecture?.length ?? 0) + alias!.length);
  if (/\d+-\d+-\d+$/.test(remainder) || /号$/.test(remainder)) {
    problems.push("住居表示（○番○号・1-2-3 の形）のようです。地番は登記事項証明書などで確かめて入力してください。");
    location.townName = splitAza(remainder.replace(/\d.*$/, "")).townName;
    return { location, problems };
  }
  const lot = /^(.*?)(\d+(?:(?:-|番地の|番地|番の|番|の)\d+)?(?:番地|番)?)$/.exec(remainder);
  if (!lot) {
    problems.push("地番を見つけられませんでした。");
    Object.assign(location, splitAza(remainder));
    return { location, problems };
  }
  Object.assign(location, splitAza(lot[1]));
  location.lotNumber = normalizeLotNumber(lot[2]);
  return { location, problems };
}

/**
 * 入力画面に出す所在。構造を保存していればそれを、無ければ原文から分けた案を返す
 * （inferred: true。保存するまでデータは変わらない）。
 */
export function propertyLocationOf(details: Parameters<typeof storedPropertyLocation>[0]): ParsedPropertyLocation & { inferred: boolean } {
  const stored = storedPropertyLocation(details);
  if (hasStoredPropertyLocation(details) || !stored.source) return { location: stored, problems: [], inferred: false };
  return { ...parsePropertyLocation(stored.source), inferred: true };
}

/**
 * 保存前に所在の欄を揃える（API の検証から呼ぶ）。市区町村コードは名前から付け直し、
 * 名前は表の書き方（都道府県から）へ寄せる。表に無い名前は入力のまま残しコードを外す。
 */
export function normalizePropertyLocationFields<T extends Record<string, unknown>>(details: T): T {
  const result: Record<string, unknown> = { ...details };
  delete result.municipalityCode;
  const name = typeof details.municipalityName === "string" ? details.municipalityName.trim() : "";
  if (name) {
    const municipality = findMunicipality(name);
    result.municipalityName = municipality?.name ?? name;
    if (municipality) result.municipalityCode = municipality.code;
  }
  for (const field of ["lotNumber", "houseNumber"] as const) {
    if (typeof details[field] === "string") result[field] = normalizeLotNumber(details[field]);
  }
  if (typeof details.aza === "string") result.aza = normalizeAza(details.aza);
  for (const field of ["townName", "aza", "lotNumber", "houseNumber", "municipalityName"] as const) {
    if (result[field] === "") delete result[field];
  }
  return result as T;
}
