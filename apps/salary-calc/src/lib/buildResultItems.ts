import type { ResultItem } from '@/components/ResultSection';
import type { SalaryResult } from '@/lib/salaryCalculator';
import type { BonusResult } from '@/lib/bonusCalculator';
import { formatYen, formatPercent } from '@/lib/utils';
import { PENSION_RATE, EMPLOYMENT_INSURANCE_RATE } from '@/data/prefectureRates';

/** 料率の折半表示 (例: "9.98% ÷ 2") */
function halfRate(rate: number): string {
  return `${formatPercent(rate)} ÷ 2`;
}

/** 税率を%表示（復興特別所得税込み） */
function taxRateLabel(rate: number): string {
  return `${(rate * 100).toFixed(3)}%`;
}

/** 所得税の計算過程をステップで構築 */
function buildIncomeTaxSteps(r: SalaryResult): string[] {
  const steps: string[] = [];

  // ① 社保控除後の金額
  if (r.grossSalary !== r.taxableBase) {
    steps.push(`① 社保控除後 ${formatYen(r.salaryAfterSI)} − 通勤手当 ${formatYen(r.grossSalary - r.taxableBase - r.totalSocialInsurance)} = ${formatYen(r.taxableBase)}`);
  } else {
    steps.push(`① 社保控除後の給与等 ${formatYen(r.taxableBase)}`);
  }

  // ② 各控除の内訳
  const deductions: string[] = [`給与所得控除 ${formatYen(r.employmentDeduction)}`, `基礎控除 ${formatYen(r.basicDeduction)}`];
  if (r.dependentDeduction > 0) deductions.push(`扶養控除 ${formatYen(r.dependentDeduction)}`);
  steps.push(`② ${deductions.join(' + ')}`);

  // ③ 課税給与所得
  steps.push(`③ 課税給与所得 ${formatYen(r.taxableBase)} − 控除合計 = ${formatYen(r.taxableIncome)}`);

  // ④ 税額の算出
  if (r.taxableIncome <= 0) {
    steps.push(`④ 課税所得なし → 税額 ${formatYen(0)}`);
  } else if (r.taxDeduction > 0) {
    steps.push(`④ ${formatYen(r.taxableIncome)} × ${taxRateLabel(r.taxRate)} − ${formatYen(r.taxDeduction)} = ${formatYen(r.incomeTax)}（10円未満四捨五入）`);
  } else {
    steps.push(`④ ${formatYen(r.taxableIncome)} × ${taxRateLabel(r.taxRate)} = ${formatYen(r.incomeTax)}（10円未満四捨五入）`);
  }

  return steps;
}

export function buildSalaryItems(r: SalaryResult): ResultItem[] {
  return [
    { label: '総支給額', value: r.grossSalary, isBold: true },
    {
      label: '健康保険料',
      value: -r.healthInsurance,
      sub: `標準報酬月額表 第${r.gradeNumber}級（${formatYen(r.healthStandardMonthly)}）料率 ${halfRate(r.healthRate)}`,
    },
    ...(r.nursingCareInsurance > 0
      ? [{
          label: '介護保険料',
          value: -r.nursingCareInsurance,
          sub: `標準報酬月額表 第${r.gradeNumber}級（${formatYen(r.healthStandardMonthly)}）料率 ${halfRate(r.nursingCareRate)}`,
        }]
      : []),
    {
      label: '厚生年金保険料',
      value: -r.pensionInsurance,
      sub: `標準報酬月額表 第${r.gradeNumber}級（${formatYen(r.pensionStandardMonthly)}）料率 ${halfRate(PENSION_RATE)}`,
    },
    {
      label: '雇用保険料',
      value: -r.employmentInsurance,
      sub: `${formatYen(r.grossSalary)} × ${formatPercent(EMPLOYMENT_INSURANCE_RATE)}`,
    },
    { label: '社会保険料 小計', value: -r.totalSocialInsurance, isBold: true },
    {
      label: '所得税（源泉徴収）',
      value: -r.incomeTax,
      subs: buildIncomeTaxSteps(r),
    },
    ...(r.residentTax > 0
      ? [{ label: '住民税', value: -r.residentTax }]
      : []),
    { label: '控除合計', value: -r.totalDeductions, isBold: true },
  ];
}

export function buildBonusItems(r: BonusResult): ResultItem[] {
  return [
    { label: '賞与支給額', value: r.bonusAmount, isBold: true },
    {
      label: '健康保険料',
      value: -r.healthInsurance,
      sub: `標準賞与額 ${formatYen(r.healthBase)} × ${halfRate(r.healthRate)}`,
    },
    ...(r.nursingCareInsurance > 0
      ? [{
          label: '介護保険料',
          value: -r.nursingCareInsurance,
          sub: `${formatYen(r.healthBase)} × ${halfRate(r.nursingCareRate)}`,
        }]
      : []),
    {
      label: '厚生年金保険料',
      value: -r.pensionInsurance,
      sub: `標準賞与額 ${formatYen(r.pensionBase)} × ${halfRate(PENSION_RATE)}`,
    },
    {
      label: '雇用保険料',
      value: -r.employmentInsurance,
      sub: `${formatYen(r.bonusAmount)} × ${formatPercent(EMPLOYMENT_INSURANCE_RATE)}`,
    },
    { label: '社会保険料 小計', value: -r.totalSocialInsurance, isBold: true },
    {
      label: '所得税（源泉徴収）',
      value: -r.incomeTax,
      sub: `（${formatYen(r.bonusAmount)} − ${formatYen(r.totalSocialInsurance)}） × ${formatPercent(r.taxRate)}`,
    },
    { label: '控除合計', value: -r.totalDeductions, isBold: true },
  ];
}
