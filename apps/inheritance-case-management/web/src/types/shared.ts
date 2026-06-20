import type { FeeCalcSnapshot } from '@/lib/estimate-calc';

// Case Status Types — 統合ステータス（受託判定・進み具合・対応状況を1つに統合）
export type CaseStatus = '見積前' | '見積中' | '見送り' | '受託' | '手続中' | '最終確認' | '申告済' | '請求済' | '入金済';

// Progress Step (input shape for API — used by editors)
export interface ProgressStep {
  id: string;
  name: string;
  date: string | null;
  memo?: string;
  isDynamic?: boolean;
}

// Heir (input shape for API — used by editors)
export interface HeirInput {
  personId: number;
  relationship?: string;
  memo?: string;
}

// Related party (input shape for API — used by editors)
export interface RelatedPartyInput {
  personId: number;
  memo?: string;
}

// Expense (input shape for API — used by editors)
export interface Expense {
  date: string;
  description: string;
  amount: number;
  memo?: string;
}

export interface SpecialAddition {
  description: string;
  amount: number;
}

// Normalized DB entities
export interface CaseExpenseItem {
  id: number;
  sortOrder: number;
  date: string;
  description: string;
  amount: number;
  memo?: string;
}

export interface CaseSpecialAdditionItem {
  id: number;
  sortOrder: number;
  description: string;
  amount: number;
}

interface PersonBase {
  id: number;
  name: string;
  nameKana: string;
  phone: string;
  postalCode: string;
  address: string;
  addressFromPostalCode: string;
  addressManual: string;
  memo: string;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  _count?: {
    caseLinks: number;
  };
}

export interface HeirPerson extends PersonBase {
  dateOfBirth?: string | null;
}
export interface RelatedPartyPerson extends PersonBase {
  profession: string;
}

export interface CaseHeir {
  id: number;
  sortOrder: number;
  relationship: string;
  relationshipSortOrder: number;
  personId: number;
  person: HeirPerson;
  memo: string;
}

export interface CaseRelatedParty {
  id: number;
  sortOrder: number;
  personId: number;
  person: RelatedPartyPerson;
  memo: string;
}

export interface CaseProgressItem {
  id: number;
  stepId: string;
  name: string;
  sortOrder: number;
  date: string | null;
  memo?: string;
  isDynamic?: boolean;
}

// Main Case Entity
export interface InheritanceCase {
  id: number;
  deceasedName: string;
  deceasedNameKana?: string;
  deceasedNameKanaNormalized?: string;
  dateOfDeath: string;
  status: CaseStatus;
  isUndivided?: boolean;
  taxAmount: number;
  feeAmount: number;
  fiscalYear: number;
  estimateAmount: number;
  propertyValue: number;
  referralFeeRate?: number;
  referralFeeAmount: number;
  estimateReferralFeeAmount: number;
  isReferralFeeManual?: boolean;
  isEstimateReferralFeeManual?: boolean;
  landRosenkaCount?: number;
  landBairitsuCount?: number;
  unlistedStockCount?: number;
  feeCalculationHeirCount?: number;
  discountAmount?: number;
  feeCalcSnapshot?: FeeCalcSnapshot | null;
  summary?: string;
  memo?: string;
  caseAddedDate?: string | null;
  caseCompletedDate?: string | null;
  billedDate?: string | null;
  paidDate?: string | null;
  // Normalized FK references
  assigneeId?: number | null;
  internalReferrerId?: number | null;
  referrerId?: number | null;
  // Included relations (from Prisma include)
  assignee?: Assignee | null;
  internalReferrer?: Assignee | null;
  referrer?: Referrer | null;
  // Normalized child records
  progress?: CaseProgressItem[];
  heirs?: CaseHeir[];
  relatedParties?: CaseRelatedParty[];
  expenses?: CaseExpenseItem[];
  specialAdditions?: CaseSpecialAdditionItem[];
  createdAt?: Date;
  updatedAt?: Date;
}

// Read model used by the case list and KPI cards. Keep this intentionally small.
export interface CaseListItem {
  id: number;
  deceasedName: string;
  deceasedNameKana?: string;
  dateOfDeath: string;
  status: CaseStatus;
  isUndivided: boolean;
  feeAmount: number;
  estimateAmount: number;
  fiscalYear: number;
  summary?: string;
  hasMemo: boolean;
  caseAddedDate?: string | null;
  caseCompletedDate?: string | null;
  assignee?: Pick<Assignee, 'id' | 'name'> | null;
  internalReferrer?: Pick<Assignee, 'id' | 'name'> | null;
}

// Department Entity
export interface Department {
  id: number;
  name: string;
  sortOrder: number;
  active: boolean;
}

// Assignee Entity
export interface Assignee {
  id: number;
  name: string;
  employeeId?: string;
  departmentId?: number | null;
  department?: Department | null;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Company Entity
export interface Company {
  id: number;
  name: string;
  active: boolean;
}

// CompanyBranch Entity (会社の部門・支店)
export interface CompanyBranch {
  id: number;
  companyId: number;
  company?: Company;
  name: string;
  active: boolean;
}

// Referrer Entity (external only)
export interface Referrer {
  id: number;
  companyId: number;
  company: Company;
  branchId?: number | null;
  branch?: CompanyBranch | null;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Pagination (used by PaginatedResponse)
interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

// Audit Log
export interface AuditLogEntry {
  id: number;
  entity: string;
  entityId: number;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  changes?: { field: string; old: unknown; new: unknown }[];
  changedBy?: string | null;
  changedAt: string;
}

// Company Merge Result
export interface MergeResult {
  sourceCompany: string;
  targetCompany: string;
  branchesMoved: number;
  branchesMerged: number;
  referrersMoved: number;
  casesReassigned: number;
}

// Format ID as 4-digit padded string for display
export function formatId(id: number): string {
  return String(id).padStart(4, '0');
}

/** 紹介者の表示ラベルを生成（社外: 会社名 / 部門） */
export function formatReferrerLabel(r: Referrer): string {
  const parts = [r.company.name];
  if (r.branch?.name) parts.push(r.branch.name);
  return parts.join(" / ");
}

