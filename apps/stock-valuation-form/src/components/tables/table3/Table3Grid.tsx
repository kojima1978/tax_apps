import { GridForm, type GridCell } from '@/components/ui/GridForm';
import { calcTable4 } from '../table4/Table4Grid';
import { calcTable5 } from '../table5/Table5Grid';
import { calcCompanySize } from '../table1-2/Table1_2Grid';
import { calcShareholderJudgment } from '../Table1_1Grid';
import { extractCompanyFloatHeader } from '../companyFloatHeader';
import type { TableId, TableProps } from '@/types/form';

const T = 'table3' as const;

// ══ 令和8年4月1日以降用の様式 ══
// ・円数字が㉞まで再割当: 修正=⑦〜⑫、配当還元=⑬〜㉔、株式に関する権利=㉕〜㉜、評価額=㉝㉞
//   （旧様式: 修正⑦⑧、配当還元⑨〜⑳、権利㉑〜㉔、評価額f84/f86。保存フィールド名は旧キーのまま維持）
// ・①の転記元表示が「第４表の２の㉖、㉘又は㉜」に変更（値は従来どおり第4表の計算結果）
// ・識別コード（J01/G01/C01等）は様式どおり独立セルで再現
// ・計算ロジックは従来どおり（③80%相当額の使用箇所・Lの割合・2円50銭下限・原則との比較）

// ── 端数処理（第3表記載要領） ──
const fl = (v: number) => Math.floor(v + 1e-9);                 // 円未満切捨て
const fl10sen = (v: number) => Math.floor(v * 10 + 1e-7) / 10;  // 10銭未満切捨て
const fl2sen = (v: number) => Math.floor(v * 100 + 1e-7) / 100; // 銭未満切捨て（配当期待権は円未満2位）
const companySizeHL = (companySize: 'large' | 'medium' | 'small') => (g: (field: string) => string) => g('会社規模区分') === companySize;
const selectedLinePrefixes = (companySize: 'large' | 'small', field: string) => (g: (key: string) => string) =>
  g('会社規模区分') === companySize ? g(field).split('・').filter(Boolean) : [];

// 円・銭サブセル付きの金額入力（[コード][円値][円][銭値][銭]）
function yenSenInput(
  code: string,
  yenField: string,
  senField: string,
  top: number,
  height: number,
  codeL: number,
  yenL: number,
  yenUnitL: number,
  senL: number,
  senUnitL: number,
  end: number,
  props?: Partial<GridCell>,
): GridCell[] {
  return [
    { kind: 'cell', codeLabel: code, top, left: codeL, width: +(yenL - codeL).toFixed(2), height },
    { field: yenField, kind: 'input', commaInteger: true, top, left: yenL, width: +(yenUnitL - yenL).toFixed(2), height, align: 'right', ...props },
    { kind: 'label', text: '円', top, left: yenUnitL, width: +(senL - yenUnitL).toFixed(2), height, fontSize: 7 },
    { field: senField, kind: 'input', integerDigits: 2, top, left: senL, width: +(senUnitL - senL).toFixed(2), height, align: 'right', ...props },
    { kind: 'label', text: '銭', top, left: senUnitL, width: +(end - senUnitL).toFixed(2), height, fontSize: 7 },
  ];
}

/** 第3表のグリッドセル（令和8年様式・罫線座標はPNGからの機械抽出） */
const CELLS: GridCell[] = [
  // 表内の各計算区分を、見た目を変えずに意味のあるDOMグループとしてまとめる。
  { kind: 'cell', text: '原則的評価方式による価額', ariaLabel: '原則的評価方式による価額', semanticRole: 'group', groupBorder: false, top: 14.36, left: 7.25, width: 85.09, height: 32.62 },
  { kind: 'cell', text: '配当還元方式による価額', ariaLabel: '配当還元方式による価額', semanticRole: 'group', groupBorder: false, top: 47.18, left: 7.25, width: 85.09, height: 24.1 },
  { kind: 'cell', text: '株式に関する権利の評価', ariaLabel: '株式に関する権利の評価', semanticRole: 'group', groupBorder: false, top: 71.51, left: 7.25, width: 85.09, height: 18.75 },
  { kind: 'cell', text: '株式及び株式に関する権利の価額', ariaLabel: '株式及び株式に関する権利の価額', semanticRole: 'group', groupBorder: false, top: 90.46, left: 7.25, width: 85.09, height: 3.44 },
  // ── 会社名 ──
  { kind: 'label', text: '会　社　名', top: 10.94, left: 56.53, width: 13.25, height: 2.56 },
  { field: 'company', kind: 'input', top: 10.94, left: 69.78, width: 22.56, height: 2.56, align: 'left' },
  // ── 1. 原則的評価方式による価額 ──
  { kind: 'label', text: '１．原則的評価方式による価額', semanticRole: 'columnheader', top: 14.36, left: 7.25, width: 3.02, height: 32.62, align: 'center' },
  { kind: 'label', text: '１株当たりの\n価額の計算の\n基となる金額', top: 14.36, left: 10.27, width: 9.07, height: 6.47, fontSize: 7 },
  { kind: 'label', text: '①　類 似 業 種 比 準 価 額\n（第４表の２の㉖、㉘又は㉜の金額）', bottomLabel: '（円）', bottomLabelAlign: 'right', fontSize: 6.5, top: 14.36, left: 19.34, width: 23.45, height: 3.87 },
  { kind: 'label', text: '②　１株当たりの純資産価額\n（第５表の⑪の金額）', bottomLabel: '（円）', bottomLabelAlign: 'right', fontSize: 6.5, top: 14.36, left: 42.79, width: 23.29, height: 3.87 },
  { kind: 'label', text: '③　１株当たりの純資産価額の80％相当額\n（第５表の⑫の記載がある場合のその金額）', bottomLabel: '（円）', bottomLabelAlign: 'right', fontSize: 6.5, top: 14.36, left: 66.08, width: 26.26, height: 3.87 },
  { field: '①', kind: 'input', readOnly: true, jumpTo: { tab: 'table4', field: '㉖', hint: 'クリックで転記元（第４表の類似業種比準価額）へ移動します' }, top: 18.23, left: 19.34, width: 23.45, height: 2.6, align: 'right' },
  { field: '②', kind: 'input', readOnly: true, jumpTo: { tab: 'table5', field: '⑪', hint: 'クリックで転記元（第５表の⑪・1株当たりの純資産価額）へ移動します' }, top: 18.23, left: 42.79, width: 23.29, height: 2.6, align: 'right' },
  { field: '③', kind: 'input', readOnly: true, jumpTo: { tab: 'table5', field: '⑫', hint: 'クリックで転記元（第５表の⑫・1株当たりの純資産価額の80％相当額）へ移動します' }, top: 18.23, left: 66.08, width: 26.26, height: 2.6, align: 'right' },
  { kind: 'label', text: '１株当たりの価額の計算', verticalSectionHeading: { number: '１', text: '株当たりの価額の計算', compact: true }, top: 20.83, left: 10.27, width: 1.82, height: 13.13 },
  { kind: 'label', text: '区　分', top: 20.83, left: 12.09, width: 7.25, height: 2.13 },
  { kind: 'label', text: '１ 株 当 た り の 価 額 の 算 定 方 法 等', top: 20.83, left: 19.34, width: 52.26, height: 2.13 },
  { kind: 'label', text: '１株当たりの価額', bottomLabel: '（円）', bottomLabelAlign: 'right', top: 20.83, left: 71.6, width: 20.74, height: 2.13, fontSize: 7 },
  // 大会社
  { kind: 'label', text: '大会社の\n株式の価額', highlightWhen: companySizeHL('large'), top: 22.96, left: 12.09, width: 7.25, height: 3.76 },
  {
    kind: 'label',
    text: '次のうちいずれか低い方の金額（②の記載がないときは①の金額）\nイ　①の金額\nロ　②の金額',
    align: 'left',
    highlightWhen: companySizeHL('large'),
    highlightLinePrefixes: selectedLinePrefixes('large', '大会社の採用値'),
    top: 22.96,
    left: 19.34,
    width: 52.26,
    height: 3.76,
  },
  { kind: 'label', text: '④', highlightWhen: companySizeHL('large'), top: 22.96, left: 71.6, width: 2.29, height: 3.76 },
  { kind: 'cell', codeLabel: 'C01', top: 22.96, left: 73.89, width: 1.82, height: 3.76 },
  { field: '④', kind: 'input', readOnly: true, highlightWhen: companySizeHL('large'), top: 22.96, left: 75.71, width: 16.63, height: 3.76, align: 'right' },
  // 中会社
  { kind: 'label', text: '中会社の\n株式の価額', highlightWhen: companySizeHL('medium'), top: 26.72, left: 12.09, width: 7.25, height: 3.48 },
  {
    kind: 'label',
    text: '（①と②とのいずれか低い方の金額×Lの割合）＋（②の金額（③の金額があるときは③の金額）×（1－Lの割合））',
    weightedAverageExpression: {
      leftLines: ['①と②とのいずれか', '低い方の金額'],
      rightLines: ['②の金額（③の金額が', 'あるときは③の金額）'],
      rateField: 'L割合',
    },
    highlightWhen: companySizeHL('medium'),
    top: 26.72,
    left: 19.34,
    width: 52.26,
    height: 3.48,
    fontSize: 5.5,
  },
  { kind: 'label', text: '⑤', highlightWhen: companySizeHL('medium'), top: 26.72, left: 71.6, width: 2.29, height: 3.48 },
  { kind: 'cell', codeLabel: 'C02', top: 26.72, left: 73.89, width: 1.82, height: 3.48 },
  { field: '⑤', kind: 'input', readOnly: true, highlightWhen: companySizeHL('medium'), top: 26.72, left: 75.71, width: 16.63, height: 3.48, align: 'right' },
  // 小会社
  { kind: 'label', text: '小会社の\n株式の価額', highlightWhen: companySizeHL('small'), top: 30.2, left: 12.09, width: 7.25, height: 3.76 },
  {
    kind: 'label',
    text: '次のうちいずれか低い方の金額\nイ　②の金額（③の金額があるときは③の金額）\nロ　（①の金額×0.50）＋（イの金額×0.50）',
    align: 'left',
    highlightWhen: companySizeHL('small'),
    highlightLinePrefixes: selectedLinePrefixes('small', '小会社の採用値'),
    top: 30.2,
    left: 19.34,
    width: 52.26,
    height: 3.76,
  },
  { kind: 'label', text: '⑥', highlightWhen: companySizeHL('small'), top: 30.2, left: 71.6, width: 2.29, height: 3.76 },
  { kind: 'cell', codeLabel: 'C03', top: 30.2, left: 73.89, width: 1.82, height: 3.76 },
  { field: '⑥', kind: 'input', readOnly: true, highlightWhen: companySizeHL('small'), top: 30.2, left: 75.71, width: 16.63, height: 3.76, align: 'right' },
  // 株式の価額の修正
  { kind: 'label', text: '株式の価額の修正', top: 33.96, left: 10.27, width: 1.82, height: 13.02 },
  { kind: 'label', text: '課税時期において\n配当期待権の発生\nしている場合', fontSize: 7, top: 33.96, left: 12.09, width: 12.69, height: 5.01 },
  { kind: 'label', text: '⑦　１株当たりの\n配当金額', noWrap: true, fontSize: 7, top: 33.96, left: 24.78, width: 24.49, height: 5.01, align: 'left' },
  ...yenSenInput('J01', 'mod1_div', 'mod1_div_sen', 33.96, 5.01, 49.27, 51.09, 60.15, 61.97, 69.78, 71.6),
  { kind: 'label', text: '⑧　修正後の株式の価額\n（（④、⑤又は⑥）－⑦）', bottomLabel: '（円）', bottomLabelAlign: 'right', fontSize: 7, top: 33.96, left: 71.6, width: 20.74, height: 2.42 },
  { field: '⑧', kind: 'input', readOnly: true, top: 36.38, left: 71.6, width: 20.74, height: 2.59, align: 'right' },
  { kind: 'label', text: '課税時期において株式\nの割当てを受ける権利、\n株主となる権利又は株\n式無償交付期待権の発\n生している場合', fontSize: 6, top: 38.97, left: 12.09, width: 12.69, height: 8.01, align: 'left' },
  { kind: 'label', text: '⑨　割当株式１株当たりの払込金額', fontSize: 7, align: 'left', top: 38.97, left: 24.78, width: 24.49, height: 2.91 },
  { kind: 'cell', codeLabel: 'G01', top: 38.97, left: 49.27, width: 1.82, height: 2.91 },
  { field: 'mod2_pay', kind: 'input', commaInteger: true, top: 38.97, left: 51.09, width: 18.69, height: 2.91, align: 'right' },
  { kind: 'label', text: '円', top: 38.97, left: 69.78, width: 1.82, height: 2.91, fontSize: 7 },
  { kind: 'label', text: '⑩　１株当たりの割当株式数', fontSize: 7, align: 'left', top: 41.88, left: 24.78, width: 24.49, height: 2.59 },
  { kind: 'cell', codeLabel: 'C04', top: 41.88, left: 49.27, width: 1.82, height: 2.59 },
  { field: 'mod2_ratio', kind: 'input', top: 41.88, left: 51.09, width: 18.69, height: 2.59, align: 'right' },
  { kind: 'label', text: '株', top: 41.88, left: 69.78, width: 1.82, height: 2.59, fontSize: 7 },
  { kind: 'label', text: '⑪　１株当たりの割当株式数\n又は交付株式数', fontSize: 7, align: 'left', top: 44.47, left: 24.78, width: 24.49, height: 2.51 },
  { kind: 'cell', codeLabel: 'C05', top: 44.47, left: 49.27, width: 1.82, height: 2.51 },
  { field: 'mod2_ratio2', kind: 'input', top: 44.47, left: 51.09, width: 18.69, height: 2.51, align: 'right' },
  { kind: 'label', text: '株', top: 44.47, left: 69.78, width: 1.82, height: 2.51, fontSize: 7 },
  { kind: 'label', text: '⑫　修正後の株式の価額\n（④、⑤又は⑥（⑧がある\nときは⑧）＋⑨×⑩）÷\n（１株＋⑪）', bottomLabel: '（円）', bottomLabelAlign: 'right', fontSize: 6.5, top: 38.97, left: 71.6, width: 20.74, height: 5.5 },
  { field: '⑫', kind: 'input', readOnly: true, top: 44.47, left: 71.6, width: 20.74, height: 2.51, align: 'right' },
  // ── 2. 配当還元方式による価額 ──
  { kind: 'label', text: '２．配当還元方式による価額', semanticRole: 'columnheader', top: 47.18, left: 7.25, width: 3.02, height: 24.1, align: 'center' },
  { kind: 'label', text: '１ 株 当 た り の 資 本 金 等 の 額 、 発 行 済 株 式 数 等', top: 47.18, left: 10.27, width: 82.07, height: 1.85 },
  { kind: 'label', text: '⑬　直前期末の\n資本金等の額', bottomLabel: '（千円）', bottomLabelAlign: 'right', fontSize: 6.5, top: 49.03, left: 10.27, width: 17.05, height: 3.96 },
  { kind: 'label', text: '⑭　直前期末の\n発行済株式数', bottomLabel: '（株）', bottomLabelAlign: 'right', fontSize: 6.5, top: 49.03, left: 27.32, width: 15.47, height: 3.96 },
  { kind: 'label', text: '⑮　直前期末の\n自己株式数', bottomLabel: '（株）', bottomLabelAlign: 'right', fontSize: 6.5, top: 49.03, left: 42.79, width: 15.55, height: 3.96 },
  { kind: 'label', text: '⑯　１株当たりの資本金等の\n額を50円とした場合の発行\n済株式数（⑬÷50円）', bottomLabel: '（株）', bottomLabelAlign: 'right', fontSize: 6, top: 49.03, left: 58.34, width: 17.37, height: 3.96 },
  { kind: 'label', text: '⑰　１株当たりの\n資本金等の額\n（⑬÷（⑭－⑮））', bottomLabel: '（円）', bottomLabelAlign: 'right', fontSize: 6, top: 49.03, left: 75.71, width: 16.63, height: 3.96 },
  { kind: 'cell', codeLabel: 'G02', top: 52.99, left: 10.27, width: 1.82, height: 2.62 },
  { field: '⑬', kind: 'input', commaInteger: true, readOnly: true, jumpTo: { tab: 'table4', field: '①', hint: 'クリックで入力元（第４表の１・①直前期末の資本金等の額）へ移動します' }, top: 52.99, left: 12.09, width: 15.23, height: 2.62, align: 'right' },
  { kind: 'cell', codeLabel: 'G03', top: 52.99, left: 27.32, width: 2.29, height: 2.62 },
  { field: '⑭', kind: 'input', commaInteger: true, readOnly: true, jumpTo: { tab: 'table1_1', field: '⑤', hint: 'クリックで入力元（第１表の１⑤・発行済株式数）へ移動します' }, top: 52.99, left: 29.61, width: 13.18, height: 2.62, align: 'right' },
  { kind: 'cell', codeLabel: 'G04', top: 52.99, left: 42.79, width: 2.86, height: 2.62 },
  { field: '⑮', kind: 'input', commaInteger: true, readOnly: true, jumpTo: { tab: 'table1_1', field: 'f63', hint: 'クリックで入力元（第１表の１・自己株式数）へ移動します' }, top: 52.99, left: 45.65, width: 12.69, height: 2.62, align: 'right' },
  { field: '⑯', kind: 'input', readOnly: true, top: 52.99, left: 58.34, width: 17.37, height: 2.62, align: 'right' },
  { kind: 'cell', codeLabel: 'C06', top: 52.99, left: 75.71, width: 1.81, height: 2.62 },
  { field: '⑰', kind: 'input', readOnly: true, top: 52.99, left: 77.52, width: 14.82, height: 2.62, align: 'right' },
  // 直前期末以前2年間の配当金額
  { kind: 'label', text: '直 前 期 末 以 前 ２ 年 間 の 配 当 金 額　（千円）', top: 55.61, left: 10.27, width: 82.07, height: 1.94 },
  { kind: 'label', text: '事 業 年 度', top: 57.55, left: 10.27, width: 9.07, height: 2.05 },
  { kind: 'label', text: '⑱　年 配 当 金 額', top: 57.55, left: 19.34, width: 18.01, height: 2.05, fontSize: 7 },
  { kind: 'label', text: '⑲　左のうち非経常的な\n配当金額', top: 57.55, left: 37.35, width: 17.36, height: 2.05, fontSize: 6.5 },
  { kind: 'label', text: '⑳　差引経常的な\n年配当金額（⑱－⑲）', top: 57.55, left: 54.71, width: 19.18, height: 2.05, fontSize: 6.5 },
  { kind: 'label', text: '㉑　年平均配当金額\n（（㋑＋㋺）÷２）', top: 57.55, left: 73.89, width: 18.45, height: 2.05, fontSize: 6.5 },
  { kind: 'label', text: '直　前　期', top: 59.6, left: 10.27, width: 9.07, height: 2.59 },
  { kind: 'cell', codeLabel: 'G05', top: 59.6, left: 19.34, width: 1.81, height: 2.59 },
  { field: 'f55', kind: 'input', commaInteger: true, readOnly: true, jumpTo: { tab: 'table4', field: 'f28', hint: 'クリックで入力元（第４表・⑥年配当金額・直前期）へ移動します' }, top: 59.6, left: 21.15, width: 16.2, height: 2.59, align: 'right' },
  { kind: 'cell', codeLabel: 'G07', top: 59.6, left: 37.35, width: 1.81, height: 2.59 },
  { field: 'f56', kind: 'input', commaInteger: true, readOnly: true, jumpTo: { tab: 'table4', field: 'f29', hint: 'クリックで入力元（第４表・⑦非経常的な配当金額・直前期）へ移動します' }, top: 59.6, left: 39.16, width: 15.55, height: 2.59, align: 'right' },
  { kind: 'label', text: '㋑', top: 59.6, left: 54.71, width: 1.82, height: 2.59 },
  { kind: 'cell', codeLabel: 'G09', top: 59.6, left: 56.53, width: 1.81, height: 2.59 },
  { field: 'イ', kind: 'input', readOnly: true, top: 59.6, left: 58.34, width: 15.55, height: 2.59, align: 'right' },
  { kind: 'label', text: '直 前 々 期', top: 62.19, left: 10.27, width: 9.07, height: 2.6 },
  { kind: 'cell', codeLabel: 'G06', top: 62.19, left: 19.34, width: 1.81, height: 2.6 },
  { field: 'f59', kind: 'input', commaInteger: true, readOnly: true, jumpTo: { tab: 'table4', field: 'f32', hint: 'クリックで入力元（第４表・⑥年配当金額・直前々期）へ移動します' }, top: 62.19, left: 21.15, width: 16.2, height: 2.6, align: 'right' },
  { kind: 'cell', codeLabel: 'G08', top: 62.19, left: 37.35, width: 1.81, height: 2.6 },
  { field: 'f60', kind: 'input', commaInteger: true, readOnly: true, jumpTo: { tab: 'table4', field: 'f33', hint: 'クリックで入力元（第４表・⑦非経常的な配当金額・直前々期）へ移動します' }, top: 62.19, left: 39.16, width: 15.55, height: 2.6, align: 'right' },
  { kind: 'label', text: '㋺', top: 62.19, left: 54.71, width: 1.82, height: 2.6 },
  { kind: 'cell', codeLabel: 'G10', top: 62.19, left: 56.53, width: 1.81, height: 2.6 },
  { field: 'ロ', kind: 'input', readOnly: true, top: 62.19, left: 58.34, width: 15.55, height: 2.6, align: 'right' },
  { kind: 'cell', codeLabel: 'G11', top: 59.6, left: 73.89, width: 1.82, height: 5.19 },
  { field: '㉑', kind: 'input', readOnly: true, top: 59.6, left: 75.71, width: 16.63, height: 5.19, align: 'right' },
  // ㉒ 1株(50円)当たりの年配当金額
  { kind: 'label', text: '㉒　１株（50円）当たりの年配当金額\n（㉑÷⑯）', fontSize: 7, top: 64.79, left: 10.27, width: 27.08, height: 2.59 },
  ...yenSenInput('J02', '㉒円', '㉒銭', 64.79, 2.59, 37.35, 39.16, 49.27, 51.09, 58.34, 60.15, { readOnly: true }),
  { kind: 'label', text: 'この金額が２円50銭未満の場合は\n２円50銭とします。', align: 'left', top: 64.79, left: 60.15, width: 32.19, height: 2.59, fontSize: 6 },
  // ㉓・㉔
  { kind: 'label', text: '㉓　配 当 還 元 価 額\n（（㉒÷10％）×（⑰÷50円））', fontSize: 7, top: 67.38, left: 10.27, width: 21.16, height: 3.9 },
  { kind: 'cell', codeLabel: 'C07', top: 67.38, left: 31.43, width: 1.81, height: 3.9 },
  { field: '㉓', kind: 'input', readOnly: true, top: 67.38, left: 33.24, width: 12.41, height: 3.9, align: 'right' },
  { kind: 'label', text: '円', top: 67.38, left: 45.65, width: 1.81, height: 3.9, fontSize: 7 },
  { kind: 'label', text: '㉔　配当還元方式による価額\n㉓の金額が、原則的評価方式により計算した価額\nを超える場合には、原則的評価方式により計算し\nた価額とします。', align: 'left', fontSize: 6, top: 67.38, left: 47.46, width: 30.06, height: 3.9 },
  { kind: 'cell', codeLabel: 'C08', top: 67.38, left: 77.52, width: 1.81, height: 3.9 },
  { field: '㉔', kind: 'input', readOnly: true, top: 67.38, left: 79.33, width: 10.88, height: 3.9, align: 'right' },
  { kind: 'label', text: '円', top: 67.38, left: 90.21, width: 2.13, height: 3.9, fontSize: 7 },
  // ── 3. 株式に関する権利の評価（1.及び2.に共通） ──
  { kind: 'label', text: '３．株式に関する権利の評価（１．及び２．に共通）', semanticRole: 'columnheader', top: 71.51, left: 7.25, width: 3.02, height: 18.75, align: 'center' },
  // 配当期待権
  { kind: 'label', text: '配　当　期　待　権', ariaLabel: '配当期待権を選択', toggleField: 'right_haito', highlightWhen: (g) => g('right_haito') === '1', top: 71.51, left: 10.27, width: 17.05, height: 5.27 },
  { kind: 'label', text: '㉕　１株当たりの\n予想配当金額', fontSize: 7, top: 71.51, left: 27.32, width: 21.95, height: 2.68 },
  { kind: 'label', text: '㉖　源泉徴収されるべき\n所得税相当額', fontSize: 7, top: 71.51, left: 49.27, width: 22.33, height: 2.68 },
  { kind: 'label', text: '㉗　配当期待権の価額\n（㉕－㉖）', fontSize: 7, top: 71.51, left: 71.6, width: 20.74, height: 2.68 },
  ...yenSenInput('J03', 'exp_div', 'exp_div_sen', 74.19, 2.59, 27.32, 29.61, 39.16, 40.98, 47.46, 49.27),
  ...yenSenInput('J04', 'exp_tax', 'exp_tax_sen', 74.19, 2.59, 49.27, 51.09, 60.15, 61.97, 69.78, 71.6),
  ...yenSenInput('J05', '㉗円', 'f72', 74.19, 2.59, 71.6, 73.89, 82.96, 84.77, 90.21, 92.34, { readOnly: true }),
  // 株式の割当てを受ける権利
  { kind: 'label', text: '株式の割当てを受ける権利\n（割当株式１株当たりの価額）', fontSize: 6.5, ariaLabel: '割当てを受ける権利を選択', toggleField: 'right_wariate', highlightWhen: (g) => g('right_wariate') === '1', top: 76.78, left: 10.27, width: 17.05, height: 5.64 },
  { kind: 'label', text: '㉘　⑫の金額\n（配当還元方式の場合は㉔の金額）', fontSize: 6.5, top: 76.78, left: 27.32, width: 21.95, height: 3.05 },
  { kind: 'label', text: '㉙　割当株式１株当たりの\n払込金額', fontSize: 6.5, top: 76.78, left: 49.27, width: 22.33, height: 3.05 },
  { kind: 'label', text: '㉚　株式の割当てを受ける権利\nの価額（㉘－㉙）', fontSize: 6.5, top: 76.78, left: 71.6, width: 20.74, height: 3.05 },
  { kind: 'cell', codeLabel: 'G12', top: 79.83, left: 27.32, width: 2.29, height: 2.59 },
  { field: '㉘', kind: 'input', readOnly: true, top: 79.83, left: 29.61, width: 17.85, height: 2.59, align: 'right' },
  { kind: 'label', text: '円', top: 79.83, left: 47.46, width: 1.81, height: 2.59, fontSize: 7 },
  { kind: 'cell', codeLabel: 'G13', top: 79.83, left: 49.27, width: 1.82, height: 2.59 },
  { field: 'r22_pay', kind: 'input', commaInteger: true, top: 79.83, left: 51.09, width: 18.69, height: 2.59, align: 'right' },
  { kind: 'label', text: '円', top: 79.83, left: 69.78, width: 1.82, height: 2.59, fontSize: 7 },
  { kind: 'cell', codeLabel: 'C09', top: 79.83, left: 71.6, width: 2.29, height: 2.59 },
  { field: '㉚', kind: 'input', readOnly: true, top: 79.83, left: 73.89, width: 16.32, height: 2.59, align: 'right' },
  { kind: 'label', text: '円', top: 79.83, left: 90.21, width: 2.13, height: 2.59, fontSize: 7 },
  // 株主となる権利
  { kind: 'label', text: '株 主 と な る 権 利\n（割当株式１株当たりの価額）', fontSize: 6.5, ariaLabel: '株主となる権利を選択', toggleField: 'right_kabunushi', highlightWhen: (g) => g('right_kabunushi') === '1', top: 82.42, left: 10.27, width: 17.05, height: 3.96 },
  { kind: 'label', text: '⑫の金額（配当還元方式の場合は㉔の金額）\n（課税時期後にその株主となる権利につき払い込むべき金額が\nあるときは、その金額を控除した金額）', align: 'left', fontSize: 6, top: 82.42, left: 27.32, width: 44.28, height: 3.96 },
  { kind: 'label', text: '㉛　株主となる権利の価額', fontSize: 7, top: 82.42, left: 71.6, width: 20.74, height: 1.37 },
  { kind: 'cell', codeLabel: 'C10', top: 83.79, left: 71.6, width: 2.29, height: 2.59 },
  { field: '㉛', kind: 'input', readOnly: true, top: 83.79, left: 73.89, width: 16.32, height: 2.59, align: 'right' },
  { kind: 'label', text: '円', top: 83.79, left: 90.21, width: 2.13, height: 2.59, fontSize: 7 },
  // 株式無償交付期待権
  { kind: 'label', text: '株 式 無 償 交 付 期 待 権\n（交付される株式１株当たりの価額）', fontSize: 6, ariaLabel: '無償交付期待権を選択', toggleField: 'right_musho', highlightWhen: (g) => g('right_musho') === '1', top: 86.38, left: 10.27, width: 17.05, height: 3.88 },
  { kind: 'label', text: '⑫の金額（配当還元方式の場合は㉔の金額）', align: 'left', fontSize: 6.5, top: 86.38, left: 27.32, width: 44.28, height: 3.88 },
  { kind: 'label', text: '㉜　株式無償交付期待権の価額', fontSize: 7, top: 86.38, left: 71.6, width: 20.74, height: 1.37 },
  { kind: 'cell', codeLabel: 'C11', top: 87.75, left: 71.6, width: 2.29, height: 2.51 },
  { field: '㉜', kind: 'input', readOnly: true, top: 87.75, left: 73.89, width: 16.32, height: 2.51, align: 'right' },
  { kind: 'label', text: '円', top: 87.75, left: 90.21, width: 2.13, height: 2.51, fontSize: 7 },
  // ── 4. 株式及び株式に関する権利の価額 ──
  { kind: 'label', text: '４．株式及び株式に\n関する権利の価額\n（１．及び２．に共通）', semanticRole: 'columnheader', fontSize: 6.5, top: 90.46, left: 7.25, width: 13.9, height: 3.44 },
  { kind: 'label', text: '㉝　株式の評価額', fontSize: 7, top: 90.46, left: 21.15, width: 12.09, height: 3.44 },
  { kind: 'cell', codeLabel: 'C12', top: 90.46, left: 33.24, width: 2.3, height: 3.44 },
  { field: '㉝', kind: 'input', readOnly: true, top: 90.46, left: 35.54, width: 15.55, height: 3.44, align: 'right' },
  { kind: 'label', text: '円', top: 90.46, left: 51.09, width: 1.81, height: 3.44, fontSize: 7 },
  { kind: 'label', text: '㉞　株式に関する\n権利の評価額', fontSize: 7, top: 90.46, left: 52.9, width: 10.88, height: 3.44 },
  { kind: 'cell', codeLabel: 'J06', top: 90.46, left: 63.78, width: 2.3, height: 3.44 },
  { field: '㉞', kind: 'input', readOnly: true, multiline: true, fontSize: 7, top: 90.46, left: 66.08, width: 26.26, height: 3.44 },
];

/** 第3表（CSSグリッド方式・令和8年4月1日以降用） */
export function Table3Grid({ getField, updateField, onJump }: TableProps) {
  const raw = (f: string) => getField(T, f);
  const u = (f: string, v: string) => updateField(T, f, v);

  const numOf = (s: string): number | null => {
    const t = s.replace(/,/g, '').trim();
    if (t === '') return null;
    const n = Number(t);
    return isNaN(n) ? null : n;
  };
  const num = (f: string) => numOf(raw(f));
  const fmt = (v: number | null) => (v === null ? '' : v.toLocaleString('ja-JP'));
  const fmtDec1 = (v: number | null) => (v === null ? '' : v.toLocaleString('ja-JP', { maximumFractionDigits: 1 }));
  const yenPart = (v: number | null) => (v === null ? '' : fl(v).toLocaleString('ja-JP'));
  const senPart = (v: number | null) => (v === null ? '' : String(Math.round((v - fl(v)) * 100)).padStart(2, '0'));
  const amountWithSen = (yenField: string, senField: string) => {
    const yen = num(yenField);
    const senText = raw(senField).trim();
    if (yen === null && senText === '') return null;
    if (senText === '') return yen;
    return fl(yen ?? 0) + (numOf(senText) ?? 0) / 100;
  };

  // 転記元（第4表・第5表・第1表の2・第1表の1）
  const t4 = calcTable4(getField);
  const t5 = calcTable5(getField);
  const size = calcCompanySize((f) => getField('table1_2', f)).result;
  const judge = calcShareholderJudgment(getField);

  // 1. 原則的評価方式による価額
  const v1 = t4.v28 ?? t4.v27 ?? t4.v26;  // ①=第4表の比準価額（修正後があればそれ）
  const v2 = t5['⑪'] ?? null;             // ②=第5表の⑪
  const v3 = t5['⑫'] ?? null;             // ③=第5表の⑫（80%相当額）
  const v4 = v1 !== null && v2 !== null ? Math.min(v1, v2) : v2 ?? v1; // ④大会社
  const lRate = size === 3 ? 0.9 : size === 2 ? 0.75 : size === 1 ? 0.6 : null; // Lの割合（第1表の2連動）
  const lowBase = v1 !== null && v2 !== null ? Math.min(v1, v2) : null;
  const netForMid = v3 ?? v2;
  const v5 = lRate !== null && lowBase !== null && netForMid !== null ? fl(lowBase * lRate + netForMid * (1 - lRate)) : null; // ⑤中会社
  const iSmall = v3 ?? v2;
  const v6 = iSmall === null ? null : v1 === null ? fl(iSmall) : fl(Math.min(iSmall, v1 * 0.5 + iSmall * 0.5)); // ⑥小会社
  const base = size === 4 ? v4 : size === 0 ? v6 : size !== null ? v5 : null; // 会社規模に応じた株式の価額
  // 修正（⑧=（④⑤又は⑥）－⑦、⑫=(⑧(なければ④⑤⑥)＋⑨×⑩)÷(1株＋⑪)）
  const mod1Div = amountWithSen('mod1_div', 'mod1_div_sen');
  const v8 = base !== null && mod1Div !== null ? fl(base - mod1Div) : null;
  const mod2Pay = num('mod2_pay'), mod2Ratio = num('mod2_ratio'), mod2Ratio2 = num('mod2_ratio2');
  const base12 = v8 ?? base;
  const v12 = base12 !== null && mod2Ratio2 !== null ? fl((base12 + (mod2Pay ?? 0) * (mod2Ratio ?? 0)) / (1 + mod2Ratio2)) : null;
  const gensoku = v12 ?? v8 ?? base; // 原則的評価方式の最終価額

  // 2. 配当還元方式（⑬は第4表①、⑭は第1表の1⑤、⑮は第1表の1の自己株式数f63から転記）
  const effStr = (own: string, fb: string) => (raw(own).trim() !== '' ? raw(own) : getField('table4', fb));
  const linkedTreasuryShares = getField('table1_1', 'f63') || getField('table1_1', 'treasury_shares');
  const v13c = numOf(effStr('⑬', '①'));
  const v14c = numOf(getField('table1_1', '⑤'));
  const v15c = numOf(linkedTreasuryShares); // ⑮＝第1表の1の自己株式数（f63）を転記
  const v16 = v13c !== null ? fl(v13c * 20) : null; // ⑯=⑬×1000÷50
  // ⑰: 円未満切捨て。0となる場合は(⑭－⑮)の桁数の小数（記載要領）
  const sharesNet3 = v14c !== null ? v14c - (v15c ?? 0) : null;
  let v17: number | null = null;
  let v17disp = '';
  if (v13c !== null && sharesNet3 !== null && sharesNet3 > 0) {
    const v = (v13c * 1000) / sharesNet3;
    if (fl(v) > 0) {
      v17 = fl(v);
      v17disp = v17.toLocaleString('ja-JP');
    } else {
      const m = Math.pow(10, String(Math.floor(sharesNet3)).length);
      v17 = Math.floor(v * m + 1e-9) / m;
      v17disp = String(v17);
    }
  }
  // ⑱⑲年配当金額は第4表⑥⑦から転記（直前期=f28/f29、直前々期=f32/f33）
  const t4num = (f: string) => numOf(getField('table4', f));
  const subT4 = (a: string, b: string) => { const x = t4num(a); return x === null ? null : x - (t4num(b) ?? 0); };
  const ia = subT4('f28', 'f29');  // ㋑=⑱－⑲（直前期）
  const ro = subT4('f32', 'f33');  // ㋺（直前々期）
  const v21 = ia !== null && ro !== null ? (ia + ro) / 2 : null; // ㉑
  // ㉒=㉑÷⑯（10銭未満切捨て、2円50銭未満は2円50銭）
  const v22raw = v21 !== null && v16 !== null && v16 > 0 ? fl10sen((v21 * 1000) / v16) : null; // 切上げ前の計算値
  const v22 = v22raw === null ? null : Math.max(2.5, v22raw);
  const v22Floored = v22raw !== null && v22raw < 2.5; // 計算値が2円50銭未満→下限を適用
  const v23 = v22 !== null && v17 !== null ? fl((v22 * v17) / 5) : null; // ㉓=㉒÷10%×⑰÷50円
  const v24 = v23 === null ? null : gensoku !== null && v23 > gensoku ? gensoku : v23; // ㉔

  // 適用方式（自動=第1表の1・第1表の2の株主判定に連動、toolbarで手動切替可）
  // 医療法人（持分あり）は配当がないため配当還元方式を適用しない（常に原則的評価方式）
  const medical = getField('table1_1', 'medical') === '1';
  const mode = raw('hoshiki');
  const useHaito = medical ? false : mode === 'haito' ? true : mode === 'gensoku' ? false : judge.isDozokuFinal === null ? null : !judge.isDozokuFinal;
  const finalPrice = useHaito === null ? null : useHaito ? v24 ?? v23 : gensoku;

  // 3. 株式に関する権利の評価
  const expDiv = amountWithSen('exp_div', 'exp_div_sen');
  const expTax = amountWithSen('exp_tax', 'exp_tax_sen');
  const v27 = expDiv !== null ? fl2sen(expDiv - (expTax ?? 0)) : null; // ㉗配当期待権（円未満2位）
  const base28 = useHaito === null ? null : useHaito ? v24 ?? v23 : gensoku; // ⑫(配当還元の場合は㉔)
  const r22Pay = num('r22_pay');
  const v30 = base28 !== null && r22Pay !== null ? fl(base28 - r22Pay) : null; // ㉚
  const v31 = base28 === null ? null : fl(base28);                            // ㉛
  const v32 = base28; // ㉜

  // 4. 株式に関する権利の評価額: 発生している権利（クリック指定）の金額をそれぞれ別に記載（記載要領）
  const RIGHTS = [
    { key: 'right_haito', label: '配当期待権', mark: '㉗', text: v27 === null ? null : `㉗ ${fl(v27).toLocaleString('ja-JP')}円${String(Math.round((v27 - fl(v27)) * 100)).padStart(2, '0')}銭` },
    { key: 'right_wariate', label: '割当てを受ける権利', mark: '㉚', text: v30 === null ? null : `㉚ ${v30.toLocaleString('ja-JP')}円` },
    { key: 'right_kabunushi', label: '株主となる権利', mark: '㉛', text: v31 === null ? null : `㉛ ${v31.toLocaleString('ja-JP')}円` },
    { key: 'right_musho', label: '無償交付期待権', mark: '㉜', text: v32 === null ? null : `㉜ ${v32.toLocaleString('ja-JP')}円` },
  ];
  const rightsText = RIGHTS.filter((r) => raw(r.key) === '1').map((r) => r.text ?? `${r.mark} －`).join('\n');

  const g = (f: string): string => {
    switch (f) {
      case '①': return fmt(v1);
      case '②': return fmt(v2);
      case '③': return fmt(v3);
      case '会社規模区分': return size === 4 ? 'large' : size === 0 ? 'small' : size !== null ? 'medium' : '';
      case '④': return size === 4 ? fmt(v4) : '';
      case '大会社の採用値':
        if (v1 === null && v2 === null) return '';
        if (v2 === null) return 'イ';
        if (v1 === null) return 'ロ';
        if (v1 === v2) return 'イ・ロ';
        return v1 < v2 ? 'イ' : 'ロ';
      case '小会社の採用値': {
        if (iSmall === null) return '';
        if (v1 === null) return 'イ';
        const blended = v1 * 0.5 + iSmall * 0.5;
        if (iSmall === blended) return 'イ・ロ';
        return iSmall < blended ? 'イ' : 'ロ';
      }
      case '⑤': return size !== null && size > 0 && size < 4 ? fmt(v5) : '';
      case '⑥': return size === 0 ? fmt(v6) : '';
      case 'L割合': return lRate === null ? '' : lRate.toFixed(2);
      case 'mod1_div': return yenPart(num('mod1_div'));
      case 'mod1_div_sen': return raw('mod1_div_sen').trim() !== '' ? raw('mod1_div_sen') : senPart(num('mod1_div'));
      case '⑧': return fmt(v8);
      case '⑫': return fmt(v12);
      case '⑬': return getField('table4', '①');
      case '⑭': return getField('table1_1', '⑤');
      case '⑮': return linkedTreasuryShares;
      case '⑯': return fmt(v16);
      case '⑰': return v17disp;
      case 'f55': return getField('table4', 'f28');
      case 'f56': return getField('table4', 'f29');
      case 'f59': return getField('table4', 'f32');
      case 'f60': return getField('table4', 'f33');
      case 'イ': return fmtDec1(ia);
      case 'ロ': return fmtDec1(ro);
      case '㉑': return fmtDec1(v21);
      case '㉒円': return yenPart(v22);
      case '㉒銭': return senPart(v22);
      case '㉓': return fmt(v23);
      case '㉔': return fmt(v24);
      case 'exp_div': return yenPart(num('exp_div'));
      case 'exp_div_sen': return raw('exp_div_sen').trim() !== '' ? raw('exp_div_sen') : senPart(num('exp_div'));
      case 'exp_tax': return yenPart(num('exp_tax'));
      case 'exp_tax_sen': return raw('exp_tax_sen').trim() !== '' ? raw('exp_tax_sen') : senPart(num('exp_tax'));
      case '㉗円': return yenPart(v27); case 'f72': return senPart(v27);
      case '㉘': return fmt(base28);
      case '㉚': return fmt(v30);
      case '㉛': return fmt(v31);
      case '㉜': return fmt(v32);
      case '㉝': return finalPrice === null ? '' : fmt(finalPrice);
      case '㉞': return rightsText;
      default: return raw(f);
    }
  };

  const toolbar = (
    <span className="no-print" style={{ display: 'flex', alignItems: 'center', fontSize: 11, whiteSpace: 'nowrap' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        適用方式：
        <select id="table3-hoshiki-toolbar" name="table3.hoshiki" value={raw('hoshiki')} onChange={(e) => u('hoshiki', e.target.value)} style={{ fontSize: 11, padding: '1px 2px' }}>
          <option value="">自動（第1表の判定に連動）</option>
          <option value="gensoku">原則的評価方式</option>
          <option value="haito">配当還元方式</option>
        </select>
      </label>
    </span>
  );
  // ㉒が2円50銭未満で下限適用された場合、注記欄に「計算値→2円50銭」の比較を表示し、㉒欄とともに強調する
  const noteText = v22Floored && v22raw !== null
    ? `計算値 ${yenPart(v22raw)}円${senPart(v22raw)}銭\n→ 下限の２円50銭を適用`
    : 'この金額が２円50銭未満の場合は\n２円50銭とします。';
  const cells = CELLS.map((cell) => {
    if (cell.kind === 'label' && cell.text === 'この金額が２円50銭未満の場合は\n２円50銭とします。') {
      return { ...cell, text: noteText, highlightWhen: () => v22Floored };
    }
    if (cell.field === '㉒円' || cell.field === '㉒銭') {
      return { ...cell, highlightWhen: () => v22Floored };
    }
    return cell;
  });
  const { mainCells, headerExtra, aspectRatio } = extractCompanyFloatHeader(cells, g, u, T, onJump);
  return <GridForm cells={mainCells} g={g} u={u} formId={T} width="100%" aspectRatio={aspectRatio} title="第３表　一般の評価会社の株式及び株式に関する権利の価額の計算明細書" formCode="NTA0VNA200010010" headerExtra={headerExtra} toolbar={toolbar} onJump={onJump && ((t) => onJump({ tab: t.tab as TableId, field: t.field }))} />;
}
