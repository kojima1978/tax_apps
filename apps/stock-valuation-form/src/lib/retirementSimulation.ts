import type { TableProps } from '@/types/form';
import { calcValuationBasis, type ValuationBasis } from './valuationReport';

export const RETIREMENT_AMOUNT_FIELD = '_summary_retirement_amount';

type Getter = TableProps['getField'];

const numberOf = (text: string): number | null => {
  if (!text.trim()) return null;
  const value = Number(text.replace(/,/g, ''));
  return Number.isFinite(value) ? value : null;
};

export type RetirementSimulation = {
  amount: number | null;
  error: string | null;

  bases: ValuationBasis[];
};

/** 直前期に全額損金算入。支払原資・資産構成・会社規模と法人税額を固定する試算。 */
export function calcRetirementSimulation(getField: Getter): RetirementSimulation {
  const amountText = getField('table1_1', RETIREMENT_AMOUNT_FIELD);
  const amount = numberOf(amountText);
  const result: RetirementSimulation = { amount, error: null, bases: [] };
  if (!amountText.trim()) return result;
  if (amount === null || !Number.isSafeInteger(amount) || amount < 0) {
    return { ...result, error: '退職金額は0以上の整数（千円）で入力してください。' };
  }
  const income = numberOf(getField('table4', 'e18'));
  const retained = numberOf(getField('table4', 'n53'));
  if (income === null || retained === null) {
    return { ...result, error: '第4表の直前期の課税所得金額・利益積立金額を入力してください。' };
  }
  // 元の資産明細は動かさず、純資産の控除額を仮想の負債行として既存計算へ渡す。
  // 元の行がすべて埋まっていても上書きせず、計算中だけ続紙を1枚追加する。
  const pages = Math.max(1, Number(getField('table5', '_pages')) || 1);
  const lastRow = 15 + (pages - 1) * 23;
  // 既存の調整欄や前年実績を維持し、元データは書き換えない。
  const adjusted: Getter = (table, field) => {
    if (table === 'table4' && field === 'e18') return String(income - amount);
    if (table === 'table4' && field === 'n53') return String(retained - amount);
    if (table === 'table5') {
      if (field === '_pages') return String(pages + 1);
      const match = /^([al])_(\d+)_(\d)$/.exec(field);
      if (match && Number(match[2]) > lastRow) {
        if (match[1] === 'l' && Number(match[2]) === lastRow + 1) {
          if (match[3] === '1') return '退職金試算調整';
          if (match[3] === '2' || match[3] === '3') return String(amount);
        }
        return '';
      }
    }
    return getField(table, field);
  };
  result.bases = [calcValuationBasis(adjusted, 'inheritance'), calcValuationBasis(adjusted, 'special-market-value')];
  return result;
}
