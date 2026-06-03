import { FormOverlay, type OverlayField } from '@/components/ui/FormOverlay';
import type { TableProps } from '@/types/form';

const T = 'table3' as const;
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
const IMAGE = `${BASE}/forms/table3.png`;

/** 座標登録中は true（赤枠＋クリックで座標取得）、完成後 false */
const PICKER = true;

/** 第3表の入力欄（座標ピッカーで登録していく。すべて％） */
const FIELDS: OverlayField[] = [
  { field: 'f1', top: 12.46, left: 22.47, width: 23.46, height: 4.63 },
  { field: 'f2', top: 12.46, left: 45.79, width: 23.46, height: 4.63 },
  { field: 'f3', top: 12.46, left: 69.25, width: 23.46, height: 4.63 },
  { field: 'f4', top: 19.37, left: 71.57, width: 21.14, height: 4.63 },
  { field: 'f5', top: 24.00, left: 71.57, width: 21.14, height: 4.63 },
  { field: 'f6', top: 28.62, left: 71.57, width: 21.14, height: 4.63 },
  { field: 'f7', top: 35.63, left: 71.57, width: 21.14, height: 3.86 },
  { field: 'f8', top: 41.70, left: 71.57, width: 21.14, height: 3.86 },
  { field: 'f9', top: 50.18, left: 23.70, width: 14.05, height: 3.86 },
  { field: 'f10', top: 50.18, left: 37.75, width: 14.05, height: 3.86 },
  { field: 'f11', top: 50.18, left: 51.79, width: 12.82, height: 3.86 },
  { field: 'f12', top: 50.18, left: 64.61, width: 14.05, height: 3.86 },
  { field: 'f13', top: 50.18, left: 78.66, width: 13.91, height: 3.86 },
  { field: 'f14', top: 57.12, left: 23.70, width: 16.37, height: 3.86 },
  { field: 'f15', top: 57.12, left: 40.06, width: 17.59, height: 3.86 },
  { field: 'f16', top: 57.12, left: 57.52, width: 17.59, height: 3.86 },
  { field: 'f17', top: 60.88, left: 23.70, width: 16.37, height: 3.86 },
  { field: 'f18', top: 60.88, left: 40.06, width: 17.59, height: 3.86 },
  { field: 'f19', top: 60.88, left: 57.52, width: 17.59, height: 3.86 },
  { field: 'f20', top: 57.12, left: 75.12, width: 17.46, height: 7.71 },
  { field: 'f30', top: 64.74, left: 53.57, width: 10.64, height: 3.86 },
  { field: 'f31', top: 64.74, left: 65.02, width: 7.36, height: 3.86 },
  { field: 'f22', top: 68.75, left: 46.20, width: 16.09, height: 5.98 },
  { field: 'f23', top: 68.75, left: 62.30, width: 15.68, height: 5.98 },
  { field: 'f32', top: 74.89, left: 57.52, width: 9.27, height: 4.53 },
  { field: 'f33', top: 74.89, left: 66.80, width: 4.91, height: 4.63 },
  { field: 'f25', top: 79.45, left: 57.52, width: 14.18, height: 4.63 },
  { field: 'f26', top: 84.14, left: 57.52, width: 14.18, height: 4.53 },
  { field: 'f27', top: 88.67, left: 57.52, width: 14.18, height: 4.63 },
  { field: 'f28', top: 79.42, left: 79.75, width: 12.96, height: 6.17 },
  { field: 'f29', top: 85.56, left: 79.75, width: 12.96, height: 7.71 },
  { field: 'f34', top: 26.44, left: 39.25, width: 3.14, height: 1.06 },
  { field: 'f35', top: 26.54, left: 66.11, width: 3.00, height: 1.06 },
  { field: 'f36', top: 36.46, left: 53.02, width: 2.86, height: 2.02 },
  { field: 'f37', top: 36.37, left: 59.84, width: 2.45, height: 1.93 },
  { field: 'f38', top: 42.34, left: 42.66, width: 6.55, height: 1.45 },
  { field: 'f39', top: 42.25, left: 50.84, width: 6.00, height: 1.45 },
  { field: 'f40', top: 42.63, left: 65.98, width: 4.09, height: 1.16 },
];

/** 第3表（背景画像オーバーレイ方式） */
export function Table3({ getField, updateField }: TableProps) {
  const g = (f: string) => getField(T, f);
  const u = (f: string, v: string) => updateField(T, f, v);
  return <FormOverlay image={IMAGE} width="100%" fields={FIELDS} g={g} u={u} picker={PICKER} storageKey="picker_table3" />;
}
