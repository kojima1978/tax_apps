import { z } from 'zod';

// Status Schemas
export const caseStatusSchema = z.enum(['未着手', '進行中', '完了', '請求済']);
export const acceptanceStatusSchema = z.enum(['受託可', '受託不可', '未判定', '保留']);

// Contact Schema
export const contactSchema = z.object({
  name: z.string(),
  phone: z.string(),
  email: z.string().email('メールアドレスの形式が正しくありません').or(z.literal('')),
});

// Progress Step Schema
export const progressStepSchema = z.object({
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
  acceptanceStatus: acceptanceStatusSchema.optional().default('未判定'),
  taxAmount: z.number().int().min(0, '税額は0以上を入力してください').optional().default(0),
  assignee: z.string().optional(),
  assigneeId: z.string().uuid('無効な担当者IDです').optional().nullable(),
  feeAmount: z.number().int().min(0, '報酬は0以上を入力してください').optional().default(0),
  referrer: z.string().optional(),
  referrerId: z.string().uuid('無効な紹介者IDです').optional().nullable(),
  estimateAmount: z.number().int().min(0, '見積額は0以上を入力してください').optional().default(0),
  propertyValue: z.number().int().min(0, '財産評価額は0以上を入力してください').optional().default(0),
  referralFeeRate: z.number().min(0, '紹介料率は0%以上を入力してください').max(100, '紹介料率は100%以下を入力してください').optional(),
  referralFeeAmount: z.number().int().min(0, '紹介料は0以上を入力してください').optional(),
  contacts: z.array(contactSchema).optional(),
  progress: z.array(progressStepSchema).optional(),
});

export const updateCaseSchema = createCaseSchema.partial();

export const caseIdParamSchema = z.object({
  id: z.string().uuid('無効なID形式です'),
});

// Assignee Schemas
export const createAssigneeSchema = z.object({
  name: z.string().min(1, '氏名は必須です').max(50, '氏名は50文字以内で入力してください'),
  employeeId: z.string().max(20, '社員番号は20文字以内で入力してください').optional(),
  department: z.string().max(50, '部署は50文字以内で入力してください').optional(),
});

export const updateAssigneeSchema = createAssigneeSchema.partial().extend({
  active: z.boolean().optional(),
});

// Referrer Schemas
export const createReferrerSchema = z.object({
  company: z.string().min(1, '会社名は必須です').max(100, '会社名は100文字以内で入力してください'),
  name: z.string().min(1, '担当者名は必須です').max(50, '担当者名は50文字以内で入力してください'),
  department: z.string().max(50, '部署は50文字以内で入力してください').optional(),
});

export const updateReferrerSchema = createReferrerSchema.partial().extend({
  active: z.boolean().optional(),
});

// Sort Field Schema
export const sortFieldSchema = z.enum([
  'deceasedName',
  'dateOfDeath',
  'fiscalYear',
  'status',
  'taxAmount',
  'feeAmount',
  'createdAt',
  'updatedAt',
]);

export const sortOrderSchema = z.enum(['asc', 'desc']);

// Query Params Schema
export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(30),
  status: caseStatusSchema.optional(),
  acceptanceStatus: acceptanceStatusSchema.optional(),
  fiscalYear: z.coerce.number().int().optional(),
  search: z.string().optional(),
  sortBy: sortFieldSchema.optional().default('createdAt'),
  sortOrder: sortOrderSchema.optional().default('desc'),
});

// Type exports
export type CreateCaseInput = z.infer<typeof createCaseSchema>;
export type UpdateCaseInput = z.infer<typeof updateCaseSchema>;
export type CreateAssigneeInput = z.infer<typeof createAssigneeSchema>;
export type UpdateAssigneeInput = z.infer<typeof updateAssigneeSchema>;
export type CreateReferrerInput = z.infer<typeof createReferrerSchema>;
export type UpdateReferrerInput = z.infer<typeof updateReferrerSchema>;
export type ListQueryInput = z.infer<typeof listQuerySchema>;
