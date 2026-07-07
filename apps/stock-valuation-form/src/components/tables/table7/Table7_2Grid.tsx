import { GridForm, type GridCell } from '@/components/ui/GridForm';
import { calcTable4 } from '../table4/Table4Grid';
import { calcTable7 } from './Table7Grid';
import type { TableId, TableProps } from '@/types/form';

// ══ 第7表の2（令和8年4月1日以降用）══
// 旧第7表の後半（S1の類似業種比準価額の計算＝⑱〜㉚）。第4表の2と同レイアウトだが評価会社行は
// ⑤⑧⑰（第7表の1のⒷ-ⓑ/Ⓒ-ⓒ/Ⓓ-ⓓ）。値・第4表連動は calcTable7 を再利用。データは 'table7' 共通。

const T = 'table7' as const;
const fl = (v: number) => Math.floor(v + 1e-9);

const REFERENCES = [
  { label: '評価通達189-3（株式等保有特定会社のS1+S2方式）', url: 'https://www.nta.go.jp/law/tsutatsu/kihon/sisan/hyoka_new/08/05.htm#a-189' },
  { label: '評価通達180（類似業種比準価額）', url: 'https://www.nta.go.jp/law/tsutatsu/kihon/sisan/hyoka_new/08/03.htm#a-180' },
];

const minValueHighlight = (fields: string[], target: string) => (g: (field: string) => string) => {
  const values = fields.map((field) => ({ field, value: Number(g(field).replace(/,/g, '').trim()) })).filter(({ field, value }) => g(field).trim() !== '' && !isNaN(value));
  if (values.length === 0) return false;
  const min = Math.min(...values.map(({ value }) => value));
  return values.some(({ field, value }) => field === target && value === min);
};

interface BlockCfg {
  months: [string, string, string];
  prices: [string, string, string, string, string];
  aMark: string; aField: string; aCode: string;
  ev5: string; ev5sen: string; ev8: string; ev17: string; // 評価会社 ⑤(円/銭)/⑧/⑰
  ev5Code: string; ev8Code: string; ev17Code: string;
  sB1: string; sB2: string; sC: string; sD: string;
  sbCode: string; scCode: string; sdCode: string;
  eB: string; eC: string; eD: string;
  ratioField: string; ratioCode: string;
  priceField: string; priceSen: string; priceCode: string;
  shinField: string; sizeField: string;
  gyoField: string; gyoCode: string;
  aHighlight: string[];
}

/** S1類似業種比準価額の1ブロック（株価＋比準割合）。d=縦オフセット% */
function simBlock(d: number, cfg: BlockCfg): GridCell[] {
  const t = (v: number) => +(v + d).toFixed(2);
  const price = (field: string, left: number, w: number) => ({ field, kind: 'input' as const, readOnly: true, commaInteger: true, cornerLabel: field, highlightWhen: minValueHighlight(cfg.aHighlight, field), top: t(19.0), left, width: w, height: 2.57, align: 'right' as const });
  return [
    { kind: 'label', text: '類 似 業 種', top: t(14.47), left: 13.86, width: 12.2, height: 2.62 },
    { field: cfg.gyoField, kind: 'input', top: t(14.47), left: 26.06, width: 34.19, height: 2.62, align: 'left' },
    { kind: 'label', text: '業種目番号', top: t(14.47), left: 60.25, width: 13.3, height: 2.62 },
    { kind: 'cell', codeLabel: cfg.gyoCode, top: t(14.47), left: 73.55, width: 2.0, height: 2.62 },
    { field: `${cfg.gyoField}num`, kind: 'input', top: t(14.47), left: 75.55, width: 16.88, height: 2.62, align: 'left' },
    { kind: 'label', text: '類 似 業 種 の 株 価', top: t(17.09), left: 13.86, width: 79.57, height: 1.91 },
    { kind: 'label', text: '課税時期の\n属する月', fontSize: 6.5, top: t(19.0), left: 13.86, width: 12.2, height: 2.57 },
    { kind: 'label', text: '課税時期の属する\n月の前月', fontSize: 6.5, top: t(19.0), left: 26.06, width: 11.4, height: 2.57 },
    { kind: 'label', text: '課税時期の属する\n月の前々月', fontSize: 6.5, top: t(19.0), left: 37.46, width: 12.9, height: 2.57 },
    { kind: 'label', text: '前年平均株価', fontSize: 6.5, top: t(19.0), left: 50.36, width: 11.55, height: 5.19 },
    { kind: 'label', text: '課税時期の属する\n月以前２年間の\n平均株価', fontSize: 6.5, top: t(19.0), left: 61.91, width: 11.4, height: 5.19 },
    { kind: 'label', text: `Ａ\n（${cfg.prices.join('、')}のうち\n最も低いもの）`, fontSize: 6, top: t(19.0), left: 73.31, width: 19.12, height: 5.19 },
    { field: cfg.months[0], kind: 'input', readOnly: true, topRightLabel: '月', top: t(19.0), left: 13.86, width: 12.2, height: 2.57 },
    { field: cfg.months[1], kind: 'input', readOnly: true, topRightLabel: '月', top: t(19.0), left: 26.06, width: 11.4, height: 2.57 },
    { field: cfg.months[2], kind: 'input', readOnly: true, topRightLabel: '月', top: t(19.0), left: 37.46, width: 12.9, height: 2.57 },
    // 株価（前月/前々月の月欄と株価は簡略化のため株価のみ表示）
    { ...price(cfg.prices[0], 13.86, 12.2) },
    { ...price(cfg.prices[1], 26.06, 11.4) },
    { ...price(cfg.prices[2], 37.46, 12.9) },
    { ...price(cfg.prices[3], 50.36, 11.55) },
    { ...price(cfg.prices[4], 61.91, 11.4) },
    { kind: 'label', text: cfg.aMark, top: t(24.19), left: 71.31, width: 2.0, height: 2.62 },
    { kind: 'cell', codeLabel: cfg.aCode, top: t(24.19), left: 73.31, width: 1.94, height: 2.62 },
    { field: cfg.aField, kind: 'input', readOnly: true, topRightLabel: '円', top: t(24.19), left: 75.25, width: 17.18, height: 2.62, align: 'right' },
    // 比準割合の計算
    { kind: 'label', text: '比\n準\n割\n合\nの\n計\n算', top: t(26.81), left: 12.01, width: 1.85, height: 16.52, align: 'center', fontSize: 7 },
    { kind: 'label', text: '区　分', top: t(26.81), left: 13.86, width: 5.79, height: 4.04 },
    { kind: 'label', text: '１株（50円）当たり\nの 年 配 当 金 額', fontSize: 7, top: t(26.81), left: 19.65, width: 19.1, height: 4.04 },
    { kind: 'label', text: '１株（50円）当たり\nの 年 利 益 金 額', fontSize: 7, top: t(26.81), left: 38.75, width: 17.85, height: 4.04 },
    { kind: 'label', text: '１株（50円）当たり\nの 純 資 産 価 額', fontSize: 7, top: t(26.81), left: 56.6, width: 19.31, height: 4.04 },
    { kind: 'label', text: '１株（50円）当たり\nの 比 準 価 額', fontSize: 7, top: t(26.81), left: 75.91, width: 16.52, height: 4.04 },
    // 評価会社 行（⑤⑧⑰）
    { kind: 'label', text: '評価\n会社', fontSize: 7, top: t(30.85), left: 13.86, width: 5.79, height: 2.63 },
    { kind: 'label', text: '⑤', top: t(30.85), left: 19.65, width: 2.5, height: 2.63 },
    { kind: 'cell', codeLabel: cfg.ev5Code, top: t(30.85), left: 22.15, width: 1.9, height: 2.63 },
    { field: cfg.ev5, kind: 'input', readOnly: true, top: t(30.85), left: 24.05, width: 5.8, height: 2.63, align: 'right' },
    { kind: 'label', text: '円', top: t(30.85), left: 29.85, width: 1.9, height: 2.63, fontSize: 7 },
    { field: cfg.ev5sen, kind: 'input', readOnly: true, top: t(30.85), left: 31.75, width: 4.0, height: 2.63, align: 'right' },
    { kind: 'label', text: '銭', top: t(30.85), left: 35.75, width: 3.0, height: 2.63, fontSize: 7 },
    { kind: 'label', text: '⑧', top: t(30.85), left: 38.75, width: 2.5, height: 2.63 },
    { kind: 'cell', codeLabel: cfg.ev8Code, top: t(30.85), left: 41.25, width: 1.9, height: 2.63 },
    { field: cfg.ev8, kind: 'input', readOnly: true, top: t(30.85), left: 43.15, width: 11.55, height: 2.63, align: 'right' },
    { kind: 'label', text: '円', top: t(30.85), left: 54.7, width: 1.9, height: 2.63, fontSize: 7 },
    { kind: 'label', text: '⑰', top: t(30.85), left: 56.6, width: 2.5, height: 2.63 },
    { kind: 'cell', codeLabel: cfg.ev17Code, top: t(30.85), left: 59.1, width: 1.9, height: 2.63 },
    { field: cfg.ev17, kind: 'input', readOnly: true, top: t(30.85), left: 61.0, width: 13.01, height: 2.63, align: 'right' },
    { kind: 'label', text: '円', top: t(30.85), left: 74.01, width: 1.9, height: 2.63, fontSize: 7 },
    // 類似業種 行
    { kind: 'label', text: '類似\n業種', fontSize: 7, top: t(33.48), left: 13.86, width: 5.79, height: 2.62 },
    { kind: 'label', text: 'B', top: t(33.48), left: 19.65, width: 2.5, height: 2.62 },
    { kind: 'cell', codeLabel: cfg.sbCode, top: t(33.48), left: 22.15, width: 1.9, height: 2.62 },
    { field: cfg.sB1, kind: 'input', commaInteger: true, readOnly: true, top: t(33.48), left: 24.05, width: 5.8, height: 2.62, align: 'right' },
    { kind: 'label', text: '円', top: t(33.48), left: 29.85, width: 1.9, height: 2.62, fontSize: 7 },
    { field: cfg.sB2, kind: 'input', readOnly: true, top: t(33.48), left: 31.75, width: 4.0, height: 2.62, align: 'right' },
    { kind: 'label', text: '銭', top: t(33.48), left: 35.75, width: 3.0, height: 2.62, fontSize: 7 },
    { kind: 'label', text: 'C', top: t(33.48), left: 38.75, width: 2.5, height: 2.62 },
    { kind: 'cell', codeLabel: cfg.scCode, top: t(33.48), left: 41.25, width: 1.9, height: 2.62 },
    { field: cfg.sC, kind: 'input', commaInteger: true, readOnly: true, top: t(33.48), left: 43.15, width: 11.55, height: 2.62, align: 'right' },
    { kind: 'label', text: '円', top: t(33.48), left: 54.7, width: 1.9, height: 2.62, fontSize: 7 },
    { kind: 'label', text: 'D', top: t(33.48), left: 56.6, width: 2.5, height: 2.62 },
    { kind: 'cell', codeLabel: cfg.sdCode, top: t(33.48), left: 59.1, width: 1.9, height: 2.62 },
    { field: cfg.sD, kind: 'input', commaInteger: true, readOnly: true, top: t(33.48), left: 61.0, width: 13.01, height: 2.62, align: 'right' },
    { kind: 'label', text: '円', top: t(33.48), left: 74.01, width: 1.9, height: 2.62, fontSize: 7 },
    // 要素別比準割合 行
    { kind: 'label', text: '要素別\n比準割合', fontSize: 6.5, top: t(36.1), left: 13.86, width: 5.79, height: 2.62 },
    { kind: 'label', text: '⑤÷B', simpleFraction: { numerator: '⑤', denominator: 'B' }, fontSize: 6.5, top: t(36.1), left: 19.65, width: 2.5, height: 2.62 },
    { field: cfg.eB, kind: 'input', readOnly: true, top: t(36.1), left: 22.15, width: 16.6, height: 2.62, align: 'right' },
    { kind: 'label', text: '⑧÷C', simpleFraction: { numerator: '⑧', denominator: 'C' }, fontSize: 6.5, top: t(36.1), left: 38.75, width: 2.5, height: 2.62 },
    { field: cfg.eC, kind: 'input', readOnly: true, top: t(36.1), left: 41.25, width: 15.35, height: 2.62, align: 'right' },
    { kind: 'label', text: '⑰÷D', simpleFraction: { numerator: '⑰', denominator: 'D' }, fontSize: 6.5, top: t(36.1), left: 56.6, width: 2.5, height: 2.62 },
    { field: cfg.eD, kind: 'input', readOnly: true, top: t(36.1), left: 59.1, width: 14.91, height: 2.62, align: 'right' },
    // 比準割合 行
    { kind: 'label', text: '比 準\n割 合', fontSize: 7, top: t(39.6), left: 13.86, width: 5.79, height: 3.73 },
    { kind: 'label', text: '（⑤÷B＋⑧÷C＋⑰÷D）÷３', fractionExpression: { terms: [{ numerator: '⑤', denominator: 'B' }, { numerator: '⑧', denominator: 'C' }, { numerator: '⑰', denominator: 'D' }], denominator: '3' }, top: t(39.6), left: 19.65, width: 31.19, height: 3.73 },
    { kind: 'label', text: cfg.ratioField, top: t(39.6), left: 50.84, width: 2.0, height: 3.73 },
    { kind: 'cell', codeLabel: cfg.ratioCode, top: t(39.6), left: 52.84, width: 1.9, height: 3.73 },
    { field: cfg.ratioField, kind: 'input', readOnly: true, top: t(39.6), left: 54.74, width: 21.17, height: 3.73, align: 'right' },
    // 比準価額 ⑳/㉓
    { kind: 'label', text: `${cfg.aMark} × ${cfg.ratioField} × ___\n中会社は0.6\n小会社は0.5\nとします。`, companyRateExpression: { a: cfg.aMark, ratio: cfg.ratioField, rateField: cfg.shinField, sizeField: cfg.sizeField }, top: t(30.85), left: 75.91, width: 16.52, height: 8.75 },
    { kind: 'label', text: cfg.priceField, top: t(39.6), left: 75.91, width: 2.0, height: 3.73 },
    { kind: 'cell', codeLabel: cfg.priceCode, top: t(39.6), left: 77.91, width: 1.9, height: 3.73 },
    { field: cfg.priceField, kind: 'input', readOnly: true, top: t(39.6), left: 79.81, width: 5.75, height: 3.73, align: 'right' },
    { kind: 'label', text: '円', top: t(39.6), left: 85.56, width: 1.9, height: 3.73, fontSize: 7 },
    { field: cfg.priceSen, kind: 'input', readOnly: true, top: t(39.6), left: 87.46, width: 3.0, height: 3.73, align: 'right' },
    { kind: 'label', text: '銭', top: t(39.6), left: 90.46, width: 1.97, height: 3.73, fontSize: 7 },
  ];
}

const BLOCK1: BlockCfg = {
  months: ['f66', 'f68', 'f70'], prices: ['㊁', '㋭', '㋬', '㋣', '㋠'],
  aMark: '⑱', aField: '⑱', aCode: 'G02', ev5: 'f103', ev5sen: 'f104', ev8: 'f106', ev17: 'f108',
  ev5Code: 'J01', ev8Code: 'G03', ev17Code: 'G05', sB1: 'f110', sB2: 'f111', sC: 'f113', sD: 'f115',
  sbCode: 'J02', scCode: 'G04', sdCode: 'G06', eB: 'f117', eC: 'f119', eD: 'f121',
  ratioField: '⑲', ratioCode: 'C01', priceField: '⑳', priceSen: 'f125', priceCode: 'J03',
  shinField: 'r1shin', sizeField: 'r1size', gyoField: 'f61', gyoCode: 'G01', aHighlight: ['㊁', '㋭', '㋬', '㋣', '㋠'],
};
const BLOCK2: BlockCfg = {
  months: ['b2_f66', 'b2_f68', 'b2_f70'], prices: ['b2_㊁', 'b2_㋭', 'b2_㋬', 'b2_㋣', 'b2_㋠'],
  aMark: '㉑', aField: '㉑', aCode: 'G08', ev5: 'b2_f103', ev5sen: 'b2_f104', ev8: 'b2_f106', ev17: 'b2_f108',
  ev5Code: 'J04', ev8Code: 'G09', ev17Code: 'G11', sB1: 'b2_f110', sB2: 'b2_f111', sC: 'b2_f113', sD: 'b2_f115',
  sbCode: 'J05', scCode: 'G10', sdCode: 'G12', eB: 'b2_f117', eC: 'b2_f119', eD: 'b2_f121',
  ratioField: '㉒', ratioCode: 'C02', priceField: '㉓', priceSen: 'b2_f125', priceCode: 'J06',
  shinField: 'r2shin', sizeField: 'r2size', gyoField: 'b2_f61', gyoCode: 'G07', aHighlight: ['b2_㊁', 'b2_㋭', 'b2_㋬', 'b2_㋣', 'b2_㋠'],
};

// 第4表の類似業種株価・B/C/D・月へ連動（readonly＋ジャンプ）
const TABLE4_LINKED: Record<string, string> = {
  f61: 'h5', f66: 'h8', f68: 'h11', f70: 'h13', '㊁': '㋷', '㋭': '㋦', '㋬': '㋸', '㋣': '㋾', '㋠': '㋻',
  f110: 'r1sB1', f111: 'r1sB2', f113: 'r1sC', f115: 'r1sD',
  b2_f61: 'h58', b2_f66: 'h61', b2_f68: 'h64', b2_f70: 'h67', 'b2_㊁': '㋕', 'b2_㋭': '㋵', 'b2_㋬': '㋟', 'b2_㋣': '㋹', 'b2_㋠': '㋞',
  b2_f110: 'r2sB1', b2_f111: 'r2sB2', b2_f113: 'r2sC', b2_f115: 'r2sD',
};

const CELLS: GridCell[] = [
  { kind: 'label', text: '会　社　名', top: 11.0, left: 59.23, width: 12.5, height: 2.62 },
  { field: 'company', kind: 'input', top: 11.0, left: 71.73, width: 20.7, height: 2.62, align: 'left' },
  { kind: 'label', text: '１．S１の金額（続）', top: 14.47, left: 7.25, width: 2.5, height: 65.4, align: 'center' },
  { kind: 'label', text: '１株（50円）当たりの比準価額の計算', top: 14.47, left: 9.75, width: 2.26, height: 58.6, align: 'center' },
  ...simBlock(0, BLOCK1),
  ...simBlock(29.5, BLOCK2),
  // 1株当たりの比準価額 ㉔
  { kind: 'label', text: '１株当たりの比準価額', top: 73.79, left: 9.75, width: 15.55, height: 4.7 },
  { kind: 'label', text: '比準価額（⑳と㉓とのいずれか低い方の金額）×　第４表の１の④の金額 ÷ 50円', productFractionExpression: { prefixLines: ['比準価額', '（⑳と㉓とのいずれか', '低い方の金額）'], numerator: '第４表の１の④の金額', denominator: '50円' }, top: 73.79, left: 25.3, width: 50.61, height: 4.7 },
  { kind: 'label', text: '比準価額（円）', top: 73.79, left: 75.91, width: 16.52, height: 1.48, fontSize: 7 },
  { kind: 'label', text: '㉔', top: 75.27, left: 75.91, width: 2.0, height: 3.19 },
  { kind: 'cell', codeLabel: 'C03', top: 75.27, left: 77.91, width: 1.94, height: 3.19 },
  { field: '㉔', kind: 'input', readOnly: true, top: 75.27, left: 79.85, width: 12.58, height: 3.19, align: 'right' },
  // 比準価額の修正
  { kind: 'label', text: '比 準 価 額 の 修 正', top: 78.49, left: 9.75, width: 2.26, height: 13.48, align: 'center' },
  { kind: 'label', text: '直前期末の翌日から課税時\n期までの間に配当金交付の\n効力が発生した場合', fontSize: 6, top: 78.49, left: 12.01, width: 13.29, height: 4.5, align: 'left' },
  { kind: 'label', text: '１株当たりの配当金額', top: 78.49, left: 25.3, width: 16.8, height: 4.5, fontSize: 7 },
  { kind: 'label', text: '㉕', top: 78.49, left: 42.1, width: 1.9, height: 4.5 },
  { kind: 'cell', codeLabel: 'J07', top: 78.49, left: 44.0, width: 1.9, height: 4.5 },
  { field: 'mod_div', kind: 'input', commaInteger: true, top: 78.49, left: 45.9, width: 15.5, height: 4.5, align: 'right' },
  { kind: 'label', text: '円', top: 78.49, left: 61.4, width: 1.9, height: 4.5, fontSize: 7 },
  { field: 'mod_div_sen', kind: 'input', integerDigits: 2, top: 78.49, left: 63.3, width: 7.6, height: 4.5, align: 'right' },
  { kind: 'label', text: '銭', top: 78.49, left: 70.9, width: 1.9, height: 4.5, fontSize: 7 },
  { kind: 'label', text: '修正比準価額\n（㉔－㉕）（円）', top: 78.49, left: 75.91, width: 16.52, height: 1.6, fontSize: 6.5 },
  { kind: 'label', text: '㉖', top: 80.09, left: 75.91, width: 2.0, height: 3.7 },
  { kind: 'cell', codeLabel: 'C04', top: 80.09, left: 77.91, width: 1.94, height: 3.7 },
  { field: '㉖', kind: 'input', readOnly: true, top: 80.09, left: 79.85, width: 12.58, height: 3.7, align: 'right' },
  { kind: 'label', text: '直前期末の翌日から課税時\n期までの間に株式の割当て\n等の効力が発生した場合', fontSize: 6, top: 83.79, left: 12.01, width: 13.29, height: 8.18, align: 'left' },
  { kind: 'label', text: '割当株式１株\n当たりの払込金額', top: 83.79, left: 25.3, width: 16.8, height: 2.73, fontSize: 7 },
  { kind: 'label', text: '㉗', top: 83.79, left: 42.1, width: 1.9, height: 2.73 },
  { kind: 'cell', codeLabel: 'J08', top: 83.79, left: 44.0, width: 1.9, height: 2.73 },
  { field: 'mod_pay', kind: 'input', commaInteger: true, top: 83.79, left: 45.9, width: 15.5, height: 2.73, align: 'right' },
  { kind: 'label', text: '円', top: 83.79, left: 61.4, width: 1.9, height: 2.73, fontSize: 7 },
  { kind: 'label', text: '修正比準価額\n㉔（㉖があるときは㉖）\n＋㉗×㉘÷（１株＋㉙）（円）', top: 83.79, left: 75.91, width: 16.52, height: 8.18, fontSize: 6 },
  { kind: 'label', text: '１株当たりの割当株式数', top: 86.52, left: 25.3, width: 16.8, height: 2.71, fontSize: 7 },
  { kind: 'label', text: '㉘', top: 86.52, left: 42.1, width: 1.9, height: 2.71 },
  { kind: 'cell', codeLabel: 'C05', top: 86.52, left: 44.0, width: 1.9, height: 2.71 },
  { field: 'mod_ratio', kind: 'input', top: 86.52, left: 45.9, width: 24.7, height: 2.71, align: 'right' },
  { kind: 'label', text: '株', top: 86.52, left: 70.6, width: 2.0, height: 2.71, fontSize: 7 },
  { kind: 'label', text: '１株当たりの割当株式数\n又は交付株式数', top: 89.23, left: 25.3, width: 16.8, height: 2.74, fontSize: 7 },
  { kind: 'label', text: '㉙', top: 89.23, left: 42.1, width: 1.9, height: 2.74 },
  { kind: 'cell', codeLabel: 'C06', top: 89.23, left: 44.0, width: 1.9, height: 2.74 },
  { field: 'mod_ratio2', kind: 'input', top: 89.23, left: 45.9, width: 24.7, height: 2.74, align: 'right' },
  { kind: 'label', text: '株', top: 89.23, left: 70.6, width: 2.0, height: 2.74, fontSize: 7 },
  { kind: 'label', text: '㉚', top: 89.23, left: 75.91, width: 2.0, height: 2.74 },
  { kind: 'cell', codeLabel: 'C07', top: 89.23, left: 77.91, width: 1.94, height: 2.74 },
  { field: '㉚', kind: 'input', readOnly: true, top: 89.23, left: 79.85, width: 12.58, height: 2.74, align: 'right' },
];

/** 第7表の2（S1類似業種比準価額の計算＋修正） */
export function Table7_2Grid({ getField, updateField, onJump }: TableProps) {
  const raw = (f: string) => getField(T, f);
  const table4Raw = (f: string) => getField('table4', f);
  const u = (f: string, v: string) => updateField(T, f, v);
  const fmt = (v: number | null) => (v === null ? '' : v.toLocaleString('ja-JP'));
  const yenPart = (v: number | null) => (v === null ? '' : fl(v).toLocaleString('ja-JP'));
  const senPart = (v: number | null) => (v === null ? '' : String(Math.round((v - fl(v)) * 100)).padStart(2, '0'));

  const c = calcTable7(getField);
  void calcTable4; // calcTable7 が内部で参照

  const g = (f: string): string => {
    const linked = TABLE4_LINKED[f];
    if (linked) return table4Raw(linked);
    switch (f) {
      case '⑱': return fmt(c.A1); case '㉑': return fmt(c.A2);
      case 'f103': return yenPart(c.Bv); case 'f104': return senPart(c.Bv);
      case 'b2_f103': return yenPart(c.Bv); case 'b2_f104': return senPart(c.Bv);
      case 'f106': return fmt(c.Cv); case 'b2_f106': return fmt(c.Cv);
      case 'f108': return fmt(c.Dv); case 'b2_f108': return fmt(c.Dv);
      case 'f117': return c.e1B === null ? '' : c.e1B.toFixed(2);
      case 'f119': return c.e1C === null ? '' : c.e1C.toFixed(2);
      case 'f121': return c.e1D === null ? '' : c.e1D.toFixed(2);
      case 'b2_f117': return c.e2B === null ? '' : c.e2B.toFixed(2);
      case 'b2_f119': return c.e2C === null ? '' : c.e2C.toFixed(2);
      case 'b2_f121': return c.e2D === null ? '' : c.e2D.toFixed(2);
      case '⑲': return c.r19 === null ? '' : c.r19.toFixed(2);
      case '㉒': return c.r22 === null ? '' : c.r22.toFixed(2);
      case '⑳': return yenPart(c.p20); case 'f125': return senPart(c.p20);
      case '㉓': return yenPart(c.p23); case 'b2_f125': return senPart(c.p23);
      case 'r1shin': case 'r2shin': return c.shin === null ? '' : c.shin.toFixed(1);
      case 'r1size': case 'r2size': return c.size === 4 ? 'large' : c.size === 0 ? 'small' : c.size === null ? '' : 'medium';
      case '㉔': return fmt(c.v24); case '㉖': return fmt(c.v25); case '㉚': return fmt(c.v26);
      default: return raw(f);
    }
  };
  return <GridForm cells={CELLS} g={g} u={u} formId={T} width="100%" title="第７表の２　株式等保有特定会社の株式の価額の計算明細書（続）" references={REFERENCES} onJump={onJump && ((t) => onJump({ tab: t.tab as TableId, field: t.field }))} />;
}
