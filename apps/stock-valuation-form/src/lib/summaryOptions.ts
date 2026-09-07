/**
 * お客様サマリーの出力条件。
 *
 * 設定は担当者コメントと同じく第1表の1のアンダースコア接頭辞フィールドへ保存する。
 * 自動保存・JSON保存/読込・翌年度更新にそのまま乗るので、案件ごとに体裁が残る。
 * 未設定＝すべて表示になるよう、真偽値は「隠す側」を '1' として持つ（既存データは全部表示のまま）。
 */
import type { ActionItem } from '@/lib/clientSummary';
import type { ValuationBasis, ValuationBasisKey } from '@/lib/valuationReport';
import type { TableProps } from '@/types/form';

export type SummarySectionKey = 'prices' | 'holders' | 'sensitivity' | 'forecast' | 'actions' | 'note';

export const SUMMARY_SECTIONS: readonly { key: SummarySectionKey; label: string; hint: string }[] = [
  { key: 'prices', label: '株価一覧', hint: '評価方式ごとの1株当たりの価額' },
  { key: 'holders', label: '株主ごとの評価', hint: '株主別の評価方式と評価額' },
  { key: 'sensitivity', label: '比準要素の影響度', hint: '1円増加あたりの影響' },
  { key: 'forecast', label: '来期の見通し', hint: '比準要素数1・比準要素数0への該当リスク' },
  { key: 'actions', label: '次の一手', hint: '優先度つきの検討事項' },
  { key: 'note', label: '担当者コメント', hint: '自由記入欄' },
];

/** 株価一覧の行・株主ごとの列を、どの評価ベースに絞るか */
export type BasisFilter = 'both' | ValuationBasisKey;
/** 次の一手をどの優先度まで出すか */
export type ActionFilter = 'all' | 'mid' | 'high';

export const BASIS_FILTERS: readonly { value: BasisFilter; label: string }[] = [
  { value: 'both', label: '両方' },
  { value: 'inheritance', label: '相続税評価額ベースのみ' },
  { value: 'special-market-value', label: '所得税・法人税ベースのみ' },
];

export const ACTION_FILTERS: readonly { value: ActionFilter; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'mid', label: '優先度 高・中' },
  { value: 'high', label: '優先度 高のみ' },
];

export type SummaryOptions = {
  sections: Record<SummarySectionKey, boolean>;
  basis: BasisFilter;
  /** 「利益0の場合」の行・列を出すか */
  showZeroProfit: boolean;
  actionFilter: ActionFilter;
  /** 来期の見通しの「回避するために必要な水準」表を出すか */
  showForecastDetail: boolean;
};

const OFF = '1';
const OPTION_TABLE = 'table1_1' as const;

export const sectionField = (key: SummarySectionKey) => `_summary_off_${key}`;
export const BASIS_FIELD = '_summary_basis';
export const ZERO_PROFIT_FIELD = '_summary_off_zeroprofit';
export const ACTION_FIELD = '_summary_action_filter';
export const FORECAST_DETAIL_FIELD = '_summary_off_forecast_detail';

/** チェックボックス（表示するなら true）を保存値へ */
export const toStoredFlag = (visible: boolean) => (visible ? '' : OFF);

export function readSummaryOptions(getField: TableProps['getField']): SummaryOptions {
  const shown = (field: string) => getField(OPTION_TABLE, field) !== OFF;
  // 保存値が想定外（手書きJSONの読込など）なら既定へ倒す
  const pick = <T extends string>(field: string, allowed: readonly { value: T }[], fallback: T): T => {
    const saved = getField(OPTION_TABLE, field);
    return allowed.some((option) => option.value === saved) ? (saved as T) : fallback;
  };
  return {
    sections: Object.fromEntries(
      SUMMARY_SECTIONS.map((section) => [section.key, shown(sectionField(section.key))]),
    ) as Record<SummarySectionKey, boolean>,
    basis: pick<BasisFilter>(BASIS_FIELD, BASIS_FILTERS, 'both'),
    showZeroProfit: shown(ZERO_PROFIT_FIELD),
    actionFilter: pick<ActionFilter>(ACTION_FIELD, ACTION_FILTERS, 'all'),
    showForecastDetail: shown(FORECAST_DETAIL_FIELD),
  };
}

/** すべて表示へ戻すための欄と値の一覧 */
export function resetSummaryOptionFields(): { field: string; value: string }[] {
  return [
    ...SUMMARY_SECTIONS.map((section) => ({ field: sectionField(section.key), value: '' })),
    ...[BASIS_FIELD, ZERO_PROFIT_FIELD, ACTION_FIELD, FORECAST_DETAIL_FIELD].map((field) => ({ field, value: '' })),
  ];
}

/** 既定から外している条件の数。パネルを畳んでいても設定中だと分かるようにする */
export function changedOptionCount(options: SummaryOptions): number {
  return SUMMARY_SECTIONS.filter((section) => !options.sections[section.key]).length
    + (options.basis === 'both' ? 0 : 1)
    + (options.showZeroProfit ? 0 : 1)
    + (options.actionFilter === 'all' ? 0 : 1)
    + (options.showForecastDetail ? 0 : 1);
}

const ACTION_RANK: Record<ActionItem['priority'], number> = { 高: 3, 中: 2, 低: 1 };
const ACTION_FLOOR: Record<ActionFilter, number> = { all: 1, mid: 2, high: 3 };

export function filterActions(actions: readonly ActionItem[], filter: ActionFilter): ActionItem[] {
  return actions.filter((action) => ACTION_RANK[action.priority] >= ACTION_FLOOR[filter]);
}

export function filterBases(bases: readonly ValuationBasis[], basis: BasisFilter): ValuationBasis[] {
  return basis === 'both' ? [...bases] : bases.filter((item) => item.key === basis);
}

/** 株価一覧の行をどの評価ベースのときに出すか。common は両ベース共通の情報 */
export type RowScope = 'common' | ValuationBasisKey;

export function isRowVisible(
  row: { scope: RowScope; zeroProfit?: boolean },
  options: Pick<SummaryOptions, 'basis' | 'showZeroProfit'>,
): boolean {
  if (row.zeroProfit && !options.showZeroProfit) return false;
  return options.basis === 'both' || row.scope === 'common' || row.scope === options.basis;
}
