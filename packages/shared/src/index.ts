// Case Status Types
export type CaseStatus = '未着手' | '進行中' | '完了' | '請求済';
export type AcceptanceStatus = '受託可' | '受託不可' | '未判定' | '保留';

// Progress Step
interface ProgressStep {
  id: string;
  name: string;
  date: string | null;
  memo?: string;
  isDynamic?: boolean;
}

// Contact
interface Contact {
  name: string;
  phone: string;
  email: string;
}

// Main Case Entity
export interface InheritanceCase {
  id: string;
  deceasedName: string;
  dateOfDeath: string;
  status: CaseStatus;
  acceptanceStatus?: AcceptanceStatus;
  taxAmount: number;
  assignee: string;
  assigneeId?: string;
  feeAmount: number;
  fiscalYear: number;
  referrer?: string;
  referrerId?: string;
  estimateAmount: number;
  propertyValue: number;
  referralFeeRate?: number;
  referralFeeAmount?: number;
  progress?: ProgressStep[];
  contacts?: Contact[];
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
}

// Assignee Entity
export interface Assignee {
  id: string;
  name: string;
  employeeId?: string;
  department?: string;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Referrer Entity
export interface Referrer {
  id: string;
  company: string;
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

// Constants
export const DEPARTMENTS = ['会計部', '医療部', '建設部', '資産税部'] as const;
