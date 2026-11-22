/**
 * 不動産の所在（市区町村・大字・町名・字・地番・家屋番号）と、その原文。
 *
 * 保存先は Position.assetDetails（JSON）── 列を足さずにキーを足すだけで、
 * 古い明細・古いバックアップはそのまま読める（構造の無い明細は原文 propertyAddress だけを持つ）。
 * ここは市区町村の表を読まない部品だけを置く（一覧・印刷など表の要らない画面へ 60KB を運ばない）。
 * 表を使う照合・原文からの分解は municipality.ts。
 */

/** 所在を構造で持つキー。原文（propertyAddress）とは別に、どれか1つでもあれば「構造あり」とみなす。 */
export const propertyLocationKeys = ["municipalityName", "townName", "aza", "lotNumber", "houseNumber"] as const;

export type PropertyLocation = {
  /** 全国地方公共団体コードの上5桁（検査数字なし）。市区町村名から自動で付ける。表に無い名前なら空 */
  municipalityCode: string;
  /** 都道府県から書いた市区町村名（例: 東京都港区）。表に無い名前は入力のまま */
  municipalityName: string;
  /** 大字・町名。元資料の表記のまま（「大字」「丁目」も含めて） */
  townName: string;
  /** 字。先頭の「字」は付けずに持つ。記載が無ければ空 */
  aza: string;
  /** 地番（例: 123番4）。数字だけ・ハイフンは保存時に「番」へ揃える */
  lotNumber: string;
  /** 家屋番号。建物だけ */
  houseNumber: string;
  /** 所在・地番の原文。照合できなかったときに元の表記を確かめるために残す */
  source: string;
};

type LocationDetails = Partial<Record<(typeof propertyLocationKeys)[number] | "municipalityCode" | "propertyAddress", unknown>>;

const text = (value: unknown) => typeof value === "string" ? value.trim() : "";

/** 構造の欄を1つでも保存しているか。保存していない古い明細は原文だけを使う。 */
export const hasStoredPropertyLocation = (details: LocationDetails | null | undefined) =>
  propertyLocationKeys.some((key) => text(details?.[key]) !== "");

/** 保存されている所在（構造の欄が空でも原文は返す）。 */
export function storedPropertyLocation(details: LocationDetails | null | undefined): PropertyLocation {
  return {
    municipalityCode: text(details?.municipalityCode),
    municipalityName: text(details?.municipalityName),
    townName: text(details?.townName),
    aza: text(details?.aza),
    lotNumber: text(details?.lotNumber),
    houseNumber: text(details?.houseNumber),
    source: text(details?.propertyAddress),
  };
}

/** 全角の英数字・記号を半角へ。ハイフンに見える文字（長音・ダッシュ類）は数字の間だけ「-」へ。 */
export function normalizeLocationText(value: string) {
  return value.normalize("NFKC")
    .replace(/(?<=\d)\s*[ー‐−–—―ｰ-]\s*(?=\d)/g, "-")
    .trim();
}

/**
 * 地番・家屋番号の表記を揃える。「123-4」「123番地4」「123の4」は「123番4」、数字だけは「123番」。
 * それ以外（「123番4外」など）は数字を半角にするだけで残す。
 */
export function normalizeLotNumber(value: string) {
  const normalized = normalizeLocationText(value);
  const branch = /^(\d+)(?:-|番地の|番地|番の|番|の)(\d+)$/.exec(normalized);
  if (branch) return `${branch[1]}番${branch[2]}`;
  const single = /^(\d+)(?:番地|番)?$/.exec(normalized);
  if (single) return `${single[1]}番`;
  return normalized;
}

/** 字は先頭の「字」を付けずに持つ（表示で付け直す）。「大字」は字ではないので外さない。 */
export const normalizeAza = (value: string) => value.trim().replace(/^字(?=.)/, "");

/** 構造から組んだ所在の文。市区町村と地番がそろっていないときは null（原文を使わせる）。 */
export function composedPropertyLocation(location: PropertyLocation) {
  if (!location.municipalityName || !location.lotNumber) return null;
  const aza = location.aza ? `字${location.aza}` : "";
  const house = location.houseNumber ? `　家屋番号 ${location.houseNumber}` : "";
  return `${location.municipalityName}${location.townName}${aza}${location.lotNumber}${house}`;
}

/**
 * 一覧・明細・印刷に出す所在。市区町村と地番を保存していればそこから組み、
 * そうでなければ原文（古い明細・住居表示しか分からない明細）。
 */
export function propertyLocationText(details: LocationDetails | null | undefined) {
  const location = storedPropertyLocation(details);
  return composedPropertyLocation(location) ?? location.source;
}
