// Case Status Types
export type CaseStatus = '未着手' | '手続中' | '申告済' | '請求済' | '入金済' | '対応終了';
export type AcceptanceStatus = '受託可' | '受託不可' | '未判定' | '保留';

// Progress Step (input shape for API — used by editors)
export interface ProgressStep {
  id: string;
  name: string;
  date: string | null;
  memo?: string;
  isDynamic?: boolean;
}

// Contact (input shape for API — used by editors)
export interface Contact {
  name: string;
  phone: string;
  email: string;
}

// Normalized DB entities
export interface CaseContact {
  id: number;
  sortOrder: number;
  name: string;
  phone: string;
  email: string;
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
  dateOfDeath: string;
  status: CaseStatus;
  acceptanceStatus?: AcceptanceStatus;
  taxAmount: number;
  feeAmount: number;
  fiscalYear: number;
  estimateAmount: number;
  propertyValue: number;
  referralFeeRate?: number;
  referralFeeAmount?: number;
  summary?: string;
  memo?: string;
  // Normalized FK references
  assigneeId?: number | null;
  referrerId?: number | null;
  // Included relations (from Prisma include)
  assignee?: Assignee | null;
  referrer?: Referrer | null;
  // Normalized child records
  progress?: CaseProgressItem[];
  contacts?: CaseContact[];
  createdAt?: Date;
  updatedAt?: Date;
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

// Referrer Entity
export interface Referrer {
  id: number;
  companyId: number;
  company: Company;
  name: string;
  department?: string;
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

// Format ID as 4-digit padded string for display
export function formatId(id: number): string {
  return String(id).padStart(4, '0');
}

