import { parse } from 'csv-parse/sync';
import iconv from 'iconv-lite';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '@/lib/db';
import { getAppState } from '@/services/appState';
import { DISPLAY_POLICY_TYPES, isIncomeProtectionPolicyType, normalizePolicyType } from '@/types';
import type { Policy, PolicyType, FamilyMember, AppState } from '@/types';

const VALID_POLICY_TYPES: PolicyType[] = DISPLAY_POLICY_TYPES;
const VALID_FREQUENCIES = ['monthly', 'annual', 'single'] as const;
const DEATH_BENEFIT_TYPES: PolicyType[] = ['終身保険', '定期保険', '収入保障保険', '変額終身保険', '養老保険'];
const FINITE_END_AGE_TYPES: PolicyType[] = ['定期保険', '収入保障保険', '養老保険'];

const HEADER_MAP: Record<string, string> = {
  '保険会社': 'companyName',
  '保険種類': 'policyType',
  '証券番号': 'policyNumber',
  '契約日': 'contractDate',
  '契約年齢': 'contractAge',
  '被保険者': 'insuredName',
  '被保険者名': 'insuredName',
  '受取人': 'beneficiaryName',
  '受取人名': 'beneficiaryName',
  '年金受取人': 'pensionRecipientName',
  '死亡時の継続受取人': 'pensionSuccessorRecipientName',
  '年金受取開始方法': 'pensionStartMode',
  '年金受取開始年度': 'pensionStartFiscalYear',
  '年金受取年数': 'pensionPayoutYears',
  '死亡保障疾病': 'deathBenefitDisease',
  '死亡保障災害': 'deathBenefitAccident',
  '入院日額疾病': 'hospDayDisease',
  '入院日額災害': 'hospDayAccident',
  '診断一時金': 'diagnosisBenefit',
  '保険期間': 'policyEndAge',
  '通貨': 'currency',
  '為替レート': 'exchangeRate',
  '契約時為替レート': 'contractExchangeRate',
  '支払通貨': 'paymentCurrency',
  '一時払保険料実支払円額': 'actualPremiumPaidJpy',
  '一時払保険料支払日': 'premiumPaymentDate',
  '保険料USD': 'foreignPremiumAmount',
  '死亡保障疾病USD': 'foreignDeathBenefitDisease',
  '死亡保障災害USD': 'foreignDeathBenefitAccident',
  '入院日額疾病USD': 'foreignHospDayDisease',
  '入院日額災害USD': 'foreignHospDayAccident',
  '診断一時金USD': 'foreignDiagnosisBenefit',
  '満期保険金USD': 'foreignMaturityBenefit',
  '年金原資USD': 'foreignMaturityBenefit',
  '払方': 'paymentFrequency',
  '保険料': 'premiumAmount',
  '払込終了年月日': 'paymentEndDate',
  '払込終了年齢': 'paymentEndAge',
  '払込終了済み': 'premiumPaymentCompleted',
  '満期保険金': 'maturityBenefit',
  '満期保険金/年金原資': 'maturityBenefit',
  '年金原資': 'maturityBenefit',
  '年金受取総額': 'maturityBenefit',
  'コンサルタントメモ': 'consultantNote',
  'フリガナ': 'nameKana',
  'カナ': 'nameKana',
  '氏名カナ': 'nameKana',
};

interface CsvRow {
  companyName?: string;
  policyType?: string;
  policyNumber?: string;
  contractDate?: string;
  contractAge?: string;
  insuredName?: string;
  beneficiaryName?: string;
  pensionRecipientName?: string;
  pensionSuccessorRecipientName?: string;
  pensionStartMode?: string;
  pensionStartFiscalYear?: string;
  pensionPayoutYears?: string;
  deathBenefitDisease?: string;
  deathBenefitAccident?: string;
  hospDayDisease?: string;
  hospDayAccident?: string;
  diagnosisBenefit?: string;
  policyEndAge?: string;
  currency?: string;
  exchangeRate?: string;
  contractExchangeRate?: string;
  paymentCurrency?: string;
  actualPremiumPaidJpy?: string;
  premiumPaymentDate?: string;
  foreignPremiumAmount?: string;
  foreignDeathBenefitDisease?: string;
  foreignDeathBenefitAccident?: string;
  foreignHospDayDisease?: string;
  foreignHospDayAccident?: string;
  foreignDiagnosisBenefit?: string;
  foreignMaturityBenefit?: string;
  paymentFrequency?: string;
  premiumAmount?: string;
  paymentEndDate?: string;
  paymentEndAge?: string;
  premiumPaymentCompleted?: string;
  maturityBenefit?: string;
  consultantNote?: string;
}

interface RowError {
  row: number;
  message: string;
}

interface DuplicateInfo {
  row: number;
  policyNumber: string;
  existingPolicyId: string;
}

interface ParsedPolicy {
  policy: Omit<Policy, 'id'> & { id: string };
  paymentEndDate: string | null;
}

function detectEncoding(buffer: Buffer): string {
  if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    return 'utf-8';
  }

  let isValidUtf8 = true;
  for (let i = 0; i < buffer.length; i++) {
    const b = buffer[i];
    if (b < 0x80) continue;
    let remaining: number;
    if ((b & 0xE0) === 0xC0) remaining = 1;
    else if ((b & 0xF0) === 0xE0) remaining = 2;
    else if ((b & 0xF8) === 0xF0) remaining = 3;
    else { isValidUtf8 = false; break; }
    for (let j = 0; j < remaining; j++) {
      i++;
      if (i >= buffer.length || (buffer[i] & 0xC0) !== 0x80) {
        isValidUtf8 = false; break;
      }
    }
    if (!isValidUtf8) break;
  }

  return isValidUtf8 ? 'utf-8' : 'cp932';
}

function normalizeHeaders(records: Record<string, string>[]): Record<string, string>[] {
  if (records.length === 0) return records;
  const firstRow = records[0];
  const keys = Object.keys(firstRow);

  const needsMapping = keys.some(k => HEADER_MAP[k] !== undefined);
  if (!needsMapping) return records;

  return records.map(row => {
    const mapped: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      const mappedKey = HEADER_MAP[key] ?? key;
      mapped[mappedKey] = value;
    }
    return mapped;
  });
}

function calcAge(birthDate: string, targetDate: string): number {
  const birth = new Date(birthDate);
  const target = new Date(targetDate);
  let age = target.getFullYear() - birth.getFullYear();
  const monthDiff = target.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && target.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function parseIntOrDefault(value: string | undefined, defaultValue: number): number {
  if (!value || value.trim() === '') return defaultValue;
  const cleaned = value.replace(/,/g, '');
  const n = parseInt(cleaned, 10);
  return isNaN(n) ? defaultValue : n;
}

function parseNumberOrDefault(value: string | undefined, defaultValue: number): number {
  if (!value || value.trim() === '') return defaultValue;
  const cleaned = value.replace(/,/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : defaultValue;
}

function parsePaymentCompleted(value: string | undefined): boolean {
  if (!value) return false;
  return ['1', 'true', 'yes', '済', '終了', '終了済み', '払込済み'].includes(value.trim().toLowerCase());
}

function yenFromForeign(amount: number, exchangeRate: number): number {
  return Math.round((amount || 0) * (exchangeRate || 0));
}

function calcAnnualPremium(premiumAmount: number, frequency: string): number {
  if (frequency === 'monthly') return premiumAmount * 12;
  if (frequency === 'annual') return premiumAmount;
  if (frequency === 'single') return 0;
  return 0;
}

export interface ImportResult {
  importedCount: number;
  failedCount: number;
  errors: RowError[];
  state?: AppState;
  code?: string;
  message?: string;
  duplicates?: DuplicateInfo[];
}

export function importCsv(
  caseId: string,
  fileBuffer: Buffer,
  overwriteDuplicates: boolean,
): ImportResult {
  const encoding = detectEncoding(fileBuffer);
  const csvText = encoding === 'utf-8'
    ? fileBuffer.toString('utf-8').replace(/^﻿/, '')
    : iconv.decode(fileBuffer, encoding);

  let records: Record<string, string>[];
  try {
    records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      bom: true,
      trim: true,
    });
  } catch {
    return { importedCount: 0, failedCount: 0, errors: [{ row: 0, message: 'CSV の解析に失敗しました' }] };
  }

  if (records.length === 0) {
    return { importedCount: 0, failedCount: 0, errors: [{ row: 0, message: 'CSV にデータ行がありません' }] };
  }

  records = normalizeHeaders(records);

  const db = getDb();
  const currentState = getAppState(caseId);
  const commonUsdJpyRate = currentState?.valuationSettings?.usdJpyRate || 0;
  const memberRows = db.prepare('SELECT id, name FROM family_members WHERE case_id = ?').all(caseId) as { id: string; name: string }[];
  const memberByName = new Map<string, FamilyMember['id']>();
  for (const m of memberRows) {
    memberByName.set(m.name, m.id);
  }

  const existingPolicies = db.prepare('SELECT id, policy_number FROM policies WHERE case_id = ?').all(caseId) as { id: string; policy_number: string | null }[];
  const existingByNumber = new Map<string, string>();
  for (const p of existingPolicies) {
    if (p.policy_number && p.policy_number.trim() !== '') {
      existingByNumber.set(p.policy_number, p.id);
    }
  }

  const errors: RowError[] = [];
  const parsed: ParsedPolicy[] = [];
  const duplicates: DuplicateInfo[] = [];

  for (let i = 0; i < records.length; i++) {
    const row = records[i] as CsvRow;
    const rowNum = i + 2;

    if (row.companyName?.startsWith('※') || row.policyType?.startsWith('※')) {
      continue;
    }

    if (!row.companyName?.trim()) {
      errors.push({ row: rowNum, message: '保険会社は必須です' });
      continue;
    }
    const normalizedPolicyType = row.policyType?.trim() ? normalizePolicyType(row.policyType.trim()) : null;
    if (!normalizedPolicyType || !VALID_POLICY_TYPES.includes(normalizedPolicyType)) {
      errors.push({ row: rowNum, message: '保険種類が不正です' });
      continue;
    }
    if (!row.contractDate?.trim()) {
      errors.push({ row: rowNum, message: '契約日は必須です' });
      continue;
    }
    if (!row.insuredName?.trim()) {
      errors.push({ row: rowNum, message: '被保険者名は必須です' });
      continue;
    }

    const insuredId = memberByName.get(row.insuredName.trim());
    if (!insuredId) {
      errors.push({ row: rowNum, message: `被保険者「${row.insuredName.trim()}」が家族情報に存在しません` });
      continue;
    }

    let beneficiaryId = '';
    if (row.beneficiaryName?.trim()) {
      const bid = memberByName.get(row.beneficiaryName.trim());
      if (!bid) {
        errors.push({ row: rowNum, message: `受取人「${row.beneficiaryName.trim()}」が家族情報に存在しません` });
        continue;
      }
      beneficiaryId = bid;
    }

    let pensionRecipientId = '';
    let pensionSuccessorRecipientId = '';
    if (normalizedPolicyType === '個人年金保険') {
      const recipientName = row.pensionRecipientName?.trim() || row.insuredName.trim();
      pensionRecipientId = memberByName.get(recipientName) || '';
      if (!pensionRecipientId) {
        errors.push({ row: rowNum, message: `年金受取人「${recipientName}」が家族情報に存在しません` });
        continue;
      }
      if (row.pensionSuccessorRecipientName?.trim()) {
        pensionSuccessorRecipientId = memberByName.get(row.pensionSuccessorRecipientName.trim()) || '';
        if (!pensionSuccessorRecipientId) {
          errors.push({ row: rowNum, message: `死亡時の継続受取人「${row.pensionSuccessorRecipientName.trim()}」が家族情報に存在しません` });
          continue;
        }
      }
    }

    if (normalizedPolicyType !== '個人年金保険' && !row.policyEndAge?.trim()) {
      errors.push({ row: rowNum, message: '保険期間は必須です' });
      continue;
    }
    if (!row.paymentFrequency?.trim() || !VALID_FREQUENCIES.includes(row.paymentFrequency.trim() as typeof VALID_FREQUENCIES[number])) {
      errors.push({ row: rowNum, message: '払方は monthly, annual, single のいずれかが必要です' });
      continue;
    }
    if (!row.premiumAmount?.trim() && !row.foreignPremiumAmount?.trim()) {
      errors.push({ row: rowNum, message: '保険料は必須です' });
      continue;
    }
    const hasFiscalYearPensionStart = normalizedPolicyType === '個人年金保険'
      && Boolean(row.pensionStartFiscalYear?.trim());
    if (!hasFiscalYearPensionStart && !row.paymentEndDate?.trim() && !row.paymentEndAge?.trim()) {
      errors.push({ row: rowNum, message: '払込終了年月日または払込終了年齢は必須です' });
      continue;
    }

    const insuredBirthRow = db.prepare('SELECT birth_date FROM family_members WHERE id = ?').get(insuredId) as { birth_date: string } | undefined;
    const insuredBirthDate = insuredBirthRow?.birth_date ?? '';

    const hasBirthDate = Boolean(insuredBirthDate && !isNaN(new Date(insuredBirthDate).getTime()));

    let contractAge = parseIntOrDefault(row.contractAge, -1);
    if (contractAge < 0 && hasBirthDate && row.contractDate?.trim()) {
      contractAge = calcAge(insuredBirthDate, row.contractDate.trim());
    }
    if (contractAge < 0) contractAge = 0;

    const pensionStartMode: Policy['pensionStartMode'] = normalizedPolicyType === '個人年金保険'
      && (row.pensionStartMode?.trim() === 'fiscalYear'
        || row.pensionStartMode?.includes('年度')
        || hasFiscalYearPensionStart)
      ? 'fiscalYear'
      : 'age';
    const pensionStartFiscalYear = parseIntOrDefault(row.pensionStartFiscalYear, 0);
    let paymentEndAge = parseIntOrDefault(row.paymentEndAge, -1);
    if (pensionStartMode === 'fiscalYear' && pensionStartFiscalYear > 0 && hasBirthDate) {
      paymentEndAge = calcAge(insuredBirthDate, `${pensionStartFiscalYear}-04-01`);
    }
    if (paymentEndAge < 0 && hasBirthDate && row.paymentEndDate?.trim()) {
      paymentEndAge = calcAge(insuredBirthDate, row.paymentEndDate.trim());
    }
    if (paymentEndAge < 0) paymentEndAge = 0;

    const policyType = normalizedPolicyType;
    let policyEndAge = parseIntOrDefault(row.policyEndAge, 0);
    if (normalizedPolicyType === '終身保険' || normalizedPolicyType === '変額終身保険') {
      policyEndAge = 999;
    }
    const legacyPensionPayoutYears = policyEndAge > paymentEndAge ? policyEndAge - paymentEndAge : 0;
    const pensionPayoutYears = normalizedPolicyType === '個人年金保険'
      ? parseIntOrDefault(row.pensionPayoutYears, legacyPensionPayoutYears)
      : 0;
    if (normalizedPolicyType === '個人年金保険' && paymentEndAge > 0 && pensionPayoutYears > 0) {
      policyEndAge = paymentEndAge + pensionPayoutYears;
    }
    const currency = row.currency?.trim() === 'USD' || row.currency?.trim() === 'ドル' ? 'USD' : 'JPY';
    const legacyExchangeRate = currency === 'USD' ? parseNumberOrDefault(row.exchangeRate, 0) : 0;
    const exchangeRate = currency === 'USD' ? (commonUsdJpyRate || legacyExchangeRate) : 0;
    const contractExchangeRate = parseNumberOrDefault(row.contractExchangeRate, legacyExchangeRate);
    const foreignPremiumAmount = parseNumberOrDefault(row.foreignPremiumAmount, 0);
    const foreignDeathBenefitDisease = parseNumberOrDefault(row.foreignDeathBenefitDisease, 0);
    const foreignDeathBenefitAccident = parseNumberOrDefault(row.foreignDeathBenefitAccident, 0);
    const foreignHospDayDisease = parseNumberOrDefault(row.foreignHospDayDisease, 0);
    const foreignHospDayAccident = parseNumberOrDefault(row.foreignHospDayAccident, 0);
    const foreignDiagnosisBenefit = parseNumberOrDefault(row.foreignDiagnosisBenefit, 0);
    const foreignMaturityBenefit = parseNumberOrDefault(row.foreignMaturityBenefit, 0);
    if (currency === 'USD' && exchangeRate <= 0) {
      errors.push({ row: rowNum, message: 'ドル建ては為替レートが必須です' });
      continue;
    }
    const freq = row.paymentFrequency!.trim() as Policy['paymentFrequency'];
    const paymentCurrency: Policy['paymentCurrency'] = row.paymentCurrency?.trim().toUpperCase() === 'USD' ? 'USD' : 'JPY';
    const actualPremiumPaidJpy = parseIntOrDefault(row.actualPremiumPaidJpy, 0);
    const maturityBenefit = currency === 'USD' && foreignMaturityBenefit > 0
      ? yenFromForeign(foreignMaturityBenefit, exchangeRate)
      : parseIntOrDefault(row.maturityBenefit, 0);
    const premiumAmount = currency === 'USD' && freq === 'single' && paymentCurrency === 'JPY' && actualPremiumPaidJpy > 0
      ? actualPremiumPaidJpy
      : currency === 'USD' && foreignPremiumAmount > 0
        ? yenFromForeign(foreignPremiumAmount, exchangeRate)
      : parseIntOrDefault(row.premiumAmount, 0);
    const deathBenefitDisease = currency === 'USD' && foreignDeathBenefitDisease > 0
      ? yenFromForeign(foreignDeathBenefitDisease, exchangeRate)
      : parseIntOrDefault(row.deathBenefitDisease, 0);
    const deathBenefitAccident = currency === 'USD' && foreignDeathBenefitAccident > 0
      ? yenFromForeign(foreignDeathBenefitAccident, exchangeRate)
      : parseIntOrDefault(row.deathBenefitAccident, 0);
    const hospDayDisease = currency === 'USD' && foreignHospDayDisease > 0
      ? yenFromForeign(foreignHospDayDisease, exchangeRate)
      : parseIntOrDefault(row.hospDayDisease, 0);
    const hospDayAccident = currency === 'USD' && foreignHospDayAccident > 0
      ? yenFromForeign(foreignHospDayAccident, exchangeRate)
      : parseIntOrDefault(row.hospDayAccident, 0);
    const diagnosisBenefit = currency === 'USD' && foreignDiagnosisBenefit > 0
      ? yenFromForeign(foreignDiagnosisBenefit, exchangeRate)
      : parseIntOrDefault(row.diagnosisBenefit, 0);
    if (policyType === '個人年金保険') {
      if (!paymentEndAge || paymentEndAge === 999) {
        errors.push({ row: rowNum, message: '個人年金保険は年金受取開始年齢が必須です' });
        continue;
      }
      if (pensionStartMode === 'fiscalYear' && (!pensionStartFiscalYear || !hasBirthDate)) {
        errors.push({ row: rowNum, message: '年度指定には年金受取開始年度と被保険者の生年月日が必須です' });
        continue;
      }
      if (!pensionPayoutYears || pensionPayoutYears < 1 || pensionPayoutYears > 100) {
        errors.push({ row: rowNum, message: '個人年金保険は1〜100年の年金受取年数が必須です' });
        continue;
      }
      if (maturityBenefit <= 0) {
        errors.push({ row: rowNum, message: '個人年金保険は年金原資（受取総額）が必須です' });
        continue;
      }
    }
    if (policyType !== '個人年金保険' && FINITE_END_AGE_TYPES.includes(policyType) && policyEndAge === 999) {
      errors.push({ row: rowNum, message: `${policyType}は保険期間の終了年齢が必須です` });
      continue;
    }
    if (policyType !== '個人年金保険' && DEATH_BENEFIT_TYPES.includes(policyType)) {
      if (!beneficiaryId) {
        errors.push({ row: rowNum, message: `${policyType}は受取人が必須です` });
        continue;
      }
      if (deathBenefitDisease <= 0) {
        errors.push({
          row: rowNum,
          message: `${policyType}は${isIncomeProtectionPolicyType(policyType) ? '死亡保険金月額' : '死亡保障額'}が必須です`,
        });
        continue;
      }
      if (isIncomeProtectionPolicyType(policyType) && deathBenefitDisease >= 1000000) {
        errors.push({ row: rowNum, message: '収入保障保険は死亡保険金月額を入力してください。総額ではなく月額を確認してください' });
        continue;
      }
    }

    const policyNumber = row.policyNumber?.trim() ?? '';
    if (policyNumber && existingByNumber.has(policyNumber)) {
      duplicates.push({
        row: rowNum,
        policyNumber,
        existingPolicyId: existingByNumber.get(policyNumber)!,
      });
    }

    parsed.push({
      policy: {
        id: uuidv4(),
        companyName: row.companyName!.trim(),
        policyType,
        policyNumber,
        contractDate: row.contractDate!.trim(),
        contractAge,
        insuredId,
        beneficiaryId,
        pensionRecipientId: policyType === '個人年金保険' ? pensionRecipientId : undefined,
        pensionSuccessorRecipientId: policyType === '個人年金保険' ? pensionSuccessorRecipientId : undefined,
        pensionStartMode: policyType === '個人年金保険' ? pensionStartMode : undefined,
        pensionStartFiscalYear: policyType === '個人年金保険' && pensionStartMode === 'fiscalYear' ? pensionStartFiscalYear : undefined,
        pensionPayoutYears: policyType === '個人年金保険' ? pensionPayoutYears : undefined,
        deathBenefitDisease,
        deathBenefitAccident: isIncomeProtectionPolicyType(policyType) ? 0 : deathBenefitAccident,
        hospDayDisease,
        hospDayAccident,
        diagnosisBenefit,
        policyEndAge,
        currency,
        exchangeRate,
        contractExchangeRate: currency === 'USD' && contractExchangeRate > 0 ? contractExchangeRate : undefined,
        foreignPremiumAmount,
        foreignDeathBenefitDisease,
        foreignDeathBenefitAccident,
        foreignHospDayDisease,
        foreignHospDayAccident,
        foreignDiagnosisBenefit,
        foreignMaturityBenefit,
        paymentFrequency: freq,
        paymentCurrency: currency === 'USD' && freq === 'single' ? paymentCurrency : undefined,
        premiumPaymentDate: currency === 'USD' && freq === 'single' ? row.premiumPaymentDate?.trim() || undefined : undefined,
        actualPremiumPaidJpy: currency === 'USD' && freq === 'single' && paymentCurrency === 'JPY' && actualPremiumPaidJpy > 0
          ? actualPremiumPaidJpy
          : undefined,
        paymentExchangeRate: currency === 'USD' && freq === 'single' && paymentCurrency === 'JPY'
          && actualPremiumPaidJpy > 0 && foreignPremiumAmount > 0
          ? actualPremiumPaidJpy / foreignPremiumAmount
          : undefined,
        premiumAmount,
        paymentEndAge,
        premiumPaymentCompleted: parsePaymentCompleted(row.premiumPaymentCompleted),
        annualPremium: calcAnnualPremium(premiumAmount, freq),
        maturityBenefit,
        consultantNote: row.consultantNote?.trim() || undefined,
      },
      paymentEndDate: row.paymentEndDate?.trim() || null,
    });
  }

  if (errors.length > 0) {
    return {
      importedCount: 0,
      failedCount: errors.length,
      errors,
    };
  }

  if (duplicates.length > 0 && !overwriteDuplicates) {
    return {
      importedCount: 0,
      failedCount: 0,
      errors: [],
      code: 'DUPLICATE_POLICY_NUMBER',
      message: '同じ証券番号の保険証券があります。上書きしますか？',
      duplicates,
    };
  }

  const ts = new Date().toISOString();
  const maxSortRow = db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS max_sort FROM policies WHERE case_id = ?').get(caseId) as { max_sort: number };
  let nextSort = maxSortRow.max_sort + 1;

  const duplicateIds = new Set(duplicates.map(d => d.existingPolicyId));

  db.transaction(() => {
    if (overwriteDuplicates && duplicateIds.size > 0) {
      const deleteStmt = db.prepare('DELETE FROM policies WHERE id = ?');
      for (const id of duplicateIds) {
        deleteStmt.run(id);
      }
    }

    const insertPolicy = db.prepare(`INSERT INTO policies (id, case_id, company_name, policy_type, policy_number, contract_date, contract_age, insured_member_id, beneficiary_member_id, death_benefit_disease, death_benefit_accident, hosp_day_disease, hosp_day_accident, diagnosis_benefit, policy_end_age, currency, exchange_rate, foreign_premium_amount, foreign_death_benefit_disease, foreign_death_benefit_accident, foreign_hosp_day_disease, foreign_hosp_day_accident, foreign_diagnosis_benefit, foreign_maturity_benefit, payment_frequency, premium_amount, payment_end_date, payment_end_age, annual_premium, maturity_benefit, consultant_note, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const updatePensionSettings = db.prepare('UPDATE policies SET pension_settings = ? WHERE id = ?');
    const updatePaymentCompleted = db.prepare('UPDATE policies SET premium_payment_completed = ? WHERE id = ?');
    const updatePaymentDetails = db.prepare('UPDATE policies SET payment_details = ? WHERE id = ?');

    for (const { policy, paymentEndDate } of parsed) {
      insertPolicy.run(
        policy.id, caseId, policy.companyName, policy.policyType,
        policy.policyNumber || null, policy.contractDate, policy.contractAge,
        policy.insuredId, policy.beneficiaryId || null,
        policy.deathBenefitDisease, policy.deathBenefitAccident,
        policy.hospDayDisease, policy.hospDayAccident,
        policy.diagnosisBenefit, policy.policyEndAge,
        policy.currency ?? 'JPY', policy.exchangeRate ?? 0,
        policy.foreignPremiumAmount ?? 0,
        policy.foreignDeathBenefitDisease ?? 0,
        policy.foreignDeathBenefitAccident ?? 0,
        policy.foreignHospDayDisease ?? 0,
        policy.foreignHospDayAccident ?? 0,
        policy.foreignDiagnosisBenefit ?? 0,
        policy.foreignMaturityBenefit ?? 0,
        policy.paymentFrequency, policy.premiumAmount,
        paymentEndDate, policy.paymentEndAge,
        policy.annualPremium, policy.maturityBenefit,
        policy.consultantNote ?? null, nextSort, ts, ts,
      );
      if (policy.policyType === '個人年金保険') {
        updatePensionSettings.run(JSON.stringify({
          pensionRecipientId: policy.pensionRecipientId || policy.insuredId,
          pensionSuccessorRecipientId: policy.pensionSuccessorRecipientId || '',
          pensionStartMode: policy.pensionStartMode || 'age',
          pensionStartFiscalYear: policy.pensionStartFiscalYear,
          pensionPayoutYears: policy.pensionPayoutYears,
        }), policy.id);
      }
      updatePaymentCompleted.run(policy.premiumPaymentCompleted ? 1 : 0, policy.id);
      updatePaymentDetails.run(JSON.stringify({
        contractExchangeRate: policy.contractExchangeRate,
        paymentCurrency: policy.paymentCurrency,
        premiumPaymentDate: policy.premiumPaymentDate,
        actualPremiumPaidJpy: policy.actualPremiumPaidJpy,
        paymentExchangeRate: policy.paymentExchangeRate,
      }), policy.id);
      nextSort++;
    }

    db.prepare('INSERT OR REPLACE INTO app_state_meta (case_id, schema_version, updated_at, valuation_settings) VALUES (?, 1, ?, ?)').run(
      caseId,
      ts,
      JSON.stringify(currentState?.valuationSettings ?? { usdJpyRate: commonUsdJpyRate, fxRateDate: '' }),
    );
  })();

  return {
    importedCount: parsed.length,
    failedCount: 0,
    errors: [],
    state: getAppState(caseId)!,
  };
}
