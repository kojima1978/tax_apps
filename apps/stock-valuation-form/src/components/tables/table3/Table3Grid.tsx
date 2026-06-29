import { GridForm, type GridCell } from '@/components/ui/GridForm';
import { calcTable4 } from '../table4/Table4Grid';
import { calcTable5 } from '../table5/Table5Grid';
import { calcCompanySize } from '../table1-2/Table1_2Grid';
import { calcShareholderJudgment } from '../Table1_1Grid';
import type { TableId, TableProps } from '@/types/form';

const T = 'table3' as const;

// ── 計算の根拠（参考リンク） ──
const REFERENCES = [
  { label: '評価通達179（取引相場のない株式の評価の原則）', url: 'https://www.nta.go.jp/law/tsutatsu/kihon/sisan/hyoka_new/08/02.htm#a-179' },
  { label: '評価通達187（株式の価額の修正）', url: 'https://www.nta.go.jp/law/tsutatsu/kihon/sisan/hyoka_new/08/04.htm#a-187' },
  { label: '評価通達188-2（同族株主以外の株主等が取得した株式の評価）', url: 'https://www.nta.go.jp/law/tsutatsu/kihon/sisan/hyoka_new/08/04.htm#a-188_2' },
  { label: '評価通達190〜193（株式に関する権利の評価）', url: 'https://www.nta.go.jp/law/tsutatsu/kihon/sisan/hyoka_new/08/06.htm#a-190' },
];

// ── 端数処理（第3表記載要領） ──
const fl = (v: number) => Math.floor(v + 1e-9);                 // 円未満切捨て
const fl10sen = (v: number) => Math.floor(v * 10 + 1e-7) / 10;  // 10銭未満切捨て
const fl2sen = (v: number) => Math.floor(v * 100 + 1e-7) / 100; // 銭未満切捨て（配当期待権は円未満2位）
const companySizeHL = (companySize: 'large' | 'medium' | 'small') => (g: (field: string) => string) => g('会社規模区分') === companySize;
const selectedLinePrefixes = (companySize: 'large' | 'small', field: string) => (g: (key: string) => string) =>
  g('会社規模区分') === companySize ? g(field).split('・').filter(Boolean) : [];

/** 第3表のグリッドセル（ピッカーで測定・確定したもの／ピッカー出力をそのまま保存） */
const CELLS: GridCell[] = [
  // ── 外枠・4区分 ──
  { kind: 'cell', text: '外枠', top: 8.71, left: 8.71, width: 84.01, height: 84.63 },
  { kind: 'cell', text: '１原則的評価方法による価額', top: 8.71, left: 8.44, width: 84.28, height: 36.92 },
  { kind: 'cell', text: '２配当還元方式による価額', top: 45.52, left: 8.44, width: 84.28, height: 29.3 },
  { kind: 'cell', text: '３株式に関する権利の価額', top: 74.73, left: 8.44, width: 63.01, height: 18.51 },
  { kind: 'cell', text: '４株式及び株式に関する権利の価額', top: 74.73, left: 71.45, width: 21.14, height: 18.51 },
  // ── 1 原則的評価方法による価額 ──
  { kind: 'label', text: '１原則的評価方法による価額', top: 8.61, left: 8.44, width: 3.55, height: 37.01 },
  { kind: 'label', text: '１株当たりの\n価格の基となる金額', top: 8.61, left: 11.92, width: 10.5, height: 8.48 },
  { kind: 'label', text: '類似業種比準価額\n（第４表の㉖、㉗又は㉘の金額）', top: 8.61, left: 22.55, width: 23.19, height: 3.86 },
  { kind: 'label', text: '１株当たりの純資産価額\n（第５表の⑪の金額）', top: 8.61, left: 46.01, width: 23.19, height: 3.86 },
  { kind: 'label', text: '１株当たりの純資産価額の80％相当額\n（第5表の⑫の記載がある場合のその金額）', top: 8.51, left: 69.2, width: 23.59, height: 3.86 },
  { field: '①', kind: 'input', readOnly: true, jumpTo: { tab: 'table4', field: '㉖', hint: 'クリックで転記元（第４表の㉖・類似業種比準価額）へ移動します' }, cornerLabel: '①', topRightLabel: '円', top: 12.27, left: 22.14, width: 23.73, height: 4.92 },
  { field: '②', kind: 'input', readOnly: true, jumpTo: { tab: 'table5', field: '⑪', hint: 'クリックで転記元（第５表の⑪・1株当たりの純資産価額）へ移動します' }, cornerLabel: '②', topRightLabel: '円', top: 12.37, left: 45.74, width: 23.46, height: 4.72 },
  { field: '③', kind: 'input', readOnly: true, jumpTo: { tab: 'table5', field: '⑫', hint: 'クリックで転記元（第５表の⑫・1株当たりの純資産価額の80％相当額）へ移動します' }, cornerLabel: '③', topRightLabel: '円', top: 12.47, left: 69.2, width: 23.46, height: 4.53 },
  { kind: 'label', text: '1株当たりの価額の計算', verticalSectionHeading: { number: '1', text: '株当たりの価額の計算', compact: true }, top: 16.9, left: 11.78, width: 3.68, height: 16.19 },
  { kind: 'label', text: '区分', top: 16.9, left: 15.33, width: 7.09, height: 2.51 },
  { kind: 'label', text: '１株当たりの価額の算定方法', top: 17, left: 22.28, width: 49.23, height: 2.31 },
  { kind: 'label', text: '１株当たりの価額', top: 16.8, left: 71.38, width: 21.14, height: 2.51 },
  { kind: 'label', text: '大会社の\n株式の価額', highlightWhen: companySizeHL('large'), top: 19.21, left: 15.33, width: 7.09, height: 4.72 },
  {
    kind: 'label',
    text: '次のうちいずれか低い方の金額（②の記載がないときは①の金額）\n\nイ　①の金額\nロ　②の金額',
    align: 'left',
    highlightWhen: companySizeHL('large'),
    highlightLinePrefixes: selectedLinePrefixes('large', '大会社の採用値'),
    top: 19.12,
    left: 22.28,
    width: 49.23,
    height: 4.92,
  },
  { field: '④', kind: 'input', readOnly: true, cornerLabel: '④', topRightLabel: '円', highlightWhen: companySizeHL('large'), top: 19.02, left: 71.38, width: 21.41, height: 5.11 },
  { kind: 'label', text: '中会社の\n株式の価額', highlightWhen: companySizeHL('medium'), top: 23.84, left: 15.19, width: 7.23, height: 4.72 },
  {
    kind: 'label',
    text: '（①と②とのいずれか低い方の金額×Lの割合）＋（②の金額（③の金額があるときは③の金額）×（1－Lの割合））',
    weightedAverageExpression: {
      leftLines: ['①と②とのいずれか', '低い方の金額'],
      rightLines: ['②の金額（③の金額が', 'あるときは③の金額）'],
      rateField: 'L割合',
    },
    highlightWhen: companySizeHL('medium'),
    top: 23.93,
    left: 22.14,
    width: 49.51,
    height: 4.72,
    fontSize: 5.5,
  },
  { field: '⑤', kind: 'input', readOnly: true, cornerLabel: '⑤', topRightLabel: '円', highlightWhen: companySizeHL('medium'), top: 23.84, left: 71.38, width: 21.41, height: 4.82 },
  { kind: 'label', text: '小会社の\n株式の価額', highlightWhen: companySizeHL('small'), top: 28.37, left: 15.33, width: 7.09, height: 4.92 },
  {
    kind: 'label',
    text: '次のうちいずれか低い方の金額\n\nイ　②の金額（③の金額があるときは③の金額）\nロ　（①の金額×0.5）＋（㋑の金額×0.5）',
    align: 'left',
    highlightWhen: companySizeHL('small'),
    highlightLinePrefixes: selectedLinePrefixes('small', '小会社の採用値'),
    top: 28.56,
    left: 22.28,
    width: 49.37,
    height: 4.82,
  },
  { field: '⑥', kind: 'input', readOnly: true, cornerLabel: '⑥', topRightLabel: '円', highlightWhen: companySizeHL('small'), top: 28.56, left: 71.52, width: 21.14, height: 4.72 },
  // 株式の価額の修正
  { kind: 'label', text: '株式の価額の修正', top: 33.19, left: 11.92, width: 3.41, height: 12.43 },
  { kind: 'label', text: '課税時期において\n配当期待権の発生している場合', top: 33.09, left: 15.05, width: 14.32, height: 6.26 },
  {
    kind: 'input',
    subtractionAmountExpression: {
      leftLabelLines: ['株式の価額', '（④、⑤又は⑥の金額）'],
      leftValueField: 'mod1_base',
      rightLabelLines: ['1株当たりの', '配当金額'],
      rightYenField: 'mod1_div',
      rightSenField: 'mod1_div_sen',
    },
    top: 33.19,
    left: 29.24,
    width: 42.28,
    height: 6.36,
  },
  { kind: 'label', text: '修正後の株式の価額', top: 33.19, left: 71.52, width: 21.14, height: 2.51 },
  { field: '⑦', kind: 'input', readOnly: true, cornerLabel: '⑦', topRightLabel: '円', top: 35.69, left: 71.38, width: 21.41, height: 3.86 },
  { kind: 'label', text: '課税時期において\n株式の割当てを受ける権利、\n株式となる権利\nまたは\n株式無償交付期待権\nの発生している場合', top: 39.36, left: 15.19, width: 14.18, height: 6.17, fontSize: 6 },
  // ⑧＝(⑦(ないときは④⑤⑥)＋払込金額×割当株式数)÷(1＋割当・交付株式数)。割当株式数は1株未満を切り捨てない
  {
    kind: 'input',
    allocationAdjustmentExpression: {
      baseLabelLines: ['株式の価額', '（④、⑤又は⑥', '（⑦があるときは⑦）の金額）'],
      baseValueField: 'mod2_base',
      paymentLabelLines: ['割当株式1株当たりの', '払込金額'],
      paymentField: 'mod2_pay',
      allocationLabelLines: ['1株当たりの', '割当株式数'],
      allocationField: 'mod2_ratio',
      issuedLabelLines: ['1株当たりの', '割当株式数又は交付株式数'],
      issuedField: 'mod2_ratio2',
    },
    top: 39.26,
    left: 29.24,
    width: 42.42,
    height: 6.17,
  },
  { kind: 'label', text: '修正後の株式の価額', top: 39.16, left: 71.38, width: 21.41, height: 2.51 },
  { field: '⑧', kind: 'input', readOnly: true, cornerLabel: '⑧', topRightLabel: '円', top: 41.57, left: 71.38, width: 21.14, height: 3.86 },
  // ── 2 配当還元方式による価額 ──
  { kind: 'label', text: '２ 配 当 還 元 方 式 に よ る 価 額', top: 45.43, left: 8.51, width: 3.55, height: 29.4 },
  { kind: 'label', text: '１株当たりの\n資本金等の額、\n発行済株式数等', top: 45.33, left: 11.78, width: 11.73, height: 8.67 },
  { kind: 'label', text: '直 前 期 末 の 資 本 金 等 の 額', top: 45.38, left: 23.29, width: 14.32, height: 4.72 },
  { kind: 'label', text: '直 前 期 末 の 発 行 済 株 式 数', top: 45.38, left: 37.47, width: 14.18, height: 4.72 },
  { kind: 'label', text: '直 前 期 末 の 自 己 株 式 数', top: 45.38, left: 51.52, width: 12.96, height: 4.82 },
  { kind: 'label', text: '１株当たりの資本金等の額を\n50円とした場合の発済株式数\n（⑨÷50円）', top: 45.38, left: 64.39, width: 14.18, height: 4.92 },
  { kind: 'label', text: '１株当たりの資本金等の額\n（⑨÷（⑩－⑪））', top: 45.28, left: 78.3, width: 14.18, height: 4.92 },
  { field: '⑨', kind: 'input', commaInteger: true, readOnly: true, jumpTo: { tab: 'table4', field: '①', hint: 'クリックで入力元（第４表①・直前期末の資本金等の額）へ移動します' }, cornerLabel: '⑨', topRightLabel: '千円', top: 50.01, left: 23.34, width: 14.32, height: 3.95 },
  { field: '⑩', kind: 'input', commaInteger: true, readOnly: true, jumpTo: { tab: 'table1_1', field: '①', hint: 'クリックで入力元（第１表の１①・発行済株式の総数）へ移動します' }, cornerLabel: '⑩', topRightLabel: '株', top: 50.1, left: 37.39, width: 14.32, height: 3.95 },
  { field: '⑪', kind: 'input', commaInteger: true, readOnly: true, jumpTo: { tab: 'table1_1', field: 'f63', hint: 'クリックで入力元（第１表の１・自己株式数）へ移動します' }, cornerLabel: '⑪', topRightLabel: '株', top: 50.1, left: 51.57, width: 12.96, height: 3.86 },
  { field: '⑫', kind: 'input', readOnly: true, cornerLabel: '⑫', topRightLabel: '株', top: 50.1, left: 64.39, width: 14.18, height: 3.76 },
  { field: '⑬', kind: 'input', readOnly: true, cornerLabel: '⑬', topRightLabel: '円', top: 50.1, left: 78.3, width: 14.18, height: 3.95 },
  { kind: 'label', text: '直 前 期 末 以 前 ２ 年 間 の 配 当 金 額', top: 53.86, left: 11.74, width: 3.68, height: 10.99 },
  { kind: 'label', text: '事 業 年 度', top: 53.77, left: 15.15, width: 8.46, height: 3.28 },
  { kind: 'label', text: '⑭ 年 配 当 金 額', top: 53.77, left: 23.47, width: 16.5, height: 3.37 },
  { kind: 'label', text: '⑮左 の う ち 非 経 常 的 な 配 当 金 額', top: 53.86, left: 39.84, width: 17.59, height: 3.37 },
  { kind: 'label', text: '⑯差引経常的な年配当金額\n（ ⑭－⑮ ）', top: 53.96, left: 57.43, width: 17.73, height: 3.18 },
  { kind: 'label', text: '年 平 均 配 当 金 額', top: 54.15, left: 75.03, width: 17.59, height: 2.89 },
  { kind: 'label', text: '直 前 期', top: 56.95, left: 15.15, width: 8.46, height: 3.95 },
  { field: 'f55', kind: 'input', commaInteger: true, readOnly: true, jumpTo: { tab: 'table4', field: 'f28', hint: 'クリックで入力元（第４表・⑥年配当金額・直前期）へ移動します' }, topRightLabel: '千円', top: 56.95, left: 23.34, width: 16.64, height: 4.05 },
  { field: 'f56', kind: 'input', commaInteger: true, readOnly: true, jumpTo: { tab: 'table4', field: 'f29', hint: 'クリックで入力元（第４表・⑦非経常的な配当金額・直前期）へ移動します' }, topRightLabel: '千円', top: 57.04, left: 39.84, width: 17.59, height: 3.86 },
  { field: 'イ', kind: 'input', readOnly: true, cornerLabel: '㋑', topRightLabel: '千円', top: 57.04, left: 57.3, width: 17.73, height: 3.86 },
  { kind: 'label', text: '直 前 々 期', top: 60.75, left: 15.29, width: 8.32, height: 4.05 },
  { field: 'f59', kind: 'input', commaInteger: true, readOnly: true, jumpTo: { tab: 'table4', field: 'f32', hint: 'クリックで入力元（第４表・⑥年配当金額・直前々期）へ移動します' }, topRightLabel: '千円', top: 60.85, left: 23.47, width: 16.5, height: 3.86 },
  { field: 'f60', kind: 'input', commaInteger: true, readOnly: true, jumpTo: { tab: 'table4', field: 'f33', hint: 'クリックで入力元（第４表・⑦非経常的な配当金額・直前々期）へ移動します' }, topRightLabel: '千円', top: 60.85, left: 39.98, width: 17.59, height: 3.95 },
  { field: 'ロ', kind: 'input', readOnly: true, cornerLabel: '㋺', topRightLabel: '千円', top: 60.85, left: 57.43, width: 17.59, height: 3.95 },
  { field: '⑰（イ＋ロ）÷２ ', kind: 'input', readOnly: true, cornerLabel: '⑰(㋑＋㋺)÷2', topRightLabel: '千円', top: 56.9, left: 75.03, width: 17.59, height: 7.81 },
  { kind: 'label', text: '１株(50円)当たりの\n年配当金額', top: 64.61, left: 11.74, width: 11.73, height: 4.05, fontSize: 6.5 },
  { kind: 'label', text: '年平均配当金額（⑰の金額）÷⑫の株式数＝', stackedDivisionExpression: { dividendLines: ['年平均配当金額', '（⑰の金額）'], divisor: '⑫の株式数', suffix: '＝' }, top: 64.8, left: 23.34, width: 34.09, height: 3.95, fontSize: 6.5 },
  { field: '⑱円', kind: 'input', readOnly: true, cornerLabel: '⑱', topRightLabel: '円', top: 64.8, left: 57.43, width: 10, height: 3.95 },
  { field: '⑱銭', kind: 'input', readOnly: true, topRightLabel: '銭', top: 64.8, left: 67.43, width: 7.59, height: 3.95 },
  { kind: 'label', text: 'この金額が2円50銭未満の場合は\n2円50銭とします。', align: 'left', top: 64.8, left: 75.02, width: 17.6, height: 3.95, fontSize: 6 },
  { kind: 'label', text: '配 当 還 元 価 額', top: 68.56, left: 11.74, width: 11.87, height: 6.26 },
  { kind: 'label', text: '⑱の金額÷10%×⑬の金額÷50円＝', fractionProductExpression: { left: { numerator: '⑱の金額', denominator: '10%', valueField: '⑱' }, right: { numerator: '⑬の金額', denominator: '50円', valueField: '⑬' }, suffix: '＝' }, top: 68.46, left: 23.47, width: 33.96, height: 6.26 },
  { field: '⑲', kind: 'input', readOnly: true, cornerLabel: '⑲', topRightLabel: '円', top: 68.46, left: 57.43, width: 17.59, height: 6.26 },
  { field: '⑳', kind: 'input', readOnly: true, cornerLabel: '⑳', topRightLabel: '円', bottomLabel: '（⑲が原則的評価額を超える場合はその価格）', top: 68.56, left: 75.02, width: 17.6, height: 6.17 },
  // ── 3 株式に関する権利の価額 ──
  { kind: 'label', text: '３ 株 式 に 関 す る 権 利 の 価 額', top: 74.63, left: 8.34, width: 3.68, height: 18.51 },
  { kind: 'label', text: '配 当 期 待 権', ariaLabel: '配当期待権を選択', toggleField: 'right_haito', highlightWhen: (g) => g('right_haito') === '1', top: 74.73, left: 11.88, width: 15.27, height: 4.63 },
  {
    kind: 'input',
    editableSubtractionExpression: {
      leftLabelLines: ['1株当たりの', '予想配当金額'],
      leftYenField: 'exp_div',
      leftSenField: 'exp_div_sen',
      rightLabelLines: ['源泉徴収されるべき', '所得税相当額'],
      rightYenField: 'exp_tax',
      rightSenField: 'exp_tax_sen',
      parenthesized: true,
    },
    top: 74.73,
    left: 26.88,
    width: 30.42,
    height: 4.82,
  },
  { field: '㉑', kind: 'input', readOnly: true, cornerLabel: '㉑', topRightLabel: '円', top: 74.73, left: 57.3, width: 9.55, height: 4.63 },
  { field: 'f72', kind: 'input', readOnly: true, topRightLabel: '銭', top: 74.73, left: 66.57, width: 4.91, height: 4.63 },
  { kind: 'label', text: '株式の割当てを受ける権利\n(割当株式１株当たりの価額)', ariaLabel: '割当てを受ける権利を選択', toggleField: 'right_wariate', highlightWhen: (g) => g('right_wariate') === '1', top: 79.45, left: 11.88, width: 15.27, height: 4.53 },
  {
    kind: 'input',
    subtractionAmountExpression: {
      leftLabelLines: ['⑧（配当還元方式の場合は⑳）の金額'],
      leftValueField: 'r22_base',
      rightLabelLines: ['割当株式１株当たりの払込金額'],
      rightYenField: 'r22_pay',
      underlineRight: false,
      leftLabelNoWrap: true,
      rightLabelNoWrap: true,
    },
    top: 79.26,
    left: 26.88,
    width: 30.55,
    height: 4.82,
  },
  { field: '㉒', kind: 'input', readOnly: true, cornerLabel: '㉒', topRightLabel: '円', top: 79.36, left: 57.3, width: 14.18, height: 4.72 },
  { kind: 'label', text: '株主となる権利\n(割当株式１株当たりの価額)', ariaLabel: '株主となる権利を選択', toggleField: 'right_kabunushi', highlightWhen: (g) => g('right_kabunushi') === '1', top: 83.98, left: 11.88, width: 15.14, height: 4.63 },
  { kind: 'label', text: '⑧（配当還元方式の場合は⑳）の金額\n（課税時期後に払い込むべき金額があるときは、\nその金額を控除した金額）', align: 'left', top: 83.89, left: 27.02, width: 30.41, height: 4.82, fontSize: 6 },
  { field: '㉓', kind: 'input', readOnly: true, cornerLabel: '㉓', topRightLabel: '円', top: 83.98, left: 57.43, width: 13.91, height: 4.63 },
  { kind: 'label', text: '株式無償交付期待権\n(交付される株式１株当たりの価額)', ariaLabel: '無償交付期待権を選択', toggleField: 'right_musho', highlightWhen: (g) => g('right_musho') === '1', top: 88.51, left: 11.88, width: 15, height: 4.63 },
  { kind: 'label', text: '⑧（配当還元方式の場合は⑳）の金額', align: 'left', top: 88.51, left: 26.88, width: 30.69, height: 4.63 },
  { field: '㉔', kind: 'input', readOnly: true, cornerLabel: '㉔', topRightLabel: '円', top: 88.42, left: 57.16, width: 14.18, height: 4.72 },
  // ── 4 株式及び株式に関する権利の価額 ──
  { kind: 'label', text: '４．株式及び株式に関する権利の価額\n（１．及び２．に共通）', top: 74.73, left: 71.34, width: 21.28, height: 4.72 },
  { kind: 'label', text: '株式の評価額', top: 79.26, left: 71.48, width: 8.32, height: 6.26 },
  { field: 'f84', kind: 'input', readOnly: true, topRightLabel: '円', top: 79.36, left: 79.66, width: 12.82, height: 6.26 },
  { kind: 'label', text: '株式に関する権利\nの評価額', top: 85.43, left: 71.48, width: 8.32, height: 7.81 },
  { field: 'f86', kind: 'input', readOnly: true, multiline: true, fontSize: 7.5, top: 85.43, left: 79.39, width: 13.09, height: 7.71 },
];

/** 第3表（CSSグリッド方式・完成版） */
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
  const v1 = t4.v28 ?? t4.v27 ?? t4.v26;  // ①=第4表の㉖、㉗又は㉘（修正後があればそれ）
  const v2 = t5['⑪'] ?? null;             // ②=第5表の⑪
  const v3 = t5['⑫'] ?? null;             // ③=第5表の⑫
  const v4 = v1 !== null && v2 !== null ? Math.min(v1, v2) : v2 ?? v1; // ④大会社
  const lRate = size === 3 ? 0.9 : size === 2 ? 0.75 : size === 1 ? 0.6 : null; // Lの割合（第1表の2連動）
  const lowBase = v1 !== null && v2 !== null ? Math.min(v1, v2) : null;
  const netForMid = v3 ?? v2;
  const v5 = lRate !== null && lowBase !== null && netForMid !== null ? fl(lowBase * lRate + netForMid * (1 - lRate)) : null; // ⑤中会社
  const iSmall = v3 ?? v2;
  const v6 = iSmall === null ? null : v1 === null ? fl(iSmall) : fl(Math.min(iSmall, v1 * 0.5 + iSmall * 0.5)); // ⑥小会社
  const base = size === 4 ? v4 : size === 0 ? v6 : size !== null ? v5 : null; // 会社規模に応じた株式の価額
  // 修正（⑦=base－配当金額、⑧=(⑦(なければbase)＋払込×割当)÷(1＋割当・交付)）
  const mod1Div = amountWithSen('mod1_div', 'mod1_div_sen');
  const v7 = base !== null && mod1Div !== null ? fl(base - mod1Div) : null;
  const mod2Pay = num('mod2_pay'), mod2Ratio = num('mod2_ratio'), mod2Ratio2 = num('mod2_ratio2');
  const base8 = v7 ?? base;
  const v8 = base8 !== null && mod2Ratio2 !== null ? fl((base8 + (mod2Pay ?? 0) * (mod2Ratio ?? 0)) / (1 + mod2Ratio2)) : null;
  const gensoku = v8 ?? v7 ?? base; // 原則的評価方式の最終価額

  // 2. 配当還元方式（⑨は第4表①、⑩は第1表の1①、⑪は第1表の1の自己株式数f63から転記）
  const effStr = (own: string, fb: string) => (raw(own).trim() !== '' ? raw(own) : getField('table4', fb));
  const linkedTreasuryShares = getField('table1_1', 'f63') || getField('table1_1', 'treasury_shares');
  const v9c = numOf(effStr('⑨', '①'));
  const v10c = numOf(getField('table1_1', '①'));
  const v11c = numOf(linkedTreasuryShares); // ⑪＝第1表の1の自己株式数（f63）を転記
  const v12 = v9c !== null ? fl(v9c * 20) : null; // ⑫=⑨×1000÷50
  // ⑬: 円未満切捨て。0となる場合は(⑩－⑪)の桁数の小数（記載要領3⑴ロ）
  const sharesNet3 = v10c !== null ? v10c - (v11c ?? 0) : null;
  let v13: number | null = null;
  let v13disp = '';
  if (v9c !== null && sharesNet3 !== null && sharesNet3 > 0) {
    const v = (v9c * 1000) / sharesNet3;
    if (fl(v) > 0) {
      v13 = fl(v);
      v13disp = v13.toLocaleString('ja-JP');
    } else {
      const m = Math.pow(10, String(Math.floor(sharesNet3)).length);
      v13 = Math.floor(v * m + 1e-9) / m;
      v13disp = String(v13);
    }
  }
  // ⑭⑮年配当金額は第4表⑥⑦から転記（直前期=f28/f29、直前々期=f32/f33）
  const t4num = (f: string) => numOf(getField('table4', f));
  const subT4 = (a: string, b: string) => { const x = t4num(a); return x === null ? null : x - (t4num(b) ?? 0); };
  const ia = subT4('f28', 'f29');  // イ=⑭－⑮（直前期）
  const ro = subT4('f32', 'f33');  // ロ（直前々期）
  const v17 = ia !== null && ro !== null ? (ia + ro) / 2 : null;
  // ⑱=⑰÷⑫（10銭未満切捨て、2円50銭未満は2円50銭）
  const v18raw = v17 !== null && v12 !== null && v12 > 0 ? fl10sen((v17 * 1000) / v12) : null; // 切上げ前の計算値
  const v18 = v18raw === null ? null : Math.max(2.5, v18raw);
  const v18Floored = v18raw !== null && v18raw < 2.5; // 計算値が2円50銭未満→下限を適用
  const v19 = v18 !== null && v13 !== null ? fl((v18 * v13) / 5) : null; // ⑲=⑱÷10%×⑬÷50円
  const v20 = v19 === null ? null : gensoku !== null && v19 > gensoku ? gensoku : v19; // ⑳

  // 適用方式（自動=第1表の1の株主判定に連動、toolbarで手動切替可）
  const mode = raw('hoshiki');
  const useHaito = mode === 'haito' ? true : mode === 'gensoku' ? false : judge.isDozokuFinal === null ? null : !judge.isDozokuFinal;
  const finalPrice = useHaito === null ? null : useHaito ? v20 ?? v19 : gensoku;

  // 3. 株式に関する権利の価額
  const expDiv = amountWithSen('exp_div', 'exp_div_sen');
  const expTax = amountWithSen('exp_tax', 'exp_tax_sen');
  const v21 = expDiv !== null ? fl2sen(expDiv - (expTax ?? 0)) : null; // ㉑配当期待権（円未満2位）
  const base22 = useHaito === null ? null : useHaito ? v20 ?? v19 : gensoku; // ⑧(配当還元の場合は⑳)
  const r22Pay = num('r22_pay');
  const v22 = base22 !== null && r22Pay !== null ? fl(base22 - r22Pay) : null; // ㉒
  const v23 = base22 === null ? null : fl(base22);                            // ㉓
  const v24 = base22; // ㉔

  // 4. 株式に関する権利の評価額: 発生している権利（チェック指定）の金額をそれぞれ別に記載（記載要領5⑵）
  const RIGHTS = [
    { key: 'right_haito', label: '配当期待権', mark: '㉑', text: v21 === null ? null : `㉑ ${fl(v21).toLocaleString('ja-JP')}円${String(Math.round((v21 - fl(v21)) * 100)).padStart(2, '0')}銭` },
    { key: 'right_wariate', label: '割当てを受ける権利', mark: '㉒', text: v22 === null ? null : `㉒ ${v22.toLocaleString('ja-JP')}円` },
    { key: 'right_kabunushi', label: '株主となる権利', mark: '㉓', text: v23 === null ? null : `㉓ ${v23.toLocaleString('ja-JP')}円` },
    { key: 'right_musho', label: '無償交付期待権', mark: '㉔', text: v24 === null ? null : `㉔ ${v24.toLocaleString('ja-JP')}円` },
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
      case 'mod1_base': return fmt(base);
      case 'mod1_div': return yenPart(num('mod1_div'));
      case 'mod1_div_sen': return raw('mod1_div_sen').trim() !== '' ? raw('mod1_div_sen') : senPart(num('mod1_div'));
      case '⑦': return fmt(v7);
      case 'mod2_base': return fmt(base8);
      case '⑧': return fmt(v8);
      case '⑨': return getField('table4', '①');
      case '⑩': return getField('table1_1', '①');
      case '⑪': return linkedTreasuryShares;
      case '⑫': return fmt(v12);
      case '⑬': return v13disp;
      case 'f55': return getField('table4', 'f28');
      case 'f56': return getField('table4', 'f29');
      case 'f59': return getField('table4', 'f32');
      case 'f60': return getField('table4', 'f33');
      case 'イ': return fmtDec1(ia);
      case 'ロ': return fmtDec1(ro);
      case '⑰（イ＋ロ）÷２ ': return fmtDec1(v17);
      case '⑱': return v18 === null ? '' : `${fl(v18)}円${senPart(v18)}銭`;
      case '⑱円': return yenPart(v18);
      case '⑱銭': return senPart(v18);
      case '⑲': return fmt(v19);
      case '⑳': return fmt(v20);
      case 'exp_div': return yenPart(num('exp_div'));
      case 'exp_div_sen': return raw('exp_div_sen').trim() !== '' ? raw('exp_div_sen') : senPart(num('exp_div'));
      case 'exp_tax': return yenPart(num('exp_tax'));
      case 'exp_tax_sen': return raw('exp_tax_sen').trim() !== '' ? raw('exp_tax_sen') : senPart(num('exp_tax'));
      case '㉑': return yenPart(v21); case 'f72': return senPart(v21);
      case 'r22_base': return fmt(base22);
      case '㉒': return fmt(v22);
      case '㉓': return fmt(v23);
      case '㉔': return fmt(v24);
      case 'f84': return finalPrice === null ? '' : fmt(finalPrice);
      case 'f86': return rightsText;
      default: return raw(f);
    }
  };

  const toolbar = (
    <span className="no-print" style={{ display: 'flex', alignItems: 'center', fontSize: 11, whiteSpace: 'nowrap' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        適用方式：
        <select id="table3-hoshiki-toolbar" name="table3.hoshiki" value={raw('hoshiki')} onChange={(e) => u('hoshiki', e.target.value)} style={{ fontSize: 11, padding: '1px 2px' }}>
          <option value="">自動（第1表の1の判定に連動）</option>
          <option value="gensoku">原則的評価方式</option>
          <option value="haito">配当還元方式</option>
        </select>
      </label>
    </span>
  );
  // ⑱が2円50銭未満で下限適用された場合、注記欄に「計算値→2円50銭」の比較を表示し、⑱欄とともに強調する
  const noteText = v18Floored && v18raw !== null
    ? `計算値 ${yenPart(v18raw)}円${senPart(v18raw)}銭\n→ 下限の2円50銭を適用`
    : 'この金額が2円50銭未満の場合は\n2円50銭とします。';
  const cells = CELLS.map((cell) => {
    if (cell.kind === 'label' && cell.text === 'この金額が2円50銭未満の場合は\n2円50銭とします。') {
      return { ...cell, text: noteText, highlightWhen: () => v18Floored };
    }
    if (cell.field === '⑱円' || cell.field === '⑱銭') {
      return { ...cell, highlightWhen: () => v18Floored };
    }
    return cell;
  });
  return <GridForm cells={cells} g={g} u={u} formId={T} width="100%" title="第３表　一般の評価会社の株式及び株式に関する権利の価額の計算明細書" toolbar={toolbar} references={REFERENCES} onJump={onJump && ((t) => onJump({ tab: t.tab as TableId, field: t.field }))} />;
}
