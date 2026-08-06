import { DISPLAY_POLICY_TYPES, isIncomeProtectionPolicyType, SURRENDER_PROJECTION_MODES } from '@/types';
import type { Policy, PolicyType, SurrenderProjectionMode } from '@/types';
import { getBeneficiaryAllocations } from '@/utils/beneficiaryUtils';
import { isValidLogoDataUrl } from '@/lib/agencyLogo';

const VALID_POLICY_TYPES: PolicyType[] = DISPLAY_POLICY_TYPES;
const VALID_GENDERS = ['male', 'female'] as const;
const VALID_INSIGHT_TYPES = ['gap', 'redundancy', 'recommendation'] as const;
const VALID_RATINGS = ['good', 'caution', 'warning'] as const;
const VALID_FREQUENCIES = ['monthly', 'annual', 'single'] as const;
const VALID_CURRENCIES = ['JPY', 'USD'] as const;
const VALID_PENSION_START_MODES = ['age', 'fiscalYear'] as const;
const DEATH_BENEFIT_TYPES: PolicyType[] = ['終身保険', '定期保険', '収入保障保険', '変額終身保険', '養老保険'];
const MEDICAL_BENEFIT_TYPES: PolicyType[] = ['医療保険', 'がん保険'];
const FINITE_END_AGE_TYPES: PolicyType[] = ['定期保険', '収入保障保険', '養老保険'];

interface ValidationError {
  field: string;
  message: string;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export function validateAppState(body: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (!body || typeof body !== 'object') {
    return { valid: false, errors: [{ field: 'body', message: 'リクエストボディが不正です' }] };
  }

  const data = body as Record<string, unknown>;

  if (!Array.isArray(data.familyMembers) || data.familyMembers.length === 0) {
    errors.push({ field: 'familyMembers', message: 'familyMembers は 1 件以上の配列が必要です' });
  } else {
    for (let i = 0; i < data.familyMembers.length; i++) {
      const m = data.familyMembers[i] as Record<string, unknown>;
      if (!m || typeof m !== 'object') {
        errors.push({ field: `familyMembers[${i}]`, message: '家族情報が不正です' });
        continue;
      }
      if (typeof m.id !== 'string' || !m.id) errors.push({ field: `familyMembers[${i}].id`, message: 'id は必須です' });
      if (typeof m.name !== 'string') errors.push({ field: `familyMembers[${i}].name`, message: 'name は文字列が必要です' });
      if (m.nameKana !== undefined && typeof m.nameKana !== 'string') errors.push({ field: `familyMembers[${i}].nameKana`, message: 'nameKana は文字列が必要です' });
      if (typeof m.relationship !== 'string') errors.push({ field: `familyMembers[${i}].relationship`, message: 'relationship は文字列が必要です' });
      if (m.birthDate !== undefined && typeof m.birthDate !== 'string') errors.push({ field: `familyMembers[${i}].birthDate`, message: 'birthDate は文字列が必要です' });
      if (!VALID_GENDERS.includes(m.gender as typeof VALID_GENDERS[number])) {
        errors.push({ field: `familyMembers[${i}].gender`, message: 'gender は male または female が必要です' });
      }
    }
  }

  if (!data.agency || typeof data.agency !== 'object') {
    errors.push({ field: 'agency', message: 'agency はオブジェクトが必要です' });
  } else {
    const a = data.agency as Record<string, unknown>;
    if (typeof a.name !== 'string') errors.push({ field: 'agency.name', message: 'name は文字列が必要です' });
    if (typeof a.representative !== 'string') errors.push({ field: 'agency.representative', message: 'representative は文字列が必要です' });
    if (typeof a.phone !== 'string') errors.push({ field: 'agency.phone', message: 'phone は文字列が必要です' });
    // ロゴは data URL 形式・サイズ上限内のみ受け付ける（DBとJSONエクスポートの肥大化防止）
    if (a.logoDataUrl !== undefined && a.logoDataUrl !== '' && (typeof a.logoDataUrl !== 'string' || !isValidLogoDataUrl(a.logoDataUrl))) {
      errors.push({ field: 'agency.logoDataUrl', message: 'ロゴ画像の形式またはサイズが不正です' });
    }
    if (a.printLogo !== undefined && typeof a.printLogo !== 'boolean') {
      errors.push({ field: 'agency.printLogo', message: 'printLogo は真偽値が必要です' });
    }
  }

  if (data.valuationSettings !== undefined) {
    if (!data.valuationSettings || typeof data.valuationSettings !== 'object') {
      errors.push({ field: 'valuationSettings', message: '評価用為替レート設定が不正です' });
    } else {
      const settings = data.valuationSettings as Record<string, unknown>;
      if (typeof settings.usdJpyRate !== 'number' || settings.usdJpyRate < 0) {
        errors.push({ field: 'valuationSettings.usdJpyRate', message: 'USD/JPYレートは0以上の数値が必要です' });
      }
      if (typeof settings.fxRateDate !== 'string') {
        errors.push({ field: 'valuationSettings.fxRateDate', message: '為替レート基準日は文字列が必要です' });
      }
    }
  }

  const familyMemberIds = new Set(
    Array.isArray(data.familyMembers)
      ? data.familyMembers
        .filter(member => !!member && typeof member === 'object')
        .map(member => (member as Record<string, unknown>).id)
        .filter((id): id is string => typeof id === 'string')
      : [],
  );

  if (!Array.isArray(data.policies)) {
    errors.push({ field: 'policies', message: 'policies は配列が必要です' });
  } else {
    for (let i = 0; i < data.policies.length; i++) {
      const p = data.policies[i] as Record<string, unknown>;
      if (!p || typeof p !== 'object') {
        errors.push({ field: `policies[${i}]`, message: '保険証券が不正です' });
        continue;
      }
      if (typeof p.id !== 'string' || !p.id) errors.push({ field: `policies[${i}].id`, message: 'id は必須です' });
      if (typeof p.companyName !== 'string' || !p.companyName) errors.push({ field: `policies[${i}].companyName`, message: '保険会社は必須です' });
      if (!VALID_POLICY_TYPES.includes(p.policyType as PolicyType)) {
        errors.push({ field: `policies[${i}].policyType`, message: '保険種類が不正です' });
      }
      const contractDateOptional = p.policyType === '個人年金保険'
        || p.policyType === '終身保険'
        || p.policyType === '変額終身保険';
      if (typeof p.contractDate !== 'string' || (!contractDateOptional && !p.contractDate)) {
        errors.push({ field: `policies[${i}].contractDate`, message: '契約日は必須です' });
      }
      if (typeof p.contractAge !== 'number') errors.push({ field: `policies[${i}].contractAge`, message: '契約年齢は数値が必要です' });
      if (typeof p.insuredId !== 'string' || !p.insuredId) errors.push({ field: `policies[${i}].insuredId`, message: '被保険者は必須です' });
      if (typeof p.policyEndAge !== 'number') errors.push({ field: `policies[${i}].policyEndAge`, message: '保険期間は数値が必要です' });
      if (p.currency !== undefined && !VALID_CURRENCIES.includes(p.currency as typeof VALID_CURRENCIES[number])) {
        errors.push({ field: `policies[${i}].currency`, message: '通貨は JPY または USD が必要です' });
      }
      if (p.contractExchangeRate !== undefined && (typeof p.contractExchangeRate !== 'number' || p.contractExchangeRate < 0)) {
        errors.push({ field: `policies[${i}].contractExchangeRate`, message: '契約時為替レートが不正です' });
      }
      if (p.paymentCurrency !== undefined && p.paymentCurrency !== 'JPY' && p.paymentCurrency !== 'USD') {
        errors.push({ field: `policies[${i}].paymentCurrency`, message: '支払通貨は JPY または USD が必要です' });
      }
      if (p.premiumPaymentDate !== undefined && typeof p.premiumPaymentDate !== 'string') {
        errors.push({ field: `policies[${i}].premiumPaymentDate`, message: '支払日が不正です' });
      }
      if (p.actualPremiumPaidJpy !== undefined && (typeof p.actualPremiumPaidJpy !== 'number' || p.actualPremiumPaidJpy < 0)) {
        errors.push({ field: `policies[${i}].actualPremiumPaidJpy`, message: '実支払円額が不正です' });
      }
      if (!VALID_FREQUENCIES.includes(p.paymentFrequency as typeof VALID_FREQUENCIES[number])) {
        errors.push({ field: `policies[${i}].paymentFrequency`, message: '払方は monthly, annual, single のいずれかが必要です' });
      }
      if (typeof p.premiumAmount !== 'number') errors.push({ field: `policies[${i}].premiumAmount`, message: '保険料は数値が必要です' });
      if (typeof p.paymentEndAge !== 'number') errors.push({ field: `policies[${i}].paymentEndAge`, message: '払込終了年齢は数値が必要です' });
      if (p.premiumPaymentCompleted !== undefined && typeof p.premiumPaymentCompleted !== 'boolean') {
        errors.push({ field: `policies[${i}].premiumPaymentCompleted`, message: '払込終了済みは真偽値が必要です' });
      }
      if (p.policyType === '個人年金保険') {
        if (typeof p.paymentEndAge === 'number' && (!p.paymentEndAge || p.paymentEndAge === 999)) {
          errors.push({ field: `policies[${i}].paymentEndAge`, message: '個人年金保険は年金受取開始年齢が必要です' });
        }
        if (p.pensionRecipientId !== undefined && (typeof p.pensionRecipientId !== 'string' || !p.pensionRecipientId)) {
          errors.push({ field: `policies[${i}].pensionRecipientId`, message: '年金受取人が不正です' });
        }
        if (p.pensionSuccessorRecipientId !== undefined && typeof p.pensionSuccessorRecipientId !== 'string') {
          errors.push({ field: `policies[${i}].pensionSuccessorRecipientId`, message: '死亡時の継続受取人が不正です' });
        }
        if (p.pensionStartMode !== undefined && !VALID_PENSION_START_MODES.includes(p.pensionStartMode as typeof VALID_PENSION_START_MODES[number])) {
          errors.push({ field: `policies[${i}].pensionStartMode`, message: '年金受取開始の指定方法が不正です' });
        }
        if (p.pensionStartMode === 'fiscalYear' && (typeof p.pensionStartFiscalYear !== 'number' || p.pensionStartFiscalYear < 1900 || p.pensionStartFiscalYear > 2200)) {
          errors.push({ field: `policies[${i}].pensionStartFiscalYear`, message: '年金受取開始年度が不正です' });
        }
        if (p.pensionPayoutYears !== undefined && (typeof p.pensionPayoutYears !== 'number' || p.pensionPayoutYears <= 0 || p.pensionPayoutYears > 100)) {
          errors.push({ field: `policies[${i}].pensionPayoutYears`, message: '年金受取年数は1〜100年で入力してください' });
        }
        if (typeof p.maturityBenefit !== 'number' || p.maturityBenefit <= 0) {
          errors.push({ field: `policies[${i}].maturityBenefit`, message: '個人年金保険は年金原資（受取総額）が必要です' });
        }
      }
      if (VALID_POLICY_TYPES.includes(p.policyType as PolicyType) && p.policyType !== '個人年金保険') {
        const policyType = p.policyType as PolicyType;
        if (DEATH_BENEFIT_TYPES.includes(policyType) && (typeof p.deathBenefitDisease !== 'number' || p.deathBenefitDisease <= 0)) {
          const label = isIncomeProtectionPolicyType(policyType) ? '死亡保険金月額' : '死亡保障額';
          errors.push({ field: `policies[${i}].deathBenefitDisease`, message: `死亡保障がある保険は${label}が必要です` });
        }
        const beneficiaryAllocations = getBeneficiaryAllocations(p as unknown as Policy);
        if (DEATH_BENEFIT_TYPES.includes(policyType) && beneficiaryAllocations.length === 0) {
          errors.push({ field: `policies[${i}].beneficiaryAllocations`, message: '死亡保障がある保険は受取人が必要です' });
        }
        if (beneficiaryAllocations.length > 0) {
          const totalPercentage = beneficiaryAllocations.reduce((sum, allocation) => sum + allocation.percentage, 0);
          if (beneficiaryAllocations.some(allocation => !familyMemberIds.has(allocation.beneficiaryId))) {
            errors.push({ field: `policies[${i}].beneficiaryAllocations`, message: '受取人が家族情報に存在しません' });
          }
          if (beneficiaryAllocations.some(allocation => allocation.percentage <= 0 || allocation.percentage > 100)
            || Math.abs(totalPercentage - 100) > 0.001) {
            errors.push({ field: `policies[${i}].beneficiaryAllocations`, message: '受取割合の合計は100%である必要があります' });
          }
        }
        if (MEDICAL_BENEFIT_TYPES.includes(policyType) && (Number(p.hospDayDisease || 0) <= 0 && Number(p.diagnosisBenefit || 0) <= 0)) {
          errors.push({ field: `policies[${i}].hospDayDisease`, message: '医療保険・がん保険は入院日額または診断一時金が必要です' });
        }
        if (policyType === '養老保険' && (typeof p.maturityBenefit !== 'number' || p.maturityBenefit <= 0)) {
          errors.push({ field: `policies[${i}].maturityBenefit`, message: '養老保険は満期保険金が必要です' });
        }
        if (FINITE_END_AGE_TYPES.includes(policyType) && p.policyEndAge === 999) {
          errors.push({ field: `policies[${i}].policyEndAge`, message: `${policyType}は保険期間の終了年齢が必要です` });
        }
      }
      if (p.surrenderValues !== undefined) {
        if (!Array.isArray(p.surrenderValues)) {
          errors.push({ field: `policies[${i}].surrenderValues`, message: 'surrenderValues は配列が必要です' });
        } else {
          for (let j = 0; j < p.surrenderValues.length; j++) {
            const point = p.surrenderValues[j] as Record<string, unknown>;
            if (!point || typeof point !== 'object'
              || typeof point.age !== 'number' || !Number.isFinite(point.age) || point.age < 0 || point.age > 120
              || typeof point.amount !== 'number' || !Number.isFinite(point.amount) || point.amount < 0
              || (point.foreignAmount !== undefined && typeof point.foreignAmount !== 'number')) {
              errors.push({ field: `policies[${i}].surrenderValues[${j}]`, message: '年齢別の解約返戻金が不正です' });
            }
          }
        }
      }
      if (p.surrenderProjection !== undefined
        && !SURRENDER_PROJECTION_MODES.includes(p.surrenderProjection as SurrenderProjectionMode)) {
        errors.push({ field: `policies[${i}].surrenderProjection`, message: '解約返戻金の推定方法が不正です' });
      }
      if (p.evaluationOverrides !== undefined) {
        if (!Array.isArray(p.evaluationOverrides)) {
          errors.push({ field: `policies[${i}].evaluationOverrides`, message: 'evaluationOverrides は配列が必要です' });
        } else {
          for (let j = 0; j < p.evaluationOverrides.length; j++) {
            const o = p.evaluationOverrides[j] as Record<string, unknown>;
            if (!o || typeof o !== 'object' || typeof o.label !== 'string' || typeof o.text !== 'string'
              || !VALID_RATINGS.includes(o.rating as typeof VALID_RATINGS[number])) {
              errors.push({ field: `policies[${i}].evaluationOverrides[${j}]`, message: '評価の上書きが不正です' });
            }
          }
        }
      }
    }
  }

  const hasUsdPolicy = Array.isArray(data.policies)
    && data.policies.some(policy => !!policy && typeof policy === 'object' && (policy as Record<string, unknown>).currency === 'USD');
  const valuationSettings = data.valuationSettings as Record<string, unknown> | undefined;
  if (hasUsdPolicy && (!valuationSettings || typeof valuationSettings.usdJpyRate !== 'number' || valuationSettings.usdJpyRate <= 0)) {
    errors.push({ field: 'valuationSettings.usdJpyRate', message: 'ドル建て証券がある場合は基本情報のUSD/JPYレートが必要です' });
  }

  return { valid: errors.length === 0, errors };
}

export function validatePortfolioInsights(value: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (!Array.isArray(value)) {
    return { valid: false, errors: [{ field: 'portfolioInsights', message: 'portfolioInsights は配列が必要です' }] };
  }

  for (let i = 0; i < value.length; i++) {
    const insight = value[i] as Record<string, unknown>;
    if (!insight || typeof insight !== 'object') {
      errors.push({ field: `portfolioInsights[${i}]`, message: '診断コメントが不正です' });
      continue;
    }
    if (!VALID_INSIGHT_TYPES.includes(insight.type as typeof VALID_INSIGHT_TYPES[number])) {
      errors.push({ field: `portfolioInsights[${i}].type`, message: 'type は gap, redundancy, recommendation のいずれかが必要です' });
    }
    if (typeof insight.text !== 'string') {
      errors.push({ field: `portfolioInsights[${i}].text`, message: 'text は文字列が必要です' });
    }
  }

  return { valid: errors.length === 0, errors };
}
