import { z } from 'zod';
import { MAX_SUMMARY_LENGTH } from './constants';

// Status Schemas (internal - used by createCaseSchema/listQuerySchema)
const caseStatusSchema = z.enum(['未着手', '手続中', '申告済', '請求済', '入金済']);
const handlingStatusSchema = z.enum(['対応中', '対応終了', '未分割']);
const acceptanceStatusSchema = z.enum(['受託可', '受託不可', '未判定', '保留']);

// Contact Schema (internal - used by createCaseSchema)
const contactSchema = z.object({
  name: z.string(),
  phone: z.string(),
  email: z.string().email('メールアドレスの形式が正しくありません').or(z.literal('')),
});

// Progress Step Schema (internal - used by createCaseSchema)
const progressStepSchema = z.object({
  id: z.string(),
  name: z.string(),
  date: z.string().nullable(),
  memo: z.string().optional(),
  isDynamic: z.boolean().optional(),
});

// Case Schemas
export const createCaseSchema = z.object({
  deceasedName: z.string().min(1, '被相続人氏名は必須です').max(100, '被相続人氏名は100文字以内で入力してください'),
  dateOfDeath: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日付形式が正しくありません（YYYY-MM-DD）'),
  fiscalYear: z.number().int('年度は整数で入力してください').min(2000, '年度は2000年以上を入力してください').max(2100, '年度は2100年以下を入力してください'),
  status: caseStatusSchema.optional().default('未着手'),
  handlingStatus: handlingStatusSchema.optional().default('対応中'),
  acceptanceStatus: acceptanceStatusSchema.optional().default('未判定'),
  taxAmount: z.number().int().min(0, '税額は0以上を入力してください').optional().default(0),
  assigneeId: z.number().int().nullable().optional(),
  internalReferrerId: z.number().int().nullable().optional(),
  feeAmount: z.number().int().min(0, '報酬は0以上を入力してください').optional().default(0),
  referrerId: z.number().int().nullable().optional(),
  estimateAmount: z.number().int().min(0, '見積額は0以上を入力してください').optional().default(0),
  propertyValue: z.number().int().min(0, '財産評価額は0以上を入力してください').optional().default(0),
  referralFeeRate: z.number().min(0, '紹介料率は0%以上を入力してください').max(100, '紹介料率は100%以下を入力してください').nullable().optional(),
  referralFeeAmount: z.number().int().min(0, '紹介料は0以上を入力してください').nullable().optional(),
  summary: z.string().max(MAX_SUMMARY_LENGTH, `特記事項は${MAX_SUMMARY_LENGTH}文字以内で入力してください`).nullable().optional(),
  memo: z.string().nullable().optional(),
  contacts: z.array(contactSchema).max(10, '連絡先は最大10件までです').optional(),
  progress: z.array(progressStepSchema).optional(),
});

export const updateCaseSchema = createCaseSchema.partial().extend({
  updatedAt: z.string().optional(), // 楽観ロック用（ISO 8601）
});

export const caseIdParamSchema = z.object({
  id: z.coerce.number().int('無効なID形式です'),
});

// Assignee Schemas
export const createAssigneeSchema = z.object({
  name: z.string().min(1, '氏名は必須です').max(50, '氏名は50文字以内で入力してください'),
  employeeId: z.string().max(20, '社員番号は20文字以内で入力してください').optional(),
  departmentId: z.number().int().nullable().optional(),
});

export const updateAssigneeSchema = createAssigneeSchema.partial().extend({
  active: z.boolean().optional(),
});

// Department Schemas
export const createDepartmentSchema = z.object({
  name: z.string().min(1, '部署名は必須です').max(50, '部署名は50文字以内で入力してください'),
  sortOrder: z.number().int().min(0).optional().default(0),
});

export const updateDepartmentSchema = createDepartmentSchema.partial().extend({
  active: z.boolean().optional(),
});

// Company Schemas
export const createCompanySchema = z.object({
  name: z.string().min(1, '会社名は必須です').max(100, '会社名は100文字以内で入力してください'),
});

export const updateCompanySchema = createCompanySchema.partial().extend({
  active: z.boolean().optional(),
});

// Referrer Schemas
export const createReferrerSchema = z.object({
  companyId: z.number().int('会社IDは整数で入力してください'),
  department: z.string().max(50, '部署は50文字以内で入力してください').optional(),
});

export const updateReferrerSchema = createReferrerSchema.partial().extend({
  active: z.boolean().optional(),
});

// Sort Field Schema (internal - used by listQuerySchema)
const sortFieldSchema = z.enum([
  'deceasedName',
  'dateOfDeath',
  'fiscalYear',
  'status',
  'taxAmount',
  'feeAmount',
  'createdAt',
  'updatedAt',
]);

const sortOrderSchema = z.enum(['asc', 'desc']);

// Query Params Schema
export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(200).optional().default(100),
  status: z.string().optional(),
  handlingStatus: z.string().optional(),
  acceptanceStatus: z.string().optional(),
  fiscalYear: z.coerce.number().int().optional(),
  search: z.string().optional(),
  assigneeId: z.coerce.number().int().optional(),
  internalReferrerId: z.coerce.number().int().optional(),
  staffId: z.coerce.number().int().optional(),
  referrerCompany: z.string().optional(),
  department: z.string().optional(),
  sortBy: sortFieldSchema.optional().default('dateOfDeath'),
  sortOrder: sortOrderSchema.optional().default('asc'),
});

// Type exports
export type CreateCaseInput = z.infer<typeof createCaseSchema>;
export type UpdateCaseInput = z.infer<typeof updateCaseSchema>;
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
export type CreateAssigneeInput = z.infer<typeof createAssigneeSchema>;
export type UpdateAssigneeInput = z.infer<typeof updateAssigneeSchema>;
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
export type CreateReferrerInput = z.infer<typeof createReferrerSchema>;
export type UpdateReferrerInput = z.infer<typeof updateReferrerSchema>;
export type ListQueryInput = z.infer<typeof listQuerySchema>;
