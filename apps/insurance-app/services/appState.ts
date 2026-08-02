import { v4 as uuidv4 } from 'uuid';
import { getDb } from '@/lib/db';
import { getSampleFamilyMembers, getSampleAgency, getSamplePolicies } from '@/lib/sampleData';
import { isIncomeProtectionPolicyType, normalizePolicyType } from '@/types';
import type { AppState, FamilyMember, Policy, Agency, BeneficiaryAllocation, EvaluationOverride, SurrenderValuePoint, ValuationSettings } from '@/types';
import { normalizeBeneficiaryAllocations } from '@/utils/beneficiaryUtils';

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
  beneficiary_allocations: string | null;
  pension_settings: string | null;
  death_benefit_disease: number;
  death_benefit_accident: number;
  hosp_day_disease: number;
  hosp_day_accident: number;
  diagnosis_benefit: number;
  policy_end_age: number;
  currency: string;
  exchange_rate: number;
  foreign_premium_amount: number;
  foreign_death_benefit_disease: number;
  foreign_death_benefit_accident: number;
  foreign_hosp_day_disease: number;
  foreign_hosp_day_accident: number;
  foreign_diagnosis_benefit: number;
  foreign_maturity_benefit: number;
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

function parseBeneficiaryAllocations(
  raw: string | null,
  legacyBeneficiaryId: string,
): BeneficiaryAllocation[] {
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as BeneficiaryAllocation[];
      return normalizeBeneficiaryAllocations(parsed, legacyBeneficiaryId);
    } catch {
      // 旧形式の単一受取人へフォールバック
    }
  }
  return normalizeBeneficiaryAllocations(undefined, legacyBeneficiaryId);
}

function serializeBeneficiaryAllocations(policy: Policy): string | null {
  const allocations = normalizeBeneficiaryAllocations(policy.beneficiaryAllocations, policy.beneficiaryId);
  return allocations.length > 0 ? JSON.stringify(allocations) : null;
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

function rowToPolicy(row: PolicyRow): Policy {
  const policyType = normalizePolicyType(row.policy_type);
  const insuredId = row.insured_member_id;
  const paymentEndAge = row.payment_end_age;
  const policyEndAge = row.policy_end_age;
  return normalizePolicyForStorage({
    id: row.id,
    companyName: row.company_name,
    policyType,
    policyNumber: row.policy_number ?? '',
    contractDate: row.contract_date,
    contractAge: row.contract_age,
    insuredId,
    beneficiaryId: row.beneficiary_member_id ?? '',
    beneficiaryAllocations: parseBeneficiaryAllocations(
      row.beneficiary_allocations,
      row.beneficiary_member_id ?? '',
    ),
    deathBenefitDisease: row.death_benefit_disease,
    deathBenefitAccident: row.death_benefit_accident,
    hospDayDisease: row.hosp_day_disease,
    hospDayAccident: row.hosp_day_accident,
    diagnosisBenefit: row.diagnosis_benefit,
    policyEndAge,
    currency: row.currency === 'USD' ? 'USD' : 'JPY',
    exchangeRate: row.exchange_rate,
    foreignPremiumAmount: row.foreign_premium_amount,
    foreignDeathBenefitDisease: row.foreign_death_benefit_disease,
    foreignDeathBenefitAccident: row.foreign_death_benefit_accident,
    foreignHospDayDisease: row.foreign_hosp_day_disease,
    foreignHospDayAccident: row.foreign_hosp_day_accident,
    foreignDiagnosisBenefit: row.foreign_diagnosis_benefit,
    foreignMaturityBenefit: row.foreign_maturity_benefit,
    paymentFrequency: row.payment_frequency as Policy['paymentFrequency'],
    premiumAmount: row.premium_amount,
    paymentEndAge,
    premiumPaymentCompleted: Boolean(row.premium_payment_completed),
    annualPremium: row.annual_premium,
    maturityBenefit: row.maturity_benefit,
    surrenderValues: parseSurrenderValues(row.surrender_values),
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
  const insertPolicy = db.prepare(`INSERT INTO policies (id, case_id, company_name, policy_type, policy_number, contract_date, contract_age, insured_member_id, beneficiary_member_id, death_benefit_disease, death_benefit_accident, hosp_day_disease, hosp_day_accident, diagnosis_benefit, policy_end_age, currency, exchange_rate, foreign_premium_amount, foreign_death_benefit_disease, foreign_death_benefit_accident, foreign_hosp_day_disease, foreign_hosp_day_accident, foreign_diagnosis_benefit, foreign_maturity_benefit, payment_frequency, premium_amount, payment_end_date, payment_end_age, annual_premium, maturity_benefit, surrender_values, consultant_note, evaluation_overrides, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const updateBeneficiaryAllocations = db.prepare('UPDATE policies SET beneficiary_allocations = ? WHERE id = ?');
  for (let i = 0; i < policies.length; i++) {
    const p = policies[i];
    const policyId = uuidv4();
    insertPolicy.run(
      policyId,
      caseId,
      p.companyName,
      p.policyType,
      p.policyNumber || null,
      p.contractDate,
      p.contractAge,
      memberIdMap.get(p.insuredId) || p.insuredId,
      p.beneficiaryId ? memberIdMap.get(p.beneficiaryId) || p.beneficiaryId : null,
      p.deathBenefitDisease,
      p.deathBenefitAccident,
      p.hospDayDisease,
      p.hospDayAccident,
      p.diagnosisBenefit,
      p.policyEndAge,
      p.currency ?? 'JPY',
      p.exchangeRate ?? 0,
      p.foreignPremiumAmount ?? 0,
      p.foreignDeathBenefitDisease ?? 0,
      p.foreignDeathBenefitAccident ?? 0,
      p.foreignHospDayDisease ?? 0,
      p.foreignHospDayAccident ?? 0,
      p.foreignDiagnosisBenefit ?? 0,
      p.foreignMaturityBenefit ?? 0,
      p.paymentFrequency,
      p.premiumAmount,
      null,
      p.paymentEndAge,
      p.annualPremium,
      p.maturityBenefit,
      p.surrenderValues?.length ? JSON.stringify(p.surrenderValues) : null,
      p.consultantNote ?? null,
      p.evaluationOverrides?.length ? JSON.stringify(p.evaluationOverrides) : null,
      i,
      ts,
      ts,
    );
    const mappedAllocations = normalizeBeneficiaryAllocations(p.beneficiaryAllocations, p.beneficiaryId).map(allocation => ({
      ...allocation,
      beneficiaryId: memberIdMap.get(allocation.beneficiaryId) || allocation.beneficiaryId,
    }));
    updateBeneficiaryAllocations.run(JSON.stringify(mappedAllocations), policyId);
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

  return {
    familyMembers: memberRows.map(rowToFamilyMember),
    policies: policyRows.map(rowToPolicy),
    agency: agencyRow ? rowToAgency(agencyRow) : { name: '', representative: '', phone: '' },
    valuationSettings: parseValuationSettings(metaRow?.valuation_settings ?? null),
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

    const insertPolicy = db.prepare(`INSERT INTO policies (id, case_id, company_name, policy_type, policy_number, contract_date, contract_age, insured_member_id, beneficiary_member_id, death_benefit_disease, death_benefit_accident, hosp_day_disease, hosp_day_accident, diagnosis_benefit, policy_end_age, currency, exchange_rate, foreign_premium_amount, foreign_death_benefit_disease, foreign_death_benefit_accident, foreign_hosp_day_disease, foreign_hosp_day_accident, foreign_diagnosis_benefit, foreign_maturity_benefit, payment_frequency, premium_amount, payment_end_date, payment_end_age, annual_premium, maturity_benefit, surrender_values, consultant_note, evaluation_overrides, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const updatePensionSettings = db.prepare('UPDATE policies SET pension_settings = ? WHERE id = ?');
    const updatePaymentCompleted = db.prepare('UPDATE policies SET premium_payment_completed = ? WHERE id = ?');
    const updatePaymentDetails = db.prepare('UPDATE policies SET payment_details = ? WHERE id = ?');
    const updateBeneficiaryAllocations = db.prepare('UPDATE policies SET beneficiary_allocations = ? WHERE id = ?');
    for (let i = 0; i < state.policies.length; i++) {
      const p = normalizePolicyForStorage(state.policies[i]);
      insertPolicy.run(p.id, caseId, p.companyName, p.policyType, p.policyNumber || null, p.contractDate, p.contractAge, p.insuredId, p.beneficiaryId || null, p.deathBenefitDisease, p.deathBenefitAccident, p.hospDayDisease, p.hospDayAccident, p.diagnosisBenefit, p.policyEndAge, p.currency ?? 'JPY', p.exchangeRate ?? 0, p.foreignPremiumAmount ?? 0, p.foreignDeathBenefitDisease ?? 0, p.foreignDeathBenefitAccident ?? 0, p.foreignHospDayDisease ?? 0, p.foreignHospDayAccident ?? 0, p.foreignDiagnosisBenefit ?? 0, p.foreignMaturityBenefit ?? 0, p.paymentFrequency, p.premiumAmount, null, p.paymentEndAge, p.annualPremium, p.maturityBenefit, p.surrenderValues?.length ? JSON.stringify(p.surrenderValues) : null, p.consultantNote ?? null, p.evaluationOverrides?.length ? JSON.stringify(p.evaluationOverrides) : null, i, ts, ts);
      updatePensionSettings.run(serializePensionSettings(p), p.id);
      updatePaymentCompleted.run(p.premiumPaymentCompleted ? 1 : 0, p.id);
      updatePaymentDetails.run(serializePaymentDetails(p), p.id);
      updateBeneficiaryAllocations.run(serializeBeneficiaryAllocations(p), p.id);
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
