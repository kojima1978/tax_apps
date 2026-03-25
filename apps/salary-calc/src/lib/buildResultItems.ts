import type { ResultItem } from '@/components/ResultSection';
import type { SalaryResult } from '@/lib/salaryCalculator';
import type { BonusResult } from '@/lib/bonusCalculator';
import { formatPercent } from '@/lib/utils';

export function buildSalaryItems(r: SalaryResult): ResultItem[] {
  return [
    { label: '総支給額', value: r.grossSalary, isBold: true },
    { label: '健康保険料', value: -r.healthInsurance, sub: `標準報酬月額 ¥${r.healthStandardMonthly.toLocaleString()}` },
    ...(r.nursingCareInsurance > 0
      ? [{ label: '介護保険料', value: -r.nursingCareInsurance }]
      : []),
    { label: '厚生年金保険料', value: -r.pensionInsurance, sub: `標準報酬月額 ¥${r.pensionStandardMonthly.toLocaleString()}` },
    { label: '雇用保険料', value: -r.employmentInsurance },
    { label: '社会保険料 小計', value: -r.totalSocialInsurance, isBold: true },
    { label: '所得税（源泉徴収）', value: -r.incomeTax },
    ...(r.residentTax > 0
      ? [{ label: '住民税', value: -r.residentTax }]
      : []),
    { label: '控除合計', value: -r.totalDeductions, isBold: true },
  ];
}

export function buildBonusItems(r: BonusResult): ResultItem[] {
  return [
    { label: '賞与支給額', value: r.bonusAmount, isBold: true },
    { label: '健康保険料', value: -r.healthInsurance },
    ...(r.nursingCareInsurance > 0
      ? [{ label: '介護保険料', value: -r.nursingCareInsurance }]
      : []),
    { label: '厚生年金保険料', value: -r.pensionInsurance },
    { label: '雇用保険料', value: -r.employmentInsurance },
    { label: '社会保険料 小計', value: -r.totalSocialInsurance, isBold: true },
    { label: '所得税（源泉徴収）', value: -r.incomeTax, sub: `適用税率 ${formatPercent(r.taxRate)}` },
    { label: '控除合計', value: -r.totalDeductions, isBold: true },
  ];
}
