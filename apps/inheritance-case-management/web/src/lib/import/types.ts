import type { CreateCaseInput } from '@/types/validation';
import { CASE_STATUS_OPTIONS, HANDLING_STATUS_OPTIONS, ACCEPTANCE_STATUS_OPTIONS } from '@/types/constants';

// ── Header → field mapping ──────────────────────────────────
export const CSV_HEADER_MAP: Record<string, string> = {
  '被相続人氏名': 'deceasedName',
  '死亡日': 'dateOfDeath',
  '年度': 'fiscalYear',
  '進み具合': 'status',
  '対応状況': 'handlingStatus',
  '受託状況': 'acceptanceStatus',
  '担当者': 'assigneeName',
  '担当者_氏名': 'assigneePersonName',
  '担当者_部署名': 'assigneeDepartment',
  '紹介者': 'referrerName',
  '紹介者_会社名': 'referrerCompany',
  '紹介者_氏名': 'referrerPersonName',
  '紹介者_部署名': 'referrerDepartment',
  '財産評価額': 'propertyValue',
  '相続税額': 'taxAmount',
  '見積額': 'estimateAmount',
  '報酬額': 'feeAmount',
  '紹介料率(%)': 'referralFeeRate',
  '紹介料': 'referralFeeAmount',
  '特記事項': 'summary',
  'メモ': 'memo',
};

export const IGNORED_HEADERS = new Set(['作成日', '更新日']);

export const VALID_STATUSES = CASE_STATUS_OPTIONS as readonly string[];
export const VALID_HANDLING = HANDLING_STATUS_OPTIONS as readonly string[];
export const VALID_ACCEPTANCE = ACCEPTANCE_STATUS_OPTIONS as readonly string[];

export const MAX_CONTACT_COLUMNS = 10;
export const MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024;

// ── Contact column detection ──────────────────────────────────
export const CONTACT_HEADER_RE = /^連絡先(\d+)_(氏名|電話|メール)$/;
export const CONTACT_FIELD_MAP: Record<string, 'name' | 'phone' | 'email'> = {
  '氏名': 'name',
  '電話': 'phone',
  'メール': 'email',
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
  name?: string;
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
}

/** Fields that receive Zod defaults when empty */
export const DEFAULTABLE_FIELDS: Record<string, string> = {
  status: '進み具合→未着手',
  handlingStatus: '対応状況→対応中',
  acceptanceStatus: '受託状況→未判定',
  taxAmount: '相続税額→0',
  feeAmount: '報酬額→0',
  estimateAmount: '見積額→0',
  propertyValue: '財産評価額→0',
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
  contactCols: Map<number, { index: number; field: 'name' | 'phone' | 'email' }>;
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
}
