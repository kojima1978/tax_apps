/**
 * 郵便番号から住所（都道府県＋市区町村＋町域）を引き、保存する1本の住所と
 * 画面の2欄（自動で入る部分／番地・建物名）を行き来させる。
 *
 * データは日本郵便の全国一括データ（utf_ken_all）を圧縮したもので、相続税の申告書
 * （apps/inheritance-tax-form/src/data/zipAddresses.json）と同じファイルの写し。
 * 外部の検索サービス（zipcloud など）は使わない ── 社員の自宅の郵便番号を外へ出さないため。
 * 1つの郵便番号には町域が1つだけ入っている（複数の町域にまたがる番号は代表の1つ）。
 * 3MB近くあるので静的 import はせず、郵便番号が7桁そろって初めて動的 import する。
 */

let loading: Promise<Map<string, string>> | undefined;

async function loadTable(): Promise<Map<string, string>> {
  const raw = (await import('./data/zipAddresses.json?raw')).default;
  const { c, z } = JSON.parse(raw) as { c: string[]; z: string };
  const table = new Map<string, string>();
  for (const line of z.split('\n')) {
    // 先頭7文字＝郵便番号、続きが「市区町村の番号」＋任意の「|町域」
    const [index = '', town = ''] = line.slice(7).split('|');
    table.set(line.slice(0, 7), (c[Number(index)] ?? '') + town);
  }
  return table;
}

/** 郵便番号の数字だけ。全角・ハイフン・〒 は落とす */
export function zipDigits(zip: string): string {
  return zip.normalize('NFKC').replace(/\D/g, '');
}

/** 該当が無ければ空文字。7桁でなければデータを読まずに空文字 */
export async function lookupZipAddress(zip: string): Promise<string> {
  const digits = zipDigits(zip);
  if (digits.length !== 7) return '';
  loading ??= loadTable();
  return (await loading).get(digits) ?? '';
}

export type AddressParts = { area: string; rest: string };

/**
 * 保存されている住所を2欄に分ける。先頭が郵便番号から引いた住所と一致すれば
 * そこまでを上の欄へ、残りを番地・建物名へ。一致しなければ（手で書いた住所・
 * 郵便番号が未入力など）全部を上の欄に置く ── 番地の欄に住所が丸ごと入ると読みにくいため。
 */
export function splitAddress(address: string, base: string): AddressParts {
  if (base !== '' && address.startsWith(base)) {
    return { area: base, rest: address.slice(base.length).trim() };
  }
  return { area: address, rest: '' };
}

/** 2欄を1本へ。間に空白は入れない（「千代田区千代田1-1」の形）。番地の前後の空白は落とす */
export function joinAddress({ area, rest }: AddressParts): string {
  return `${area.trim()}${rest.trim()}`;
}
