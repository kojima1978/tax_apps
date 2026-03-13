import { createCaseSchema } from '@/types/validation';
import type { CreateCaseInput } from '@/types/validation';
import type { CaseStatus, AcceptanceStatus, Assignee, Referrer } from '@/types/shared';

// 既存CSV出力(export-csv.ts)の日本語ヘッダー → フィールド名マッピング
const CSV_HEADER_MAP: Record<string, string> = {
  '被相続人氏名': 'deceasedName',
  '死亡日': 'dateOfDeath',
  '年度': 'fiscalYear',
  'ステータス': 'status',
  '受託状況': 'acceptanceStatus',
  '担当者': 'assigneeName',
  '紹介者': 'referrerName',
  '財産評価額': 'propertyValue',
  '相続税額': 'taxAmount',
  '見積額': 'estimateAmount',
  '報酬額': 'feeAmount',
  '紹介料率(%)': 'referralFeeRate',
  '紹介料': 'referralFeeAmount',
};

// 無視するカラム（取り込み時に不要）
const IGNORED_HEADERS = new Set(['ID', '作成日', '更新日']);

const VALID_STATUSES: CaseStatus[] = ['未着手', '進行中', '完了', '請求済'];
const VALID_ACCEPTANCE: AcceptanceStatus[] = ['受託可', '受託不可', '未判定', '保留'];

export interface ImportError {
  row: number;
  message: string;
}

export interface ImportParseResult {
  validRows: CreateCaseInput[];
  errors: ImportError[];
  totalRows: number;
}

/**
 * CSV文字列をパースして2次元配列に変換
 * BOM除去、ダブルクォート対応
 */
export function parseCSVText(text: string): string[][] {
  // BOM除去
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
          // エスケープされたダブルクォート
          current += '"';
          i++;
        } else {
          // クォート終了
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
        if (ch === '\r') i++; // skip \n after \r
      } else if (ch === '\r') {
        // \r without \n
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

  // 最終行（改行なし終端）
  if (current !== '' || fields.length > 0) {
    fields.push(current);
    if (fields.some((f) => f.trim() !== '')) {
      rows.push(fields);
    }
  }

  return rows;
}

/**
 * ヘッダー行を解析し、カラムインデックス → フィールド名マッピングを返す
 */
function buildColumnMap(headers: string[]): Map<number, string> {
  const map = new Map<number, string>();
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].trim();
    if (IGNORED_HEADERS.has(h)) continue;
    const field = CSV_HEADER_MAP[h];
    if (field) {
      map.set(i, field);
    }
  }
  return map;
}

/**
 * 数値文字列をパース（空文字・非数値は undefined を返す）
 */
function parseOptionalInt(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === '') return undefined;
  const n = Number(trimmed);
  if (isNaN(n)) return undefined;
  return Math.round(n);
}

function parseOptionalFloat(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === '') return undefined;
  const n = Number(trimmed);
  if (isNaN(n)) return undefined;
  return n;
}

/** Name→ID resolve maps */
export interface ResolverMaps {
  assigneeNameToId: Map<string, number>;
  referrerNameToId: Map<string, number>;
}

/** Build resolve maps from master data */
export function buildResolverMaps(assignees: Assignee[], referrers: Referrer[]): ResolverMaps {
  const assigneeNameToId = new Map<string, number>();
  assignees.forEach(a => assigneeNameToId.set(a.name, a.id));

  const referrerNameToId = new Map<string, number>();
  referrers.forEach(r => {
    referrerNameToId.set(`${r.company} / ${r.name}`, r.id);
    referrerNameToId.set(r.company, r.id);
  });

  return { assigneeNameToId, referrerNameToId };
}

/**
 * CSV行をCreateCaseInput形式に変換
 */
function rowToInput(
  row: string[],
  columnMap: Map<number, string>,
  resolvers?: ResolverMaps
): Record<string, unknown> {
  const obj: Record<string, unknown> = {};

  for (const [colIndex, fieldName] of columnMap) {
    const value = (row[colIndex] ?? '').trim();

    switch (fieldName) {
      case 'deceasedName':
      case 'dateOfDeath':
        obj[fieldName] = value;
        break;
      case 'fiscalYear':
        obj[fieldName] = value ? Number(value) : undefined;
        break;
      case 'status':
        obj[fieldName] = value && VALID_STATUSES.includes(value as CaseStatus)
          ? value
          : undefined;
        break;
      case 'acceptanceStatus':
        obj[fieldName] = value && VALID_ACCEPTANCE.includes(value as AcceptanceStatus)
          ? value
          : undefined;
        break;
      case 'assigneeName':
        if (value && resolvers) {
          obj.assigneeId = resolvers.assigneeNameToId.get(value) || null;
        }
        break;
      case 'referrerName':
        if (value && resolvers) {
          obj.referrerId = resolvers.referrerNameToId.get(value) || null;
        }
        break;
      case 'propertyValue':
      case 'taxAmount':
      case 'estimateAmount':
      case 'feeAmount':
      case 'referralFeeAmount': {
        const n = parseOptionalInt(value);
        if (n !== undefined) obj[fieldName] = n;
        break;
      }
      case 'referralFeeRate': {
        const n = parseOptionalFloat(value);
        if (n !== undefined) obj[fieldName] = n;
        break;
      }
    }
  }

  return obj;
}

/**
 * CSVテキストをパース・バリデーションし、取り込み可能なデータを返す
 */
export function parseAndValidateCSV(text: string, resolvers?: ResolverMaps): ImportParseResult {
  const rows = parseCSVText(text);

  if (rows.length === 0) {
    return { validRows: [], errors: [{ row: 0, message: 'CSVファイルが空です' }], totalRows: 0 };
  }

  const headers = rows[0];
  const columnMap = buildColumnMap(headers);

  // 必須ヘッダーの存在確認
  const mappedFields = new Set(columnMap.values());
  const missingRequired: string[] = [];
  if (!mappedFields.has('deceasedName')) missingRequired.push('被相続人氏名');
  if (!mappedFields.has('dateOfDeath')) missingRequired.push('死亡日');
  if (!mappedFields.has('fiscalYear')) missingRequired.push('年度');

  if (missingRequired.length > 0) {
    return {
      validRows: [],
      errors: [{ row: 1, message: `必須ヘッダーが見つかりません: ${missingRequired.join(', ')}` }],
      totalRows: 0,
    };
  }

  const dataRows = rows.slice(1);
  if (dataRows.length === 0) {
    return { validRows: [], errors: [{ row: 0, message: 'データ行がありません' }], totalRows: 0 };
  }

  const validRows: CreateCaseInput[] = [];
  const errors: ImportError[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const csvRowNum = i + 2; // 1-based, ヘッダーが1行目
    const raw = rowToInput(dataRows[i], columnMap, resolvers);
    const result = createCaseSchema.safeParse(raw);

    if (result.success) {
      validRows.push(result.data);
    } else {
      const messages = result.error.issues.map((issue) => issue.message);
      errors.push({ row: csvRowNum, message: messages.join('; ') });
    }
  }

  return { validRows, errors, totalRows: dataRows.length };
}

/** ファイルサイズ上限 (5MB) */
export const MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024;
