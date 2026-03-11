import { NURSING_CARE_RATE, PENSION_RATE, EMPLOYMENT_INSURANCE_RATE, PREFECTURES } from '@/data/prefectureRates';
import { getHealthStandardMonthly, getPensionStandardMonthly } from '@/data/standardRemuneration';

/**
 * 給与所得控除額の計算（電子計算機の特例 — 月額換算）
 * 令和8年分 源泉徴収税額表 電子計算機用
 */
function calcEmploymentIncomeDeduction(a: number): number {
  if (a <= 158333) return 54167;
  if (a <= 299999) return Math.ceil(a * 0.3 + 6667);
  if (a <= 549999) return Math.ceil(a * 0.2 + 36667);
  if (a <= 708330) return Math.ceil(a * 0.1 + 91667);
  return 162500;
}

/**
 * 基礎控除額（月額換算）
 */
function calcBasicDeduction(a: number): number {
  if (a <= 2120833) return 48334;
  if (a <= 2162499) return 40000;
  if (a <= 2204166) return 26667;
  if (a <= 2245833) return 13334;
  return 0;
}

/**
 * 税額計算（電子計算機の特例）
 * B = 課税給与所得金額（月額）
 */
function calcTaxFromTaxableIncome(b: number): number {
  if (b <= 0) return 0;
  let tax: number;
  if (b <= 162500) tax = b * 0.05105;
  else if (b <= 275000) tax = b * 0.10210 - 8296;
  else if (b <= 579166) tax = b * 0.20420 - 36374;
  else if (b <= 750000) tax = b * 0.23483 - 54113;
  else if (b <= 1500000) tax = b * 0.33693 - 130688;
  else if (b <= 3333333) tax = b * 0.40840 - 237893;
  else tax = b * 0.45945 - 408061;
  // 10円未満四捨五入
  return Math.round(tax / 10) * 10;
}

export interface SalaryInput {
  /** 総支給額（月額） */
  grossSalary: number;
  /** 通勤手当（非課税） */
  commuteAllowance: number;
  /** 都道府県コード */
  prefectureCode: string;
  /** 扶養親族等の数 */
  dependents: number;
  /** 介護保険該当（40歳以上65歳未満） */
  isNursingCare: boolean;
  /** 住民税（月額、手入力） */
  residentTax: number;
}

export interface SalaryResult {
  /** 総支給額 */
  grossSalary: number;
  /** 健康保険の標準報酬月額 */
  healthStandardMonthly: number;
  /** 厚生年金の標準報酬月額 */
  pensionStandardMonthly: number;
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
  /** 社会保険料控除後の給与（源泉徴収税額計算の基礎） */
  salaryAfterSI: number;
  /** 所得税（源泉徴収税額） */
  incomeTax: number;
  /** 住民税 */
  residentTax: number;
  /** 控除合計 */
  totalDeductions: number;
  /** 手取り金額 */
  takeHomePay: number;
}

export function calculateSalary(input: SalaryInput): SalaryResult {
  const prefecture = PREFECTURES.find(p => p.code === input.prefectureCode);
  if (!prefecture) throw new Error('都道府県が選択されていません');

  const gross = input.grossSalary;
  const commute = input.commuteAllowance;

  // 標準報酬月額の決定
  const healthStd = getHealthStandardMonthly(gross);
  const pensionStd = getPensionStandardMonthly(gross);

  // 社会保険料計算（被保険者負担＝折半）
  const healthInsurance = Math.floor(healthStd * (prefecture.healthRate / 100) / 2);
  const nursingCareInsurance = input.isNursingCare
    ? Math.floor(healthStd * (NURSING_CARE_RATE / 100) / 2)
    : 0;
  const pensionInsurance = Math.floor(pensionStd * (PENSION_RATE / 100) / 2);
  const employmentInsurance = Math.floor(gross * (EMPLOYMENT_INSURANCE_RATE / 100));

  const totalSI = healthInsurance + nursingCareInsurance + pensionInsurance + employmentInsurance;

  // 社会保険料控除後の給与等の金額
  const salaryAfterSI = gross - totalSI;

  // 課税対象額の計算（通勤手当は非課税）
  const a = salaryAfterSI - commute;

  // 給与所得控除
  const employmentDeduction = calcEmploymentIncomeDeduction(a);
  // 基礎控除
  const basicDeduction = calcBasicDeduction(a);
  // 扶養控除（配偶者控除含む）
  const dependentDeduction = 31667 * input.dependents;

  // 課税給与所得金額
  const taxableIncome = Math.max(0, a - employmentDeduction - basicDeduction - dependentDeduction);

  // 所得税（源泉徴収税額）
  const incomeTax = calcTaxFromTaxableIncome(taxableIncome);

  const totalDeductions = totalSI + incomeTax + input.residentTax;
  const takeHomePay = gross - totalDeductions;

  return {
    grossSalary: gross,
    healthStandardMonthly: healthStd,
    pensionStandardMonthly: pensionStd,
    healthInsurance,
    nursingCareInsurance,
    pensionInsurance,
    employmentInsurance,
    totalSocialInsurance: totalSI,
    salaryAfterSI,
    incomeTax,
    residentTax: input.residentTax,
    totalDeductions,
    takeHomePay,
  };
}
