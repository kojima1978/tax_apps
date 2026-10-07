// 取込ファイル（CSV / xlsx）を「見出し + 行」の表にする。列名の解釈や値の変換はしない
// （それは loadStatement.ts）。Django 版の _detect_and_read_file に当たる。
//
// 文字コードの試し方は Django 版と同じ順: UTF-8（BOM 付き/無し）→ Shift_JIS（cp932）→
// 置換しながら Shift_JIS。どれも「見出しに 銀行名 / 日付 / 支店名 のどれかがあるか」で
// 当たりを判定し、1行目に無ければ2行目を見出しとして試す（表題行のあるファイル）。
//
// pandas と違って値はすべて文字列のまま持つ。口座番号 `0012345` の先頭の 0 が
// 消えていた（計画書 §3 の #1）のは、pandas が数字だけの列を数値に読んでいたため。

import XLSX from 'xlsx-js-style';
import { EncodingError, FormatError } from './errors.js';

// xlsx の数値セルだけ number で持つ（小数かどうかを後段で見分けるため）。
// 日付セルは 'YYYY-MM-DD' の文字列にして渡す。
export type Cell = string | number | null;

export type TableRow = {
  // ファイル上の行番号（1始まり、見出し・表題・空行も数える）。
  // Excel で開いたときの行番号と同じで、エラーの「行N」はこれを出す。
  line: number;
  cells: Cell[];
};

export type Table = {
  header: string[];
  rows: TableRow[];
};

const HEADER_KEYWORDS = ['銀行名', '日付', '支店名'] as const;

// Django 版が失敗のときに出していた試行の一覧。CSV ではすべて失敗したときにしか
// 出ないので、常にこの6つになる（Excel として読む試行は CSV では意味が無いので
// 実際には試さないが、一覧は Django 版とそろえる）。
const CSV_TRIED = ['utf-8-sig', 'utf-8', 'cp932', 'shift_jis', 'excel', 'cp932_replace'];

export function fileHeaderHex(bytes: Uint8Array): string {
  return Array.from(bytes.subarray(0, 8), (b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

export function readTable(bytes: Uint8Array): Table {
  const headHex = fileHeaderHex(bytes);

  if (headHex.startsWith('D0CF11E0')) {
    // 計画書 §4: `.xls` には対応しない（Django 版も xlrd を入れておらず読めなかった）。
    throw new FormatError('Excel 97-2003 形式（.xls）のファイルには対応していません。', {
      suggestion: 'Excel で開き、「名前を付けて保存」で「Excel ブック（.xlsx）」か「CSV UTF-8」形式を選んで保存し直してください。',
    });
  }
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    // 'PK'（zip）。xlsx として読む。
    try {
      return readXlsx(bytes);
    } catch (e) {
      if (e instanceof FormatError) throw e;
      throw new EncodingError('ファイルの読み込みに失敗しました。', ['excel_binary_forced'], headHex);
    }
  }

  const strategies: (() => string | null)[] = [
    () => decode(bytes, 'utf-8', true),
    () => decode(bytes, 'shift_jis', true),
    () => decode(bytes, 'shift_jis', false),
  ];
  for (const strategy of strategies) {
    const text = strategy();
    if (text === null) continue;
    const table = tableFromRecords(parseCsv(text));
    if (table !== null) return table;
  }
  throw new EncodingError('ファイルの読み込みに失敗しました。', CSV_TRIED, headHex);
}

// fatal なら読めない並びで null。BOM は TextDecoder が落とす（utf-8-sig と同じ）。
function decode(bytes: Uint8Array, encoding: string, fatal: boolean): string | null {
  try {
    return new TextDecoder(encoding, { fatal }).decode(bytes);
  } catch {
    return null;
  }
}

function hasHeaderKeyword(cells: string[]): boolean {
  return cells.some((c) => HEADER_KEYWORDS.some((kw) => c.includes(kw)));
}

type CsvRecord = { line: number; fields: string[] };

// 見出しを決めて表にする。当たらなければ null（次の文字コードを試す）。
function tableFromRecords(records: CsvRecord[]): Table | null {
  // pandas と同じく、何も書かれていない行（区切りも無い行）は見出しの候補から外す。
  const nonEmpty = records.filter((r) => !(r.fields.length === 1 && r.fields[0] === ''));
  for (const candidate of nonEmpty.slice(0, 2)) {
    if (!hasHeaderKeyword(candidate.fields)) continue;
    const header = candidate.fields.map((h, i) => headerName(h, i));
    const rows: TableRow[] = [];
    for (const r of records) {
      if (r.line <= candidate.line) continue;
      // 見出しより列が多い行。末尾が空欄だけ（行末のカンマ）なら捨てて読む。
      // 値が入っていると列がずれている恐れがあるので止める（pandas は1行目なら
      // 先頭の列を索引に回して列をずらし、2行目以降ならファイルごと失敗していた）。
      if (r.fields.length > header.length && r.fields.slice(header.length).some((f) => f.trim() !== '')) {
        throw new FormatError('見出しより列の多い行があります。', {
          lineNumber: r.line,
          suggestion: `行${r.line} の列の数が見出し（${header.length}列）と合いません。摘要などにカンマが含まれていないか、引用符（"）で囲まれているかを確認してください。`,
        });
      }
      rows.push({ line: r.line, cells: header.map((_, i) => r.fields[i] ?? null) });
    }
    return { header, rows };
  }
  return null;
}

// 空の見出しは pandas と同じ名前にする（エラーの「検出されたカラム」に出る）。
function headerName(raw: string | number | null, index: number): string {
  const text = raw === null ? '' : String(raw).trim();
  return text === '' ? `Unnamed: ${index}` : text;
}

// RFC 4180 の CSV。区切りはカンマ、改行は LF / CRLF / CR、引用符の中の改行・"" を扱う。
// 行番号はレコードの通し番号（引用符の中の改行は数えない）。Excel で開いたときの行番号と同じ。
export function parseCsv(text: string): CsvRecord[] {
  const records: CsvRecord[] = [];
  let fields: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  const endRecord = () => {
    fields.push(field);
    records.push({ line: records.length + 1, fields });
    fields = [];
    field = '';
  };

  while (i < text.length) {
    const ch = text[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
      } else {
        field += ch;
      }
      i++;
      continue;
    }
    if (ch === '"' && field === '') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(field);
      field = '';
    } else if (ch === '\r' || ch === '\n') {
      endRecord();
      if (ch === '\r' && text[i + 1] === '\n') i++;
    } else {
      field += ch;
    }
    i++;
  }
  // 最後の行に改行が無い場合。ファイル末尾の改行だけなら空のレコードは作らない。
  if (field !== '' || fields.length > 0) endRecord();
  return records;
}

function readXlsx(bytes: Uint8Array): Table {
  const wb = XLSX.read(bytes, { type: 'array', cellDates: false, cellNF: true, dense: false });
  const sheetName = wb.SheetNames[0];
  const ws = sheetName === undefined ? undefined : wb.Sheets[sheetName];
  if (!ws || !ws['!ref']) {
    throw new FormatError('Excel ファイルにシートがありません。', {
      suggestion: '1枚目のシートに、見出し行と取引の行がある形で保存してください。',
    });
  }
  const date1904 = Boolean(wb.Workbook?.WBProps?.date1904);
  const range = XLSX.utils.decode_range(ws['!ref']);

  const readRow = (r: number): Cell[] => {
    const cells: Cell[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      cells.push(xlsxCell(ws[XLSX.utils.encode_cell({ r, c })], date1904));
    }
    return cells;
  };

  // pandas.read_excel と同じく1行目を見出しにする（CSV のような見出し探しはしない）。
  const header = readRow(range.s.r).map((h, i) => headerName(h, i));
  const rows: TableRow[] = [];
  for (let r = range.s.r + 1; r <= range.e.r; r++) {
    rows.push({ line: r + 1, cells: readRow(r) });
  }
  return { header, rows };
}

type XlsxCell = { t: string; v?: unknown; z?: string | number; w?: string };

function xlsxCell(cell: XlsxCell | undefined, date1904: boolean): Cell {
  if (!cell || cell.v === undefined || cell.v === null) return null;
  if (cell.t === 'n' && typeof cell.v === 'number') {
    // 日付セルはシリアル値で入っている。表示形式が日付なら年月日へ。
    // Date を経由しないのは、タイムゾーンで日がずれる経路を作らないため。
    if (cell.z !== undefined && XLSX.SSF.is_date(String(cell.z))) {
      const p = XLSX.SSF.parse_date_code(cell.v, { date1904 });
      return `${String(p.y).padStart(4, '0')}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
    }
    return cell.v;
  }
  if (cell.t === 'b') return cell.v ? 'TRUE' : 'FALSE';
  if (cell.t === 'e') return cell.w ?? '#ERROR';
  return String(cell.v);
}
