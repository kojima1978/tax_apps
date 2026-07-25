// recharts のカスタムツールチップ／フォーマッタに渡る値の型（必要な範囲だけを定義）
// recharts 側の ValueType は配列も許容するため、そのまま受けられるようにしておく
export type ChartValue = number | string | readonly (number | string)[] | undefined;

export interface ChartTooltipItem {
  dataKey?: string | number;
  name?: string | number;
  value?: ChartValue;
  color?: string;
}

export interface ChartTooltipProps {
  active?: boolean;
  label?: number | string;
  payload?: ChartTooltipItem[];
}
