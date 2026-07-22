export type ClientSummary = {
  id: number;
  clientCode: string;
  name: string;
  nameKana: string;
  assignedStaff: string;
  latestFiscalYear: number | null;
};

/** 顧客の検索対象になる項目。表示側のハイライトもこの順で扱う。 */
export const CLIENT_SEARCH_FIELDS = ["name", "nameKana", "clientCode", "assignedStaff"] as const;

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

export function matchesClient(client: ClientSummary, terms: string[]) {
  if (terms.length === 0) return true;
  const fields = CLIENT_SEARCH_FIELDS.map((field) => normalizeSearchText(client[field]));
  // 検索語はすべて（AND）、いずれかの項目に含まれていればヒットとみなす。
  return terms.every((term) => fields.some((field) => field.includes(term)));
}

export function filterClients(clients: ClientSummary[], terms: string[]) {
  return terms.length === 0 ? clients : clients.filter((client) => matchesClient(client, terms));
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
