import { GridForm, type GridCell } from '@/components/ui/GridForm';
import { calcTable4 } from '../table4/Table4Grid';
import { calcTable5 } from '../table5/Table5Grid';
import { calcCompanySize } from '../table1-2/Table1_2Grid';
import { calcTable2 } from '../table2/Table2Grid';
import type { TableId, TableProps } from '@/types/form';

const T = 'table7' as const;

// ── 計算の根拠（参考リンク） ──
const REFERENCES = [
  { label: '評価通達189-3（株式等保有特定会社のS1+S2方式）', url: 'https://www.nta.go.jp/law/tsutatsu/kihon/sisan/hyoka_new/08/05.htm#a-189' },
  { label: '評価通達180（類似業種比準価額）', url: 'https://www.nta.go.jp/law/tsutatsu/kihon/sisan/hyoka_new/08/03.htm#a-180' },
  { label: '評価通達187（株式の価額の修正）', url: 'https://www.nta.go.jp/law/tsutatsu/kihon/sisan/hyoka_new/08/04.htm#a-187' },
];

// ── 端数処理（第7表記載要領＝第4表の記載方法等4に準ずる） ──
const fl = (v: number) => Math.floor(v + 1e-9);                 // 円未満切捨て
const fl10sen = (v: number) => Math.floor(v * 10 + 1e-7) / 10;  // 10銭未満切捨て
const fl3 = (v: number) => Math.floor(v * 1000 + 1e-7) / 1000;  // 小数点以下3位未満切捨て

const TABLE4_LINKED_FIELDS: Record<string, string> = {
  f61: 'h5',
  f66: 'h8',
  f68: 'h11',
  f70: 'h13',
  '㊁': '㋷',
  '㋭': '㋦',
  '㋬': '㋸',
  '㋣': '㋾',
  '㋠': '㋻',
  f110: 'r1sB1',
  f111: 'r1sB2',
  f113: 'r1sC',
  f115: 'r1sD',
  b2_f61: 'h58',
  b2_f66: 'h61',
  b2_f68: 'h64',
  b2_f70: 'h67',
  'b2_㊁': '㋕',
  'b2_㋭': '㋵',
  'b2_㋬': '㋟',
  'b2_㋣': '㋹',
  'b2_㋠': '㋞',
  b2_f110: 'r2sB1',
  b2_f111: 'r2sB2',
  b2_f113: 'r2sC',
  b2_f115: 'r2sD',
};

const linkInputsToTable4 = (cells: GridCell[]): GridCell[] =>
  cells.map((cell) => {
    if (cell.kind !== 'input') return cell;
    const linked = cell.field ? TABLE4_LINKED_FIELDS[cell.field] : undefined;
    return linked
      ? { ...cell, readOnly: true, jumpTo: { tab: 'table4', field: linked, hint: `クリックで入力元（第４表 ${linked}）へ移動します` } }
      : { ...cell, readOnly: true };
  });

const minValueHighlight = (fields: string[], target: string) => (g: (field: string) => string) => {
  const values = fields
    .map((field) => ({ field, value: Number(g(field).replace(/,/g, '').trim()) }))
    .filter(({ field, value }) => g(field).trim() !== '' && !isNaN(value));
  if (values.length === 0) return false;
  const min = Math.min(...values.map(({ value }) => value));
  return values.some(({ field, value }) => field === target && value === min);
};

/** 比準価額計算の1ブロック分（類似業種株価＋比準割合＋比準価額）。1回目を基準に定義。 */
const BLOCK1_CALC: GridCell[] = [
  // 類似業種の株価
  { kind: 'label', text: '類似業種と\n業種目番号', top: 46.87, left: 13.28, width: 7.5, height: 2.99 },
  { field: 'f61', kind: 'input', top: 46.97, left: 20.51, width: 16.64, height: 2.89 },
  { kind: 'label', text: '類 似 業 種 の 株 価', top: 49.67, left: 13.28, width: 2.76, height: 14.17 },
  { kind: 'label', text: '課税時期の属する月', fontSize: 6, noWrap: true, top: 49.77, left: 15.73, width: 8.59, height: 2.22 },
  { kind: 'label', text: '課税時期の属する月の\n前月', fontSize: 5.5, noWrap: true, top: 51.89, left: 15.73, width: 8.59, height: 2.22 },
  { kind: 'label', text: '課税時期の属する月の\n前々月', fontSize: 5.5, noWrap: true, top: 54.01, left: 15.87, width: 8.32, height: 2.12 },
  { field: 'f66', kind: 'input', topRightLabel: '月', top: 49.86, left: 24.05, width: 5.05, height: 2.12 },
  { field: '㊁', kind: 'input', commaInteger: true, cornerLabel: '㊁', topRightLabel: '円', highlightWhen: minValueHighlight(['㊁', '㋭', '㋬', '㋣', '㋠'], '㊁'), top: 49.77, left: 28.83, width: 8.18, height: 2.22 },
  { field: 'f68', kind: 'input', topRightLabel: '月', top: 51.98, left: 24.05, width: 4.91, height: 2.02 },
  { field: '㋭', kind: 'input', commaInteger: true, cornerLabel: '㋭', topRightLabel: '円', highlightWhen: minValueHighlight(['㊁', '㋭', '㋬', '㋣', '㋠'], '㋭'), top: 51.89, left: 28.83, width: 8.32, height: 2.12 },
  { field: 'f70', kind: 'input', topRightLabel: '月', top: 54.01, left: 24.05, width: 4.91, height: 2.02 },
  { field: '㋬', kind: 'input', commaInteger: true, cornerLabel: '㋬', topRightLabel: '円', highlightWhen: minValueHighlight(['㊁', '㋭', '㋬', '㋣', '㋠'], '㋬'), top: 53.91, left: 28.83, width: 8.32, height: 2.12 },
  { kind: 'label', text: '前年平均株価', top: 56.03, left: 15.87, width: 13.23, height: 2.12 },
  { kind: 'label', text: '課税時期の属する月以前\n２年間の平均株価', fontSize: 6, noWrap: true, top: 58.15, left: 15.73, width: 13.37, height: 2.22 },
  { kind: 'label', text: 'Ａ(㊁、㋭、㋬、㋣及び㋠のうち\n最も低いもの）', noWrap: true, top: 60.18, left: 15.87, width: 13.23, height: 3.57 },
  { field: '㋣', kind: 'input', commaInteger: true, cornerLabel: '㋣', topRightLabel: '円', highlightWhen: minValueHighlight(['㊁', '㋭', '㋬', '㋣', '㋠'], '㋣'), top: 55.93, left: 28.83, width: 8.32, height: 2.31 },
  { field: '㋠', kind: 'input', commaInteger: true, cornerLabel: '㋠', topRightLabel: '円', highlightWhen: minValueHighlight(['㊁', '㋭', '㋬', '㋣', '㋠'], '㋠'), top: 58.15, left: 28.83, width: 8.46, height: 2.12 },
  { field: '⑱', kind: 'input', readOnly: true, cornerLabel: '⑱', topRightLabel: '円', top: 60.27, left: 28.96, width: 8.18, height: 3.37 },
  // 比準割合の計算
  { kind: 'label', text: '比 準 割 合 の 計 算', top: 47.07, left: 36.87, width: 2.73, height: 16.77 },
  { kind: 'label', text: '区 分', top: 46.87, left: 39.46, width: 7.23, height: 2.99 },
  { kind: 'label', text: '１株(50円)当たりの\n年配当金額', top: 46.87, left: 46.42, width: 11.05, height: 2.99 },
  { kind: 'label', text: '１株(50円)当たりの\n年利益金額', top: 46.97, left: 57.19, width: 11.05, height: 2.89 },
  { kind: 'label', text: '１株(50円)当たりの\n純資産価額', top: 46.87, left: 68.11, width: 10.64, height: 2.99 },
  { kind: 'label', text: '１株(50円)当たりの\n比準価額', top: 46.87, left: 78.61, width: 12.14, height: 2.89 },
  { kind: 'label', text: '評価\n会社', top: 49.77, left: 39.46, width: 7.23, height: 3.57 },
  { kind: 'label', text: '⑤', top: 49.67, left: 46.28, width: 2.86, height: 3.66 },
  { field: 'f103', kind: 'input', readOnly: true, topRightLabel: '円', top: 49.77, left: 48.88, width: 4.91, height: 3.47 },
  { field: 'f104', kind: 'input', readOnly: true, topRightLabel: '銭', top: 49.57, left: 53.65, width: 3.68, height: 3.66 },
  { kind: 'label', text: '⑧', top: 49.77, left: 57.19, width: 2.59, height: 3.57 },
  { field: 'f106', kind: 'input', readOnly: true, topRightLabel: '円', top: 49.77, left: 59.65, width: 8.46, height: 3.57 },
  { kind: 'label', text: '⑰', top: 49.77, left: 67.83, width: 2.73, height: 3.57 },
  { field: 'f108', kind: 'input', readOnly: true, topRightLabel: '円', top: 49.77, left: 70.29, width: 8.59, height: 3.57 },
  { kind: 'label', text: '類似\n業種', top: 53.24, left: 39.33, width: 7.36, height: 3.66 },
  { kind: 'label', text: 'B', top: 53.24, left: 46.42, width: 2.73, height: 3.66 },
  { field: 'f110', kind: 'input', commaInteger: true, topRightLabel: '円', top: 53.24, left: 49.01, width: 4.77, height: 3.57 },
  { field: 'f111', kind: 'input', topRightLabel: '銭', top: 53.14, left: 53.65, width: 3.68, height: 3.66 },
  { kind: 'label', text: 'C', top: 53.14, left: 57.19, width: 2.45, height: 3.76 },
  { field: 'f113', kind: 'input', commaInteger: true, topRightLabel: '円', top: 53.04, left: 59.51, width: 8.73, height: 3.86 },
  { kind: 'label', text: 'D', top: 53.24, left: 67.83, width: 2.59, height: 3.66 },
  { field: 'f115', kind: 'input', commaInteger: true, topRightLabel: '円', top: 53.14, left: 70.29, width: 8.46, height: 3.76 },
  { kind: 'label', text: '要素別\n比準割合', top: 56.71, left: 39.33, width: 7.36, height: 3.66 },
  { kind: 'label', text: '⑤÷B', fontSize: 5.5, simpleFraction: { numerator: '⑤', denominator: 'B' }, top: 56.71, left: 46.42, width: 2.73, height: 3.57 },
  { field: 'f117', kind: 'input', readOnly: true, top: 56.71, left: 49.01, width: 8.32, height: 3.66 },
  { kind: 'label', text: '⑧÷C', fontSize: 5.5, simpleFraction: { numerator: '⑧', denominator: 'C' }, top: 56.71, left: 57.19, width: 2.45, height: 3.66 },
  { field: 'f119', kind: 'input', readOnly: true, top: 56.71, left: 59.65, width: 8.46, height: 3.66 },
  { kind: 'label', text: '⑰÷D', fontSize: 5.5, simpleFraction: { numerator: '⑰', denominator: 'D' }, top: 56.61, left: 67.97, width: 2.59, height: 3.76 },
  { field: 'f121', kind: 'input', readOnly: true, top: 56.71, left: 70.29, width: 8.46, height: 3.66 },
  { kind: 'label', text: '比準割合', top: 60.18, left: 39.33, width: 7.23, height: 3.66 },
  { kind: 'label', text: '（⑤÷B＋⑧÷C＋⑰÷D）÷３', fractionExpression: { terms: [{ numerator: '⑤', denominator: 'B' }, { numerator: '⑧', denominator: 'C' }, { numerator: '⑰', denominator: 'D' }], denominator: '3' }, top: 60.18, left: 46.56, width: 20.49, height: 3.66 },
  { field: '⑲', kind: 'input', readOnly: true, cornerLabel: '⑲', top: 60.08, left: 66.88, width: 12, height: 3.66 },
  // 比準価額
  { field: '⑳', kind: 'input', readOnly: true, cornerLabel: '⑳', topRightLabel: '円', top: 60.27, left: 78.74, width: 7.36, height: 3.47 },
  { field: 'f125', kind: 'input', readOnly: true, topRightLabel: '銭', top: 60.27, left: 85.84, width: 4.77, height: 3.47 },
  { kind: 'label', text: '⑱ × ⑲ × ___\n大会社は0.7\n中会社は0.6\n小会社は0.5\nとします。', companyRateExpression: { a: '⑱', ratio: '⑲', rateField: 'r1shin', sizeField: 'r1size' }, top: 49.67, left: 78.61, width: 12.14, height: 10.6 },
];

/** 2回目ブロック = 別の類似業種を入力（A=㉑/比準割合=㉒/比準価額=㉓）。記号系fieldはb2_接頭辞。評価会社⑤⑧⑰は共通。 */
const NUM2: Record<string, string> = { '⑱': '㉑', '⑲': '㉒', '⑳': '㉓' };
const STOCK_LABELS2: Record<string, string> = { '㊁': '㋷', '㋭': '㋦', '㋬': '㋸', '㋣': '㋾', '㋠': '㋻' };
const BLOCK2_CALC: GridCell[] = BLOCK1_CALC.map((c) => {
  const out: GridCell = { ...c, top: +(c.top + 16.87).toFixed(2) };
  if (c.field) out.field = NUM2[c.field] ?? `b2_${c.field}`;
  if (c.cornerLabel) out.cornerLabel = NUM2[c.cornerLabel] ?? STOCK_LABELS2[c.cornerLabel] ?? c.cornerLabel;
  if (c.text) {
    out.text = Object.entries(STOCK_LABELS2).reduce(
      (text, [from, to]) => text.split(from).join(to),
      c.text.replace('⑱', '㉑').replace('⑲', '㉒').replace('⑳', '㉓'),
    );
  }
  if (out.field && ['b2_㊁', 'b2_㋭', 'b2_㋬', 'b2_㋣', 'b2_㋠'].includes(out.field)) {
    out.highlightWhen = minValueHighlight(['b2_㊁', 'b2_㋭', 'b2_㋬', 'b2_㋣', 'b2_㋠'], out.field);
  }
  if (c.companyRateExpression) {
    out.companyRateExpression = { a: '㉑', ratio: '㉒', rateField: 'r2shin', sizeField: 'r2size' };
  }
  return out;
});

/** 第7表のグリッドセル（測定値＋自動計算） */
const CELLS: GridCell[] = [
  // ── 外枠・S1縦帯 ──
  { kind: 'cell', text: '', top: 9.28, left: 8.78, width: 81.83, height: 84.34 },
  { kind: 'label', text: '1.S1の金額（類似業種比準価額の修正計算）', top: 9.38, left: 8.64, width: 2.53, height: 84.24 },
  // 受取配当金等収受割合の計算
  { kind: 'label', text: '受取配当金等収受割合\nの計算', top: 9.28, left: 10.96, width: 11.05, height: 8.67 },
  { kind: 'label', text: '事 業 年 度', top: 9.28, left: 21.74, width: 9.55, height: 2.89 },
  { kind: 'label', text: '① 直 前 期', top: 9.28, left: 31.01, width: 14.46, height: 2.89 },
  { kind: 'label', text: '② 直 前 々 期', top: 9.19, left: 45.19, width: 14.59, height: 2.99 },
  { kind: 'label', text: '合計(①＋②)', top: 9.19, left: 59.51, width: 14.46, height: 2.99 },
  { kind: 'label', text: '受取配当金等の額', top: 11.98, left: 21.74, width: 9.55, height: 2.89 },
  { kind: 'label', text: '営業利益の金額', top: 14.78, left: 21.87, width: 9.41, height: 2.99 },
  { field: 'f10', kind: 'input', top: 11.98, left: 31.01, width: 14.46, height: 2.99 },
  { field: 'f11', kind: 'input', top: 11.99, left: 45.23, width: 14.46, height: 2.98 },
  { field: '㋑', kind: 'input', readOnly: true, top: 12.08, left: 59.65, width: 14.46, height: 2.89 },
  { field: 'f13', kind: 'input', top: 14.78, left: 31.01, width: 14.59, height: 3.08 },
  { field: 'f14', kind: 'input', top: 14.78, left: 45.19, width: 14.59, height: 3.08 },
  { field: '㋺', kind: 'input', readOnly: true, top: 14.78, left: 59.51, width: 14.59, height: 2.99 },
  { kind: 'label', text: '受取配当金等収受割合\n（㋑÷（㋑＋㋺））\n※小数点以下３位未満切り捨て', top: 9.19, left: 73.83, width: 16.78, height: 4.14 },
  { field: '㋩', kind: 'input', readOnly: true, top: 13.04, left: 73.83, width: 16.78, height: 4.92 },
  // Ⓑ－ⓑの金額
  { kind: 'label', text: 'Ⓑ－ⓑ\nの金額', top: 17.67, left: 10.96, width: 10.91, height: 5.88 },
  { kind: 'label', text: '１株（50円）当たりの年配当金額\n（第４表のⒷ）', top: 17.67, left: 21.74, width: 16.64, height: 3.08 },
  { kind: 'label', text: 'ⓑの金額\n（③×㋩）', top: 17.67, left: 38.1, width: 18.14, height: 2.99 },
  { kind: 'label', text: 'Ⓑ－ⓑの金額\n（③－④）', top: 17.77, left: 55.97, width: 18.14, height: 2.89 },
  { field: '③', kind: 'input', readOnly: true, jumpTo: { tab: 'table4', field: 'B', hint: 'クリックで転記元（第４表 Ⓑ・1株当たりの年配当金額）へ移動します' }, top: 20.66, left: 21.74, width: 11.87, height: 2.89 },
  { field: 'f23', kind: 'input', readOnly: true, topRightLabel: '銭', top: 20.56, left: 33.33, width: 5.05, height: 2.99 },
  { field: '④', kind: 'input', readOnly: true, top: 20.56, left: 38.24, width: 13.23, height: 2.89 },
  { field: 'f25', kind: 'input', readOnly: true, topRightLabel: '銭', top: 20.56, left: 51.33, width: 4.77, height: 2.89 },
  { field: '⑤', kind: 'input', readOnly: true, top: 20.47, left: 56.1, width: 13.23, height: 2.99 },
  { field: 'f27', kind: 'input', readOnly: true, topRightLabel: '銭', top: 20.56, left: 69.2, width: 4.91, height: 2.99 },
  // 🄫－©の金額
  { kind: 'label', text: '🄫－©\nの金額', top: 23.36, left: 10.96, width: 11.05, height: 5.59 },
  { kind: 'label', text: '１株（50円）当たりの年利益金額\n（第４表の🄫）', top: 23.45, left: 21.74, width: 16.64, height: 2.89 },
  { kind: 'label', text: '©の金額\n（⑥×㋩）', top: 23.36, left: 38.1, width: 18.14, height: 2.89 },
  { kind: 'label', text: '🄫－©の金額\n（⑥－⑦）', top: 23.26, left: 55.97, width: 18.14, height: 3.08 },
  { field: '⑥', kind: 'input', readOnly: true, top: 26.25, left: 21.74, width: 16.64, height: 2.8 },
  { field: '⑦', kind: 'input', readOnly: true, top: 26.15, left: 38.1, width: 18, height: 2.8 },
  { field: '⑧', kind: 'input', readOnly: true, top: 26.15, left: 55.83, width: 18.28, height: 2.8 },
  { kind: 'cell', diagonal: 'bltr', top: 17.77, left: 73.97, width: 16.78, height: 11.18 },
  // Ⓓ－ⓓの金額
  { kind: 'label', text: 'Ⓓ－ⓓ\nの金額', top: 28.85, left: 10.82, width: 8.73, height: 18.12 },
  { kind: 'label', text: '（イ）の金額', top: 28.85, left: 19.28, width: 2.59, height: 5.98 },
  { kind: 'label', text: '１株（50円）当たりの純資産価額\n（第４表のⒹ）', top: 28.85, left: 21.6, width: 16.81, height: 3.18 },
  { kind: 'label', text: '直前期末の株式等の帳簿価額\nの合計額', top: 28.75, left: 38.24, width: 17.83, height: 3.28 },
  { kind: 'label', text: '直前期末の総資産価額\n(帳簿価額）', top: 28.75, left: 55.97, width: 18, height: 3.28 },
  { kind: 'label', text: '（イ）の金額\n（⑨×（⑩÷⑪））', top: 28.85, left: 73.83, width: 16.91, height: 3.28 },
  { field: '⑨', kind: 'input', readOnly: true, jumpTo: { tab: 'table4', field: 'D', hint: 'クリックで転記元（第４表 Ⓓ・1株当たりの純資産価額）へ移動します' }, top: 31.93, left: 21.6, width: 16.78, height: 2.8 },
  { field: '⑩', kind: 'input', top: 31.93, left: 38.24, width: 18, height: 2.89 },
  { field: '⑪', kind: 'input', top: 31.84, left: 55.97, width: 18.14, height: 2.89 },
  { field: '⑫', kind: 'input', readOnly: true, top: 31.84, left: 73.83, width: 16.91, height: 2.89 },
  { kind: 'label', text: '（ロ）の金額', top: 34.63, left: 19.28, width: 2.73, height: 6.65 },
  { kind: 'label', text: '利益積立金額\n（第４表の⑱の「直前期」欄の金額）', top: 34.73, left: 21.74, width: 26.05, height: 3.86 },
  { kind: 'label', text: '１株当たりの資本金等の額を\n50円とした場合の発行済株式数\n（第４表の⑤の株式数）', top: 34.73, left: 47.51, width: 26.46, height: 3.86 },
  { kind: 'label', text: '（ロ）の金額\n（（⑬÷⑭）×ハ ）', top: 34.54, left: 73.83, width: 16.91, height: 3.95 },
  { field: '⑬', kind: 'input', readOnly: true, jumpTo: { tab: 'table4', field: 'n53', hint: 'クリックで入力元（第４表 ⑱利益積立金額・直前期）へ移動します' }, top: 38.39, left: 21.87, width: 26.05, height: 2.8 },
  { field: '⑭', kind: 'input', readOnly: true, top: 38.39, left: 47.65, width: 26.32, height: 2.8 },
  { field: '⑮', kind: 'input', readOnly: true, top: 38.3, left: 73.97, width: 16.64, height: 2.99 },
  { kind: 'cell', text: '', top: 41.19, left: 19.28, width: 2.59, height: 5.88 },
  { kind: 'label', text: 'ⓓの金額\n（⑫＋⑮）', top: 41.09, left: 21.6, width: 16.78, height: 2.99 },
  { kind: 'label', text: 'Ⓓ－ⓓの金額\n（⑨－⑯）', top: 41.09, left: 38.1, width: 18.14, height: 2.89 },
  { field: '⑯', kind: 'input', readOnly: true, top: 43.98, left: 21.74, width: 16.64, height: 2.99 },
  { field: '⑰', kind: 'input', readOnly: true, top: 43.98, left: 38.24, width: 17.87, height: 2.99 },
  { kind: 'label', text: '（注）\n１㋩の割合は、１を上限とします。\n２⑯の金額は、Ⓓの金額（⑨の金額）を上限とします。', top: 40.99, left: 55.97, width: 34.78, height: 5.98 },
  // 1株50円当たりの比準価額の計算（縦帯・2ブロック共通）
  { kind: 'label', text: '１株[50円]当たりの比準価額の計算', top: 47.07, left: 10.96, width: 2.59, height: 33.54 },
  // 1回目ブロック（⑱⑲⑳）＝第4表3類似業種比準価額の計算に連動
  ...linkInputsToTable4(BLOCK1_CALC),
  // 2回目ブロック（㉑㉒㉓）＝第4表3類似業種比準価額の計算に連動
  ...linkInputsToTable4(BLOCK2_CALC),
  // 1株当たりの比準価額（㉔）
  { kind: 'label', text: '１株当たりの比準価額', top: 80.51, left: 10.96, width: 18.14, height: 3.18 },
  {
    kind: 'label',
    text: '比準価額（⑳と㉓とのいずれか低い方の金額）×第４表の④の金額÷50円',
    productFractionExpression: { prefixLines: ['比準価額', '（⑳と㉓とのいずれか低い方の金額）'], numerator: '第４表の④の金額', denominator: '50円' },
    top: 80.42, left: 28.83, width: 46.51, height: 3.37,
  },
  { field: '㉔', kind: 'input', readOnly: true, cornerLabel: '㉔', topRightLabel: '円', top: 80.51, left: 75.06, width: 15.55, height: 3.28 },
  // 比準価額の修正（㉕㉖）
  { kind: 'label', text: '比 準 価 額 の 修 正', top: 83.69, left: 10.96, width: 2.73, height: 9.93 },
  { kind: 'label', text: '直前期末の翌日から課税時期までの間に\n「配当金交付」の効力が\n発生した場合', fontSize: 5, top: 83.69, left: 13.28, width: 15.82, height: 5.01 },
  {
    kind: 'input',
    subtractionAmountExpression: {
      leftLabelLines: ['比準価額', '（㉔の金額）'],
      leftValueField: '㉔',
      rightLabelLines: ['１株当たりの', '配当金額'],
      rightYenField: 'mod_div',
      rightSenField: 'mod_div_sen',
    },
    top: 83.69, left: 28.96, width: 46.23, height: 4.92,
  },
  { kind: 'label', text: '修正比準価額', top: 83.69, left: 75.2, width: 15.55, height: 1.73 },
  { field: '㉕', kind: 'input', readOnly: true, cornerLabel: '㉕', topRightLabel: '円', top: 85.33, left: 75.2, width: 15.41, height: 3.37 },
  { kind: 'label', text: '直前期末の翌日から課税時期までの間に\n「株式の割当て等」の効力が\n発生した場合', fontSize: 5, top: 88.51, left: 13.42, width: 15.55, height: 5.01 },
  {
    kind: 'input',
    allocationAdjustmentExpression: {
      baseLabelLines: ['比準価額', '（㉔（㉕があるときは㉕）の金額）'],
      baseValueField: 'mod2_base',
      paymentLabelLines: ['割当株式１株当たりの', '払込金額'],
      paymentField: 'mod_pay',
      allocationLabelLines: ['１株当たりの', '割当株式数'],
      allocationField: 'mod_ratio',
      issuedLabelLines: ['１株当たりの割当株式数', '又は交付株式数'],
      issuedField: 'mod_ratio2',
    },
    top: 88.51, left: 28.83, width: 46.51, height: 5.11,
  },
  { kind: 'label', text: '修正比準価額', top: 88.61, left: 75.06, width: 15.68, height: 1.64 },
  { field: '㉖', kind: 'input', readOnly: true, cornerLabel: '㉖', topRightLabel: '円', top: 90.25, left: 75.06, width: 15.68, height: 3.37 },
];

/** 第7表のS1比準価額計算（第8表からも参照する） */
export function calcTable7(getField: TableProps['getField']) {
  const raw = (f: string) => getField(T, f);
  const parseNum = (value: string): number | null => {
    const s = value.replace(/,/g, '').trim();
    if (s === '') return null;
    const v = Number(s);
    return isNaN(v) ? null : v;
  };
  const num = (f: string) => parseNum(raw(f));
  const senPair = (y: string, s: string) => { const a = num(y); return a === null ? null : a + (num(s) ?? 0) / 100; };

  const t4 = calcTable4(getField);
  const t5 = calcTable5(getField);
  const size = calcCompanySize((f) => getField('table1_2', f)).result;
  const shin = size === null ? null : size === 4 ? 0.7 : size === 0 ? 0.5 : 0.6;

  // ⑴ 受取配当金等収受割合 ㋩ ＝ ㋑÷(㋑＋㋺)（小数3位未満切捨て、上限1）
  const r10 = num('f10'), r11 = num('f11');
  const ia = r10 === null && r11 === null ? null : (r10 ?? 0) + (r11 ?? 0);   // ㋑
  const o13 = num('f13'), o14 = num('f14');
  const ro = o13 === null && o14 === null ? null : (o13 ?? 0) + (o14 ?? 0);   // ㋺
  const denom = (ia ?? 0) + (ro ?? 0);
  const ha = ia !== null && denom > 0 ? Math.min(1, fl3(ia / denom)) : null;  // ㋩

  // Ⓑ－ⓑ（年配当・円/銭）: ③=第4表Ⓑ, ④=ⓑ=③×㋩, ⑤=③－④
  const Bv = t4.Bv;
  const lowerB = Bv !== null && ha !== null ? fl10sen(Bv * ha) : null;        // ④ ⓑ
  const adjB = Bv !== null && lowerB !== null ? fl10sen(Bv - lowerB) : null;  // ⑤

  // 🄫－©（年利益・円）: ⑥=第4表Ⓒ, ⑦=©=⑥×㋩, ⑧=⑥－⑦
  const Cv = t4.Cv;
  const lowerC = Cv !== null && ha !== null ? fl(Cv * ha) : null;             // ⑦ ©
  const adjC = Cv !== null && lowerC !== null ? Cv - lowerC : null;           // ⑧

  // Ⓓ－ⓓ（純資産・円）
  const Dv = t4.Dv;                                                          // ⑨ 第4表Ⓓ
  const kabuBook: number | null = num('⑩') ?? t5['ロ'] ?? null;             // ⑩ 株式等帳簿価額（第5表ロ）
  const totalBook: number | null = num('⑪') ?? t5['②'] ?? null;            // ⑪ 総資産帳簿価額（第5表②）
  const iKin = Dv !== null && kabuBook !== null && totalBook !== null && totalBook > 0
    ? fl(Dv * (kabuBook / totalBook)) : null;                                // ⑫ (イ)
  const ekiseki = parseNum(getField('table4', 'n53'));                       // ⑬ 利益積立金額（第4表⑱直前期）
  const shares50 = t4.cap5;                                                   // ⑭ 第4表⑤株式数
  const roKin = ekiseki !== null && shares50 !== null && shares50 > 0 && ha !== null
    ? fl((ekiseki / shares50) * ha) : null;                                   // ⑮ (ロ)
  const lowerDraw = iKin === null && roKin === null ? null : (iKin ?? 0) + (roKin ?? 0);
  const lowerD = lowerDraw === null ? null : Dv !== null ? Math.min(lowerDraw, Dv) : lowerDraw; // ⑯ ⓓ（⑨上限）
  const adjD = Dv !== null && lowerD !== null ? Dv - lowerD : null;           // ⑰

  // 比準価額: 第4表3「類似業種比準価額の計算」と同じ値を転記する。
  const A1 = t4.A1;             // 第4表⑳ → 第7表⑱
  const A2 = t4.A2;             // 第4表㉓ → 第7表㉑
  const e1B = t4.e1B, e1C = t4.e1C, e1D = t4.e1D;
  const e2B = t4.e2B, e2C = t4.e2C, e2D = t4.e2D;
  const r19 = t4.r21;           // 第4表㉑ → 第7表⑲
  const r22 = t4.r24;           // 第4表㉔ → 第7表㉒
  const p20 = t4.p22;           // 第4表㉒ → 第7表⑳
  const p23 = t4.p25;           // 第4表㉕ → 第7表㉓
  const v24 = t4.v26;           // 第4表㉖ → 第7表㉔

  // 比準価額の修正
  const modDiv = senPair('mod_div', 'mod_div_sen');
  const v25 = v24 !== null && modDiv !== null ? fl(v24 - modDiv) : null;       // ㉕
  const modPay = senPair('mod_pay', 'mod_pay_sen'), modRatio = num('mod_ratio'), modRatio2 = num('mod_ratio2');
  const base26 = v25 ?? v24;
  const v26 = base26 !== null && modRatio2 !== null ? fl((base26 + (modPay ?? 0) * (modRatio ?? 0)) / (1 + modRatio2)) : null; // ㉖

  // S1の比準価額（修正後があればそれ、なければ㉔）
  const s1Hijun = v26 ?? v25 ?? v24;

  return {
    ia, ro, ha, Bv, lowerB, adjB, Cv, lowerC, adjC, Dv, kabuBook, totalBook, iKin, ekiseki, shares50, roKin, lowerD, adjD,
    A1, A2, e1B, e1C, e1D, e2B, e2C, e2D, r19, r22, p20, p23, v24, v25, v26, shin, size, s1Hijun,
  };
}

/** 第7表（CSSグリッド方式・完成版） */
export function Table7Grid({ getField, updateField, onJump }: TableProps) {
  const raw = (f: string) => getField(T, f);
  const table4Raw = (f: string) => getField('table4', f);
  const u = (f: string, v: string) => updateField(T, f, v);

  const fmt = (v: number | null) => (v === null ? '' : v.toLocaleString('ja-JP'));
  const yenPart = (v: number | null) => (v === null ? '' : fl(v).toLocaleString('ja-JP'));
  const senPart = (v: number | null) => (v === null ? '' : String(Math.round((v - fl(v)) * 100)).padStart(2, '0'));

  const c = calcTable7(getField);
  const judge = calcTable2(getField).j;

  const g = (f: string): string => {
    const linkedTable4Field = TABLE4_LINKED_FIELDS[f];
    if (linkedTable4Field) return table4Raw(linkedTable4Field);

    switch (f) {
      case '㋑': return fmt(c.ia);
      case '㋺': return fmt(c.ro);
      case '㋩': return c.ha === null ? '' : c.ha.toFixed(3);
      case '③': return yenPart(c.Bv); case 'f23': return senPart(c.Bv);
      case '④': return yenPart(c.lowerB); case 'f25': return senPart(c.lowerB);
      case '⑤': return yenPart(c.adjB); case 'f27': return senPart(c.adjB);
      case '⑥': return fmt(c.Cv);
      case '⑦': return fmt(c.lowerC);
      case '⑧': return fmt(c.adjC);
      case '⑨': return fmt(c.Dv);
      case '⑩': return raw('⑩').trim() !== '' ? raw('⑩') : fmt(c.kabuBook);
      case '⑪': return raw('⑪').trim() !== '' ? raw('⑪') : fmt(c.totalBook);
      case '⑫': return fmt(c.iKin);
      case '⑬': return fmt(c.ekiseki);
      case '⑭': return fmt(c.shares50);
      case '⑮': return fmt(c.roKin);
      case '⑯': return fmt(c.lowerD);
      case '⑰': return fmt(c.adjD);
      // 比準価額 1回目ブロック
      case 'f103': return yenPart(c.Bv); case 'f104': return senPart(c.Bv);
      case 'f106': return fmt(c.Cv);
      case 'f108': return fmt(c.Dv);
      case 'f117': return c.e1B === null ? '' : c.e1B.toFixed(2);
      case 'f119': return c.e1C === null ? '' : c.e1C.toFixed(2);
      case 'f121': return c.e1D === null ? '' : c.e1D.toFixed(2);
      case '⑱': return fmt(c.A1);
      case '⑲': return c.r19 === null ? '' : c.r19.toFixed(2);
      case '⑳': return yenPart(c.p20); case 'f125': return senPart(c.p20);
      // 比準価額 2回目ブロック（評価会社⑤⑧⑰は共通）
      case 'b2_f103': return yenPart(c.Bv); case 'b2_f104': return senPart(c.Bv);
      case 'b2_f106': return fmt(c.Cv);
      case 'b2_f108': return fmt(c.Dv);
      case 'b2_f117': return c.e2B === null ? '' : c.e2B.toFixed(2);
      case 'b2_f119': return c.e2C === null ? '' : c.e2C.toFixed(2);
      case 'b2_f121': return c.e2D === null ? '' : c.e2D.toFixed(2);
      case '㉑': return fmt(c.A2);
      case '㉒': return c.r22 === null ? '' : c.r22.toFixed(2);
      case '㉓': return yenPart(c.p23); case 'b2_f125': return senPart(c.p23);
      case 'r1shin': case 'r2shin': return c.shin === null ? '' : c.shin.toFixed(1);
      case 'r1size': case 'r2size': return c.size === 4 ? 'large' : c.size === 0 ? 'small' : c.size === null ? '' : 'medium';
      // 1株当たりの比準価額・修正
      case '㉔': return fmt(c.v24);
      case '㉕': return fmt(c.v25);
      case '㉖': return fmt(c.v26);
      case 'mod2_base': return fmt(c.v25 ?? c.v24);
      default: return raw(f);
    }
  };

  const toolbar = (
    <span className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, whiteSpace: 'nowrap', flexWrap: 'wrap' }}>
      <span style={{ fontWeight: 700, color: judge.s2 === true ? '#b45309' : '#555' }}>
        第2表判定：株式等保有特定会社に{judge.s2 === true ? '該当' : judge.s2 === false ? '非該当' : '未判定'}
      </span>
    </span>
  );
  return <GridForm cells={CELLS} g={g} u={u} formId={T} width="100%" title="第７表　株式等保有特定会社の株式の価額の計算明細書" toolbar={toolbar} references={REFERENCES} onJump={onJump && ((t) => onJump({ tab: t.tab as TableId, field: t.field }))} />;
}
