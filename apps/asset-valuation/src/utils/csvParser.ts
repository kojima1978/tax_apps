/** CSV解析結果 */
export interface CsvData {
  headers: string[];
  rows: string[][];
}

/** エンコーディングを検出してテキストに変換 */
function decodeBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);

  // BOM check for UTF-8
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(buffer);
  }

  // Try UTF-8 first
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    return text;
  } catch {
    // Fall back to Shift_JIS (CP932)
    return new TextDecoder('shift_jis').decode(buffer);
  }
}

/** CSV文字列をパース */
function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(current.trim());
        current = '';
      } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
        row.push(current.trim());
        current = '';
        if (row.some((cell) => cell !== '')) {
          rows.push(row);
        }
        row = [];
        if (ch === '\r') i++;
      } else {
        current += ch;
      }
    }
  }

  // Last row
  if (current !== '' || row.length > 0) {
    row.push(current.trim());
    if (row.some((cell) => cell !== '')) {
      rows.push(row);
    }
  }

  return rows;
}

/** CSVファイルを解析 */
export async function parseCsvFile(file: File): Promise<CsvData> {
  const buffer = await file.arrayBuffer();
  const text = decodeBuffer(buffer);
  const allRows = parseCsvText(text);

  if (allRows.length === 0) {
    throw new Error('CSVファイルにデータがありません');
  }

  const headers = allRows[0]!;
  const rows = allRows.slice(1);

  if (rows.length === 0) {
    throw new Error('CSVファイルにデータ行がありません');
  }

  if (rows.length > 300) {
    throw new Error(`データ行が300件を超えています（${rows.length}件）`);
  }

  return { headers, rows };
}
