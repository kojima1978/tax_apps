import { GridForm, type GridCell } from '@/components/ui/GridForm';
import type { TableProps } from '@/types/form';

const T = 'table8' as const;

/** 第8表のグリッドセル（ピッカーで測定・確定したもの／ピッカー出力をそのまま保存） */
const CELLS: GridCell[] = [
  // ── 外枠 ──
  { kind: 'cell', text: '', top: 9.28, left: 8.64, width: 81.69, height: 85.01 },
  // ── 1. S1の金額（続）純資産価額（相続税評価額）の修正計算 ──
  { kind: 'label', text: '１．S1の金額（続）', top: 9.28, left: 8.51, width: 2.73, height: 59.85 },
  { kind: 'label', text: '純 資 産 価 額( 相 続 税 評 価 額 )の 修 正 計 算', top: 9.19, left: 10.96, width: 10.91, height: 29.01 },
  { kind: 'label', text: '相続税評価額による純資産価額（第５表の⑤の金額）', top: 9.19, left: 21.6, width: 22.91, height: 4.24 },
  { kind: 'label', text: '課税時期現在の株式等の価額の合計額 (第５表の㋑の金額)', top: 9.19, left: 44.24, width: 23.05, height: 4.24 },
  { kind: 'label', text: '差 引(①－②）', top: 9.28, left: 67.01, width: 23.32, height: 4.14 },
  { field: '①', kind: 'input', top: 13.33, left: 21.74, width: 22.78, height: 3.08 },
  { field: '②', kind: 'input', top: 13.33, left: 44.37, width: 22.78, height: 3.08 },
  { field: '③', kind: 'input', top: 13.14, left: 67.01, width: 23.32, height: 3.28 },
  { kind: 'label', text: '帳簿価額による純資産価額（第５表の⑥の金額）', top: 16.32, left: 21.74, width: 22.78, height: 4.14 },
  { kind: 'label', text: '株 式 等 の 帳 簿 価 額 の 合 計 額(第５表の㋺＋（㊁－㋭）の金額)(注', top: 16.22, left: 44.37, width: 22.78, height: 4.24 },
  { kind: 'label', text: '差 引（④－⑤）', top: 16.22, left: 67.01, width: 23.32, height: 4.14 },
  { field: '④', kind: 'input', top: 20.27, left: 21.6, width: 22.91, height: 3.28 },
  { field: '⑤', kind: 'input', top: 20.27, left: 44.37, width: 22.78, height: 3.18 },
  { field: '⑥', kind: 'input', top: 20.27, left: 66.88, width: 23.46, height: 3.18 },
  { kind: 'label', text: '評価差額に相当する金額(③－⑥)', top: 23.45, left: 21.74, width: 22.78, height: 4.05 },
  { kind: 'label', text: '評 価 差 額 に 対 す る 法 人 税 額 等 相 当 額（⑦×37％）', top: 23.36, left: 44.37, width: 22.78, height: 4.14 },
  { kind: 'label', text: '課 税 時 期 現 在 の 修 正 純 資 産 価 額（相続税評価額） (③－⑧）', top: 23.45, left: 66.88, width: 23.46, height: 3.95 },
  { field: '⑦', kind: 'input', top: 27.5, left: 21.74, width: 22.78, height: 2.99 },
  { field: '⑧', kind: 'input', top: 27.4, left: 44.37, width: 22.78, height: 3.08 },
  { field: '⑨', kind: 'input', top: 27.4, left: 67.01, width: 23.19, height: 3.18 },
  { kind: 'label', text: '課税時期現在の発行済株式数(第５表の⑩の株式数)', top: 30.49, left: 21.74, width: 22.78, height: 3.76 },
  { kind: 'label', text: '課税時期現在の修正後の１株当たりの 純 資 産 価 額 ( 相 続 税 評 価 額 )( ⑨ ÷ ⑩)', top: 30.39, left: 44.37, width: 22.78, height: 4.05 },
  { kind: 'label', text: '（注）第５表のニ及びホの金額に株式等 以外の資産に係る金額が含まれてい る場合には、その金額を除いて計算 します。', top: 30.39, left: 67.01, width: 23.32, height: 7.81 },
  { field: '⑩', kind: 'input', top: 34.25, left: 21.6, width: 23.05, height: 3.95 },
  { field: '⑪', kind: 'input', top: 34.34, left: 44.37, width: 22.91, height: 3.95 },
  // 1株当たりのS1の金額の計算の基となる金額
  { kind: 'label', text: '１株当たりのＳ1の金額の計算の基となる金額', top: 38.1, left: 10.96, width: 15.68, height: 8.29 },
  { kind: 'label', text: '修正後の類似業種比準価額（第７表の ㉔ 、 ㉕ 又は ㉖ の金額）', top: 38.01, left: 26.37, width: 20.59, height: 4.34 },
  { kind: 'label', text: '修正後の１株当たりの純資産価額（相続税評価額） （⑪の金額）', top: 38.1, left: 46.69, width: 20.59, height: 4.24 },
  { field: '⑫', kind: 'input', top: 42.25, left: 26.37, width: 20.59, height: 4.14 },
  { field: '⑬', kind: 'input', top: 42.06, left: 46.69, width: 20.46, height: 4.34 },
  { kind: 'label', text: '', top: 38.1, left: 67.01, width: 23.32, height: 8.29 },
  // 1株当たりのS1の金額の計算
  { kind: 'label', text: '１株当たりのS1の金額の計算', top: 46.3, left: 10.96, width: 2.63, height: 22.84 },
  { kind: 'label', text: '区 分', top: 46.2, left: 13.28, width: 8.59, height: 2.89 },
  { kind: 'label', text: '１ 株 当 た り の Ｓ 1 の 金 額 の 算 定 方 法', top: 46.2, left: 21.6, width: 50.33, height: 2.89 },
  { kind: 'label', text: '１株当たりのＳ1の金額', top: 46.3, left: 71.79, width: 18.55, height: 2.7 },
  { kind: 'label', text: '比準要素数１である会社のＳ1 の 金 額', top: 48.9, left: 13.28, width: 8.59, height: 5.3 },
  { kind: 'label', text: '次のうちいずれか低い方の金額 　イ　⑬の金額 　ロ　（ ⑫の金額 × 0.25 ）＋（ ⑬の金額 × 0.75 ）', top: 48.9, left: 21.74, width: 50.19, height: 5.3 },
  { field: '⑭', kind: 'input', top: 48.9, left: 71.65, width: 18.68, height: 5.3 },
  { kind: 'label', text: '上 記 以 外 の 会 社', top: 54.1, left: 13.28, width: 2.76, height: 15.04 },
  { kind: 'label', text: '大 会 社 のＳ1の金額', top: 54.01, left: 15.73, width: 6.14, height: 5.11 },
  { kind: 'label', text: '次のうちいずれか低い方の金額（⑬の記載がないときは⑫の金額）イ　⑫の金額 　ロ　⑬の', top: 54.01, left: 21.74, width: 50.19, height: 5.11 },
  { field: '⑮', kind: 'input', top: 54.01, left: 71.65, width: 18.82, height: 5.1 },
  { kind: 'label', text: '中 会 社 のＳ1の金額', top: 58.92, left: 15.73, width: 6.14, height: 5.01 },
  { kind: 'label', text: '（⑫と⑬とのいずれか 低い方の金額×Lの割合0.＿）＋（⑬の金額×（１－Lの割合0.＿））', top: 58.92, left: 21.74, width: 50.19, height: 5.01 },
  { field: '⑯', kind: 'input', top: 58.92, left: 71.79, width: 18.55, height: 5.01 },
  { kind: 'label', text: '小 会 社 のＳ1の金額', top: 63.74, left: 15.73, width: 6.14, height: 5.3 },
  { kind: 'label', text: '次のうちいずれか低い方の金額 　イ　⑬の金額 　ロ　（ ⑫の金額 × 0.50 ）＋（ ⑬の金額 × 0.50 ）', top: 63.75, left: 21.74, width: 50.19, height: 5.39 },
  { field: '⑰', kind: 'input', top: 63.74, left: 71.79, width: 18.55, height: 5.4 },
  // ── 2. S2の金額 ──
  { kind: 'label', text: '２．S2の金額', top: 69.04, left: 8.51, width: 2.73, height: 16.39 },
  { kind: 'label', text: '課 税 時 期 現 在 の 株 式 等の 価 額 の 合 計 額（第５表の㋑の金額） ', top: 68.95, left: 10.96, width: 19.23, height: 4.72 },
  { kind: 'label', text: '株式等の帳簿価額の合計額(第５表の㋺＋(㊁－㋭)の金額)(注)', top: 69.04, left: 30.05, width: 20.59, height: 4.63 },
  { kind: 'label', text: '株 式 等 に 係 る 評 価 差 額に 相 当 す る 金 額（⑱－⑲） ', top: 68.95, left: 50.38, width: 20.32, height: 4.63 },
  { kind: 'label', text: '⑳ の 評 価 差 額 に 対 す る法 人 税 額 等 相 当 額（⑳×37％）', top: 69.04, left: 70.56, width: 19.78, height: 4.53 },
  { field: '⑱', kind: 'input', top: 73.57, left: 11.1, width: 19.09, height: 2.89 },
  { field: '⑲', kind: 'input', top: 73.57, left: 30.05, width: 20.46, height: 2.89 },
  { field: '⑳', kind: 'input', top: 73.48, left: 50.38, width: 20.32, height: 2.99 },
  { field: '㉑', kind: 'input', top: 73.48, left: 70.56, width: 19.78, height: 2.98 },
  { kind: 'label', text: 'Ｓ2の純資産価額相当額（⑱－ ㉑ ）', top: 76.37, left: 11.1, width: 19.09, height: 4.53 },
  { kind: 'label', text: '課 税 時 期 現 在 の 発 行 済 株 式 数（第５表の⑩の株式数）', top: 76.37, left: 30.05, width: 20.46, height: 4.43 },
  { kind: 'label', text: 'Ｓ2 の 金 額（ ㉒ ÷ ㉓ ）', top: 76.37, left: 50.38, width: 20.46, height: 4.44 },
  { kind: 'label', text: '（注）第５表の㊁及び㋭の金額に株式等以外の資産に係 る金額が含まれている場合 には、その金額を除いて計 算します。', top: 76.27, left: 70.56, width: 19.78, height: 9.16 },
  { field: '㉒', kind: 'input', top: 80.8, left: 11.1, width: 19.09, height: 4.43 },
  { field: '㉓', kind: 'input', top: 80.8, left: 30.05, width: 20.46, height: 4.53 },
  { field: '㉔', kind: 'input', top: 80.71, left: 50.38, width: 20.46, height: 4.63 },
  // ── 3. 株式等保有特定会社の株式の価額 ──
  { kind: 'label', text: '３.株式等保有特定会社 の株式の価額', top: 85.33, left: 8.78, width: 13.09, height: 8.96 },
  { kind: 'label', text: '１株当たりの純資産価額（第５表の ⑪の金額（第５表の⑫の金額がある ときはその金額）)', top: 85.33, left: 21.74, width: 22.91, height: 4.43 },
  { kind: 'label', text: 'Ｓ1の金額とＳ2の金額との合計額（（⑭、⑮、⑯又は⑰）＋ ㉔）', top: 85.33, left: 44.37, width: 22.78, height: 4.53 },
  { kind: 'label', text: '株式等保有特定会社の株式の価額（ ㉕ と ㉖とのいずれか低い方の金額）', top: 85.24, left: 66.88, width: 23.46, height: 4.53 },
  { field: '㉕', kind: 'input', top: 89.67, left: 21.6, width: 22.91, height: 4.53 },
  { field: '㉖', kind: 'input', top: 89.77, left: 44.37, width: 22.78, height: 4.53 },
  { field: '㉗', kind: 'input', top: 89.67, left: 67.01, width: 23.32, height: 4.53 },
];

/** 第8表（CSSグリッド方式・完成版） */
export function Table8Grid({ getField, updateField }: TableProps) {
  const g = (f: string) => getField(T, f);
  const u = (f: string, v: string) => updateField(T, f, v);
  return <GridForm cells={CELLS} g={g} u={u} width="100%" title="第８表　株式等保有特定会社の株式の価額の計算明細書（続）" />;
}
