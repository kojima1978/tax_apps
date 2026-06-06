import { GridForm, type GridCell } from '@/components/ui/GridForm';
import type { TableProps } from '@/types/form';

const T = 'table1_2' as const;

/** 第1表の2のグリッドセル（ピッカーで測定・確定したもの／ピッカー出力をそのまま保存） */
const CELLS: GridCell[] = [];

/** 第1表の2（CSSグリッド方式・完成版） */
export function Table1_2Grid({ getField, updateField }: TableProps) {
  const g = (f: string) => getField(T, f);
  const u = (f: string, v: string) => updateField(T, f, v);
  return <GridForm cells={CELLS} g={g} u={u} width="100%" title="第１表の２　評価上の株主の判定及び会社規模の判定の明細書（続）" />;
}
