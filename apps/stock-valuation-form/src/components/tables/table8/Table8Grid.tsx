import { GridForm, type GridCell } from '@/components/ui/GridForm';
import type { TableProps } from '@/types/form';

const T = 'table8' as const;

/** 第8表のグリッドセル（ピッカーで測定・確定したもの／ピッカー出力をそのまま保存） */
const CELLS: GridCell[] = [];

/** 第8表（CSSグリッド方式・完成版） */
export function Table8Grid({ getField, updateField }: TableProps) {
  const g = (f: string) => getField(T, f);
  const u = (f: string, v: string) => updateField(T, f, v);
  return <GridForm cells={CELLS} g={g} u={u} width="100%" title="第８表　株式等保有特定会社の株式の価額の計算明細書（続）" />;
}
