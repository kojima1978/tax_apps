import { z } from 'zod';
import { MAX_SUMMARY_LENGTH } from './constants';
import { normalizePostalCodeDigits } from '@/lib/postal-code-format';

/** 入力された郵便番号を 7 桁数字に正規化 + バリデート（空 OR 7 桁数字のみ許可） */
const postalCodeSchema = z
  .string()
  .optional()
  .default('')
  .transform(v => normalizePostalCodeDigits(v))
  .refine(v => v === '' || /^\d{7}$/.test(v), '郵便番号は7桁の数字で入力してください');

// Status Schema (internal - used by createCaseSchema/listQuerySchema)
const caseStatusSchema = z.enum(['見積前', '見積中', '見送り', '受託', '手続中', '最終確認', '申告済', '請求済', '入金済']);

// Heir Schema (supports both personId reference and inline import format)
const heirByIdSchema = z.object({
  personId: z.number().int(),
  relationship: z.string().max(20, '続柄は20文字以内で入力してください').optional(),
  memo: z.string().optional(),
});
const heirImportSchema = z.object({
  name: z.string(),
  nameKana: z.string().optional(),
  phone: z.string().optional(),
  postalCode: postalCodeSchema,
  address: z.string().optional(),
  addressFromPostalCode: z.string().optional(),
  addressManual: z.string().optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '生年月日はYYYY-MM-DD形式で入力してください').optional(),
  relationship: z.string().max(20).optional(),
  memo: z.string().optional(),
});
const heirSchema = z.union([heirByIdSchema, heirImportSchema]);

// Related party Schema
const relatedPartySchema = z.object({
  personId: z.number().int(),
  memo: z.string().optional(),
});

// Progress Step Schema (internal - used by createCaseSchema)
const progressStepSchema = z.object({
  id: z.string(),
  name: z.string(),
  date: z.string().nullable(),
  memo: z.string().optional(),
  isDynamic: z.boolean().optional(),
});

// Expense Schema (internal - used by createCaseSchema)
const expenseSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日付形式が正しくありません（YYYY-MM-DD）'),
  description: z.string().min(1, '内容は必須です').max(200, '内容は200文字以内で入力してください'),
  amount: z.number().int().min(0, '金額は0以上を入力してください'),
  memo: z.string().max(500, '備考は500文字以内で入力してください').nullable().optional(),
});

const specialAdditionSchema = z.object({
  description: z.string().min(1, '特別業務報酬額の内容は必須です').max(100, '特別業務報酬額の内容は100文字以内で入力してください'),
  amount: z.number().int().min(0, '特別業務報酬額は0以上を入力してください'),
});

// Case Schemas
export const createCaseSchema = z.object({
  deceasedName: z.string().min(1, '被相続人氏名は必須です').max(100, '被相続人氏名は100文字以内で入力してください'),
  deceasedNameKana: z.string().max(100, '被相続人フリガナは100文字以内で入力してください').optional().default(''),
  dateOfDeath: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日付形式が正しくありません（YYYY-MM-DD）'),
  fiscalYear: z.number().int('年度は整数で入力してください').min(2000, '年度は2000年以上を入力してください').max(2100, '年度は2100年以下を入力してください'),
  status: caseStatusSchema.optional().default('見積前'),
  isUndivided: z.boolean().optional().default(false),
  taxAmount: z.number().int().min(0, '税額は0以上を入力してください').optional().default(0),
  assigneeId: z.number().int().nullable().optional(),
  internalReferrerId: z.number().int().nullable().optional(),
  feeAmount: z.number().int().min(0, '報酬は0以上を入力してください').optional().default(0),
  referrerId: z.number().int().nullable().optional(),
  estimateAmount: z.number().int().min(0, '見積額は0以上を入力してください').optional().default(0),
  propertyValue: z.number().int().min(0, '財産評価額は0以上を入力してください').optional().default(0),
  referralFeeRate: z.number().min(0, '紹介料率は0%以上を入力してください').max(100, '紹介料率は100%以下を入力してください').nullable().optional(),
  referralFeeAmount: z.number().int().min(0, '紹介料は0以上を入力してください').optional(),
  estimateReferralFeeAmount: z.number().int().min(0, '見積紹介料は0以上を入力してください').optional(),
  isReferralFeeManual: z.boolean().optional(),
  isEstimateReferralFeeManual: z.boolean().optional(),
  landRosenkaCount: z.number().int().min(0, '土地数（路線価）は0以上を入力してください').optional().default(0),
  landBairitsuCount: z.number().int().min(0, '土地数（倍率）は0以上を入力してください').optional().default(0),
  unlistedStockCount: z.number().int().min(0, '非上場株式数は0以上を入力してください').optional().default(0),
  feeCalculationHeirCount: z.number().int().min(0, '報酬計算上の相続人数は0以上を入力してください').optional().default(0),
  discountAmount: z.number().int().min(0, '値引額は0以上を入力してください').optional().default(0),
  feeCalcSnapshot: z.record(z.any()).nullable().optional(),
  summary: z.string().max(MAX_SUMMARY_LENGTH, `特記事項は${MAX_SUMMARY_LENGTH}文字以内で入力してください`).nullable().optional(),
  memo: z.string().nullable().optional(),
  caseAddedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日付形式が正しくありません（YYYY-MM-DD）').nullable().optional(),
  caseCompletedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日付形式が正しくありません（YYYY-MM-DD）').nullable().optional(),
  billedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日付形式が正しくありません（YYYY-MM-DD）').nullable().optional(),
  paidDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日付形式が正しくありません（YYYY-MM-DD）').nullable().optional(),
  heirs: z.array(heirSchema).max(10, '相続人は最大10件までです').optional(),
  relatedParties: z.array(relatedPartySchema).max(20, '関係者は最大20件までです').optional(),
  progress: z.array(progressStepSchema).optional(),
  expenses: z.array(expenseSchema).optional(),
  specialAdditions: z.array(specialAdditionSchema).max(2, '特別業務報酬額は最大2行までです').optional(),
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

// CompanyBranch Schemas
export const createCompanyBranchSchema = z.object({
  companyId: z.number().int('会社IDは整数で入力してください'),
  name: z.string().min(1, '部門名は必須です').max(50, '部門名は50文字以内で入力してください'),
});

export const updateCompanyBranchSchema = createCompanyBranchSchema.partial().extend({
  active: z.boolean().optional(),
});

// Referrer Schemas
export const createReferrerSchema = z.object({
  companyId: z.number().int('会社IDは整数で入力してください'),
  branchId: z.number().int().nullable().optional(),
});

export const updateReferrerSchema = createReferrerSchema.partial().extend({
  active: z.boolean().optional(),
});

// Person Schemas（HeirPerson / RelatedPartyPerson 共通の項目構造）
const personBaseSchema = z.object({
  name: z.string().min(1, '氏名は必須です').max(100, '氏名は100文字以内で入力してください'),
  nameKana: z.string().max(100, 'フリガナは100文字以内で入力してください').optional().default(''),
  phone: z.string().max(30).optional().default(''),
  postalCode: postalCodeSchema,
  address: z.string().max(200).optional().default(''),
  addressFromPostalCode: z.string().max(200).optional().default(''),
  addressManual: z.string().max(200).optional().default(''),
  memo: z.string().max(500).optional().default(''),
});

export const createHeirPersonSchema = personBaseSchema.extend({
  dateOfBirth: z
    .string()
    .optional()
    .nullable()
    .transform(v => (v && v.trim() !== '' ? v : null))
    .refine(v => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), '生年月日はYYYY-MM-DD形式で入力してください'),
});
export const updateHeirPersonSchema = createHeirPersonSchema.partial().extend({
  active: z.boolean().optional(),
});

export const createRelatedPartyPersonSchema = personBaseSchema.extend({
  profession: z.string().max(50, '業種は50文字以内で入力してください').optional().default(''),
});
export const updateRelatedPartyPersonSchema = createRelatedPartyPersonSchema.partial().extend({
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
const dateQuerySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional();

// Query Params Schema
export const listQuerySchema = z.object({
  view: z.enum(['list']).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(200).optional().default(100),
  status: z.string().optional(),
  isUndivided: z.coerce.boolean().optional(),
  hideClosed: z.coerce.boolean().optional(),
  fiscalYear: z.coerce.number().int().optional(),
  fiscalYears: z.string().regex(/^\d{4}(,\d{4})*$/).optional(),
  search: z.string().optional(),
  assigneeId: z.coerce.number().int().optional(),
  internalReferrerId: z.coerce.number().int().optional(),
  staffId: z.coerce.number().int().optional(),
  referrerCompany: z.string().optional(),
  unassigned: z.coerce.boolean().optional(),
  noReferrer: z.coerce.boolean().optional(),
  deadlineSoon: z.coerce.boolean().optional(),
  department: z.string().optional(),
  caseAddedFrom: dateQuerySchema,
  caseAddedTo: dateQuerySchema,
  caseCompletedFrom: dateQuerySchema,
  caseCompletedTo: dateQuerySchema,
  billedFrom: dateQuerySchema,
  billedTo: dateQuerySchema,
  paidFrom: dateQuerySchema,
  paidTo: dateQuerySchema,
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
export type CreateCompanyBranchInput = z.infer<typeof createCompanyBranchSchema>;
export type UpdateCompanyBranchInput = z.infer<typeof updateCompanyBranchSchema>;
export type CreateReferrerInput = z.infer<typeof createReferrerSchema>;
export type UpdateReferrerInput = z.infer<typeof updateReferrerSchema>;
export type CreateHeirPersonInput = z.infer<typeof createHeirPersonSchema>;
export type UpdateHeirPersonInput = z.infer<typeof updateHeirPersonSchema>;
export type CreateRelatedPartyPersonInput = z.infer<typeof createRelatedPartyPersonSchema>;
export type UpdateRelatedPartyPersonInput = z.infer<typeof updateRelatedPartyPersonSchema>;
export type ListQueryInput = z.infer<typeof listQuerySchema>;
