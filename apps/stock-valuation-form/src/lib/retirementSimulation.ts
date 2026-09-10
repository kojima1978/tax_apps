import type { TableProps } from '@/types/form';
import { calcValuationBasis, type ValuationBasis } from './valuationReport';

export const RETIREMENT_AMOUNT_FIELD = '_summary_retirement_amount';
export const RETIREMENT_INSURANCE_FIELD = '_summary_retirement_insurance_proceeds';

type Getter = TableProps['getField'];

const numberOf = (text: string): number | null => {
  if (!text.trim()) return null;
  const value = Number(text.replace(/,/g, ''));
  return Number.isFinite(value) ? value : null;
};

type FieldError = { error: string; errorField: string };

/** 空欄は「入力なし」として通し、書式違い・負数・小数だけを弾く。 */
const validate = (field: string, text: string, value: number | null, label: string): FieldError | null =>
  !text.trim() || (value !== null && Number.isSafeInteger(value) && value >= 0)
    ? null
    : { error: `${label}は0以上の整数（千円）で入力してください。`, errorField: field };

export type RetirementSimulation = {
  amount: number | null;
  proceeds: number | null;
  error: string | null;
  /** エラーの出所の入力欄。第4表側の不足など、欄に紐づかないものは null。 */
  errorField: string | null;

  bases: ValuationBasis[];
};

/**
 * 直前期に退職金を全額損金算入し、保険の解約益を同じ期の益金とする試算。
 * 支払原資・資産構成・会社規模と法人税額は現状で固定する。
 * 解約は第5表へ持ち込まない ── 保険は解約返戻金相当額で相続税評価額に載っている
 * （財産評価基本通達214）ので、解約して現金に替わっても純資産価額は動かない。
 */
export function calcRetirementSimulation(getField: Getter): RetirementSimulation {
  const amountText = getField('table1_1', RETIREMENT_AMOUNT_FIELD);
  const proceedsText = getField('table1_1', RETIREMENT_INSURANCE_FIELD);
  const amount = numberOf(amountText);
  const proceeds = numberOf(proceedsText);
  const result: RetirementSimulation = { amount, proceeds, error: null, errorField: null, bases: [] };
  // 退職金なしで保険だけ解約する場合もあるので、どちらか一方の入力で試算する。
  if (!amountText.trim() && !proceedsText.trim()) return result;
  const invalid = validate(RETIREMENT_AMOUNT_FIELD, amountText, amount, '退職金額')
    ?? validate(RETIREMENT_INSURANCE_FIELD, proceedsText, proceeds, '保険の解約益');
  if (invalid) return { ...result, ...invalid };
  const income = numberOf(getField('table4', 'e18'));
  const retained = numberOf(getField('table4', 'n53'));
  if (income === null || retained === null) {
    return { ...result, error: '第4表の直前期の課税所得金額・利益積立金額を入力してください。' };
  }
  // ⑫非経常的な利益金額。様式でも未記入は0として⑯を計算するので、空欄は0で足す。
  const nonRecurring = numberOf(getField('table4', 'e19')) ?? 0;
  const pay = amount ?? 0;
  const gain = proceeds ?? 0;
  // 元の資産明細は動かさず、純資産の控除額を仮想の負債行として既存計算へ渡す。
  // 元の行がすべて埋まっていても上書きせず、計算中だけ続紙を1枚追加する。
  const pages = Math.max(1, Number(getField('table5', '_pages')) || 1);
  const lastRow = 15 + (pages - 1) * 23;
  // 既存の調整欄や前年実績を維持し、元データは書き換えない。
  const adjusted: Getter = (table, field) => {
    if (table === 'table4') {
      // ⑪法人税の課税所得金額。退職金は損金、解約益は益金として同じ直前期に立てる。
      if (field === 'e18') return String(income - pay + gain);
      // ⑫非経常的な利益金額。解約益をここへも立てると ⑯＝⑪－⑫＋⑬－⑭＋⑮ で打ち消し合い、
      // 類似業種比準のⒸ（年利益金額）が解約益で膨らまない。財産評価基本通達183(2)が
      // 保険差益を非経常的な利益としてⒸから除くのと同じ扱いで、⑪だけに足すと株価が高く出る。
      if (field === 'e19') return String(nonRecurring + gain);
      // ⑱利益積立金額。こちらは経常・非経常を問わないので解約益がそのまま残り、
      // Ⓓ（1株当たりの純資産価額・帳簿価額）を通じて比準価額へ効く。
      if (field === 'n53') return String(retained - pay + gain);
    }
    if (table === 'table5') {
      if (field === '_pages') return String(pages + 1);
      const match = /^([al])_(\d+)_(\d)$/.exec(field);
      if (match && Number(match[2]) > lastRow) {
        if (match[1] === 'l' && Number(match[2]) === lastRow + 1) {
          if (match[3] === '1') return '退職金試算調整';
          if (match[3] === '2' || match[3] === '3') return String(pay);
        }
        return '';
      }
    }
    return getField(table, field);
  };
  result.bases = [calcValuationBasis(adjusted, 'inheritance'), calcValuationBasis(adjusted, 'special-market-value')];
  return result;
}
