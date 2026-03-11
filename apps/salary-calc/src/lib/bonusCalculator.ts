import { NURSING_CARE_RATE, PENSION_RATE, EMPLOYMENT_INSURANCE_RATE, PREFECTURES } from '@/data/prefectureRates';
import { getHealthStandardMonthly, getPensionStandardMonthly } from '@/data/standardRemuneration';
import { getBonusTaxRate } from '@/data/bonusTaxRates';

export interface BonusInput {
  /** 賞与支給額 */
  bonusAmount: number;
  /** 前月の社会保険料等控除後の給与等の金額 */
  prevMonthSalaryAfterSI: number;
  /** 都道府県コード */
  prefectureCode: string;
  /** 扶養親族等の数 */
  dependents: number;
  /** 介護保険該当（40歳以上65歳未満） */
  isNursingCare: boolean;
}

export interface BonusResult {
  /** 賞与支給額 */
  bonusAmount: number;
  /** 標準賞与額（1,000円未満切捨て） */
  standardBonus: number;
  /** 健康保険料（被保険者負担分） */
  healthInsurance: number;
  /** 介護保険料（被保険者負担分） */
  nursingCareInsurance: number;
  /** 厚生年金保険料（被保険者負担分） */
  pensionInsurance: number;
  /** 雇用保険料（被保険者負担分） */
  employmentInsurance: number;
  /** 社会保険料合計 */
  totalSocialInsurance: number;
  /** 適用税率（%） */
  taxRate: number;
  /** 所得税（源泉徴収税額） */
  incomeTax: number;
  /** 控除合計 */
  totalDeductions: number;
  /** 手取り金額 */
  takeHomePay: number;
}

/** 健康保険の標準賞与額上限（年度累計） */
const HEALTH_BONUS_CAP = 5730000;
/** 厚生年金の標準賞与額上限（1回あたり） */
const PENSION_BONUS_CAP = 1500000;

export function calculateBonus(input: BonusInput): BonusResult {
  const prefecture = PREFECTURES.find(p => p.code === input.prefectureCode);
  if (!prefecture) throw new Error('都道府県が選択されていません');

  // 標準賞与額（1,000円未満切捨て）
  const standardBonus = Math.floor(input.bonusAmount / 1000) * 1000;

  // 健康保険・介護保険の標準賞与額（年度累計上限573万円 — ここでは1回分として計算）
  const healthBase = Math.min(standardBonus, HEALTH_BONUS_CAP);
  // 厚生年金の標準賞与額（1回上限150万円）
  const pensionBase = Math.min(standardBonus, PENSION_BONUS_CAP);

  // 社会保険料計算
  const healthInsurance = Math.floor(healthBase * (prefecture.healthRate / 100) / 2);
  const nursingCareInsurance = input.isNursingCare
    ? Math.floor(healthBase * (NURSING_CARE_RATE / 100) / 2)
    : 0;
  const pensionInsurance = Math.floor(pensionBase * (PENSION_RATE / 100) / 2);
  const employmentInsurance = Math.floor(input.bonusAmount * (EMPLOYMENT_INSURANCE_RATE / 100));

  const totalSI = healthInsurance + nursingCareInsurance + pensionInsurance + employmentInsurance;

  // 源泉徴収税率の決定
  const taxRate = getBonusTaxRate(input.prevMonthSalaryAfterSI, input.dependents);

  // 所得税 = (賞与額 − 社会保険料) × 税率（1円未満切捨て）
  const taxableBonus = input.bonusAmount - totalSI;
  const incomeTax = Math.floor(taxableBonus * (taxRate / 100));

  const totalDeductions = totalSI + incomeTax;
  const takeHomePay = input.bonusAmount - totalDeductions;

  return {
    bonusAmount: input.bonusAmount,
    standardBonus,
    healthInsurance,
    nursingCareInsurance,
    pensionInsurance,
    employmentInsurance,
    totalSocialInsurance: totalSI,
    taxRate,
    incomeTax,
    totalDeductions,
    takeHomePay,
  };
}

/**
 * 月額給与から「前月の社会保険料等控除後の給与等の金額」を概算する
 * （賞与タブで月額給与タブの結果を流用するためのヘルパー）
 */
export function estimatePrevMonthSalaryAfterSI(
  grossSalary: number,
  prefectureCode: string,
  isNursingCare: boolean,
): number {
  const prefecture = PREFECTURES.find(p => p.code === prefectureCode);
  if (!prefecture) return grossSalary;

  const healthStd = getHealthStandardMonthly(grossSalary);
  const pensionStd = getPensionStandardMonthly(grossSalary);

  const health = Math.floor(healthStd * (prefecture.healthRate / 100) / 2);
  const nursing = isNursingCare ? Math.floor(healthStd * (NURSING_CARE_RATE / 100) / 2) : 0;
  const pension = Math.floor(pensionStd * (PENSION_RATE / 100) / 2);
  const employment = Math.floor(grossSalary * (EMPLOYMENT_INSURANCE_RATE / 100));

  return grossSalary - health - nursing - pension - employment;
}
