import { v4 as uuidv4 } from 'uuid';
import { getDb } from '@/lib/db';
import { getSampleFamilyMembers, getSampleAgency, getSamplePolicies } from '@/lib/sampleData';
import { isIncomeProtectionPolicyType, normalizePolicyType, SURRENDER_PROJECTION_MODES } from '@/types';
import type { AppState, FamilyMember, Policy, Agency, BeneficiaryAllocation, EvaluationOverride, SurrenderValuePoint, ValuationSettings } from '@/types';
import { normalizeBeneficiaryAllocations } from '@/utils/beneficiaryUtils';
import {
  applyValuationRateToPolicy,
  inferValuationSettings,
  storedSurrenderAmount,
  surrenderAmountForStorage,
  yenFromUsd,
} from '@/utils/currencyUtils';

interface FamilyMemberRow {
  id: string;
  case_id: string;
  name: string;
  name_kana: string;
  relationship: string;
  birth_date: string;
  gender: string;
  sort_order: number;
}

interface PolicyRow {
  id: string;
  case_id: string;
  company_name: string;
  policy_type: string;
  policy_number: string | null;
  contract_date: string;
  contract_age: number;
  insured_member_id: string;
  beneficiary_member_id: string | null;
  pension_settings: string | null;
  death_benefit_disease: number;
  death_benefit_accident: number;
  hosp_day_disease: number;
  hosp_day_accident: number;
  diagnosis_benefit: number;
  policy_end_age: number;
  currency: string;
  exchange_rate: number;
  payment_frequency: string;
  premium_amount: number;
  payment_end_date: string | null;
  payment_end_age: number;
  premium_payment_completed: number;
  payment_details: string | null;
  annual_premium: number;
  maturity_benefit: number;
  consultant_note: string | null;
  evaluation_overrides: string | null;
  surrender_values: string | null;
  surrender_projection: string | null;
  sort_order: number;
}

interface AgencyRow {
  id: string;
  case_id: string;
  name: string;
  representative: string;
  phone: string;
  logo_data_url: string | null;
  print_logo: number | null;
}

interface MetaRow {
  updated_at: string;
  schema_version: number;
  valuation_settings: string | null;
}

function rowToFamilyMember(row: FamilyMemberRow): FamilyMember {
  return {
    id: row.id,
    name: row.name,
    nameKana: row.name_kana,
    relationship: row.relationship,
    birthDate: row.birth_date,
    gender: row.gender as 'male' | 'female',
  };
}

function parseEvaluationOverrides(raw: string | null): EvaluationOverride[] | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function parseSurrenderValues(raw: string | null): SurrenderValuePoint[] | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return undefined;
    const points = parsed.filter(
      (point): point is SurrenderValuePoint =>
        !!point && typeof point === 'object'
        && typeof point.age === 'number' && typeof point.amount === 'number',
    );
    return points.length > 0 ? points : undefined;
  } catch {
    return undefined;
  }
}

/** 1件の契約の受取割合を入れ替える。家族情報に居ない受取人は入れない（外部キーで弾かれる） */
function replacePolicyBeneficiaries(policyId: string, allocations: BeneficiaryAllocation[]): void {
  const db = getDb();
  db.prepare('DELETE FROM policy_beneficiaries WHERE policy_id = ?').run(policyId);
  const link = db.prepare(`
    INSERT OR IGNORE INTO policy_beneficiaries (policy_id, beneficiary_member_id, percentage, sort_order)
    SELECT @policyId, id, @percentage, @sortOrder FROM family_members WHERE id = @beneficiaryId
  `);
  allocations.forEach((allocation, index) => {
    link.run({ policyId, beneficiaryId: allocation.beneficiaryId, percentage: allocation.percentage, sortOrder: index });
  });
}

/** ケース1件ぶんの受取割合を契約ごとにまとめて読む */
function readBeneficiariesByPolicy(caseId: string): Map<string, BeneficiaryAllocation[]> {
  const rows = getDb().prepare(`
    SELECT b.policy_id, b.beneficiary_member_id, b.percentage
    FROM policy_beneficiaries b
    JOIN policies p ON p.id = b.policy_id
    WHERE p.case_id = ?
    ORDER BY b.policy_id, b.sort_order, b.beneficiary_member_id
  `).all(caseId) as { policy_id: string; beneficiary_member_id: string; percentage: number }[];
  const byPolicy = new Map<string, BeneficiaryAllocation[]>();
  for (const row of rows) {
    const allocation = { beneficiaryId: row.beneficiary_member_id, percentage: row.percentage };
    const allocations = byPolicy.get(row.policy_id);
    if (allocations) allocations.push(allocation);
    else byPolicy.set(row.policy_id, [allocation]);
  }
  return byPolicy;
}

function parsePensionSettings(
  raw: string | null,
  fallback: Pick<Policy, 'policyType' | 'insuredId' | 'paymentEndAge' | 'policyEndAge'>,
): Pick<Policy, 'pensionRecipientId' | 'pensionSuccessorRecipientId' | 'pensionStartMode' | 'pensionStartFiscalYear' | 'pensionPayoutYears'> {
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return {
        pensionRecipientId: typeof parsed.pensionRecipientId === 'string' ? parsed.pensionRecipientId : fallback.insuredId,
        pensionSuccessorRecipientId: typeof parsed.pensionSuccessorRecipientId === 'string' ? parsed.pensionSuccessorRecipientId : '',
        pensionStartMode: parsed.pensionStartMode === 'fiscalYear' ? 'fiscalYear' : 'age',
        pensionStartFiscalYear: typeof parsed.pensionStartFiscalYear === 'number' ? parsed.pensionStartFiscalYear : undefined,
        pensionPayoutYears: typeof parsed.pensionPayoutYears === 'number' ? parsed.pensionPayoutYears : undefined,
      };
    } catch {
      // 旧データ互換の既定値へフォールバック
    }
  }
  if (fallback.policyType !== '個人年金保険') return {};
  return {
    pensionRecipientId: fallback.insuredId,
    pensionSuccessorRecipientId: '',
    pensionStartMode: 'age',
    pensionPayoutYears: fallback.policyEndAge !== 999
      ? Math.max(1, fallback.policyEndAge - fallback.paymentEndAge)
      : 20,
  };
}

function serializePensionSettings(policy: Policy): string | null {
  if (policy.policyType !== '個人年金保険') return null;
  return JSON.stringify({
    pensionRecipientId: policy.pensionRecipientId || policy.insuredId,
    pensionSuccessorRecipientId: policy.pensionSuccessorRecipientId || '',
    pensionStartMode: policy.pensionStartMode === 'fiscalYear' ? 'fiscalYear' : 'age',
    pensionStartFiscalYear: policy.pensionStartFiscalYear,
    pensionPayoutYears: policy.pensionPayoutYears || Math.max(1, policy.policyEndAge - policy.paymentEndAge),
  });
}

function parsePaymentDetails(raw: string | null): Pick<Policy, 'contractExchangeRate' | 'paymentCurrency' | 'premiumPaymentDate' | 'actualPremiumPaidJpy' | 'paymentExchangeRate'> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      contractExchangeRate: typeof parsed.contractExchangeRate === 'number' ? parsed.contractExchangeRate : undefined,
      paymentCurrency: parsed.paymentCurrency === 'JPY' || parsed.paymentCurrency === 'USD' ? parsed.paymentCurrency : undefined,
      premiumPaymentDate: typeof parsed.premiumPaymentDate === 'string' ? parsed.premiumPaymentDate : undefined,
      actualPremiumPaidJpy: typeof parsed.actualPremiumPaidJpy === 'number' ? parsed.actualPremiumPaidJpy : undefined,
      paymentExchangeRate: typeof parsed.paymentExchangeRate === 'number' ? parsed.paymentExchangeRate : undefined,
    };
  } catch {
    return {};
  }
}

function serializePaymentDetails(policy: Policy): string | null {
  if (
    policy.contractExchangeRate === undefined
    && policy.paymentCurrency === undefined
    && !policy.premiumPaymentDate
    && policy.actualPremiumPaidJpy === undefined
    && policy.paymentExchangeRate === undefined
  ) return null;
  return JSON.stringify({
    contractExchangeRate: policy.contractExchangeRate,
    paymentCurrency: policy.paymentCurrency,
    premiumPaymentDate: policy.premiumPaymentDate,
    actualPremiumPaidJpy: policy.actualPremiumPaidJpy,
    paymentExchangeRate: policy.paymentExchangeRate,
  });
}

function parseValuationSettings(raw: string | null): ValuationSettings | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      usdJpyRate: typeof parsed.usdJpyRate === 'number' ? parsed.usdJpyRate : 0,
      fxRateDate: typeof parsed.fxRateDate === 'string' ? parsed.fxRateDate : '',
    };
  } catch {
    return undefined;
  }
}

/**
 * 保存する金額は「契約通貨での額」。外貨建て(USD)の契約は外貨の欄が本物で、円換算額は
 * 読み出し時にその案件のレートから作る（applyValuationRateToPolicy）ので列には入れない。
 */
function policyAmountsForStorage(policy: Policy) {
  const isForeign = (policy.currency ?? 'JPY') === 'USD';
  const premiumAmount = isForeign ? policy.foreignPremiumAmount ?? 0 : policy.premiumAmount ?? 0;
  return {
    premiumAmount,
    // 年額保険料は保険料から導く値。外貨建ては外貨の保険料から作る
    annualPremium: isForeign
      ? premiumAmount * (policy.paymentFrequency === 'monthly' ? 12 : 1)
      : policy.annualPremium ?? 0,
    deathBenefitDisease: isForeign ? policy.foreignDeathBenefitDisease ?? 0 : policy.deathBenefitDisease ?? 0,
    deathBenefitAccident: isForeign ? policy.foreignDeathBenefitAccident ?? 0 : policy.deathBenefitAccident ?? 0,
    hospDayDisease: isForeign ? policy.foreignHospDayDisease ?? 0 : policy.hospDayDisease ?? 0,
    hospDayAccident: isForeign ? policy.foreignHospDayAccident ?? 0 : policy.hospDayAccident ?? 0,
    diagnosisBenefit: isForeign ? policy.foreignDiagnosisBenefit ?? 0 : policy.diagnosisBenefit ?? 0,
    maturityBenefit: isForeign ? policy.foreignMaturityBenefit ?? 0 : policy.maturityBenefit ?? 0,
  };
}

/**
 * 解約返戻金の点も契約通貨での額だけを保存する。外貨建ての円換算額（amount）は
 * 読み出しで作る写しなので JSON には入れない。
 */
function surrenderValuesForStorage(policy: Policy): string | null {
  const points = policy.surrenderValues;
  if (!points?.length) return null;
  const isForeign = (policy.currency ?? 'JPY') === 'USD';
  const stored = points.map(point => ({
    age: point.age,
    amount: surrenderAmountForStorage(point, isForeign, policy.exchangeRate ?? 0),
  }));
  return JSON.stringify(stored);
}

/**
 * policies への INSERT はサンプル投入・保存・CSV取込の3箇所にある。列を足したときに
 * 片方だけ直す事故を防ぐため、SQL と値の組み立てはここだけに置く。
 * pension_settings / premium_payment_completed / payment_details / surrender_projection は
 * 3箇所とも挿入の後に UPDATE で入れているので、ここには含めない。
 */
export const POLICY_INSERT_SQL = `
  INSERT INTO policies (
    id, case_id, company_name, policy_type, policy_number, contract_date, contract_age,
    insured_member_id, beneficiary_member_id,
    death_benefit_disease, death_benefit_accident, hosp_day_disease, hosp_day_accident, diagnosis_benefit,
    policy_end_age, currency, exchange_rate,
    payment_frequency, premium_amount, payment_end_date, payment_end_age,
    annual_premium, maturity_benefit,
    surrender_values, consultant_note, evaluation_overrides,
    sort_order, created_at, updated_at
  ) VALUES (
    @id, @caseId, @companyName, @policyType, @policyNumber, @contractDate, @contractAge,
    @insuredMemberId, @beneficiaryMemberId,
    @deathBenefitDisease, @deathBenefitAccident, @hospDayDisease, @hospDayAccident, @diagnosisBenefit,
    @policyEndAge, @currency, @exchangeRate,
    @paymentFrequency, @premiumAmount, @paymentEndDate, @paymentEndAge,
    @annualPremium, @maturityBenefit,
    @surrenderValues, @consultantNote, @evaluationOverrides,
    @sortOrder, @createdAt, @updatedAt
  )
`;

export function policyInsertParams(
  policy: Policy,
  options: { caseId: string; sortOrder: number; timestamp: string; paymentEndDate?: string | null },
): Record<string, string | number | null> {
  const amounts = policyAmountsForStorage(policy);
  return {
    id: policy.id,
    caseId: options.caseId,
    companyName: policy.companyName,
    policyType: policy.policyType,
    policyNumber: policy.policyNumber || null,
    contractDate: policy.contractDate,
    contractAge: policy.contractAge,
    insuredMemberId: policy.insuredId,
    beneficiaryMemberId: policy.beneficiaryId || null,
    deathBenefitDisease: amounts.deathBenefitDisease,
    deathBenefitAccident: amounts.deathBenefitAccident,
    hospDayDisease: amounts.hospDayDisease,
    hospDayAccident: amounts.hospDayAccident,
    diagnosisBenefit: amounts.diagnosisBenefit,
    policyEndAge: policy.policyEndAge,
    currency: policy.currency ?? 'JPY',
    // 保存時のレートの控え。案件のレートが未設定の DB から引き継ぐためだけに残している
    exchangeRate: policy.exchangeRate ?? 0,
    paymentFrequency: policy.paymentFrequency,
    premiumAmount: amounts.premiumAmount,
    paymentEndDate: options.paymentEndDate ?? null,
    paymentEndAge: policy.paymentEndAge,
    annualPremium: amounts.annualPremium,
    maturityBenefit: amounts.maturityBenefit,
    surrenderValues: surrenderValuesForStorage(policy),
    consultantNote: policy.consultantNote ?? null,
    evaluationOverrides: policy.evaluationOverrides?.length ? JSON.stringify(policy.evaluationOverrides) : null,
    sortOrder: options.sortOrder,
    createdAt: options.timestamp,
    updatedAt: options.timestamp,
  };
}

function normalizePolicyForStorage(policy: Policy): Policy {
  const policyType = normalizePolicyType(policy.policyType);
  const isIncomeProtection = isIncomeProtectionPolicyType(policyType);
  const isWholeLifeCoverage = policyType === '終身保険' || policyType === '変額終身保険';
  const beneficiaryAllocations = normalizeBeneficiaryAllocations(policy.beneficiaryAllocations, policy.beneficiaryId);
  return {
    ...policy,
    policyType,
    beneficiaryId: beneficiaryAllocations[0]?.beneficiaryId || '',
    beneficiaryAllocations,
    policyEndAge: isWholeLifeCoverage ? 999 : policy.policyEndAge,
    deathBenefitAccident: isIncomeProtection ? 0 : policy.deathBenefitAccident,
    foreignDeathBenefitAccident: isIncomeProtection ? 0 : policy.foreignDeathBenefitAccident,
  };
}

function rowToPolicy(row: PolicyRow, allocations: BeneficiaryAllocation[]): Policy {
  const policyType = normalizePolicyType(row.policy_type);
  const insuredId = row.insured_member_id;
  const paymentEndAge = row.payment_end_age;
  const policyEndAge = row.policy_end_age;
  // 金額の列は契約通貨での額。外貨建ては行に残っている保存時のレートで一旦円に直し、
  // 案件のレートは getAppState が掛け直す
  const isForeign = row.currency === 'USD';
  const yen = (amount: number) => (isForeign ? yenFromUsd(amount, row.exchange_rate) : amount);
  const foreign = (amount: number) => (isForeign ? amount : 0);
  return normalizePolicyForStorage({
    id: row.id,
    companyName: row.company_name,
    policyType,
    policyNumber: row.policy_number ?? '',
    contractDate: row.contract_date,
    contractAge: row.contract_age,
    insuredId,
    beneficiaryId: row.beneficiary_member_id ?? '',
    beneficiaryAllocations: normalizeBeneficiaryAllocations(allocations, row.beneficiary_member_id ?? ''),
    deathBenefitDisease: yen(row.death_benefit_disease),
    deathBenefitAccident: yen(row.death_benefit_accident),
    hospDayDisease: yen(row.hosp_day_disease),
    hospDayAccident: yen(row.hosp_day_accident),
    diagnosisBenefit: yen(row.diagnosis_benefit),
    policyEndAge,
    currency: isForeign ? 'USD' : 'JPY',
    exchangeRate: row.exchange_rate,
    foreignPremiumAmount: foreign(row.premium_amount),
    foreignDeathBenefitDisease: foreign(row.death_benefit_disease),
    foreignDeathBenefitAccident: foreign(row.death_benefit_accident),
    foreignHospDayDisease: foreign(row.hosp_day_disease),
    foreignHospDayAccident: foreign(row.hosp_day_accident),
    foreignDiagnosisBenefit: foreign(row.diagnosis_benefit),
    foreignMaturityBenefit: foreign(row.maturity_benefit),
    paymentFrequency: row.payment_frequency as Policy['paymentFrequency'],
    premiumAmount: yen(row.premium_amount),
    paymentEndAge,
    premiumPaymentCompleted: Boolean(row.premium_payment_completed),
    annualPremium: yen(row.annual_premium),
    maturityBenefit: yen(row.maturity_benefit),
    surrenderValues: parseSurrenderValues(row.surrender_values)?.map(point => {
      const contractAmount = storedSurrenderAmount(point, isForeign);
      return isForeign
        ? { age: point.age, amount: yen(contractAmount), foreignAmount: contractAmount }
        : { age: point.age, amount: contractAmount };
    }),
    surrenderProjection: SURRENDER_PROJECTION_MODES.find(mode => mode === row.surrender_projection),
    consultantNote: row.consultant_note ?? undefined,
    evaluationOverrides: parseEvaluationOverrides(row.evaluation_overrides),
    ...parsePensionSettings(row.pension_settings, { policyType, insuredId, paymentEndAge, policyEndAge }),
    ...parsePaymentDetails(row.payment_details),
  });
}

function rowToAgency(row: AgencyRow): Agency {
  return {
    name: row.name,
    representative: row.representative,
    phone: row.phone,
    logoDataUrl: row.logo_data_url ?? undefined,
    printLogo: row.print_logo !== 0,
  };
}

// ロゴ未登録・印刷可否未指定は「ロゴなし・印刷する」を既定とする
function agencyStorageValues(agency: Agency): [string | null, number] {
  return [agency.logoDataUrl?.trim() || null, agency.printLogo === false ? 0 : 1];
}

function now(): string {
  return new Date().toISOString();
}

function insertSampleData(caseId: string): void {
  const db = getDb();
  const ts = now();

  db.prepare('INSERT OR REPLACE INTO cases (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)').run(caseId, 'default', ts, ts);

  const agency = getSampleAgency();
  const agencyId = uuidv4();
  db.prepare('INSERT INTO agencies (id, case_id, name, representative, phone, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(agencyId, caseId, agency.name, agency.representative, agency.phone, ts, ts);

  const members = getSampleFamilyMembers();
  const memberIdMap = new Map(members.map(member => [member.id, uuidv4()]));
  const insertMember = db.prepare('INSERT INTO family_members (id, case_id, name, name_kana, relationship, birth_date, gender, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  for (let i = 0; i < members.length; i++) {
    const m = members[i];
    insertMember.run(memberIdMap.get(m.id), caseId, m.name, m.nameKana, m.relationship, m.birthDate, m.gender, i, ts, ts);
  }

  const policies = getSamplePolicies();
  const insertPolicy = db.prepare(POLICY_INSERT_SQL);
  for (let i = 0; i < policies.length; i++) {
    const p = policies[i];
    const policyId = uuidv4();
    insertPolicy.run(policyInsertParams({
      ...p,
      id: policyId,
      insuredId: memberIdMap.get(p.insuredId) || p.insuredId,
      beneficiaryId: p.beneficiaryId ? memberIdMap.get(p.beneficiaryId) || p.beneficiaryId : '',
    }, { caseId, sortOrder: i, timestamp: ts }));
    const mappedAllocations = normalizeBeneficiaryAllocations(p.beneficiaryAllocations, p.beneficiaryId).map(allocation => ({
      ...allocation,
      beneficiaryId: memberIdMap.get(allocation.beneficiaryId) || allocation.beneficiaryId,
    }));
    replacePolicyBeneficiaries(policyId, mappedAllocations);
  }

  db.prepare('INSERT OR REPLACE INTO app_state_meta (case_id, schema_version, updated_at) VALUES (?, 1, ?)').run(caseId, ts);
}

export function getAppState(caseId: string): AppState | null {
  const db = getDb();

  const caseRow = db.prepare('SELECT id FROM cases WHERE id = ?').get(caseId) as { id: string } | undefined;
  if (!caseRow) return null;

  const memberRows = db.prepare('SELECT * FROM family_members WHERE case_id = ? ORDER BY sort_order').all(caseId) as FamilyMemberRow[];
  const policyRows = db.prepare('SELECT * FROM policies WHERE case_id = ? ORDER BY sort_order').all(caseId) as PolicyRow[];
  const agencyRow = db.prepare('SELECT * FROM agencies WHERE case_id = ?').get(caseId) as AgencyRow | undefined;
  const metaRow = db.prepare('SELECT updated_at, schema_version, valuation_settings FROM app_state_meta WHERE case_id = ?').get(caseId) as MetaRow | undefined;
  const beneficiariesByPolicy = readBeneficiariesByPolicy(caseId);

  const policies = policyRows.map(row => rowToPolicy(row, beneficiariesByPolicy.get(row.id) ?? []));
  const valuationSettings = parseValuationSettings(metaRow?.valuation_settings ?? null);
  // 外貨建ての円換算額は保存していないので、読み出しのここで今のレートから作る。
  // 画面だけで掛けていた頃は、エクスポート・バックアップ・portfolio-insights が
  // 保存時のレートのままの円額を吐いていた
  const { usdJpyRate } = inferValuationSettings(valuationSettings, policies);

  return {
    familyMembers: memberRows.map(rowToFamilyMember),
    policies: policies.map(policy => applyValuationRateToPolicy(policy, usdJpyRate)),
    agency: agencyRow ? rowToAgency(agencyRow) : { name: '', representative: '', phone: '' },
    valuationSettings,
    updatedAt: metaRow?.updated_at ?? undefined,
  };
}

export function initFromSample(caseId: string): AppState {
  const db = getDb();
  db.transaction(() => insertSampleData(caseId))();
  return getAppState(caseId)!;
}

export function saveAppState(caseId: string, state: AppState): AppState {
  const db = getDb();
  const ts = now();

  db.transaction(() => {
    db.prepare('INSERT OR IGNORE INTO cases (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)').run(caseId, 'default', ts, ts);
    db.prepare('UPDATE cases SET updated_at = ? WHERE id = ?').run(ts, caseId);

    db.prepare('DELETE FROM policies WHERE case_id = ?').run(caseId);
    db.prepare('DELETE FROM family_members WHERE case_id = ?').run(caseId);

    const insertMember = db.prepare('INSERT INTO family_members (id, case_id, name, name_kana, relationship, birth_date, gender, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (let i = 0; i < state.familyMembers.length; i++) {
      const m = state.familyMembers[i];
      insertMember.run(m.id, caseId, m.name, m.nameKana ?? '', m.relationship, m.birthDate, m.gender, i, ts, ts);
    }

    const existingAgency = db.prepare('SELECT name, representative, phone, logo_data_url, print_logo FROM agencies WHERE case_id = ?').get(caseId) as Omit<AgencyRow, 'id' | 'case_id'> | undefined;
    const [logoDataUrl, printLogo] = agencyStorageValues(state.agency);
    if (existingAgency) {
      // ロゴは data URL で数百KBになる。証券を1件直しただけで書き直すとWALが膨らむので、
      // 実際に変わったときだけ UPDATE する
      const isUnchanged = existingAgency.name === state.agency.name
        && existingAgency.representative === state.agency.representative
        && existingAgency.phone === state.agency.phone
        && (existingAgency.logo_data_url ?? null) === logoDataUrl
        && (existingAgency.print_logo === 0 ? 0 : 1) === printLogo;
      if (!isUnchanged) {
        db.prepare('UPDATE agencies SET name = ?, representative = ?, phone = ?, logo_data_url = ?, print_logo = ?, updated_at = ? WHERE case_id = ?').run(state.agency.name, state.agency.representative, state.agency.phone, logoDataUrl, printLogo, ts, caseId);
      }
    } else {
      db.prepare('INSERT INTO agencies (id, case_id, name, representative, phone, logo_data_url, print_logo, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(uuidv4(), caseId, state.agency.name, state.agency.representative, state.agency.phone, logoDataUrl, printLogo, ts, ts);
    }

    const insertPolicy = db.prepare(POLICY_INSERT_SQL);
    const updatePensionSettings = db.prepare('UPDATE policies SET pension_settings = ? WHERE id = ?');
    const updatePaymentCompleted = db.prepare('UPDATE policies SET premium_payment_completed = ? WHERE id = ?');
    const updatePaymentDetails = db.prepare('UPDATE policies SET payment_details = ? WHERE id = ?');
    const updateSurrenderProjection = db.prepare('UPDATE policies SET surrender_projection = ? WHERE id = ?');
    for (let i = 0; i < state.policies.length; i++) {
      const p = normalizePolicyForStorage(state.policies[i]);
      insertPolicy.run(policyInsertParams(p, { caseId, sortOrder: i, timestamp: ts }));
      updatePensionSettings.run(serializePensionSettings(p), p.id);
      updatePaymentCompleted.run(p.premiumPaymentCompleted ? 1 : 0, p.id);
      updatePaymentDetails.run(serializePaymentDetails(p), p.id);
      replacePolicyBeneficiaries(p.id, p.beneficiaryAllocations ?? []);
      updateSurrenderProjection.run(p.surrenderProjection ?? null, p.id);
    }

    db.prepare('INSERT OR REPLACE INTO app_state_meta (case_id, schema_version, updated_at, valuation_settings) VALUES (?, 1, ?, ?)').run(
      caseId,
      ts,
      JSON.stringify(state.valuationSettings ?? { usdJpyRate: 0, fxRateDate: '' }),
    );
  })();

  return getAppState(caseId)!;
}

export function resetToSample(caseId: string): AppState {
  const db = getDb();
  db.transaction(() => {
    db.prepare('DELETE FROM policies WHERE case_id = ?').run(caseId);
    db.prepare('DELETE FROM family_members WHERE case_id = ?').run(caseId);
    db.prepare('DELETE FROM agencies WHERE case_id = ?').run(caseId);
    db.prepare('DELETE FROM app_state_meta WHERE case_id = ?').run(caseId);
    db.prepare('DELETE FROM cases WHERE id = ?').run(caseId);
    insertSampleData(caseId);
  })();
  return getAppState(caseId)!;
}

export function clearData(caseId: string): AppState {
  const db = getDb();
  const ts = now();

  db.transaction(() => {
    db.prepare('INSERT OR IGNORE INTO cases (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)').run(caseId, 'default', ts, ts);

    db.prepare('DELETE FROM policies WHERE case_id = ?').run(caseId);
    db.prepare('DELETE FROM family_members WHERE case_id = ?').run(caseId);

    const defaultMemberId = uuidv4();
    db.prepare('INSERT INTO family_members (id, case_id, name, name_kana, relationship, birth_date, gender, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(defaultMemberId, caseId, '', '', '本人', new Date().toISOString().split('T')[0], 'male', 0, ts, ts);

    const existingAgency = db.prepare('SELECT id FROM agencies WHERE case_id = ?').get(caseId) as { id: string } | undefined;
    if (!existingAgency) {
      const agency = getSampleAgency();
      db.prepare('INSERT INTO agencies (id, case_id, name, representative, phone, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(uuidv4(), caseId, agency.name, agency.representative, agency.phone, ts, ts);
    }

    db.prepare('INSERT OR REPLACE INTO app_state_meta (case_id, schema_version, updated_at) VALUES (?, 1, ?)').run(caseId, ts);
  })();

  return getAppState(caseId)!;
}

export function updateExportTimestamp(caseId: string): void {
  const db = getDb();
  db.prepare('UPDATE app_state_meta SET last_exported_at = ? WHERE case_id = ?').run(now(), caseId);
}
