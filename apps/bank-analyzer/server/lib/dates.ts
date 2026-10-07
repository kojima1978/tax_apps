// 取込ファイルの日付欄を読む（Django 版 analyzer/lib/importer.py の
// _convert_japanese_date と pd.to_datetime の置き換え）。
//
// Django 版との違い（計画書 §3 で「直す」と決めたもの）:
//  - #3 行ごとに判定する。pandas は1行目の書式に他の行を合わせようとするため、
//    和暦と西暦の混在、`2021-04-03` と `2021/4/4` の混在でもファイルごと失敗していた
//  - #5 `04/03/2021`（月/日/年）は読まない。日本の通帳では出ない書式で、
//    pandas は黙って4月3日と読んでいた
// 読めない書式（`令和3年4月1日` など）は Django と同じく読めない（§3 の #10）。

// 元号（Django 版 constants.py の ERA_DATA）。開始日は表示側（和暦表記）で使う。
export const ERAS = [
  { start: '2019-05-01', name: '令和', abbr: 'R', firstYear: 2019 },
  { start: '1989-01-08', name: '平成', abbr: 'H', firstYear: 1989 },
  { start: '1926-12-25', name: '昭和', abbr: 'S', firstYear: 1926 },
  { start: '1912-07-30', name: '大正', abbr: 'T', firstYear: 1912 },
  { start: '1868-01-25', name: '明治', abbr: 'M', firstYear: 1868 },
] as const;

const ERA_FIRST_YEAR: Record<string, number> = Object.fromEntries(
  ERAS.map((e) => [e.abbr, e.firstYear]),
);

// `H28.6.3` / `R3/4/2` / `R03.04.01`。Django 版と同じく先頭一致で、後ろに何が続いても読む
// （re.match の挙動）。元号の範囲（R1.4.1 は平成）は Django 版でも確かめていない。
const WAREKI = /^([MTSHR])(\d+)[./](\d+)[./](\d+)/;

// `2021-04-03` / `2021/4/4` / `2021.4.5`。後ろに時刻が付いていてもよい（Excel から
// 文字列で書き出された日時）。年が4桁でないもの（`04/03/2021` など）は読まない。
const SEIREKI = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T]\d{1,2}:\d{2}(?::\d{2}(?:\.\d+)?)?)?$/;

// 実在する日なら 'YYYY-MM-DD'、しなければ null（2021-02-30、13月 など）。
export function toIsoDate(year: number, month: number, day: number): string | null {
  if (!Number.isInteger(year) || year < 1 || year > 9999) return null;
  const d = new Date(Date.UTC(2000, month - 1, day));
  d.setUTCFullYear(year);
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
    return null;
  }
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// 日付欄の1つの値を 'YYYY-MM-DD' にする。読めなければ null。
export function parseStatementDate(value: string): string | null {
  const text = value.trim();

  const w = WAREKI.exec(text);
  if (w) {
    const [, era, y, m, d] = w;
    return toIsoDate(ERA_FIRST_YEAR[era!]! + Number(y) - 1, Number(m), Number(d));
  }

  const s = SEIREKI.exec(text);
  if (s) {
    const [, y, m, d] = s;
    return toIsoDate(Number(y), Number(m), Number(d));
  }

  return null;
}
