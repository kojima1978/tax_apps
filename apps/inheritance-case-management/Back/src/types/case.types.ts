export interface InheritanceCase {
  id: string;
  deceasedName: string;
  dateOfDeath: string;
  status: '未着手' | '進行中' | '完了';
  acceptanceStatus?: '受託可' | '受託不可' | '未判定';
  taxAmount: number;
  assignee: string;
  feeAmount: number;
  fiscalYear: number;
  referrer?: string;
  estimateAmount: number;
  propertyValue: number;
  referralFeeRate?: number;
  referralFeeAmount?: number;
  progress?: ProgressStep[];
  contacts?: Contact[];
}

export interface ProgressStep {
  id: string;
  name: string;
  date: string | null;
  memo?: string;
  isDynamic?: boolean;
}

export interface Contact {
  name: string;
  phone: string;
  email: string;
}

export interface CreateCaseDto {
  deceasedName: string;
  dateOfDeath: string;
  fiscalYear: number;
  status?: string;
  acceptanceStatus?: string;
  taxAmount?: number;
  assignee?: string;
  feeAmount?: number;
  referrer?: string;
  estimateAmount?: number;
  propertyValue?: number;
}

export interface UpdateCaseDto extends Partial<CreateCaseDto> {
  id: string;
}
