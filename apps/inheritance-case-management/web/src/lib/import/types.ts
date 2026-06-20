import type { CreateCaseInput } from '@/types/validation';
import { CASE_STATUS_OPTIONS } from '@/types/constants';

export interface ImportHeir {
  name: string;
  phone: string;
  postalCode: string;
  address: string;
  addressFromPostalCode?: string;
  addressManual?: string;
  dateOfBirth?: string;
  relationship?: string;
  memo: string;
}

// ── Header → field mapping ──────────────────────────────────
export const CSV_HEADER_MAP: Record<string, string> = {
  '被相続人氏名': 'deceasedName',
  '被相続人フリガナ': 'deceasedNameKana',
  '死亡日': 'dateOfDeath',
  '年度': 'fiscalYear',
  'ステータス': 'status',
  '進み具合': 'status',
  '遺産未分割': 'isUndivided',
  '担当者': 'assigneeName',
  '担当者_氏名': 'assigneePersonName',
  '担当者_部署名': 'assigneeDepartment',
  '紹介者': 'referrerName',
  '紹介者_会社名': 'referrerCompany',
  '紹介者_部署名': 'referrerDepartment',
  '社内紹介者': 'internalReferrerName',
  '社内紹介者_氏名': 'internalReferrerName',
  '社内紹介者_部署名': 'internalReferrerDepartment',
  '財産評価額': 'propertyValue',
  '相続税額': 'taxAmount',
  '見積額': 'estimateAmount',
  '報酬額': 'feeAmount',
  '紹介料率(%)': 'referralFeeRate',
  '紹介料': 'referralFeeAmount',
  '見積紹介料': 'estimateReferralFeeAmount',
  '土地数_路線価': 'landRosenkaCount',
  '土地数_倍率': 'landBairitsuCount',
  '非上場株式数': 'unlistedStockCount',
  '相続人数': 'feeCalculationHeirCount',
  '報酬計算上の相続人数': 'feeCalculationHeirCount',
  '特記事項': 'summary',
  'メモ': 'memo',
  '受託日': 'caseAddedDate',
  '申告日': 'caseCompletedDate',
  '申告完了日': 'caseCompletedDate',
  '請求日': 'billedDate',
  '入金日': 'paidDate',
};

export const IGNORED_HEADERS = new Set(['作成日', '更新日']);

export const VALID_STATUSES = CASE_STATUS_OPTIONS as readonly string[];

export const MAX_HEIR_COLUMNS = 10;
export const MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024;

// ── Heir column detection ──────────────────────────────────
export const HEIR_HEADER_RE = /^相続人(\d+)_(氏名|電話|郵便番号|住所|生年月日|続柄|メモ|メール)$/;
export const HEIR_FIELD_MAP: Record<string, keyof ImportHeir> = {
  '氏名': 'name',
  '電話': 'phone',
  '郵便番号': 'postalCode',
  '住所': 'address',
  '生年月日': 'dateOfBirth',
  '続柄': 'relationship',
  'メモ': 'memo',
  'メール': 'memo', // 旧形式の後方互換（メール→メモに変換）
};

// ── Types ──────────────────────────────────
export interface ImportIssue {
  row: number;
  message: string;
}

export type ImportError = ImportIssue;
export type ImportWarning = ImportIssue;

export interface PendingReferrer {
  company: string;
  department?: string;
}

export interface PendingAssignee {
  name: string;
  department?: string;
}

export interface ImportRow {
  data: CreateCaseInput;
  mode: 'create' | 'update';
  id?: number;
  deceasedName: string;
  defaultedFields: string[];
  pendingReferrer?: PendingReferrer;
  pendingAssignee?: PendingAssignee;
  pendingInternalReferrer?: PendingAssignee;
}

/** Fields that receive Zod defaults when empty */
export const DEFAULTABLE_FIELDS: Record<string, string> = {
  status: 'ステータス→見積前',
  taxAmount: '相続税額→0',
  feeAmount: '報酬額→0',
  estimateAmount: '見積額→0',
  propertyValue: '財産評価額→0',
  landRosenkaCount: '土地数（路線価）→0',
  landBairitsuCount: '土地数（倍率）→0',
  unlistedStockCount: '非上場株式数→0',
  feeCalculationHeirCount: '報酬計算上の相続人数→0',
};

export interface ImportParseResult {
  validRows: ImportRow[];
  errors: ImportError[];
  warnings: ImportWarning[];
  totalRows: number;
}

export interface ResolverMaps {
  assigneeNameToId: Map<string, number>;
  referrerNameToId: Map<string, number>;
}

export interface ColumnMaps {
  fieldMap: Map<number, string>;
  heirCols: Map<number, { index: number; field: keyof ImportHeir }>;
  progressCol: number | null;
  idCol: number | null;
}

export interface RowParseResult {
  obj: Record<string, unknown>;
  rawId: number | null;
  unresolvedAssignee?: string;
  unresolvedReferrer?: string;
  pendingReferrer?: PendingReferrer;
  pendingAssignee?: PendingAssignee;
  pendingInternalReferrer?: PendingAssignee;
  rowWarnings: string[];
}
