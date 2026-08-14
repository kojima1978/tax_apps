/**
 * 郵便番号から住所（都道府県＋市区町村＋町域）を引く。
 *
 * データは日本郵便の全国一括データ（utf_ken_all）を圧縮して同梱したもの（src/data/zipAddresses.json）。
 * 3MB近くあるので静的 import はせず、**郵便番号が7桁埋まって初めて**動的 import する。
 * `?raw` で文字列のまま読むのは、Vite に JSON をオブジェクトリテラルへ展開させると
 * チャンクが膨らみ、解析も遅くなるため。
 */

let loading: Promise<Map<string, string>> | undefined;

async function loadTable(): Promise<Map<string, string>> {
  const raw = (await import('../data/zipAddresses.json?raw')).default;
  const { c, z } = JSON.parse(raw) as { c: string[]; z: string };
  const table = new Map<string, string>();
  for (const line of z.split('\n')) {
    // 先頭7文字＝郵便番号、続きが「市区町村の番号」＋任意の「|町域」
    const [index = '', town = ''] = line.slice(7).split('|');
    table.set(line.slice(0, 7), (c[Number(index)] ?? '') + town);
  }
  return table;
}

/** 該当が無ければ空文字を返す。データの読み込みは初回だけ。 */
export async function lookupZipAddress(zip: string): Promise<string> {
  const digits = zip.replace(/\D/g, '');
  if (digits.length !== 7) return '';
  loading ??= loadTable();
  return (await loading).get(digits) ?? '';
}
