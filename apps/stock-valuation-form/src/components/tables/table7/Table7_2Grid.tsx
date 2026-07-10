import { GridForm, type GridCell } from '@/components/ui/GridForm';
import { calcTable4 } from '../table4/Table4Grid';
import { calcTable7 } from './Table7Grid';
import { extractCompanyFloatHeader } from '../companyFloatHeader';
import type { TableId, TableProps } from '@/types/form';

// ══ 第7表の2（令和8年4月1日以降用）══
// 旧第7表の後半（S1の類似業種比準価額の計算＝⑱〜㉚)。第4表の2と同レイアウトだが評価会社行は
// 「第７表の１の[⑤][⑧][⑰]」（Ⓑ-ⓑ/Ⓒ-ⓒ/Ⓓ-ⓓ）。値・第4表連動は calcTable7 を再利用。データは 'table7' 共通。
// 座標は r08-12 の罫線実測値（ブロック1/2で行高が微差のため行Y座標テーブル方式）。

const T = 'table7' as const;
const fl = (v: number) => Math.floor(v + 1e-9);

const minValueHighlight = (fields: string[], target: string) => (g: (field: string) => string) => {
  const values = fields.map((field) => ({ field, value: Number(g(field).replace(/,/g, '').trim()) })).filter(({ field, value }) => g(field).trim() !== '' && !isNaN(value));
  if (values.length === 0) return false;
  const min = Math.min(...values.map(({ value }) => value));
  return values.some(({ field, value }) => field === target && value === min);
};

interface BlockCfg {
  months: [string, string, string];
  prices: [string, string, string, string, string];
  priceMarks: [string, string, string, string, string]; // 表示記号（フィールド名の b2_ 接頭辞を含まない）
  aMark: string; aField: string; aCode: string;
  ev5: string; ev5sen: string; ev8: string; ev17: string; // 評価会社 [⑤](円/銭)/[⑧]/[⑰]
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

// 各ブロックの行Y座標（%）。gyo=類似業種行 / kabuHead=株価ヘッダー / colHead=列見出し / month=月行 /
// price=株価行 / kubun=区分見出し / hyoka=評価会社行 / ruiji=類似業種行 / yoso=要素別 / hikaku=比準割合 / end=下端
interface BlockYs { gyo: number; kabuHead: number; colHead: number; month: number; price: number; kubun: number; hyoka: number; ruiji: number; yoso: number; hikaku: number; end: number; }
const YS1: BlockYs = { gyo: 14.47, kabuHead: 17.09, colHead: 19.0, month: 21.57, price: 24.19, kubun: 26.81, hyoka: 30.85, ruiji: 33.48, yoso: 36.1, hikaku: 39.6, end: 43.33 };
const YS2: BlockYs = { gyo: 43.33, kabuHead: 45.95, colHead: 47.86, month: 50.4, price: 53.02, kubun: 55.67, hyoka: 59.72, ruiji: 62.34, yoso: 64.96, hikaku: 67.98, end: 71.71 };

/** S1類似業種比準価額の1ブロック（株価＋比準割合） */
function simBlock(y: BlockYs, cfg: BlockCfg): GridCell[] {
  const h = (a: number, b: number) => +(b - a).toFixed(2);
  const price = (idx: number, left: number, w: number): GridCell => ({ field: cfg.prices[idx], kind: 'input', readOnly: true, commaInteger: true, cornerLabel: cfg.priceMarks[idx], highlightWhen: minValueHighlight(cfg.aHighlight, cfg.prices[idx]!), top: y.price, left, width: w, height: h(y.price, y.kubun), align: 'right' });
  const yen = (left: number, w: number, top: number, hh: number): GridCell => ({ kind: 'label', text: '円', top, left, width: w, height: hh, fontSize: 7 });
  const priceH = h(y.price, y.kubun);
  const rowH = (a: number, b: number) => h(a, b);
  const evMark = (mark: string, left: number, w: number, top: number, hh: number): GridCell => ({ kind: 'label', text: `第７表\nの１の\n[${mark}]`, fontSize: 6, top, left, width: w, height: hh });
  return [
    // 類似業種名・業種目番号
    { kind: 'label', text: '類　似　業　種', top: y.gyo, left: 12.05, width: 16.35, height: h(y.gyo, y.kabuHead) },
    { field: cfg.gyoField, kind: 'input', top: y.gyo, left: 28.4, width: 30.91, height: h(y.gyo, y.kabuHead), align: 'left' },
    { kind: 'label', text: '業 種 目 番 号', top: y.gyo, left: 59.31, width: 11.0, height: h(y.gyo, y.kabuHead) },
    { kind: 'cell', codeLabel: cfg.gyoCode, top: y.gyo, left: 70.31, width: 1.81, height: h(y.gyo, y.kabuHead) },
    { field: `${cfg.gyoField}num`, kind: 'input', top: y.gyo, left: 72.12, width: 20.18, height: h(y.gyo, y.kabuHead), align: 'left' },
    // 類似業種の株価 ヘッダー
    { kind: 'label', text: '類　似　業　種　の　株　価', top: y.kabuHead, left: 12.05, width: 80.25, height: h(y.kabuHead, y.colHead) },
    { kind: 'label', text: '課税時期の\n属する月', fontSize: 6.5, top: y.colHead, left: 12.05, width: 12.69, height: h(y.colHead, y.month) },
    { kind: 'label', text: '課税時期の\n属する月の前月', fontSize: 6.5, top: y.colHead, left: 24.74, width: 11.0, height: h(y.colHead, y.month) },
    { kind: 'label', text: '課税時期の\n属する月の前々月', fontSize: 6.5, top: y.colHead, left: 35.74, width: 12.69, height: h(y.colHead, y.month) },
    { kind: 'label', text: '前年平均株価', fontSize: 6.5, top: y.colHead, left: 48.43, width: 12.69, height: h(y.colHead, y.price) },
    { kind: 'label', text: '課税時期の属する\n月以前２年間の\n平均株価', fontSize: 6.5, top: y.colHead, left: 61.12, width: 11.0, height: h(y.colHead, y.price) },
    { kind: 'label', text: `Ａ\n（${cfg.priceMarks[0]}、${cfg.priceMarks[1]}、${cfg.priceMarks[2]}、${cfg.priceMarks[3]}及び\n${cfg.priceMarks[4]}のうち最も低いもの）`, fontSize: 6, top: y.colHead, left: 72.12, width: 20.18, height: h(y.colHead, y.price) },
    // 月行
    { field: cfg.months[0], kind: 'input', readOnly: true, top: y.month, left: 12.05, width: 10.88, height: h(y.month, y.price) },
    { kind: 'label', text: '月', top: y.month, left: 22.93, width: 1.81, height: h(y.month, y.price), fontSize: 7 },
    { field: cfg.months[1], kind: 'input', readOnly: true, top: y.month, left: 24.74, width: 9.18, height: h(y.month, y.price) },
    { kind: 'label', text: '月', top: y.month, left: 33.92, width: 1.82, height: h(y.month, y.price), fontSize: 7 },
    { field: cfg.months[2], kind: 'input', readOnly: true, top: y.month, left: 35.74, width: 10.88, height: h(y.month, y.price) },
    { kind: 'label', text: '月', top: y.month, left: 46.62, width: 1.81, height: h(y.month, y.price), fontSize: 7 },
    // 株価行
    price(0, 12.05, 10.88), yen(22.93, 1.81, y.price, priceH),
    price(1, 24.74, 9.18), yen(33.92, 1.82, y.price, priceH),
    price(2, 35.74, 10.88), yen(46.62, 1.81, y.price, priceH),
    price(3, 48.43, 10.88), yen(59.31, 1.81, y.price, priceH),
    price(4, 61.12, 9.19), yen(70.31, 1.81, y.price, priceH),
    { kind: 'label', text: cfg.aMark, top: y.price, left: 72.12, width: 1.85, height: priceH },
    { kind: 'cell', codeLabel: cfg.aCode, top: y.price, left: 73.97, width: 1.86, height: priceH },
    { field: cfg.aField, kind: 'input', readOnly: true, top: y.price, left: 75.83, width: 14.62, height: priceH, align: 'right' },
    yen(90.45, 1.85, y.price, priceH),
    // 比準割合の計算
    { kind: 'label', text: '比 準 割 合 の 計 算', top: y.kubun, left: 12.05, width: 1.85, height: h(y.kubun, y.end), align: 'center' },
    { kind: 'label', text: '区　分', top: y.kubun, left: 13.9, width: 5.48, height: h(y.kubun, y.hyoka) },
    { kind: 'label', text: '１株（50円）当たり\nの 年 配 当 金 額', fontSize: 7, top: y.kubun, left: 19.38, width: 18.21, height: h(y.kubun, y.hyoka) },
    { kind: 'label', text: '１株（50円）当たり\nの 年 利 益 金 額', fontSize: 7, top: y.kubun, left: 37.59, width: 18.17, height: h(y.kubun, y.hyoka) },
    { kind: 'label', text: '１株（50円）当たり\nの 純 資 産 価 額', fontSize: 7, top: y.kubun, left: 55.76, width: 20.07, height: h(y.kubun, y.hyoka) },
    { kind: 'label', text: '１株（50円）当たり\nの 比 準 価 額', fontSize: 7, top: y.kubun, left: 75.83, width: 16.47, height: h(y.kubun, y.hyoka) },
    // 評価会社 行（第7表の1の[⑤][⑧][⑰]）
    { kind: 'label', text: '評価\n会社', fontSize: 7, top: y.hyoka, left: 13.9, width: 5.48, height: rowH(y.hyoka, y.ruiji) },
    evMark('⑤', 19.38, 3.55, y.hyoka, rowH(y.hyoka, y.ruiji)),
    { kind: 'cell', codeLabel: cfg.ev5Code, top: y.hyoka, left: 22.93, width: 1.81, height: rowH(y.hyoka, y.ruiji) },
    { field: cfg.ev5, kind: 'input', readOnly: true, top: y.hyoka, left: 24.74, width: 5.52, height: rowH(y.hyoka, y.ruiji), align: 'right' },
    yen(30.26, 1.81, y.hyoka, rowH(y.hyoka, y.ruiji)),
    { field: cfg.ev5sen, kind: 'input', readOnly: true, top: y.hyoka, left: 32.07, width: 3.67, height: rowH(y.hyoka, y.ruiji), align: 'right' },
    { kind: 'label', text: '銭', top: y.hyoka, left: 35.74, width: 1.85, height: rowH(y.hyoka, y.ruiji), fontSize: 7 },
    evMark('⑧', 37.59, 3.51, y.hyoka, rowH(y.hyoka, y.ruiji)),
    { kind: 'cell', codeLabel: cfg.ev8Code, top: y.hyoka, left: 41.1, width: 1.85, height: rowH(y.hyoka, y.ruiji) },
    { field: cfg.ev8, kind: 'input', readOnly: true, top: y.hyoka, left: 42.95, width: 11.0, height: rowH(y.hyoka, y.ruiji), align: 'right' },
    yen(53.95, 1.81, y.hyoka, rowH(y.hyoka, y.ruiji)),
    evMark('⑰', 55.76, 3.55, y.hyoka, rowH(y.hyoka, y.ruiji)),
    { kind: 'cell', codeLabel: cfg.ev17Code, top: y.hyoka, left: 59.31, width: 1.81, height: rowH(y.hyoka, y.ruiji) },
    { field: cfg.ev17, kind: 'input', readOnly: true, top: y.hyoka, left: 61.12, width: 12.85, height: rowH(y.hyoka, y.ruiji), align: 'right' },
    yen(73.97, 1.86, y.hyoka, rowH(y.hyoka, y.ruiji)),
    // 類似業種 行
    { kind: 'label', text: '類似\n業種', fontSize: 7, top: y.ruiji, left: 13.9, width: 5.48, height: rowH(y.ruiji, y.yoso) },
    { kind: 'label', text: 'B', top: y.ruiji, left: 19.38, width: 3.55, height: rowH(y.ruiji, y.yoso) },
    { kind: 'cell', codeLabel: cfg.sbCode, top: y.ruiji, left: 22.93, width: 1.81, height: rowH(y.ruiji, y.yoso) },
    { field: cfg.sB1, kind: 'input', commaInteger: true, readOnly: true, top: y.ruiji, left: 24.74, width: 5.52, height: rowH(y.ruiji, y.yoso), align: 'right' },
    yen(30.26, 1.81, y.ruiji, rowH(y.ruiji, y.yoso)),
    { field: cfg.sB2, kind: 'input', readOnly: true, top: y.ruiji, left: 32.07, width: 3.67, height: rowH(y.ruiji, y.yoso), align: 'right' },
    { kind: 'label', text: '銭', top: y.ruiji, left: 35.74, width: 1.85, height: rowH(y.ruiji, y.yoso), fontSize: 7 },
    { kind: 'label', text: 'C', top: y.ruiji, left: 37.59, width: 3.51, height: rowH(y.ruiji, y.yoso) },
    { kind: 'cell', codeLabel: cfg.scCode, top: y.ruiji, left: 41.1, width: 1.85, height: rowH(y.ruiji, y.yoso) },
    { field: cfg.sC, kind: 'input', commaInteger: true, readOnly: true, top: y.ruiji, left: 42.95, width: 11.0, height: rowH(y.ruiji, y.yoso), align: 'right' },
    yen(53.95, 1.81, y.ruiji, rowH(y.ruiji, y.yoso)),
    { kind: 'label', text: 'D', top: y.ruiji, left: 55.76, width: 3.55, height: rowH(y.ruiji, y.yoso) },
    { kind: 'cell', codeLabel: cfg.sdCode, top: y.ruiji, left: 59.31, width: 1.81, height: rowH(y.ruiji, y.yoso) },
    { field: cfg.sD, kind: 'input', commaInteger: true, readOnly: true, top: y.ruiji, left: 61.12, width: 12.85, height: rowH(y.ruiji, y.yoso), align: 'right' },
    yen(73.97, 1.86, y.ruiji, rowH(y.ruiji, y.yoso)),
    // 要素別比準割合 行
    { kind: 'label', text: '要素別\n比準割合', fontSize: 6.5, top: y.yoso, left: 13.9, width: 5.48, height: rowH(y.yoso, y.hikaku) },
    { kind: 'label', text: '[⑤]÷B', simpleFraction: { numerator: '[⑤]', denominator: 'B' }, fontSize: 6.5, top: y.yoso, left: 19.38, width: 3.55, height: rowH(y.yoso, y.hikaku) },
    { field: cfg.eB, kind: 'input', readOnly: true, top: y.yoso, left: 22.93, width: 14.66, height: rowH(y.yoso, y.hikaku), align: 'right' },
    { kind: 'label', text: '[⑧]÷C', simpleFraction: { numerator: '[⑧]', denominator: 'C' }, fontSize: 6.5, top: y.yoso, left: 37.59, width: 3.51, height: rowH(y.yoso, y.hikaku) },
    { field: cfg.eC, kind: 'input', readOnly: true, top: y.yoso, left: 41.1, width: 14.66, height: rowH(y.yoso, y.hikaku), align: 'right' },
    { kind: 'label', text: '[⑰]÷D', simpleFraction: { numerator: '[⑰]', denominator: 'D' }, fontSize: 6.5, top: y.yoso, left: 55.76, width: 3.55, height: rowH(y.yoso, y.hikaku) },
    { field: cfg.eD, kind: 'input', readOnly: true, top: y.yoso, left: 59.31, width: 16.52, height: rowH(y.yoso, y.hikaku), align: 'right' },
    // 比準割合 行
    { kind: 'label', text: '比 準\n割 合', fontSize: 7, top: y.hikaku, left: 13.9, width: 5.48, height: rowH(y.hikaku, y.end) },
    { kind: 'label', text: '（[⑤]÷B＋[⑧]÷C＋[⑰]÷D）÷３', fractionExpression: { terms: [{ numerator: '[⑤]', denominator: 'B' }, { numerator: '[⑧]', denominator: 'C' }, { numerator: '[⑰]', denominator: 'D' }], denominator: '3' }, top: y.hikaku, left: 19.38, width: 30.9, height: rowH(y.hikaku, y.end) },
    { kind: 'label', text: cfg.ratioField, top: y.hikaku, left: 50.28, width: 1.82, height: rowH(y.hikaku, y.end) },
    { kind: 'cell', codeLabel: cfg.ratioCode, top: y.hikaku, left: 52.1, width: 1.85, height: rowH(y.hikaku, y.end) },
    { field: cfg.ratioField, kind: 'input', readOnly: true, top: y.hikaku, left: 53.95, width: 21.88, height: rowH(y.hikaku, y.end), align: 'right' },
    // 比準価額 ⑳/㉓
    { kind: 'label', text: `${cfg.aMark} × ${cfg.ratioField} × ___\n中会社は0.6\n小会社は0.5\nとします。`, companyRateExpression: { a: cfg.aMark, ratio: cfg.ratioField, rateField: cfg.shinField, sizeField: cfg.sizeField }, top: y.hyoka, left: 75.83, width: 16.47, height: h(y.hyoka, y.hikaku) },
    { kind: 'label', text: cfg.priceField, top: y.hikaku, left: 75.83, width: 1.81, height: rowH(y.hikaku, y.end) },
    { kind: 'cell', codeLabel: cfg.priceCode, top: y.hikaku, left: 77.64, width: 1.81, height: rowH(y.hikaku, y.end) },
    { field: cfg.priceField, kind: 'input', readOnly: true, top: y.hikaku, left: 79.45, width: 5.52, height: rowH(y.hikaku, y.end), align: 'right' },
    yen(84.97, 1.81, y.hikaku, rowH(y.hikaku, y.end)),
    { field: cfg.priceSen, kind: 'input', readOnly: true, top: y.hikaku, left: 86.78, width: 3.67, height: rowH(y.hikaku, y.end), align: 'right' },
    { kind: 'label', text: '銭', top: y.hikaku, left: 90.45, width: 1.85, height: rowH(y.hikaku, y.end), fontSize: 7 },
  ];
}

const BLOCK1: BlockCfg = {
  months: ['f66', 'f68', 'f70'], prices: ['㊁', '㋭', '㋬', '㋣', '㋠'], priceMarks: ['㊁', '㋭', '㋬', '㋣', '㋠'],
  aMark: '⑱', aField: '⑱', aCode: 'G02', ev5: 'f103', ev5sen: 'f104', ev8: 'f106', ev17: 'f108',
  ev5Code: 'J01', ev8Code: 'G03', ev17Code: 'G05', sB1: 'f110', sB2: 'f111', sC: 'f113', sD: 'f115',
  sbCode: 'J02', scCode: 'G04', sdCode: 'G06', eB: 'f117', eC: 'f119', eD: 'f121',
  ratioField: '⑲', ratioCode: 'C01', priceField: '⑳', priceSen: 'f125', priceCode: 'J03',
  shinField: 'r1shin', sizeField: 'r1size', gyoField: 'f61', gyoCode: 'G01', aHighlight: ['㊁', '㋭', '㋬', '㋣', '㋠'],
};
const BLOCK2: BlockCfg = {
  months: ['b2_f66', 'b2_f68', 'b2_f70'], prices: ['b2_㊁', 'b2_㋭', 'b2_㋬', 'b2_㋣', 'b2_㋠'], priceMarks: ['㋷', '㋦', '㋸', '㋾', '㋻'],
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
  { kind: 'label', text: '会　社　名', top: 11.0, left: 59.31, width: 11.0, height: 2.62 },
  { field: 'company', kind: 'input', top: 11.0, left: 70.31, width: 21.99, height: 2.62, align: 'left' },
  { kind: 'label', text: '１．S１の金額（続）', top: 14.47, left: 7.33, width: 2.42, height: 74.82, align: 'center' },
  { kind: 'label', text: '１株（50円）当たりの比準価額の計算', top: 14.47, left: 9.75, width: 2.3, height: 57.24, align: 'center' },
  ...simBlock(YS1, BLOCK1),
  ...simBlock(YS2, BLOCK2),
  // 1株当たりの比準価額 ㉔
  { kind: 'label', text: '１株当たりの比準価額', top: 71.71, left: 9.75, width: 16.84, height: 4.61 },
  { kind: 'label', text: '比準価額（⑳と㉓とのいずれか低い方の金額）×　第４表の１の④の金額 ÷ 50円', productFractionExpression: { prefixLines: ['比準価額', '（⑳と㉓とのいずれか', '低い方の金額）'], numerator: '第４表の１の④の金額', denominator: '50円' }, top: 71.71, left: 26.59, width: 49.24, height: 4.61 },
  { kind: 'label', text: '比準価額（円）', top: 71.71, left: 75.83, width: 16.47, height: 1.42, fontSize: 7 },
  { kind: 'label', text: '㉔', top: 73.13, left: 75.83, width: 1.81, height: 3.19 },
  { kind: 'cell', codeLabel: 'C03', top: 73.13, left: 77.64, width: 1.81, height: 3.19 },
  { field: '㉔', kind: 'input', readOnly: true, top: 73.13, left: 79.45, width: 12.85, height: 3.19, align: 'right' },
  // 比準価額の修正
  { kind: 'label', text: '比 準 価 額 の 修 正', top: 76.32, left: 9.75, width: 2.3, height: 12.97, align: 'center' },
  { kind: 'label', text: '直前期末の翌日から課税時\n期までの間に配当金交付の\n効力が発生した場合', fontSize: 6, top: 76.32, left: 12.05, width: 14.54, height: 5.08, align: 'left' },
  { kind: 'label', text: '１株当たりの配当金額', top: 76.32, left: 26.59, width: 16.36, height: 5.08, fontSize: 7 },
  { kind: 'label', text: '㉕', top: 76.32, left: 42.95, width: 1.81, height: 5.08 },
  { kind: 'cell', codeLabel: 'J07', top: 76.32, left: 44.76, width: 1.86, height: 5.08 },
  { field: 'mod_div', kind: 'input', commaInteger: true, top: 76.32, left: 46.62, width: 18.17, height: 5.08, align: 'right' },
  { kind: 'label', text: '円', top: 76.32, left: 64.79, width: 1.85, height: 5.08, fontSize: 7 },
  { field: 'mod_div_sen', kind: 'input', integerDigits: 2, top: 76.32, left: 66.64, width: 7.33, height: 5.08, align: 'right' },
  { kind: 'label', text: '銭', top: 76.32, left: 73.97, width: 1.86, height: 5.08, fontSize: 7 },
  { kind: 'label', text: '修正比準価額\n（㉔－㉕）（円）', top: 76.32, left: 75.83, width: 16.47, height: 2.45, fontSize: 6.5 },
  { kind: 'label', text: '㉖', top: 78.77, left: 75.83, width: 1.81, height: 2.63 },
  { kind: 'cell', codeLabel: 'C04', top: 78.77, left: 77.64, width: 1.81, height: 2.63 },
  { field: '㉖', kind: 'input', readOnly: true, top: 78.77, left: 79.45, width: 12.85, height: 2.63, align: 'right' },
  { kind: 'label', text: '直前期末の翌日から課税時\n期までの間に株式の割当て\n等の効力が発生した場合', fontSize: 6, top: 81.4, left: 12.05, width: 14.54, height: 7.89, align: 'left' },
  { kind: 'label', text: '割当株式１株\n当たりの払込金額', top: 81.4, left: 26.59, width: 16.36, height: 2.62, fontSize: 7 },
  { kind: 'label', text: '㉗', top: 81.4, left: 42.95, width: 1.81, height: 2.62 },
  { kind: 'cell', codeLabel: 'J08', top: 81.4, left: 44.76, width: 1.86, height: 2.62 },
  { field: 'mod_pay', kind: 'input', commaInteger: true, top: 81.4, left: 46.62, width: 18.17, height: 2.62, align: 'right' },
  { kind: 'label', text: '円', top: 81.4, left: 64.79, width: 1.85, height: 2.62, fontSize: 7 },
  { field: 'mod_pay_sen', kind: 'input', integerDigits: 2, top: 81.4, left: 66.64, width: 7.33, height: 2.62, align: 'right' },
  { kind: 'label', text: '銭', top: 81.4, left: 73.97, width: 1.86, height: 2.62, fontSize: 7 },
  { kind: 'label', text: '修正比準価額', titledFraction: { titleLines: ['修正比準価額'], numeratorLines: ['㉔（㉖があるときは㉖）＋㉗×㉘'], denominator: '１株＋㉙', suffix: '（円）' }, top: 81.4, left: 75.83, width: 16.47, height: 5.24, fontSize: 6 },
  { kind: 'label', text: '１株当たりの割当株式数', top: 84.02, left: 26.59, width: 16.36, height: 2.62, fontSize: 7 },
  { kind: 'label', text: '㉘', top: 84.02, left: 42.95, width: 1.81, height: 2.62 },
  { kind: 'cell', codeLabel: 'C05', top: 84.02, left: 44.76, width: 1.86, height: 2.62 },
  { field: 'mod_ratio', kind: 'input', top: 84.02, left: 46.62, width: 27.35, height: 2.62, align: 'right' },
  { kind: 'label', text: '株', top: 84.02, left: 73.97, width: 1.86, height: 2.62, fontSize: 7 },
  { kind: 'label', text: '１株当たりの割当株式数\n又は交付株式数', top: 86.64, left: 26.59, width: 16.36, height: 2.65, fontSize: 7 },
  { kind: 'label', text: '㉙', top: 86.64, left: 42.95, width: 1.81, height: 2.65 },
  { kind: 'cell', codeLabel: 'C06', top: 86.64, left: 44.76, width: 1.86, height: 2.65 },
  { field: 'mod_ratio2', kind: 'input', top: 86.64, left: 46.62, width: 27.35, height: 2.65, align: 'right' },
  { kind: 'label', text: '株', top: 86.64, left: 73.97, width: 1.86, height: 2.65, fontSize: 7 },
  { kind: 'label', text: '㉚', top: 86.64, left: 75.83, width: 1.81, height: 2.65 },
  { kind: 'cell', codeLabel: 'C07', top: 86.64, left: 77.64, width: 1.81, height: 2.65 },
  { field: '㉚', kind: 'input', readOnly: true, top: 86.64, left: 79.45, width: 12.85, height: 2.65, align: 'right' },
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
  const { mainCells, headerExtra, aspectRatio } = extractCompanyFloatHeader(CELLS, g, u, T);
  return <GridForm cells={mainCells} g={g} u={u} formId={T} width="100%" aspectRatio={aspectRatio} title="第７表の２　株式等保有特定会社の株式の価額の計算明細書（続）" formCode="NTA0VNA240020010" headerExtra={headerExtra} onJump={onJump && ((t) => onJump({ tab: t.tab as TableId, field: t.field }))} />;
}
