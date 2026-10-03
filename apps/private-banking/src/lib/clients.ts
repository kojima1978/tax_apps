export type ClientSummary = {
  id: number;
  clientCode: string;
  name: string;
  nameKana: string;
  assignedStaff: string;
  relatedCompany: string;
  latestFiscalYear: number | null;
};

/** 顧客の検索対象になる項目。表示側のハイライトもこの順で扱う。 */
export const CLIENT_SEARCH_FIELDS = ["name", "nameKana", "clientCode", "assignedStaff", "relatedCompany"] as const;

const KATAKANA_OFFSET = 0x60;

/**
 * 検索用に正規化する。全角/半角・大文字小文字・ひらがな/カタカナ・空白の違いを吸収する。
 * 半角カナの濁点（ﾀ+ﾞ）は1文字ずつでは合成できないため、必ず文字列全体で NFKC をかける。
 */
export function normalizeSearchText(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("ja-JP")
    .replace(/[ぁ-ゖ]/g, (kana) => String.fromCharCode(kana.charCodeAt(0) + KATAKANA_OFFSET))
    // 空白は無視する（「山田 太郎」を「山田太郎」でも探せるように）。
    .replace(/\s/g, "");
}

/**
 * 正規化後の文字列と、その各文字が元の文字列のどこ由来かの対応表を返す。
 * ハイライト位置を元の表示文字列に戻すために使う。
 * 濁点の合成で文字数が変わるため、先頭からの部分文字列を都度正規化して対応を取る。
 */
function normalizeWithSourceIndex(value: string) {
  const sourceIndex: number[] = [];
  let normalized = "";
  let index = 0;
  for (const char of value) {
    const nextNormalized = normalizeSearchText(value.slice(0, index + char.length));
    for (let offset = normalized.length; offset < nextNormalized.length; offset += 1) sourceIndex.push(index);
    normalized = nextNormalized;
    index += char.length;
  }
  // 合成で文字数が減った場合に備え、対応表を正規化後の長さへ揃える。
  sourceIndex.length = normalized.length;
  sourceIndex.push(value.length);
  return { normalized, sourceIndex };
}

/** 入力文字列を空白区切りの検索語（正規化済み）に分解する。 */
export function searchTerms(query: string) {
  return query.split(/\s+/).map(normalizeSearchText).filter((term) => term.length > 0);
}

/**
 * 正規化した項目のどれかに検索語がすべて含まれるか。
 * 検索語はすべて（AND）、いずれかの項目に含まれていればヒットとみなす。
 * 顧客一覧と不動産一覧で同じ当たり方にするため、判定はここだけに置く。
 */
export function matchesSearchTerms(values: string[], terms: string[]) {
  if (terms.length === 0) return true;
  const fields = values.map(normalizeSearchText);
  return terms.every((term) => fields.some((field) => field.includes(term)));
}

export function matchesClient(client: ClientSummary, terms: string[]) {
  return matchesSearchTerms(CLIENT_SEARCH_FIELDS.map((field) => client[field]), terms);
}

export function filterClients(clients: ClientSummary[], terms: string[]) {
  return terms.length === 0 ? clients : clients.filter((client) => matchesClient(client, terms));
}

/** 顧客一覧の並び替え。選択肢と並べ方をここだけに置く（表示側は value を渡すだけ）。 */
export const CLIENT_SORT_MODES = [
  { value: "kana", label: "カナ順" },
  { value: "code", label: "コード順" },
  { value: "year-desc", label: "年度の新しい順" },
  { value: "newest", label: "登録の新しい順" },
] as const;

export type ClientSortMode = typeof CLIENT_SORT_MODES[number]["value"];

/**
 * 既定はカナ順。DB の `name` 昇順（＝漢字のコードポイント順）は人間には無意味な並びで、
 * 一覧を開いた人がどこを探せばよいか分からなくなるため、既定で並べ直す。
 */
export const CLIENT_SORT_DEFAULT: ClientSortMode = "kana";

/**
 * 比較器は1つだけ作る（行数×比較回数で呼ばれるため、比較のたびに new しない）。
 * `numeric` は顧客コードのため。桁が揃っていなくても数値として並ぶので
 * （"0003" → "005" → "0006"）、コードを数字だけに置き換えた後もそのまま効く。
 */
const collator = new Intl.Collator("ja", { numeric: true });

/**
 * カナ順の並べ替えキー。ひらがな・半角カナ・全角半角の違いは検索と同じ規則で吸収する。
 * カナは任意入力なので、空のときは漢字名で代替する（カナ順の中に混ぜる以上これしかない）。
 */
const kanaSortKey = (client: ClientSummary) => normalizeSearchText(client.nameKana || client.name);

/** 年度なしは必ず末尾へ。null 同士を引き算すると NaN になり比較が壊れるので、数値へ寄せる。 */
const fiscalYearRank = (client: ClientSummary) => client.latestFiscalYear ?? 0;

function compareClients(left: ClientSummary, right: ClientSummary, mode: ClientSortMode) {
  if (mode === "code") return collator.compare(left.clientCode, right.clientCode);
  if (mode === "year-desc") return fiscalYearRank(right) - fiscalYearRank(left);
  if (mode === "newest") return right.id - left.id;
  return collator.compare(kanaSortKey(left), kanaSortKey(right));
}

/**
 * 一覧の並び替え。どのモードでも最後は id の昇順で決着させる ──
 * 同じ値で順序がぶれると、ページ送りしたときに行が重複したり抜け落ちたりする。
 */
export function sortClients(clients: ClientSummary[], mode: ClientSortMode) {
  return [...clients].sort((left, right) => compareClients(left, right, mode) || left.id - right.id);
}

/** 表示文字列のうち検索語に一致する範囲を、元の文字位置で返す（重なりは連結する）。 */
export function highlightRanges(text: string, terms: string[]) {
  if (!text || terms.length === 0) return [] as Array<[number, number]>;
  const { normalized, sourceIndex } = normalizeWithSourceIndex(text);
  const ranges: Array<[number, number]> = [];
  for (const term of terms) {
    let from = normalized.indexOf(term);
    while (from !== -1) {
      ranges.push([sourceIndex[from], sourceIndex[from + term.length]]);
      from = normalized.indexOf(term, from + 1);
    }
  }
  ranges.sort((left, right) => left[0] - right[0]);
  return ranges.reduce<Array<[number, number]>>((merged, range) => {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else merged.push([...range]);
    return merged;
  }, []);
}
