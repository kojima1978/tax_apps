import { GridForm, type GridCell } from '@/components/ui/GridForm';
import { calcTable4 } from '../table4/Table4Grid';
import { calcTable5 } from '../table5/Table5Grid';
import { calcTable2 } from '../table2/Table2Grid';
import { calcShareholderJudgment } from '../Table1_1Grid';
import type { TableProps } from '@/types/form';

const T = 'table6' as const;

// ── 計算の根拠（参考リンク） ──
const REFERENCES = [
  { label: '評価通達189（特定の評価会社の株式の評価）', url: 'https://www.nta.go.jp/law/tsutatsu/kihon/sisan/hyoka_new/08/05.htm#a-189' },
  { label: '評価通達187（株式の価額の修正）', url: 'https://www.nta.go.jp/law/tsutatsu/kihon/sisan/hyoka_new/08/04.htm#a-187' },
  { label: '評価通達190〜193（株式に関する権利の評価）', url: 'https://www.nta.go.jp/law/tsutatsu/kihon/sisan/hyoka_new/08/06.htm#a-190' },
];

// ── 端数処理（第6表記載要領＝第3表に準ずる） ──
const fl = (v: number) => Math.floor(v + 1e-9);                 // 円未満切捨て
const fl10sen = (v: number) => Math.floor(v * 10 + 1e-7) / 10;  // 10銭未満切捨て
const fl2sen = (v: number) => Math.floor(v * 100 + 1e-7) / 100; // 銭未満切捨て（配当期待権は円未満2位）

/** 第6表のグリッドセル（ピッカーで測定・確定したもの＋修正・権利欄にインライン入力を細分化） */
const CELLS: GridCell[] = [
  // ── 外枠・4区分 ──
  { kind: 'cell', text: '', top: 8.51, left: 8.51, width: 81.42, height: 84.63 },
  { kind: 'cell', text: '', top: 8.51, left: 8.37, width: 81.56, height: 38.65 },
  { kind: 'cell', text: '', top: 46.97, left: 8.37, width: 81.42, height: 28.43 },
  { kind: 'cell', text: '', top: 75.21, left: 8.37, width: 61.1, height: 18.02 },
  { kind: 'cell', text: '', top: 75.31, left: 69.33, width: 20.59, height: 17.83 },
  // ── 1. 純資産価額方式等による価額 ──
  { kind: 'label', text: '１ 　 純 資 産 価 額 方 式 等 に よ る 価 額', top: 8.42, left: 8.37, width: 3.68, height: 38.75 },
  { kind: 'label', text: '１ 株 当 た り の 価 額 の 計 算 の 基 と な る 金 額', top: 8.51, left: 11.64, width: 10.37, height: 8.29 },
  { kind: 'label', text: '類似業種比準価額\n（第４表の㉖、㉗又は㉘の金額）', top: 8.51, left: 21.87, width: 23.87, height: 3.86 },
  { kind: 'label', text: '１株当たりの純資産価額\n（第５表の⑪の金額）', top: 8.51, left: 45.6, width: 23.87, height: 3.86 },
  { kind: 'label', text: '１株当たりの純資産価額の80％相当額\n（第５表の⑫の記載がある場合のその金額）', top: 8.51, left: 69.2, width: 20.73, height: 3.86 },
  { field: '①', kind: 'input', readOnly: true, cornerLabel: '①', topRightLabel: '円', top: 12.18, left: 21.87, width: 23.87, height: 4.63 },
  { field: '②', kind: 'input', readOnly: true, cornerLabel: '②', topRightLabel: '円', top: 12.18, left: 45.47, width: 24, height: 4.63 },
  { field: '③', kind: 'input', readOnly: true, cornerLabel: '③', topRightLabel: '円', top: 12.27, left: 69.2, width: 20.73, height: 4.63 },
  { kind: 'label', text: '１ 株 当 た り の 価 額 の 計算', top: 16.71, left: 11.64, width: 3.62, height: 18.6 },
  { kind: 'label', text: '株 式 の 区 分', top: 16.71, left: 15.05, width: 13.77, height: 2.22 },
  { kind: 'label', text: '１ 株 当 た り の 価 額 の 算 定 方 法 等', top: 16.61, left: 28.69, width: 40.78, height: 2.41 },
  { kind: 'label', text: '１ 株 当 た り の 価 額', top: 16.71, left: 69.33, width: 20.46, height: 2.31 },
  { kind: 'label', text: '比準要素数１の会社\nの株式', top: 18.83, left: 15.05, width: 13.77, height: 4.53 },
  { kind: 'label', text: '次のうちいずれか低い方の金額\n　イ　②の金額（③の金額があるときは③の金額）\n　ロ　（ ①の金額 × 0.25 ）＋（ イの金額 × 0.75 ）', top: 18.83, left: 28.55, width: 40.92, height: 4.63, align: 'left', fontSize: 6.5 },
  { field: '④', kind: 'input', readOnly: true, cornerLabel: '④', topRightLabel: '円', top: 18.92, left: 69.33, width: 20.59, height: 4.63 },
  { kind: 'label', text: '株式等保有特定会社\nの株式', top: 23.26, left: 15.05, width: 13.77, height: 3.17 },
  { kind: 'label', text: '（第８表の㉗の金額）', top: 23.26, left: 28.69, width: 40.78, height: 3.18 },
  { field: '⑤', kind: 'input', readOnly: true, cornerLabel: '⑤', topRightLabel: '円', top: 23.26, left: 69.33, width: 20.46, height: 3.18 },
  { kind: 'label', text: '土地保有特定会社\nの株式', top: 26.34, left: 15.05, width: 13.77, height: 3.08 },
  { kind: 'label', text: '（②の金額（③の金額があるときはその金額））', top: 26.25, left: 28.69, width: 40.78, height: 3.18, fontSize: 6.5 },
  { field: '⑥', kind: 'input', readOnly: true, cornerLabel: '⑥', topRightLabel: '円', top: 26.34, left: 69.33, width: 20.46, height: 2.99 },
  { kind: 'label', text: '開業後３年未満の\n会社等の株式', top: 29.24, left: 15.05, width: 13.91, height: 3.18 },
  { kind: 'label', text: '（②の金額（③の金額があるときはその金額））', top: 29.24, left: 28.55, width: 40.92, height: 3.18, fontSize: 6.5 },
  { field: '⑦', kind: 'input', readOnly: true, cornerLabel: '⑦', topRightLabel: '円', top: 29.24, left: 69.33, width: 20.46, height: 3.08 },
  { kind: 'label', text: '開業前又は休業中の\n会社の株式', top: 32.32, left: 15.05, width: 13.77, height: 2.99 },
  { kind: 'label', text: '（②の金額）', top: 32.22, left: 28.55, width: 40.92, height: 3.08 },
  { field: '⑧', kind: 'input', readOnly: true, cornerLabel: '⑧', topRightLabel: '円', top: 32.22, left: 69.33, width: 20.46, height: 3.08 },
  // 株式の価額の修正
  { kind: 'label', text: '株 式 の 価 額 の 修 正', top: 35.12, left: 11.78, width: 3.41, height: 11.95 },
  { kind: 'label', text: '課税時期において\n配当期待権の発生\nしている場合', top: 35.12, left: 15.05, width: 13.77, height: 6.07 },
  // ⑨＝株式の価額（④〜⑧のうち第2表判定該当）－1株当たりの配当金額
  {
    kind: 'input',
    subtractionAmountExpression: {
      leftLabelLines: ['株式の価額', '（④、⑤、⑥、⑦又は⑧の金額）'],
      leftValueField: 'mod9_base',
      rightLabelLines: ['1株当たりの', '配当金額'],
      rightYenField: 'mod9_div',
      rightSenField: 'mod9_div_sen',
    },
    top: 35.21,
    left: 28.69,
    width: 40.51,
    height: 6.07,
  },
  { kind: 'label', text: '修正後の株式の価額', top: 35.21, left: 69.2, width: 20.73, height: 2.41 },
  { field: '⑨', kind: 'input', readOnly: true, cornerLabel: '⑨', topRightLabel: '円', top: 37.33, left: 69.2, width: 20.73, height: 3.95 },
  { kind: 'label', text: '課税時期において\n株式の割当てを受ける権利、\n株式となる権利\nまたは\n株式無償交付期待権\nの発生している場合', top: 41.09, left: 15.05, width: 13.77, height: 6.07, fontSize: 6 },
  // ⑩＝(⑨(なければ株式の価額)＋割当株式1株当たりの払込金額×割当株式数)÷(1＋割当・交付株式数)
  {
    kind: 'input',
    allocationAdjustmentExpression: {
      baseLabelLines: ['株式の価額', '（④〜⑧', '（⑨があるときは⑨）の金額）'],
      baseValueField: 'mod10_base',
      paymentLabelLines: ['割当株式1株当たりの', '払込金額'],
      paymentField: 'mod10_pay',
      allocationLabelLines: ['1株当たりの', '割当株式数'],
      allocationField: 'mod10_ratio',
      issuedLabelLines: ['1株当たりの', '割当株式数又は交付株式数'],
      issuedField: 'mod10_ratio2',
    },
    top: 41.19,
    left: 28.55,
    width: 40.65,
    height: 5.88,
  },
  { kind: 'label', text: '修正後の株式の価額', top: 41.19, left: 69.2, width: 20.59, height: 2.12 },
  { field: '⑩', kind: 'input', readOnly: true, cornerLabel: '⑩', topRightLabel: '円', top: 43.21, left: 69.2, width: 20.73, height: 3.95 },
  // ── 2. 配当還元方式による価額 ──
  { kind: 'label', text: '２ 配 当 還 元 方 式 に よ る 価 額', top: 46.97, left: 8.37, width: 3.55, height: 28.43 },
  { kind: 'label', text: '１株当たりの\n資本金等の額、\n発行済株式数等', top: 47.07, left: 11.64, width: 11.59, height: 8.29 },
  { kind: 'label', text: '直前期末の\n資本金等の額', top: 47.07, left: 22.96, width: 13.77, height: 4.53 },
  { kind: 'label', text: '直前期末の\n発行済株式数', top: 47.07, left: 36.46, width: 13.77, height: 4.53 },
  { kind: 'label', text: '直前期末の\n自己株式数', top: 47.07, left: 50.1, width: 12.55, height: 4.53 },
  { kind: 'label', text: '１株当たりの資本金等の額を\n50円とした場合の発済株式数\n（⑪÷50円）', top: 46.97, left: 62.51, width: 13.64, height: 4.63 },
  { kind: 'label', text: '１株当たりの資本金等の額\n（⑪÷（⑫－⑬））', top: 47.07, left: 76.02, width: 13.77, height: 4.63 },
  { field: '⑪', kind: 'input', commaInteger: true, readOnly: true, cornerLabel: '⑪', topRightLabel: '千円', top: 51.4, left: 22.96, width: 13.77, height: 3.95 },
  { field: '⑫', kind: 'input', commaInteger: true, readOnly: true, cornerLabel: '⑫', topRightLabel: '株', top: 51.5, left: 36.6, width: 13.64, height: 3.76 },
  { field: '⑬', kind: 'input', commaInteger: true, readOnly: true, cornerLabel: '⑬', topRightLabel: '株', top: 51.5, left: 50.1, width: 12.55, height: 3.76 },
  { field: '⑭', kind: 'input', readOnly: true, cornerLabel: '⑭', topRightLabel: '株', top: 51.4, left: 62.51, width: 13.77, height: 3.95 },
  { field: '⑮', kind: 'input', readOnly: true, cornerLabel: '⑮', topRightLabel: '円', top: 51.5, left: 76.15, width: 13.64, height: 3.76 },
  { kind: 'label', text: '直 前 期 末 以 前 ２ 年 間 の 配 当 金 額', top: 55.07, left: 11.64, width: 3.55, height: 10.6 },
  { kind: 'label', text: '事 業 年 度', top: 55.16, left: 14.92, width: 8.32, height: 3.18 },
  { kind: 'label', text: '⑯年 配 当 金 額', top: 55.26, left: 22.96, width: 15.96, height: 3.08 },
  { kind: 'label', text: '⑰ 左 の う ち 非 経 常 的 な配 当 金 額', top: 55.16, left: 38.78, width: 17.18, height: 3.18 },
  { kind: 'label', text: '⑱差引経常的な年配当金額\n（ ⑯ － ⑰ ）', top: 55.16, left: 55.83, width: 17.05, height: 3.08 },
  { kind: 'label', text: '年 平 均 配 当 金 額', top: 55.26, left: 72.74, width: 17.05, height: 2.99 },
  { kind: 'label', text: '直 前 期', top: 58.15, left: 14.92, width: 8.32, height: 3.86 },
  { field: 'f61', kind: 'input', commaInteger: true, readOnly: true, topRightLabel: '千円', top: 58.25, left: 22.96, width: 15.96, height: 3.66 },
  { field: 'f62', kind: 'input', commaInteger: true, readOnly: true, topRightLabel: '千円', top: 58.15, left: 38.78, width: 17.05, height: 3.95 },
  { field: '㋑', kind: 'input', readOnly: true, cornerLabel: '㋑', topRightLabel: '千円', top: 58.15, left: 55.69, width: 17.05, height: 3.86 },
  { field: '⑲', kind: 'input', readOnly: true, cornerLabel: '⑲(㋑＋㋺)÷2', topRightLabel: '千円', top: 58.05, left: 72.74, width: 17.18, height: 7.61 },
  { kind: 'label', text: '直 前 々 期', top: 61.81, left: 15.05, width: 8.05, height: 3.86 },
  { field: 'f66', kind: 'input', commaInteger: true, readOnly: true, topRightLabel: '千円', top: 61.81, left: 22.96, width: 15.96, height: 3.86 },
  { field: 'f67', kind: 'input', commaInteger: true, readOnly: true, topRightLabel: '千円', top: 62.01, left: 38.78, width: 17.05, height: 3.66 },
  { field: '㋺', kind: 'input', readOnly: true, cornerLabel: '㋺', topRightLabel: '千円', top: 62.01, left: 55.69, width: 17.18, height: 3.66 },
  { kind: 'label', text: '１株(50円)当たりの\n年配当金額', top: 65.57, left: 11.64, width: 11.59, height: 3.86, fontSize: 6.5 },
  { kind: 'label', text: '年平均配当金額（⑲の金額）÷⑭の株式数＝', stackedDivisionExpression: { dividendLines: ['年平均配当金額', '（⑲の金額）'], divisor: '⑭の株式数', suffix: '＝' }, top: 65.57, left: 22.96, width: 32.73, height: 3.76, fontSize: 6.5 },
  { field: '⑳円', kind: 'input', readOnly: true, cornerLabel: '⑳', topRightLabel: '円', top: 65.48, left: 55.69, width: 9.41, height: 3.86 },
  { field: '⑳銭', kind: 'input', readOnly: true, topRightLabel: '銭', top: 65.48, left: 64.97, width: 7.77, height: 3.86 },
  { kind: 'label', text: 'この金額が2円50銭未満の場合は\n2円50銭とします。', align: 'left', top: 65.57, left: 72.74, width: 17.18, height: 3.76, fontSize: 6 },
  { kind: 'label', text: '配 当 還 元 価 額', top: 69.33, left: 11.64, width: 11.59, height: 5.98 },
  { kind: 'label', text: '⑳の金額÷10%×⑮の金額÷50円＝', fractionProductExpression: { left: { numerator: '⑳の金額', denominator: '10%', valueField: '⑳' }, right: { numerator: '⑮の金額', denominator: '50円', valueField: '⑮' }, suffix: '＝' }, top: 69.33, left: 22.96, width: 33.37, height: 5.98 },
  { field: '㉑', kind: 'input', readOnly: true, cornerLabel: '㉑', topRightLabel: '円', top: 69.24, left: 56.33, width: 16.41, height: 6.07 },
  { field: '㉒', kind: 'input', readOnly: true, cornerLabel: '㉒', topRightLabel: '円', bottomLabel: '（㉑が純資産価額方式等による価額を超える場合はその価格）', top: 69.24, left: 72.74, width: 17.18, height: 6.07 },
  // ── 3. 株式に関する権利の価額 ──
  { kind: 'label', text: '３ 株 式 に 関 す る 権 利 の 価 額 （１及び２に共通）', top: 75.21, left: 8.51, width: 3.55, height: 18.12 },
  { kind: 'label', text: '配 当 期 待 権', ariaLabel: '配当期待権を選択', toggleField: 'right_haito', highlightWhen: (g) => g('right_haito') === '1', top: 75.21, left: 11.64, width: 15, height: 4.62 },
  // ㉓＝予想配当金額－源泉所得税相当額（円未満2位＝銭まで）
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
    top: 75.31,
    left: 26.37,
    width: 29.32,
    height: 4.53,
  },
  { field: '㉓', kind: 'input', readOnly: true, cornerLabel: '㉓', topRightLabel: '円', top: 75.31, left: 55.69, width: 9.41, height: 4.53 },
  { field: 'f82', kind: 'input', readOnly: true, topRightLabel: '銭', top: 75.21, left: 64.97, width: 4.5, height: 4.63 },
  { kind: 'label', text: '株式の割当てを受ける権利\n(割当株式１株当たりの価額)', ariaLabel: '割当てを受ける権利を選択', toggleField: 'right_wariate', highlightWhen: (g) => g('right_wariate') === '1', top: 79.74, left: 11.78, width: 14.87, height: 4.53 },
  // ㉔＝⑩(配当還元方式の場合は㉒)の金額－割当株式1株当たりの払込金額
  {
    kind: 'input',
    subtractionAmountExpression: {
      leftLabelLines: ['⑩（配当還元方式の場合は㉒）の金額'],
      leftValueField: 'r24_base',
      rightLabelLines: ['割当株式１株当たりの払込金額'],
      rightYenField: 'r24_pay',
      underlineRight: false,
      leftLabelNoWrap: true,
      rightLabelNoWrap: true,
    },
    top: 79.74,
    left: 26.37,
    width: 29.32,
    height: 4.53,
  },
  { field: '㉔', kind: 'input', readOnly: true, cornerLabel: '㉔', topRightLabel: '円', top: 79.64, left: 55.69, width: 13.77, height: 4.53 },
  { kind: 'label', text: '株主となる権利\n(割当株式１株当たりの価額)', ariaLabel: '株主となる権利を選択', toggleField: 'right_kabunushi', highlightWhen: (g) => g('right_kabunushi') === '1', top: 84.17, left: 11.78, width: 14.87, height: 4.43 },
  // ㉕＝⑩(配当還元方式の場合は㉒)の金額
  { kind: 'label', text: '⑩（配当還元方式の場合は㉒）の金額\n（課税時期後に払い込むべき金額があるときは、\nその金額を控除した金額）', align: 'left', top: 84.08, left: 26.37, width: 29.32, height: 4.63, fontSize: 6 },
  { field: '㉕', kind: 'input', readOnly: true, cornerLabel: '㉕', topRightLabel: '円', top: 84.08, left: 55.69, width: 13.77, height: 4.63 },
  { kind: 'label', text: '株式無償交付期待権\n(交付される株式１株当たりの価額)', ariaLabel: '無償交付期待権を選択', toggleField: 'right_musho', highlightWhen: (g) => g('right_musho') === '1', top: 88.42, left: 11.64, width: 15, height: 4.72 },
  { kind: 'label', text: '⑩（配当還元方式の場合は㉒）の金額', align: 'left', top: 88.51, left: 26.37, width: 29.6, height: 4.63 },
  { field: '㉖', kind: 'input', readOnly: true, cornerLabel: '㉖', topRightLabel: '円', top: 88.51, left: 55.83, width: 13.64, height: 4.63 },
  // ── 4. 株式及び株式に関する権利の価額 ──
  { kind: 'label', text: '４．株式及び株式に関する権利の価額（１．及び２．に共通）', top: 75.31, left: 69.2, width: 20.73, height: 4.43 },
  { kind: 'label', text: '株式の評価額', top: 79.55, left: 69.33, width: 8.05, height: 6.07 },
  { field: 'f94', kind: 'input', readOnly: true, topRightLabel: '円', top: 79.64, left: 77.11, width: 12.82, height: 6.07 },
  { kind: 'label', text: '株式に関する権利の評価額', top: 85.62, left: 69.33, width: 8.05, height: 7.62 },
  { field: 'f96', kind: 'input', readOnly: true, multiline: true, fontSize: 7.5, top: 85.52, left: 77.11, width: 12.82, height: 7.71 },
];

/** 第6表（CSSグリッド方式・完成版） */
export function Table6Grid({ getField, updateField }: TableProps) {
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

  // 転記元（第4表・第5表・第2表判定・第8表・第1表の1）
  const t4 = calcTable4(getField);
  const t5 = calcTable5(getField);
  const t2 = calcTable2(getField);
  const judge = calcShareholderJudgment(getField);

  // 1. 純資産価額方式等による価額
  const v1 = t4.v28 ?? t4.v27 ?? t4.v26;  // ①=第4表の㉖、㉗又は㉘（修正後があればそれ）
  const v2 = t5['⑪'] ?? null;             // ②=第5表の⑪
  const v3 = t5['⑫'] ?? null;             // ③=第5表の⑫
  // ④ 比準要素数1の会社の株式: いずれか低い方 イ=③(なければ②), ロ=①×0.25＋イ×0.75
  const iValue = v3 ?? v2;
  const p4 = iValue === null ? null : v1 === null ? fl(iValue) : fl(Math.min(iValue, v1 * 0.25 + iValue * 0.75));
  // ⑤ 株式等保有特定会社の株式 = 第8表㉗（第8表は手入力／転記）
  const p5 = numOf(getField('table8', '㉗'));
  // ⑥ 土地保有特定会社の株式 = ③(なければ②)
  const p6 = iValue === null ? null : fl(iValue);
  // ⑦ 開業後3年未満の会社等の株式 = ③(なければ②)
  const p7 = iValue === null ? null : fl(iValue);
  // ⑧ 開業前又は休業中の会社の株式 = ②
  const p8 = v2 === null ? null : fl(v2);
  // 第2表の判定結果に応じて適用する株式の価額（④〜⑧）を選択
  const baseByResult: Record<number, number | null> = { 1: p4, 2: p5, 3: p6, 4: p7, 5: p8 };
  const base = baseByResult[t2.result] ?? null;

  // 株式の価額の修正（⑨＝base－配当金額、⑩＝(⑨(なければbase)＋払込×割当)÷(1＋割当・交付)）
  const mod9Div = amountWithSen('mod9_div', 'mod9_div_sen');
  const v9 = base !== null && mod9Div !== null ? fl(base - mod9Div) : null;
  const mod10Pay = num('mod10_pay'), mod10Ratio = num('mod10_ratio'), mod10Ratio2 = num('mod10_ratio2');
  const base10 = v9 ?? base;
  const v10 = base10 !== null && mod10Ratio2 !== null ? fl((base10 + (mod10Pay ?? 0) * (mod10Ratio ?? 0)) / (1 + mod10Ratio2)) : null;
  const jun = v10 ?? v9 ?? base; // 純資産価額方式等の最終価額

  // 2. 配当還元方式（⑪⑫⑬は第4表①②③を初期表示・手入力で上書き可）
  const effStr = (own: string, fb: string) => (raw(own).trim() !== '' ? raw(own) : getField('table4', fb));
  const cap = numOf(effStr('⑪', '①'));
  const issued = numOf(effStr('⑫', '②'));
  const treasury = numOf(effStr('⑬', '③'));
  const v14 = cap !== null ? fl(cap * 20) : null; // ⑭=⑪×1000÷50
  // ⑮: 円未満切捨て。0となる場合は(⑫－⑬)の桁数の小数（記載要領3⑴）
  const sharesNet = issued !== null ? issued - (treasury ?? 0) : null;
  let v15: number | null = null;
  let v15disp = '';
  if (cap !== null && sharesNet !== null && sharesNet > 0) {
    const v = (cap * 1000) / sharesNet;
    if (fl(v) > 0) {
      v15 = fl(v);
      v15disp = v15.toLocaleString('ja-JP');
    } else {
      const m = Math.pow(10, String(Math.floor(sharesNet)).length);
      v15 = Math.floor(v * m + 1e-9) / m;
      v15disp = String(v15);
    }
  }
  const sub = (a: string, b: string) => { const x = num(a); return x === null ? null : x - (num(b) ?? 0); };
  const ia = sub('f61', 'f62');  // ㋑=⑯－⑰（直前期）
  const ro = sub('f66', 'f67');  // ㋺（直前々期）
  const v19 = ia !== null && ro !== null ? (ia + ro) / 2 : null; // ⑲年平均配当金額
  // ⑳=⑲÷⑭（10銭未満切捨て、2円50銭未満は2円50銭）
  const v20 = v19 !== null && v14 !== null && v14 > 0 ? Math.max(2.5, fl10sen((v19 * 1000) / v14)) : null;
  const v21 = v20 !== null && v15 !== null ? fl((v20 * v15) / 5) : null; // ㉑=⑳÷10%×⑮÷50円
  const v22 = v21 === null ? null : jun !== null && v21 > jun ? jun : v21; // ㉒

  // 適用方式（自動=第1表の1の株主判定に連動、toolbarで手動切替可）
  const mode = raw('hoshiki');
  const useHaito = mode === 'haito' ? true : mode === 'junshisan' ? false : judge.isDozokuFinal === null ? null : !judge.isDozokuFinal;
  const finalPrice = useHaito === null ? null : useHaito ? v22 ?? v21 : jun; // f94 株式の評価額

  // 3. 株式に関する権利の価額
  const expDiv = amountWithSen('exp_div', 'exp_div_sen');
  const expTax = amountWithSen('exp_tax', 'exp_tax_sen');
  const v23 = expDiv !== null ? fl2sen(expDiv - (expTax ?? 0)) : null; // ㉓配当期待権（円未満2位）
  const baseRight = useHaito === null ? null : useHaito ? v22 ?? v21 : jun; // ⑩(配当還元の場合は㉒)
  const v24 = baseRight !== null ? fl(baseRight - (num('r24_pay') ?? 0)) : null; // ㉔
  const v25 = baseRight === null ? null : fl(baseRight); // ㉕
  const v26 = baseRight; // ㉖

  // 4. 株式に関する権利の評価額: 発生している権利（チェック指定）の金額をそれぞれ別に記載（記載要領5＝第3表5に準ずる）
  const RIGHTS = [
    { key: 'right_haito', label: '配当期待権', mark: '㉓', text: v23 === null ? null : `㉓ ${fl(v23).toLocaleString('ja-JP')}円${String(Math.round((v23 - fl(v23)) * 100)).padStart(2, '0')}銭` },
    { key: 'right_wariate', label: '割当てを受ける権利', mark: '㉔', text: v24 === null ? null : `㉔ ${v24.toLocaleString('ja-JP')}円` },
    { key: 'right_kabunushi', label: '株主となる権利', mark: '㉕', text: v25 === null ? null : `㉕ ${v25.toLocaleString('ja-JP')}円` },
    { key: 'right_musho', label: '無償交付期待権', mark: '㉖', text: v26 === null ? null : `㉖ ${v26.toLocaleString('ja-JP')}円` },
  ];
  const rightsText = RIGHTS.filter((r) => raw(r.key) === '1').map((r) => r.text ?? `${r.mark} －`).join('\n');

  const g = (f: string): string => {
    switch (f) {
      case '①': return fmt(v1);
      case '②': return fmt(v2);
      case '③': return fmt(v3);
      case '④': return fmt(p4);
      case '⑤': return getField('table8', '㉗');
      case '⑥': return fmt(p6);
      case '⑦': return fmt(p7);
      case '⑧': return fmt(p8);
      case 'mod9_base': return fmt(base);
      case 'mod9_div': return yenPart(num('mod9_div'));
      case 'mod9_div_sen': return raw('mod9_div_sen').trim() !== '' ? raw('mod9_div_sen') : senPart(num('mod9_div'));
      case '⑨': return fmt(v9);
      case 'mod10_base': return fmt(base10);
      case '⑩': return fmt(v10);
      case '⑪': return raw('⑪').trim() !== '' ? raw('⑪') : getField('table4', '①');
      case '⑫': return raw('⑫').trim() !== '' ? raw('⑫') : getField('table4', '②');
      case '⑬': return raw('⑬').trim() !== '' ? raw('⑬') : getField('table4', '③');
      case '⑭': return fmt(v14);
      case '⑮': return v15disp;
      case '㋑': return fmtDec1(ia);
      case '㋺': return fmtDec1(ro);
      case '⑲': return fmtDec1(v19);
      case '⑳': return v20 === null ? '' : `${fl(v20)}円${senPart(v20)}銭`;
      case '⑳円': return yenPart(v20);
      case '⑳銭': return senPart(v20);
      case '㉑': return fmt(v21);
      case '㉒': return fmt(v22);
      case 'exp_div': return yenPart(num('exp_div'));
      case 'exp_div_sen': return raw('exp_div_sen').trim() !== '' ? raw('exp_div_sen') : senPart(num('exp_div'));
      case 'exp_tax': return yenPart(num('exp_tax'));
      case 'exp_tax_sen': return raw('exp_tax_sen').trim() !== '' ? raw('exp_tax_sen') : senPart(num('exp_tax'));
      case '㉓': return yenPart(v23); case 'f82': return senPart(v23);
      case 'r24_base': return fmt(baseRight);
      case '㉔': return fmt(v24);
      case '㉕': return fmt(v25);
      case '㉖': return fmt(v26);
      case 'f94': return finalPrice === null ? '' : fmt(finalPrice);
      case 'f96': return rightsText;
      default: return raw(f);
    }
  };

  const toolbar = (
    <span className="no-print" style={{ display: 'flex', alignItems: 'center', fontSize: 11, whiteSpace: 'nowrap' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        適用方式：
        <select id="table6-hoshiki-toolbar" name="table6.hoshiki" value={raw('hoshiki')} onChange={(e) => u('hoshiki', e.target.value)} style={{ fontSize: 11, padding: '1px 2px' }}>
          <option value="">自動（第1表の1の判定に連動）</option>
          <option value="junshisan">純資産価額方式等</option>
          <option value="haito">配当還元方式</option>
        </select>
      </label>
    </span>
  );
  return <GridForm cells={CELLS} g={g} u={u} formId={T} width="100%" title="第６表　特定の評価会社の株式及び株式に関する権利の価額の計算明細書" toolbar={toolbar} references={REFERENCES} />;
}
