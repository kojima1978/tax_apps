import type { TableProps } from '@/types/form';

export type ValuationPurpose = 'inheritance' | 'special-market-value';

export const VALUATION_PURPOSE_FIELD = '_valuation_purpose';
export const SPECIAL_CENTRAL_HOLDER_FIELD = '_special_central_holder';

export function getValuationPurpose(getField: TableProps['getField']): ValuationPurpose {
  const value = getField('table1_1', VALUATION_PURPOSE_FIELD);
  // 旧UIで保存された個別区分も、共通の時価評価区分として読み替える。
  return value === 'special-market-value'
    || value === 'income-tax-59-6'
    || value === 'corporate-tax-9-1-14'
    ? 'special-market-value'
    : 'inheritance';
}

export function usesSpecialMarketValueRules(getField: TableProps['getField']): boolean {
  return getValuationPurpose(getField) !== 'inheritance';
}

export function forcesSmallCompany(getField: TableProps['getField']): boolean {
  return usesSpecialMarketValueRules(getField)
    && getField('table1_1', SPECIAL_CENTRAL_HOLDER_FIELD) === '1';
}
