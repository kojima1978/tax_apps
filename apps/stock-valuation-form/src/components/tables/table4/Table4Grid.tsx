import { GridForm, type GridCell } from '@/components/ui/GridForm';
import { calcCompanySize } from '../table1-2/Table1_2Grid';
import type { TableId, TableProps } from '@/types/form';

const T = 'table4' as const;

type BlockNums = { a: string; ratio: string; price: string };

const minValueHighlight = (fields: string[], target: string) => (g: (field: string) => string) => {
  const values = fields
    .map((field) => ({ field, value: Number(g(field).replace(/,/g, '').trim()) }))
    .filter(({ field, value }) => g(field).trim() !== '' && !isNaN(value));
  if (values.length === 0) return false;
  const min = Math.min(...values.map(({ value }) => value));
  return values.some(({ field, value }) => field === target && value === min);
};

/**
 * 比準割合（区分／評価会社／類似業種／要素別比準割合／比準割合）＋比準価額の1ブロックを生成。
 * 第4表 Section3 は同一構造を縦に2回繰り返すため、1回目・2回目を共通定義から生成する。
 * dTop=縦オフセット%, n=各欄番号(A/比準割合/比準価額), fp=入力フィールド接頭辞。
 * 評価会社(v*)・要素別(e*)・比準割合・比準価額は自動計算（readOnly）。類似業種(s*)は手入力。
 */
function ratioPriceBlock(dTop: number, n: BlockNums, fp: string): GridCell[] {
  const t = (v: number) => +(v + dTop).toFixed(2);
  // Ⓑ・Ⓒ・Ⓓの3列は、全体幅（46.28%～78.06%）を変えずに均等配置する。
  const b = { left: 46.28, width: 10.59, valueLeft: 48.87, valueWidth: 8 };
  const c = { left: 56.87, width: 10.59, valueLeft: 59.46, valueWidth: 8 };
  const d = { left: 67.46, width: 10.6, valueLeft: 70.05, valueWidth: 8.01 };
  const markWidth = 2.59;
  return [
    { kind: 'label', text: '比 準 割 合 の 計 算', top: t(48.13), left: 36.87, width: 2.73, height: 16.87 },
    { kind: 'label', text: '区 分', top: t(48.03), left: 39.33, width: 7.23, height: 2.99 },
    { kind: 'label', text: '１株(50円)当たりの\n年配当金額', top: t(47.93), left: b.left, width: b.width, height: 3.08 },
    { kind: 'label', text: '１株(50円)当たりの\n年利益金額', top: t(47.93), left: c.left, width: c.width, height: 2.99 },
    { kind: 'label', text: '１株(50円)当たりの\n純資産価額', top: t(48.03), left: d.left, width: d.width, height: 2.89 },
    { kind: 'label', text: '評価\n会社', top: t(50.73), left: 39.19, width: 7.23, height: 3.66 },
    { kind: 'label', text: 'Ⓑ', top: t(50.83), left: b.left, width: markWidth, height: 3.56 },
    { field: `${fp}vB1`, kind: 'input', readOnly: true, topRightLabel: '円', top: t(50.92), left: b.valueLeft, width: 4.77, height: 3.57 },
    { field: `${fp}vB2`, kind: 'input', readOnly: true, topRightLabel: '銭', top: t(50.83), left: 53.64, width: 3.23, height: 3.46 },
    { kind: 'label', text: 'Ⓒ', top: t(50.92), left: c.left, width: markWidth, height: 3.57 },
    { field: `${fp}vC`, kind: 'input', readOnly: true, topRightLabel: '円', top: t(50.83), left: c.valueLeft, width: c.valueWidth, height: 3.56 },
    { kind: 'label', text: 'Ⓓ', top: t(50.73), left: d.left, width: markWidth, height: 3.56 },
    { field: `${fp}vD`, kind: 'input', readOnly: true, topRightLabel: '円', top: t(50.83), left: d.valueLeft, width: d.valueWidth, height: 3.66 },
    { kind: 'label', text: '類似\n業種', top: t(54.3), left: 39.46, width: 6.96, height: 3.66 },
    { kind: 'label', text: 'B', top: t(54.3), left: b.left, width: markWidth, height: 3.56 },
    { field: `${fp}sB1`, kind: 'input', commaInteger: true, topRightLabel: '円', top: t(54.3), left: b.valueLeft, width: 4.77, height: 3.66 },
    { field: `${fp}sB2`, kind: 'input', topRightLabel: '銭', top: t(54.3), left: 53.64, width: 3.23, height: 3.66 },
    { kind: 'label', text: 'C', top: t(54.39), left: c.left, width: markWidth, height: 3.57 },
    { field: `${fp}sC`, kind: 'input', commaInteger: true, topRightLabel: '円', top: t(54.3), left: c.valueLeft, width: c.valueWidth, height: 3.66 },
    { kind: 'label', text: 'D', top: t(54.2), left: d.left, width: markWidth, height: 3.66 },
    { field: `${fp}sD`, kind: 'input', commaInteger: true, topRightLabel: '円', top: t(54.2), left: d.valueLeft, width: d.valueWidth, height: 3.66 },
    { kind: 'label', text: '要素別\n比準割合', top: t(57.77), left: 39.19, width: 7.36, height: 3.66 },
    { kind: 'label', text: 'Ⓑ÷B', simpleFraction: { numerator: 'Ⓑ', denominator: 'B' }, top: t(57.77), left: b.left, width: markWidth, height: 3.56 },
    { field: `${fp}eB`, kind: 'input', readOnly: true, top: t(57.77), left: b.valueLeft, width: b.valueWidth, height: 3.66 },
    { kind: 'label', text: 'Ⓒ÷C', simpleFraction: { numerator: 'Ⓒ', denominator: 'C' }, top: t(57.67), left: c.left, width: markWidth, height: 3.56 },
    { field: `${fp}eC`, kind: 'input', readOnly: true, top: t(57.86), left: c.valueLeft, width: c.valueWidth, height: 3.66 },
    { kind: 'label', text: 'Ⓓ÷D', simpleFraction: { numerator: 'Ⓓ', denominator: 'D' }, top: t(57.86), left: d.left, width: markWidth, height: 3.66 },
    { field: `${fp}eD`, kind: 'input', readOnly: true, top: t(57.77), left: d.valueLeft, width: d.valueWidth, height: 3.56 },
    { kind: 'label', text: '比準割合', top: t(61.24), left: 39.19, width: 7.36, height: 3.66 },
    { kind: 'label', text: '（Ⓑ÷B＋Ⓒ÷C＋Ⓓ÷D）÷３', fractionExpression: { terms: [{ numerator: 'Ⓑ', denominator: 'B' }, { numerator: 'Ⓒ', denominator: 'C' }, { numerator: 'Ⓓ', denominator: 'D' }], denominator: '3' }, top: t(61.24), left: 46.56, width: 21.14, height: 3.56 },
    { field: n.ratio, kind: 'input', readOnly: true, cornerLabel: n.ratio, top: t(61.43), left: 67.42, width: 10.64, height: 3.57 },
    { kind: 'label', text: '１株(50円)当たりの\n比準価額', top: t(48.03), left: 77.93, width: 11.87, height: 2.99 },
    { kind: 'label', text: `${n.a} × ${n.ratio} × ___\n大会社は0.7\n中会社は0.6\n小会社は0.5\nとします。`, companyRateExpression: { a: n.a, ratio: n.ratio, rateField: `${fp}shin`, sizeField: `${fp}size` }, top: t(50.73), left: 77.79, width: 12, height: 10.7 },
    { field: n.price, kind: 'input', readOnly: true, cornerLabel: n.price, topRightLabel: '円', top: t(61.14), left: 77.79, width: 7.5, height: 3.76 },
    { field: `${fp}px`, kind: 'input', readOnly: true, topRightLabel: '銭', top: t(61.24), left: 84.88, width: 4.77, height: 3.76 },
  ];
}

/** 第4表のグリッドセル（ピッカーで測定・確定したもの／ピッカー出力をそのまま保存） */
const CELLS: GridCell[] = [
  // ── 外枠・3区分 ──
  { kind: 'cell', text: '外枠', top: 9.09, left: 8.92, width: 80.88, height: 85.01 },
  { kind: 'cell', text: '１', top: 9, left: 8.92, width: 80.88, height: 5.98 },
  { kind: 'cell', text: '２', top: 14.78, left: 8.78, width: 81.15, height: 33.45 },
  { kind: 'cell', text: '３', top: 48.03, left: 8.78, width: 81.15, height: 46.07 },
  // ── 1. 1株当たりの資本金等の額等の計算 ──
  { kind: 'label', text: '１.１株当たりの資本金等\n　の額等の計算', noWrap: true, top: 9, left: 9.05, width: 15.27, height: 5.88 },
  { kind: 'label', text: '直前期末の\n資本金等の額', noWrap: true, top: 9.09, left: 24.05, width: 13.09, height: 2.8 },
  { kind: 'label', text: '直前期末の\n発行済株式数', noWrap: true, top: 8.9, left: 37.01, width: 13.09, height: 2.99 },
  { kind: 'label', text: '直前期末の\n自己株式数', noWrap: true, top: 8.9, left: 50.1, width: 12.82, height: 2.89 },
  { kind: 'label', text: '１株当たりの資本金等の額\n（①÷（②－③））', noWrap: true, top: 8.9, left: 62.65, width: 13.09, height: 2.99 },
  { kind: 'label', text: '１株当たりの資本金等の額を50 円とした場合\nの発行済株式数\n(①÷50円）', fontSize: 5.5, noWrap: true, top: 9.09, left: 75.47, width: 14.32, height: 2.8 },
  { field: '①', kind: 'input', commaInteger: true, cornerLabel: '①', topRightLabel: '千円', top: 11.69, left: 24.05, width: 13.23, height: 3.18 },
  { field: '②', kind: 'input', commaInteger: true, readOnly: true, jumpTo: { tab: 'table1_1', field: '⑤', hint: 'クリックで入力元（第１表の１⑤・発行済株式数）へ移動します' }, cornerLabel: '②', topRightLabel: '株', top: 11.69, left: 37.01, width: 12.96, height: 3.18 },
  { field: '③', kind: 'input', commaInteger: true, readOnly: true, jumpTo: { tab: 'table1_1', field: 'f63', hint: 'クリックで入力元（第１表の１・自己株式数）へ移動します' }, cornerLabel: '③', topRightLabel: '株', top: 11.6, left: 49.83, width: 13.09, height: 3.28 },
  { field: '④', kind: 'input', readOnly: true, cornerLabel: '④', topRightLabel: '円', top: 11.6, left: 62.65, width: 13.09, height: 3.28 },
  { field: '⑤', kind: 'input', readOnly: true, cornerLabel: '⑤', topRightLabel: '株', top: 11.6, left: 75.47, width: 14.32, height: 3.28 },
  // ── 2. 比準要素等の金額の計算 ──
  { kind: 'label', text: '２比準要素等の金額の計算', top: 14.78, left: 8.78, width: 2.73, height: 33.45 },
  { kind: 'cell', text: '', top: 14.68, left: 11.23, width: 78.69, height: 12.53 },
  { kind: 'cell', text: '', top: 26.92, left: 11.1, width: 78.83, height: 11.66 },
  { kind: 'cell', text: '', top: 38.3, left: 11.23, width: 78.69, height: 9.83 },
  // 年配当金額ブロック
  { kind: 'label', text: '１株[50円]当たりの年配当金額', top: 14.59, left: 11.1, width: 2.73, height: 12.53 },
  { kind: 'label', text: '直前期末以前２( ３ )年間の年平均配当金額', top: 14.68, left: 13.55, width: 55.24, height: 2.22 },
  { kind: 'label', text: '事業年度', top: 16.71, left: 13.55, width: 6, height: 3.18 },
  { kind: 'label', text: '⑥年配当金額', top: 16.71, left: 19.28, width: 10.77, height: 3.18 },
  { kind: 'label', text: '⑦左のうち非経常的な配当金額', top: 16.61, left: 29.92, width: 10.77, height: 3.28 },
  { kind: 'label', text: '⑧差引経常的な年配当金額（⑥-⑦）', top: 16.71, left: 40.56, width: 11.87, height: 3.28 },
  { kind: 'label', text: '年平均配当金額', top: 16.8, left: 52.15, width: 16.5, height: 3.08 },
  { kind: 'label', text: '直前期', top: 19.69, left: 13.55, width: 6, height: 2.51 },
  { field: 'f28', kind: 'input', commaInteger: true, topRightLabel: '千円', top: 19.6, left: 19.42, width: 10.77, height: 2.7 },
  { field: 'f29', kind: 'input', commaInteger: true, topRightLabel: '千円', top: 19.6, left: 29.92, width: 10.77, height: 2.8 },
  { field: '㋑', kind: 'input', readOnly: true, cornerLabel: '㋑', topRightLabel: '千円', top: 19.69, left: 40.42, width: 12, height: 2.6 },
  { kind: 'label', text: '直前々期', top: 22.01, left: 13.55, width: 6, height: 2.51 },
  { field: 'f32', kind: 'input', commaInteger: true, topRightLabel: '千円', top: 22.1, left: 19.28, width: 10.91, height: 2.41 },
  { field: 'f33', kind: 'input', commaInteger: true, topRightLabel: '千円', top: 22.01, left: 29.92, width: 10.64, height: 2.51 },
  { field: '㋺', kind: 'input', readOnly: true, cornerLabel: '㋺', topRightLabel: '千円', top: 22.1, left: 40.42, width: 11.87, height: 2.41 },
  { kind: 'label', text: '直前々期の前期', top: 24.22, left: 13.42, width: 6.14, height: 2.8 },
  { field: 'f36', kind: 'input', commaInteger: true, topRightLabel: '千円', top: 24.42, left: 19.28, width: 10.77, height: 2.7 },
  { field: 'f37', kind: 'input', commaInteger: true, topRightLabel: '千円', top: 24.32, left: 29.78, width: 10.77, height: 2.8 },
  { field: '㋩', kind: 'input', readOnly: true, cornerLabel: '㋩', topRightLabel: '千円', top: 24.22, left: 40.42, width: 12, height: 2.89 },
  { field: '⑨（㋑＋㋺）÷２', kind: 'input', readOnly: true, exactPosition: true, cornerLabel: '⑨（㋑＋㋺）÷２', topRightLabel: '千円', top: 19.6, left: 52.01, width: 16.37, height: 3.565 },
  { field: '⑩（㋺＋㋩）÷２', kind: 'input', readOnly: true, exactPosition: true, cornerLabel: '⑩（㋺＋㋩）÷２', topRightLabel: '千円', top: 23.165, left: 52.01, width: 16.37, height: 3.565 },
  // 比準要素数1/0の会社の判定要素（配当）
  { kind: 'cell', text: '', top: 14.68, left: 68.51, width: 21.55, height: 8.29 },
  { kind: 'label', text: '「比準要素数１の会社」・「比準要素数０」\nの会社の判定要素の金額', noWrap: true, top: 14.68, left: 68.51, width: 21.41, height: 2.22 },
  { kind: 'label', text: '⑨÷⑤', simpleFraction: { numerator: '⑨', denominator: '⑤' }, top: 16.71, left: 68.51, width: 10.77, height: 3.18 },
  { field: 'B1', kind: 'input', readOnly: true, cornerLabel: 'B1', topRightLabel: '円', top: 16.51, left: 79.02, width: 6.27, height: 3.37 },
  { field: 'f45', kind: 'input', readOnly: true, topRightLabel: '銭', top: 16.61, left: 85.02, width: 4.91, height: 3.28 },
  { kind: 'label', text: '⑩÷⑤', simpleFraction: { numerator: '⑩', denominator: '⑤' }, top: 19.79, left: 68.51, width: 10.77, height: 3.28 },
  { field: 'B2', kind: 'input', readOnly: true, cornerLabel: 'B2', topRightLabel: '円', top: 19.69, left: 79.02, width: 6.27, height: 3.28 },
  { field: 'f48', kind: 'input', readOnly: true, topRightLabel: '銭', top: 19.69, left: 84.88, width: 5.05, height: 3.28 },
  { kind: 'cell', text: '', top: 22.87, left: 68.38, width: 21.55, height: 4.24 },
  { kind: 'label', text: '1株(50円)当たりの年配当金額\n（B1の金額）', noWrap: true, top: 22.87, left: 68.51, width: 21.28, height: 2.51 },
  { field: 'B', kind: 'input', readOnly: true, cornerLabel: 'Ⓑ', topRightLabel: '円', top: 25.09, left: 68.51, width: 16.64, height: 2.02 },
  { field: 'f52', kind: 'input', readOnly: true, topRightLabel: '銭', top: 25.19, left: 84.88, width: 5.05, height: 1.83 },
  // 利益金額ブロック（フレーム）
  { kind: 'cell', text: '', top: 26.92, left: 11.23, width: 78.69, height: 11.57 },
  { kind: 'cell', text: '', top: 26.92, left: 11.1, width: 57.69, height: 11.66 },
  { kind: 'cell', text: '', top: 26.73, left: 68.65, width: 21.28, height: 7.13 },
  { kind: 'cell', text: '', top: 33.57, left: 68.38, width: 21.41, height: 5.01 },
  { kind: 'cell', text: '', top: 38.3, left: 11.23, width: 57.55, height: 9.83 },
  { kind: 'cell', text: '', top: 38.3, left: 68.51, width: 21.41, height: 6.75 },
  { kind: 'cell', text: '', top: 44.75, left: 68.38, width: 21.55, height: 3.37 },
  // 1株50円当たりの年利益金額
  { kind: 'label', text: '１株[50円]当たりの年利益金額', top: 26.83, left: 11.1, width: 2.59, height: 11.66 },
  { kind: 'label', text: '直 前 期 末 以 前 ２ ( ３ ) 年 間 の 利 益 金 額', top: 26.83, left: 13.42, width: 55.37, height: 2.22 },
  { kind: 'label', text: '事 業 年 度', top: 28.75, left: 13.28, width: 6.41, height: 2.7 },
  { kind: 'label', text: '⑪法人税の\n課税所得金額', noWrap: true, top: 28.75, left: 19.28, width: 8.59, height: 2.7 },
  { kind: 'label', text: '⑫非経常的な\n利益金額', noWrap: true, top: 28.85, left: 27.6, width: 8.32, height: 2.6 },
  { kind: 'label', text: '⑬受取配当等の\n益金不算入額', noWrap: true, top: 28.85, left: 35.65, width: 8.59, height: 2.7 },
  { kind: 'label', text: '⑭左の所得税額', top: 28.85, left: 43.83, width: 8.59, height: 2.7 },
  { kind: 'label', text: '⑮損金算入した\n繰越欠損金の控除額', noWrap: true, top: 28.75, left: 52.15, width: 8.46, height: 2.8 },
  { kind: 'label', text: '⑯差引利益金額\n(⑪－⑫＋⑬－⑭＋⑮）', noWrap: true, top: 28.66, left: 60.33, width: 8.32, height: 2.8 },
  { kind: 'label', text: '直 前 期', top: 31.26, left: 13.28, width: 6.41, height: 2.51 },
  { field: 'e18', kind: 'input', signedCommaInteger: true, topRightLabel: '千円', top: 31.26, left: 19.42, width: 8.32, height: 2.6 },
  { field: 'e19', kind: 'input', commaInteger: true, topRightLabel: '千円', top: 31.16, left: 27.6, width: 8.32, height: 2.7 },
  { field: 'e20', kind: 'input', commaInteger: true, topRightLabel: '千円', top: 31.26, left: 35.65, width: 8.46, height: 2.51 },
  { field: 'e21', kind: 'input', commaInteger: true, topRightLabel: '千円', top: 31.26, left: 43.83, width: 8.46, height: 2.51 },
  { field: 'e22', kind: 'input', commaInteger: true, topRightLabel: '千円', top: 31.36, left: 52.15, width: 8.46, height: 2.51 },
  { field: '㊁', kind: 'input', readOnly: true, cornerLabel: '㊁', topRightLabel: '千円', top: 31.26, left: 60.47, width: 8.05, height: 2.41 },
  { kind: 'label', text: '直 前 々 期', top: 33.67, left: 13.55, width: 6, height: 2.51 },
  { field: 'e25', kind: 'input', signedCommaInteger: true, topRightLabel: '千円', top: 33.57, left: 19.42, width: 8.18, height: 2.6 },
  { field: 'e26', kind: 'input', commaInteger: true, topRightLabel: '千円', top: 33.48, left: 27.46, width: 8.46, height: 2.6 },
  { field: 'e27', kind: 'input', commaInteger: true, topRightLabel: '千円', top: 33.77, left: 35.65, width: 8.46, height: 2.31 },
  { field: 'e28', kind: 'input', commaInteger: true, topRightLabel: '千円', top: 33.67, left: 43.83, width: 8.46, height: 2.51 },
  { field: 'e29', kind: 'input', commaInteger: true, topRightLabel: '千円', top: 33.57, left: 52.01, width: 8.46, height: 2.51 },
  { field: '㋭', kind: 'input', readOnly: true, cornerLabel: '㋭', topRightLabel: '千円', top: 33.48, left: 60.2, width: 8.46, height: 2.6 },
  { kind: 'label', text: '直 前 々 期の 前 期', top: 35.98, left: 13.42, width: 6.14, height: 2.41 },
  { field: 'e32', kind: 'input', signedCommaInteger: true, topRightLabel: '千円', top: 35.89, left: 19.28, width: 8.59, height: 2.51 },
  { field: 'e33', kind: 'input', commaInteger: true, topRightLabel: '千円', top: 35.79, left: 27.46, width: 8.46, height: 2.6 },
  { field: 'e34', kind: 'input', commaInteger: true, topRightLabel: '千円', top: 35.89, left: 35.78, width: 8.32, height: 2.6 },
  { field: 'e35', kind: 'input', commaInteger: true, topRightLabel: '千円', top: 35.89, left: 43.97, width: 8.32, height: 2.6 },
  { field: 'e36', kind: 'input', commaInteger: true, topRightLabel: '千円', top: 35.89, left: 52.15, width: 8.46, height: 2.51 },
  { field: '㋬', kind: 'input', readOnly: true, cornerLabel: '㋬', topRightLabel: '千円', top: 35.79, left: 60.2, width: 8.46, height: 2.7 },
  // 利益・判定要素
  { kind: 'label', text: '「比準要素数１の会社」・「比準要素数０」\nの会社の判定要素の金額', noWrap: true, top: 26.83, left: 68.51, width: 21.28, height: 2.31 },
  { kind: 'label', text: '㊁÷⑤又は(㊁＋㋭)÷２÷⑤', alternativeFractions: { left: { numerator: '㊁', denominator: '⑤' }, right: { numerator: '(㊁＋㋭)÷２', denominator: '⑤' } }, top: 28.85, left: 68.65, width: 10.64, height: 2.6 },
  { field: 'C1', kind: 'input', readOnly: true, cornerLabel: 'C1', topRightLabel: '円', top: 28.75, left: 79.02, width: 10.91, height: 2.8 },
  { kind: 'label', text: '㋭÷⑤又は(㋭＋㋬)÷２÷⑤', alternativeFractions: { left: { numerator: '㋭', denominator: '⑤' }, right: { numerator: '(㋭＋㋬)÷２', denominator: '⑤' } }, top: 31.26, left: 68.51, width: 10.77, height: 2.51 },
  { field: 'C2', kind: 'input', readOnly: true, cornerLabel: 'C2', topRightLabel: '円', top: 31.36, left: 79.02, width: 10.77, height: 2.31 },
  { kind: 'label', text: '１株(50円)当たりの年利益金額\n（㊁÷⑤又は(㊁＋㋭)÷２÷⑤の金額）', fontSize: 5.5, alternativeFractions: { caption: '１株(50円)当たりの年利益金額', prefix: '（', left: { numerator: '㊁', denominator: '⑤' }, right: { numerator: '(㊁＋㋭)÷２', denominator: '⑤' }, suffix: 'の金額）' }, top: 33.67, left: 68.38, width: 21.55, height: 3.28 },
  { field: 'C', kind: 'input', readOnly: true, cornerLabel: 'Ⓒ', topRightLabel: '円', top: 36.75, left: 68.51, width: 21.28, height: 1.73 },
  // 1株50円当たりの純資産価額
  { kind: 'label', text: '１株[50円]当たりの純資産価額', top: 38.3, left: 11.1, width: 2.73, height: 9.93 },
  { kind: 'label', text: '直 前 期 末 （ 直 前 々 期 末 ） の 純 資 産 価 額', top: 38.2, left: 13.42, width: 55.24, height: 2.22 },
  { kind: 'label', text: '事 業 年 度', top: 40.22, left: 13.42, width: 6.27, height: 3.28 },
  { kind: 'label', text: '⑰ 資 本 金 等 の 額', top: 40.32, left: 19.28, width: 16.64, height: 3.08 },
  { kind: 'label', text: '⑱ 利 益 積 立 金 額', top: 40.32, left: 35.65, width: 16.78, height: 3.18 },
  { kind: 'label', text: '⑲純資産価額\n（⑰＋⑱)', noWrap: true, top: 40.22, left: 52.15, width: 16.64, height: 3.28 },
  { kind: 'label', text: '直 前 期', top: 43.4, left: 13.55, width: 6, height: 2.41 },
  { field: 'n52', kind: 'input', commaInteger: true, readOnly: true, jumpTo: { tab: 'table4', field: '①', hint: 'クリックで入力元（第４表①・直前期末の資本金等の額）へ移動します' }, topRightLabel: '千円', top: 43.21, left: 19.42, width: 16.5, height: 2.7 },
  { field: 'n53', kind: 'input', signedCommaInteger: true, topRightLabel: '千円', top: 43.21, left: 35.65, width: 16.64, height: 2.7 },
  { field: '㋣', kind: 'input', readOnly: true, cornerLabel: '㋣', topRightLabel: '千円', top: 43.21, left: 52.01, width: 16.78, height: 2.7 },
  { kind: 'label', text: '直 前 々 期', top: 45.62, left: 13.69, width: 5.86, height: 2.51 },
  { field: 'n56', kind: 'input', commaInteger: true, topRightLabel: '千円', top: 45.62, left: 19.42, width: 16.5, height: 2.51 },
  { field: 'n57', kind: 'input', commaInteger: true, topRightLabel: '千円', top: 45.62, left: 35.65, width: 16.64, height: 2.51 },
  { field: '㋠', kind: 'input', readOnly: true, cornerLabel: '㋠', topRightLabel: '千円', top: 45.62, left: 52.01, width: 16.64, height: 2.51 },
  // 純資産・判定要素
  { kind: 'label', text: '「比準要素数１の会社」・「比準要素数０」\nの会社の判定要素の金額', noWrap: true, top: 38.2, left: 68.51, width: 21.41, height: 2.12 },
  { kind: 'label', text: '㋣÷⑤', simpleFraction: { numerator: '㋣', denominator: '⑤' }, top: 40.22, left: 68.51, width: 7.23, height: 2.6 },
  { field: 'D1', kind: 'input', readOnly: true, cornerLabel: 'D1', topRightLabel: '円', top: 40.03, left: 75.47, width: 14.32, height: 2.7 },
  { kind: 'label', text: '㋠÷⑤', simpleFraction: { numerator: '㋠', denominator: '⑤' }, top: 42.54, left: 68.38, width: 7.36, height: 2.41 },
  { field: 'D2', kind: 'input', readOnly: true, cornerLabel: 'D2', topRightLabel: '円', top: 42.44, left: 75.47, width: 14.46, height: 2.51 },
  { kind: 'label', text: '１株(50円)当たりの純資産価額\n( D１の金額）', noWrap: true, top: 44.75, left: 68.51, width: 21.41, height: 1.93 },
  { field: 'D', kind: 'input', readOnly: true, cornerLabel: 'Ⓓ', topRightLabel: '円', top: 46.49, left: 68.38, width: 21.41, height: 1.64 },
  // ── 3. 類似業種比準価額の計算 ──
  { kind: 'label', text: '３類似業種比準価額の計算', top: 48.03, left: 9.05, width: 2.45, height: 46.07 },
  { kind: 'label', text: '１株[50円]当たりの比準価額の計算', top: 48.03, left: 11.51, width: 2.18, height: 33.83 },
  // 1回目: 類似業種の株価 → ⑳（左側）
  { kind: 'cell', text: '', top: 48.03, left: 13.69, width: 75.97, height: 16.96 },
  { kind: 'label', text: '類似業種と\n業種目番号', top: 47.93, left: 13.55, width: 7.23, height: 3.08 },
  { field: 'h5', kind: 'input', top: 47.93, left: 20.51, width: 16.78, height: 3.08 },
  { kind: 'label', text: '類 似 業 種 の 株 価', top: 50.83, left: 13.55, width: 2.32, height: 14.07 },
  { kind: 'label', text: '課税時期の属する月', fontSize: 6, noWrap: true, top: 50.73, left: 15.6, width: 8.73, height: 2.41 },
  { field: 'h8', kind: 'input', readOnly: true, jumpTo: { tab: 'table1_1', field: 'f14_m', hint: 'クリックで入力元（第１表の１・課税時期の月）へ移動します' }, topRightLabel: '月', top: 50.73, left: 24.19, width: 4.77, height: 2.41 },
  { field: '㋷', kind: 'input', commaInteger: true, readOnly: true, cornerLabel: '㋷', topRightLabel: '円', highlightWhen: minValueHighlight(['㋷', '㋦', '㋸', '㋾', '㋻'], '㋷'), top: 50.63, left: 28.96, width: 8.18, height: 2.51 },
  { kind: 'label', text: '課税時期の属する月の\n前月', fontSize: 5.5, noWrap: true, top: 52.95, left: 15.6, width: 8.73, height: 2.12 },
  { field: 'h11', kind: 'input', readOnly: true, jumpTo: { tab: 'table1_1', field: 'f14_m', hint: 'クリックで入力元（第１表の１・課税時期の月）へ移動します。前月は課税時期の月から自動計算' }, topRightLabel: '月', top: 52.85, left: 23.92, width: 5.05, height: 2.31 },
  { kind: 'label', text: '課税時期の属する月の\n前々月', fontSize: 5.5, noWrap: true, top: 54.97, left: 15.73, width: 8.46, height: 2.22 },
  { field: 'h13', kind: 'input', readOnly: true, jumpTo: { tab: 'table1_1', field: 'f14_m', hint: 'クリックで入力元（第１表の１・課税時期の月）へ移動します。前々月は課税時期の月から自動計算' }, topRightLabel: '月', top: 54.97, left: 23.92, width: 5.05, height: 2.31 },
  { field: '㋸', kind: 'input', commaInteger: true, readOnly: true, cornerLabel: '㋸', topRightLabel: '円', highlightWhen: minValueHighlight(['㋷', '㋦', '㋸', '㋾', '㋻'], '㋸'), top: 55.07, left: 28.69, width: 8.46, height: 2.22 },
  { field: '㋦', kind: 'input', commaInteger: true, readOnly: true, cornerLabel: '㋦', topRightLabel: '円', highlightWhen: minValueHighlight(['㋷', '㋦', '㋸', '㋾', '㋻'], '㋦'), top: 52.95, left: 28.55, width: 8.46, height: 2.31 },
  { kind: 'label', text: '前年平均株価', top: 56.99, left: 15.6, width: 13.5, height: 2.41 },
  { field: '㋾', kind: 'input', commaInteger: true, readOnly: true, cornerLabel: '㋾', topRightLabel: '円', highlightWhen: minValueHighlight(['㋷', '㋦', '㋸', '㋾', '㋻'], '㋾'), top: 56.99, left: 28.69, width: 8.46, height: 2.51 },
  { kind: 'label', text: '課税時期の属する月以前\n２年間の平均株価', fontSize: 6, noWrap: true, top: 59.21, left: 15.73, width: 13.23, height: 2.12 },
  { field: '㋻', kind: 'input', commaInteger: true, readOnly: true, cornerLabel: '㋻', topRightLabel: '円', highlightWhen: minValueHighlight(['㋷', '㋦', '㋸', '㋾', '㋻'], '㋻'), top: 59.21, left: 28.55, width: 8.73, height: 2.31 },
  { kind: 'label', text: 'Ａ(㋷、㋦、㋸、㋾及び㋻のうち\n最も低いもの）', noWrap: true, top: 61.24, left: 15.73, width: 13.23, height: 3.76 },
  { field: '⑳', kind: 'input', readOnly: true, cornerLabel: '⑳', topRightLabel: '円', top: 61.43, left: 28.69, width: 8.46, height: 3.47 },
  // 1回目: 比準割合＋比準価額（⑳㉑㉒）
  ...ratioPriceBlock(0, { a: '⑳', ratio: '㉑', price: '㉒' }, 'r1'),
  // 2回目: 類似業種の株価 → ㉓（左側）
  { kind: 'cell', text: '', top: 64.9, left: 13.69, width: 75.97, height: 16.96 },
  { kind: 'label', text: '類似業種と\n業種目番号', top: 64.9, left: 13.69, width: 7.23, height: 2.89 },
  { field: 'h58', kind: 'input', top: 64.8, left: 20.51, width: 16.5, height: 2.99 },
  { kind: 'label', text: '類 似 業 種 の 株 価', top: 67.5, left: 13.55, width: 2.45, height: 14.26 },
  { kind: 'label', text: '課税時期の属する月', fontSize: 6, noWrap: true, top: 67.6, left: 15.73, width: 8.59, height: 2.22 },
  { field: 'h61', kind: 'input', readOnly: true, jumpTo: { tab: 'table1_1', field: 'f14_m', hint: 'クリックで入力元（第１表の１・課税時期の月）へ移動します' }, topRightLabel: '月', top: 67.6, left: 24.05, width: 5.05, height: 2.31 },
  { field: '㋕', kind: 'input', commaInteger: true, readOnly: true, cornerLabel: '㋕', topRightLabel: '円', highlightWhen: minValueHighlight(['㋕', '㋵', '㋟', '㋹', '㋞'], '㋕'), top: 67.5, left: 28.69, width: 8.32, height: 2.41 },
  { kind: 'label', text: '課税時期の属する月の\n前月', fontSize: 5.5, noWrap: true, top: 69.72, left: 15.87, width: 8.46, height: 2.22 },
  { field: 'h64', kind: 'input', readOnly: true, jumpTo: { tab: 'table1_1', field: 'f14_m', hint: 'クリックで入力元（第１表の１・課税時期の月）へ移動します。前月は課税時期の月から自動計算' }, topRightLabel: '月', top: 69.62, left: 24.05, width: 4.91, height: 2.31 },
  { field: '㋵', kind: 'input', commaInteger: true, readOnly: true, cornerLabel: '㋵', topRightLabel: '円', highlightWhen: minValueHighlight(['㋕', '㋵', '㋟', '㋹', '㋞'], '㋵'), top: 69.72, left: 28.69, width: 8.32, height: 2.12 },
  { kind: 'label', text: '課税時期の属する月の\n前々月', fontSize: 5.5, noWrap: true, top: 71.74, left: 15.87, width: 8.46, height: 2.31 },
  { field: 'h67', kind: 'input', readOnly: true, jumpTo: { tab: 'table1_1', field: 'f14_m', hint: 'クリックで入力元（第１表の１・課税時期の月）へ移動します。前々月は課税時期の月から自動計算' }, topRightLabel: '月', top: 71.74, left: 23.92, width: 5.05, height: 2.31 },
  { field: '㋟', kind: 'input', commaInteger: true, readOnly: true, cornerLabel: '㋟', topRightLabel: '円', highlightWhen: minValueHighlight(['㋕', '㋵', '㋟', '㋹', '㋞'], '㋟'), top: 71.74, left: 28.69, width: 8.46, height: 2.31 },
  { kind: 'label', text: '前年平均株価', top: 73.96, left: 15.87, width: 12.96, height: 2.22 },
  { field: '㋹', kind: 'input', commaInteger: true, readOnly: true, cornerLabel: '㋹', topRightLabel: '円', highlightWhen: minValueHighlight(['㋕', '㋵', '㋟', '㋹', '㋞'], '㋹'), top: 73.86, left: 28.55, width: 8.46, height: 2.31 },
  { kind: 'label', text: '課税時期の属する月以前\n２年間の平均株価', fontSize: 6, noWrap: true, top: 75.98, left: 15.73, width: 13.09, height: 2.31 },
  { field: '㋞', kind: 'input', commaInteger: true, readOnly: true, cornerLabel: '㋞', topRightLabel: '円', highlightWhen: minValueHighlight(['㋕', '㋵', '㋟', '㋹', '㋞'], '㋞'), top: 75.89, left: 28.55, width: 8.59, height: 2.41 },
  { kind: 'label', text: 'Ａ （㋕、㋵、㋟、㋹及び㋞のうち\n最も低いもの ）', noWrap: true, top: 78.2, left: 15.6, width: 13.37, height: 3.47 },
  { field: '㉓', kind: 'input', readOnly: true, cornerLabel: '㉓', topRightLabel: '円', top: 78.1, left: 28.55, width: 8.59, height: 3.57 },
  // 2回目: 比準割合＋比準価額（㉓㉔㉕）※1回目を+16.87でミラー（推測）
  ...ratioPriceBlock(16.87, { a: '㉓', ratio: '㉔', price: '㉕' }, 'r2'),
  // ── 比準価額の修正（㉖㉗㉘）──
  { kind: 'label', text: '１株当たりの比準価額', top: 81.48, left: 11.37, width: 15.27, height: 3.37 },
  { kind: 'label', text: '比準価額（㉒と㉕とのいずれか低い方の金額）×④の金額÷50円', productFractionExpression: { prefixLines: ['比準価額', '（㉒と㉕とのいずれか低い方の金額）'], numerator: '④の金額', denominator: '50円' }, top: 81.48, left: 26.37, width: 47.05, height: 3.37 },
  { field: '㉖', kind: 'input', readOnly: true, cornerLabel: '㉖', topRightLabel: '円', top: 81.48, left: 73.15, width: 16.64, height: 3.28 },
  { kind: 'label', text: '比 準 価 額 の 修 正', top: 84.75, left: 11.37, width: 2.45, height: 9.25 },
  { kind: 'label', text: '直前期末の翌日から課税時期までの間に\n「配当金交付」の効力が\n発生した場合', fontSize: 5, top: 84.66, left: 13.55, width: 13.09, height: 4.72 },
  {
    kind: 'input',
    subtractionAmountExpression: {
      leftLabelLines: ['比準価額', '（㉖の金額）'],
      leftValueField: '㉖',
      rightLabelLines: ['１株当たりの', '配当金額'],
      rightYenField: 'mod_div',
      rightSenField: 'mod_div_sen',
    },
    top: 84.66,
    left: 26.37,
    width: 47.05,
    height: 4.72,
  },
  { kind: 'label', text: '修正比準価額', top: 84.46, left: 73.15, width: 16.64, height: 1.73 },
  { field: '㉗', kind: 'input', readOnly: true, cornerLabel: '㉗', topRightLabel: '円', top: 86.2, left: 73.15, width: 16.64, height: 3.18 },
  { kind: 'label', text: '直前期末の翌日から課税時期までの間に\n「株式の割当て等」の効力が\n発生した場合', fontSize: 5, top: 89.19, left: 13.49, width: 13.09, height: 4.81 },
  // ㉘＝(㉗(なければ㉖)＋払込金額×割当株式数)÷(1＋割当・交付株式数)
  {
    kind: 'input',
    allocationAdjustmentExpression: {
      baseLabelLines: ['比準価額', '（㉖（㉗がある', 'ときは㉗）の金額）'],
      baseValueField: 'mod2_base',
      paymentLabelLines: ['割当株式１株当たりの', '払込金額'],
      paymentField: 'mod_pay',
      allocationLabelLines: ['１株当たりの', '割当株式数'],
      allocationField: 'mod_ratio',
      issuedLabelLines: ['１株当たりの割当株式数', '又は交付株式数'],
      issuedField: 'mod_ratio2',
    },
    top: 89.28,
    left: 26.37,
    width: 46.78,
    height: 4.82,
  },
  { kind: 'label', text: '修正比準価額', top: 89.28, left: 73.29, width: 16.5, height: 1.73 },
  { field: '㉘', kind: 'input', readOnly: true, cornerLabel: '㉘', topRightLabel: '円', top: 90.73, left: 73.15, width: 16.64, height: 3.37 },
];

// ── 端数処理（第4表記載要領） ──
const fl = (v: number) => Math.floor(v + 1e-9);                 // 円未満切捨て
const fl10sen = (v: number) => Math.floor(v * 10 + 1e-7) / 10;  // 10銭未満切捨て
const fl2 = (v: number) => Math.floor(v * 100 + 1e-7) / 100;    // 小数点以下2位未満切捨て

/** 第4表の自動計算（第3表の①などからも参照する） */
export function calcTable4(getField: TableProps['getField']) {
  const raw = (f: string) => getField('table4', f);
  const parseNum = (value: string): number | null => {
    const s = value.replace(/,/g, '').trim();
    if (s === '') return null;
    const v = Number(s);
    return isNaN(v) ? null : v;
  };
  const num = (f: string) => parseNum(raw(f));

  // 1. 資本金等
  const cap = num('①');                         // 千円
  // ②発行済株式数＝第1表の1の⑤（評価会社の発行済株式数）を転記
  const issued = parseNum(getField('table1_1', '⑤'));
  const treasuryShares = parseNum(
    getField('table1_1', 'f63') || getField('table1_1', 'treasury_shares'),
  );
  const sharesNet = issued !== null ? issued - (treasuryShares ?? 0) : null; // ②－③
  // ④: 円未満切捨て。切捨てで0となる場合は発行済株式数(②－③)の桁数の小数位未満を切捨てて記載（記載要領の端数処理の例）
  let cap4: number | null = null;
  let cap4disp = '';
  if (cap !== null && sharesNet !== null && sharesNet > 0) {
    const v = (cap * 1000) / sharesNet;
    if (fl(v) > 0) {
      cap4 = fl(v);
      cap4disp = cap4.toLocaleString('ja-JP');
    } else {
      const m = Math.pow(10, String(Math.floor(sharesNet)).length);
      cap4 = Math.floor(v * m + 1e-9) / m;
      cap4disp = String(cap4);
    }
  }
  const cap5 = cap !== null ? fl(cap * 20) : null; // ⑤株 = ①×1000÷50
  const per50 = (kc: number | null) => (kc !== null && cap5 !== null && cap5 > 0 ? (kc * 1000) / cap5 : null); // 千円→1株50円当たり円

  // 医療法人（持分あり）: 剰余金の配当が禁止のため配当要素（Ⓑ/B）を除外して評価する
  // （評価通達194-2。第1表の1のチェックで切替）
  const medical = getField('table1_1', 'medical') === '1';

  // 2. 配当（⑧=⑥-⑦, ⑨⑩=2年平均, B=10銭未満切捨て）。医療法人はⒷ1/Ⓑ2/Ⓑを記載しない
  const sub = (a: string, b: string) => { const x = num(a); return x === null ? null : x - (num(b) ?? 0); };
  const i1 = sub('f28', 'f29'), i2 = sub('f32', 'f33'), i3 = sub('f36', 'f37');
  const avg = (a: number | null, b: number | null) => (a !== null && b !== null ? (a + b) / 2 : null);
  const v9 = avg(i1, i2), v10 = avg(i2, i3);
  const b1 = medical ? null : per50(v9) !== null ? fl10sen(per50(v9)!) : null;
  const b2 = medical ? null : per50(v10) !== null ? fl10sen(per50(v10)!) : null;
  const Bv = b1;

  // 2. 利益（⑯=⑪-⑫+⑬-⑭+⑮, C=単年と2年平均の低い方・円未満切捨て）
  const profit = (a: string, b: string, c: string, d: string, e: string) => {
    const x = num(a);
    return x === null ? null : x - (num(b) ?? 0) + (num(c) ?? 0) - (num(d) ?? 0) + (num(e) ?? 0);
  };
  const p1 = profit('e18', 'e19', 'e20', 'e21', 'e22');
  const p2 = profit('e25', 'e26', 'e27', 'e28', 'e29');
  const p3 = profit('e32', 'e33', 'e34', 'e35', 'e36');
  // C1/C2は単年か2年平均かを納税者が選択（既定は低い方を自動選択）
  const pickProfit = (single: number | null, two: number | null, mode: string) =>
    mode === 'single' ? single : mode === 'avg' ? two : single === null ? null : two === null ? single : Math.min(single, two);
  const pickProfitSide = (single: number | null, two: number | null, mode: string): 'left' | 'right' | undefined => {
    if (mode === 'single') return 'left';
    if (mode === 'avg') return 'right';
    if (single === null && two === null) return undefined;
    if (single === null) return 'right';
    if (two === null) return 'left';
    return single <= two ? 'left' : 'right';
  };
  const avg12 = p1 !== null && p2 !== null ? (p1 + p2) / 2 : null;
  const avg23 = p2 !== null && p3 !== null ? (p2 + p3) / 2 : null;
  const c1base = pickProfit(p1, avg12, raw('c1_mode'));
  const c1baseSide = pickProfitSide(p1, avg12, raw('c1_mode'));
  const c2base = pickProfit(p2, avg23, raw('c2_mode'));
  const c2baseSide = pickProfitSide(p2, avg23, raw('c2_mode'));
  // C1・C2・Ⓒが負数のときは0（記載要領3⑷⑸の注）
  const c1 = per50(c1base) !== null ? Math.max(0, fl(per50(c1base)!)) : null;
  const c2 = per50(c2base) !== null ? Math.max(0, fl(per50(c2base)!)) : null;
  const Cv = c1;

  // 2. 純資産（⑲=⑰+⑱, D=円未満切捨て）
  const na = (a: string, b: string) => { const x = num(a), y = num(b); return x === null && y === null ? null : (x ?? 0) + (y ?? 0); };
  const retained1 = num('n53');
  const t1 = cap === null && retained1 === null ? null : (cap ?? 0) + (retained1 ?? 0);
  const t2 = na('n56', 'n57');
  // D1・D2が負数のときは0（記載要領3⑺の注）
  const d1 = per50(t1) !== null ? Math.max(0, fl(per50(t1)!)) : null;
  const d2 = per50(t2) !== null ? Math.max(0, fl(per50(t2)!)) : null;
  const Dv = d1;

  // 3. 類似業種比準価額（A=最低株価, 割合=2位未満切捨て, 価額=10銭未満切捨て）
  const minOf = (fs: string[]) => { const vs = fs.map(num).filter((v): v is number => v !== null); return vs.length ? Math.min(...vs) : null; };
  const A1 = minOf(['㋷', '㋦', '㋸', '㋾', '㋻']);
  const A2 = minOf(['㋕', '㋵', '㋟', '㋹', '㋞']);
  const senPair = (y: string, s: string) => { const a = num(y); return a === null ? null : a + (num(s) ?? 0) / 100; };
  const elem = (v: number | null, base: number | null) => (v !== null && base !== null && base > 0 ? fl2(v / base) : null);
  // 比準割合: 通常は（Ⓑ/B＋Ⓒ/C＋Ⓓ/D）÷3。医療法人は配当要素を除いた（Ⓒ/C＋Ⓓ/D）÷2
  const ratio3 = (a: number | null, b: number | null, c: number | null) => (
    medical
      ? (b !== null && c !== null ? fl2((b + c) / 2) : null)
      : (a !== null && b !== null && c !== null ? fl2((a + b + c) / 3) : null)
  );
  // 斟酌率: 第1表の2の会社規模から自動連動（大0.7/中0.6/小0.5）
  const size = calcCompanySize((f) => getField('table1_2', f)).result;
  const shin = size === null ? null : size === 4 ? 0.7 : size === 0 ? 0.5 : 0.6;
  const e1B = elem(Bv, senPair('r1sB1', 'r1sB2')), e1C = elem(Cv, num('r1sC')), e1D = elem(Dv, num('r1sD'));
  const e2B = elem(Bv, senPair('r2sB1', 'r2sB2')), e2C = elem(Cv, num('r2sC')), e2D = elem(Dv, num('r2sD'));
  const r21 = ratio3(e1B, e1C, e1D); // ㉑
  const r24 = ratio3(e2B, e2C, e2D); // ㉔
  const price = (A: number | null, r: number | null) => (A !== null && r !== null && shin !== null ? fl10sen(A * r * shin) : null);
  const p22 = price(A1, r21), p25 = price(A2, r24);
  const minP = p22 !== null && p25 !== null ? Math.min(p22, p25) : p22 ?? p25;
  const v26 = minP !== null && cap4 !== null ? fl((minP * cap4) / 50) : null;

  // 比準価額の修正: ㉗=㉖－1株当たりの配当金額、㉘=(㉗(ないときは㉖)＋払込金額×割当株式数)÷(1＋割当・交付株式数)
  const modDiv = senPair('mod_div', 'mod_div_sen');
  const v27 = v26 !== null && modDiv !== null ? fl(v26 - modDiv) : null;
  const modPay = senPair('mod_pay', 'mod_pay_sen'), modRatio = num('mod_ratio'), modRatio2 = num('mod_ratio2');
  const base28 = v27 ?? v26;
  const v28 = base28 !== null && modRatio2 !== null ? fl((base28 + (modPay ?? 0) * (modRatio ?? 0)) / (1 + modRatio2)) : null;

  return { issued, treasuryShares, cap4, cap4disp, cap5, i1, i2, i3, v9, v10, b1, b2, Bv, p1, p2, p3, c1, c1baseSide, c2, c2baseSide, Cv, t1, t2, d1, d2, Dv, A1, A2, e1B, e1C, e1D, e2B, e2C, e2D, r21, r24, size, shin, p22, p25, v26, v27, v28 };
}

/** 第4表（CSSグリッド方式・完成版） */
export function Table4Grid({ getField, updateField, onJump }: TableProps) {
  const raw = (f: string) => getField(T, f);
  const u = (f: string, v: string) => updateField(T, f, v);

  const fmt = (v: number | null) => (v === null ? '' : v.toLocaleString('ja-JP'));
  const fmtDec1 = (v: number | null) => (v === null ? '' : v.toLocaleString('ja-JP', { maximumFractionDigits: 1 }));
  const yenPart = (v: number | null) => (v === null ? '' : fl(v).toLocaleString('ja-JP'));
  const senPart = (v: number | null) => (v === null ? '' : String(Math.round((v - fl(v)) * 100)).padStart(2, '0'));

  const c = calcTable4(getField);

  // 類似業種の株価の「課税時期の属する月／前月／前々月」は第1表の1の課税時期(f14)の月から導出
  const taxMonthRaw = getField('table1_1', 'f14_m');
  const taxMonth = Number(taxMonthRaw.replace(/,/g, '').trim());
  const taxMonthValid = taxMonthRaw.trim() !== '' && Number.isInteger(taxMonth) && taxMonth >= 1 && taxMonth <= 12;
  const prevMonth = (back: number): string => (taxMonthValid ? String(((taxMonth - 1 - back + 12) % 12) + 1) : '');

  const g = (f: string): string => {
    switch (f) {
      case 'h8': case 'h61': return taxMonthRaw; // 課税時期の属する月＝第1表の1の課税時期(f14)の月
      case 'h11': case 'h64': return prevMonth(1); // 前月＝課税時期の月−1（年跨ぎ対応）
      case 'h13': case 'h67': return prevMonth(2); // 前々月＝課税時期の月−2
      case '②': return fmt(c.issued);
      case '③': return fmt(c.treasuryShares);
      case '④': return c.cap4disp;
      case '⑤': return fmt(c.cap5);
      case '㋑': return fmtDec1(c.i1);
      case '㋺': return fmtDec1(c.i2);
      case '㋩': return fmtDec1(c.i3);
      case '⑨（㋑＋㋺）÷２': return fmtDec1(c.v9);
      case '⑩（㋺＋㋩）÷２': return fmtDec1(c.v10);
      case 'B1': return yenPart(c.b1); case 'f45': return senPart(c.b1);
      case 'B2': return yenPart(c.b2); case 'f48': return senPart(c.b2);
      case 'B': return yenPart(c.Bv); case 'f52': return senPart(c.Bv);
      case '㊁': return fmtDec1(c.p1);
      case '㋭': return fmtDec1(c.p2);
      case '㋬': return fmtDec1(c.p3);
      case 'C1': return fmt(c.c1); case 'C2': return fmt(c.c2); case 'C': return fmt(c.Cv);
      case 'n52': return raw('①');
      case '㋣': return fmtDec1(c.t1); case '㋠': return fmtDec1(c.t2);
      case 'D1': return fmt(c.d1); case 'D2': return fmt(c.d2); case 'D': return fmt(c.Dv);
      case '⑳': return fmt(c.A1); case '㉓': return fmt(c.A2);
      case 'r1vB1': return yenPart(c.Bv); case 'r1vB2': return senPart(c.Bv);
      case 'r2vB1': return yenPart(c.Bv); case 'r2vB2': return senPart(c.Bv);
      case 'r1vC': return fmt(c.Cv); case 'r2vC': return fmt(c.Cv);
      case 'r1vD': return fmt(c.Dv); case 'r2vD': return fmt(c.Dv);
      case 'r1eB': return c.e1B === null ? '' : c.e1B.toFixed(2);
      case 'r1eC': return c.e1C === null ? '' : c.e1C.toFixed(2);
      case 'r1eD': return c.e1D === null ? '' : c.e1D.toFixed(2);
      case 'r2eB': return c.e2B === null ? '' : c.e2B.toFixed(2);
      case 'r2eC': return c.e2C === null ? '' : c.e2C.toFixed(2);
      case 'r2eD': return c.e2D === null ? '' : c.e2D.toFixed(2);
      case '㉑': return c.r21 === null ? '' : c.r21.toFixed(2);
      case '㉔': return c.r24 === null ? '' : c.r24.toFixed(2);
      case 'r1shin': case 'r2shin': return c.shin === null ? '' : c.shin.toFixed(1);
      case 'r1size': case 'r2size': return c.size === 4 ? 'large' : c.size === 0 ? 'small' : c.size === null ? '' : 'medium';
      case '㉒': return yenPart(c.p22); case 'r1px': return senPart(c.p22);
      case '㉕': return yenPart(c.p25); case 'r2px': return senPart(c.p25);
      case '㉖': return fmt(c.v26);
      case '㉗': return fmt(c.v27);
      case '㉘': return fmt(c.v28);
      case 'mod2_base': return fmt(c.v27 ?? c.v26);
      default: return raw(f);
    }
  };
  const modeSelect = (field: string, singleLabel: string) => (
    <select id={`table4-${field}-toolbar`} name={`table4.${field}`} value={raw(field)} onChange={(e) => u(field, e.target.value)} style={{ fontSize: 11, padding: '1px 2px' }}>
      <option value="">低い方（自動）</option>
      <option value="single">{singleLabel}</option>
      <option value="avg">２年平均</option>
    </select>
  );
  const toolbar = (
    <span className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, whiteSpace: 'nowrap' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 3 }}>C1:{modeSelect('c1_mode', '単年（㊁÷⑤）')}</label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 3 }}>C2:{modeSelect('c2_mode', '単年（㋭÷⑤）')}</label>
    </span>
  );
  const cells = CELLS.map((cell) => {
    if (cell.kind === 'label' && cell.text === '㊁÷⑤又は(㊁＋㋭)÷２÷⑤' && cell.alternativeFractions) {
      return {
        ...cell,
        alternativeFractions: {
          ...cell.alternativeFractions,
          selectedSide: c.c1baseSide,
        },
      };
    }
    if (cell.kind === 'label' && cell.text === '㋭÷⑤又は(㋭＋㋬)÷２÷⑤' && cell.alternativeFractions) {
      return {
        ...cell,
        alternativeFractions: {
          ...cell.alternativeFractions,
          selectedSide: c.c2baseSide,
        },
      };
    }
    return cell;
  });
  return <GridForm cells={cells} g={g} u={u} formId={T} width="100%" title="第４表　類似業種比準価額等の計算明細書" toolbar={toolbar} onJump={onJump && ((t) => onJump({ tab: t.tab as TableId, field: t.field }))} />;
}
