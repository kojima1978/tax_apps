// ── CSV text parser ──────────────────────────────────

export function parseCSVText(text: string): string[][] {
  const cleaned = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let current = '';
  let inQuotes = false;
  let fields: string[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < cleaned.length && cleaned[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
      } else if (ch === '\n' || (ch === '\r' && cleaned[i + 1] === '\n')) {
        fields.push(current);
        current = '';
        if (fields.some((f) => f.trim() !== '')) {
          rows.push(fields);
        }
        fields = [];
        if (ch === '\r') i++;
      } else if (ch === '\r') {
        fields.push(current);
        current = '';
        if (fields.some((f) => f.trim() !== '')) {
          rows.push(fields);
        }
        fields = [];
      } else {
        current += ch;
      }
    }
  }

  if (current !== '' || fields.length > 0) {
    fields.push(current);
    if (fields.some((f) => f.trim() !== '')) {
      rows.push(fields);
    }
  }

  return rows;
}

// ── Helpers ──────────────────────────────────

/** Japanese era → Western year offset (令和=2018, 平成=1988, 昭和=1925, 大正=1911, 明治=1867) */
const ERA_OFFSETS: Record<string, number> = {
  'R': 2018, '令': 2018, '令和': 2018,
  'H': 1988, '平': 1988, '平成': 1988,
  'S': 1925, '昭': 1925, '昭和': 1925,
  'T': 1911, '大': 1911, '大正': 1911,
  'M': 1867, '明': 1867, '明治': 1867,
};

/** Normalize date string to YYYY-MM-DD (handles Excel's YYYY/M/D and Japanese era R4.1.21) */
export function normalizeDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const westernMatch = value.match(/^(\d{4})[/.](\d{1,2})[/.](\d{1,2})$/);
  if (westernMatch) {
    return `${westernMatch[1]}-${westernMatch[2].padStart(2, '0')}-${westernMatch[3].padStart(2, '0')}`;
  }
  const eraMatch = value.match(/^(R|H|S|T|M|令和?|平成?|昭和?|大正?|明治?)(\d{1,2})[./](\d{1,2})[./](\d{1,2})$/);
  if (eraMatch) {
    const offset = ERA_OFFSETS[eraMatch[1]];
    if (offset !== undefined) {
      const year = offset + parseInt(eraMatch[2], 10);
      return `${year}-${eraMatch[3].padStart(2, '0')}-${eraMatch[4].padStart(2, '0')}`;
    }
  }
  return value;
}

export function parseOptionalNumber(value: string, round = false): number | undefined {
  const trimmed = value.trim();
  if (trimmed === '') return undefined;
  const cleaned = trimmed.replace(/,/g, '');
  const n = Number(cleaned);
  if (isNaN(n)) return undefined;
  return round ? Math.round(n) : n;
}
