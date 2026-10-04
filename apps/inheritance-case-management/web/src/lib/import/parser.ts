import { ERA_TEXT_PATTERN, convertWareki, eraCodeFromText, isRealIsoDate } from '@/lib/japanese-era';

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

/**
 * 日付の正規化の結果。
 *
 * 読めなかった値は生のまま返す（検証がそのまま弾く）。`reason` はそれを**なぜ**弾いたかで、
 * 取込の警告に出す ── 「平成40年1月1日」を黙って 2028-01-01 に直していた頃は、
 * 入れた本人にも見直す手がかりが無かった。
 */
export interface NormalizedDate {
  /** 読めたときだけ `YYYY-MM-DD`。読めなければ入力された値のまま。 */
  value: string;
  /** 日付として読めなかった理由。読めたとき・そもそも日付の形をしていない値（「不明」）は null。 */
  reason: string | null;
}

/** 西暦の `YYYY/M/D`・`YYYY.M.D`・`YYYY-MM-DD`（Excel が書き出す形） */
const WESTERN_DATE_RE = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/;

/** 和暦の `R4.1.21`・`令和4/1/21`。元号の書き方は JAPANESE_ERAS から作る */
const ERA_DATE_RE = new RegExp(String.raw`^(${ERA_TEXT_PATTERN})(\d{1,2})[-/.](\d{1,2})[-/.](\d{1,2})$`);

/**
 * 日付の文字列を `YYYY-MM-DD` に正規化する（Excel の `YYYY/M/D` と和暦の `R4.1.21` に対応）。
 *
 * 実在しない日付と元号の範囲外は正規化せず、理由を付けて生値のまま返す。以前は形だけを見ていたため
 * `R4.2.31` が `2022-02-31` になり（検証の正規表現も素通りする）、`H40.1.1` は元号を無視して
 * 2028-01-01 として取り込まれていた。
 */
export function normalizeDate(value: string): NormalizedDate {
  const western = WESTERN_DATE_RE.exec(value);
  if (western) {
    const iso = `${western[1]}-${western[2].padStart(2, '0')}-${western[3].padStart(2, '0')}`;
    return isRealIsoDate(iso)
      ? { value: iso, reason: null }
      : { value, reason: `${Number(western[2])}月${Number(western[3])}日はありません` };
  }

  const era = ERA_DATE_RE.exec(value);
  const code = era ? eraCodeFromText(era[1]) : undefined;
  if (era && code) {
    const result = convertWareki(code, Number(era[2]), Number(era[3]), Number(era[4]));
    return result.ok ? { value: result.value, reason: null } : { value, reason: result.reason };
  }

  // 日付の形をしていない値（「不明」「令和四年一月」）はそのまま通す ── 取込の検証で弾かれる
  return { value, reason: null };
}

export function parseOptionalNumber(value: string, round = false): number | undefined {
  const trimmed = value.trim();
  if (trimmed === '') return undefined;
  const cleaned = trimmed.replace(/,/g, '');
  const n = Number(cleaned);
  if (isNaN(n)) return undefined;
  return round ? Math.round(n) : n;
}

// ── File decoding ──────────────────────────────────

export interface DecodeResult {
  text: string;
  encoding: 'utf-8' | 'utf-8-bom' | 'shift-jis';
}

export async function decodeCSVFile(file: File): Promise<DecodeResult> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return { text: new TextDecoder('utf-8').decode(buffer), encoding: 'utf-8-bom' };
  }

  const utf8Text = new TextDecoder('utf-8', { fatal: true });
  try {
    return { text: utf8Text.decode(buffer), encoding: 'utf-8' };
  } catch {
    return { text: new TextDecoder('shift-jis').decode(buffer), encoding: 'shift-jis' };
  }
}
