/** 金額を3桁カンマ区切りでフォーマット */
export function formatYen(value: number): string {
  return value.toLocaleString('ja-JP');
}

/** 日付文字列をYYYY/MM/DD形式に変換 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
}

/** Excelシリアル値を日付文字列に変換 */
export function excelSerialToDate(serial: number): string {
  // Excel serial date: days since 1900-01-01 (with the 1900 leap year bug)
  const utcDays = Math.floor(serial) - 25569;
  const d = new Date(utcDays * 86400000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 日付文字列をYYYY-MM-DD形式に正規化 */
export function normalizeDate(value: string): string {
  if (!value) return '';
  const trimmed = value.trim();

  // Excelシリアル値判定
  const num = Number(trimmed);
  if (!isNaN(num) && num > 10000 && num < 100000) {
    return excelSerialToDate(num);
  }

  // 和暦パターン: H27.4.1, R3.4.1 等
  const warekiMatch = trimmed.match(
    /^([MTSHR])(\d{1,2})[./-](\d{1,2})[./-](\d{1,2})$/i
  );
  if (warekiMatch) {
    const eraMap: Record<string, number> = {
      M: 1868,
      T: 1912,
      S: 1926,
      H: 1989,
      R: 2019,
    };
    const era = warekiMatch[1]!.toUpperCase();
    const year = eraMap[era]! + Number(warekiMatch[2]) - 1;
    const month = String(warekiMatch[3]).padStart(2, '0');
    const day = String(warekiMatch[4]).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // YYYY/MM/DD or YYYY-MM-DD
  const dateMatch = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (dateMatch) {
    return `${dateMatch[1]}-${String(dateMatch[2]).padStart(2, '0')}-${String(dateMatch[3]).padStart(2, '0')}`;
  }

  return trimmed;
}

/** 一意IDを生成 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
