import { GridForm, type GridCell } from '@/components/ui/GridForm';
import { calcTable4 } from './Table4Grid';
import { extractCompanyFloatHeader } from '../companyFloatHeader';
import type { TableId, TableProps } from '@/types/form';

// ══ 第4表の2（令和8年4月1日以降用）══
// 旧第4表の後半（3.類似業種比準価額の計算＋比準価額の修正）。
// データは 'table4' バケット共通、計算は calcTable4 を再利用。識別コード（G/J/C）を様式どおり独立セルで再現。

const T = 'table4' as const;

const minValueHighlight = (fields: string[], target: string) => (g: (field: string) => string) => {
  const values = fields
    .map((field) => ({ field, value: Number(g(field).replace(/,/g, '').trim()) }))
    .filter(({ field, value }) => g(field).trim() !== '' && !isNaN(value));
  if (values.length === 0) return false;
  const min = Math.min(...values.map(({ value }) => value));
  return values.some(({ field, value }) => field === target && value === min);
};

interface BlockCfg {
  fp: string;            // フィールド接頭辞 r1/r2
  months: [string, string, string]; // 月フィールド h8/h11/h13, h61/h64/h67
  prices: [string, string, string, string, string]; // ㋷㋦㋸㋾㋻ / ㋕㋵㋟㋹㋞
  aMark: string; aField: string; aCode: string; // ⑳/㉓, G02/G08
  vbCode: string; vcCode: string; vdCode: string; // 評価会社 Ⓑ/Ⓒ/Ⓓ の J/G コード
  sbCode: string; scCode: string; sdCode: string; // 類似業種 B/C/D の J/G コード
  ratioField: string; ratioCode: string; // ㉑/㉔, C01/C02
  priceField: string; priceCode: string; // ㉒/㉕, J03/J06
  aHighlight: string[]; // A の最低値ハイライト対象
}

/** 類似業種比準価額の1ブロック（株価＋比準割合の計算）を生成。d=縦オフセット% */
function simBlock(d: number, cfg: BlockCfg): GridCell[] {
  const t = (v: number) => +(v + d).toFixed(2);
  const fp = cfg.fp;
  return [
    // 類似業種名・業種目番号
    { kind: 'label', text: '類　似　業　種', top: t(14.96), left: 11.72, width: 16.24, height: 2.73 },
    { field: `${fp}gyo`, kind: 'input', top: t(14.96), left: 27.96, width: 30.42, height: 2.73, align: 'left' },
    { kind: 'label', text: '業 種 目 番 号', top: t(14.96), left: 58.38, width: 11.48, height: 2.73 },
    { kind: 'cell', codeLabel: cfg.aCode === 'G02' ? 'G01' : 'G07', top: t(14.96), left: 69.86, width: 1.9, height: 2.73 },
    { field: `${fp}gyonum`, kind: 'input', top: t(14.96), left: 71.76, width: 21.07, height: 2.73, align: 'left' },
    // 類似業種の株価 ヘッダー
    { kind: 'label', text: '類　似　業　種　の　株　価', top: t(17.69), left: 11.72, width: 81.11, height: 2.0 },
    { kind: 'label', text: '課税時期の\n属する月', fontSize: 6.5, top: t(19.69), left: 11.72, width: 12.41, height: 2.65 },
    { kind: 'label', text: '課税時期の属する\n月の前月', fontSize: 6.5, top: t(19.69), left: 24.13, width: 11.49, height: 2.65 },
    { kind: 'label', text: '課税時期の属する\n月の前々月', fontSize: 6.5, top: t(19.69), left: 35.62, width: 13.01, height: 2.65 },
    { kind: 'label', text: '前年平均株価', fontSize: 6.5, top: t(19.69), left: 48.63, width: 11.64, height: 5.38 },
    { kind: 'label', text: '課税時期の属する\n月以前２年間の\n平均株価', fontSize: 6.5, top: t(19.69), left: 60.27, width: 11.49, height: 5.38 },
    { kind: 'label', text: `Ａ\n（${cfg.prices[0]}、${cfg.prices[1]}、${cfg.prices[2]}、${cfg.prices[3]}及び\n${cfg.prices[4]}のうち最も低いもの）`, fontSize: 6, top: t(19.69), left: 71.76, width: 21.15, height: 5.38 },
    // 月番号
    { field: cfg.months[0], kind: 'input', readOnly: true, top: t(22.34), left: 11.72, width: 10.52, height: 2.73 },
    { kind: 'label', text: '月', top: t(22.34), left: 22.24, width: 1.89, height: 2.73, fontSize: 7 },
    { field: cfg.months[1], kind: 'input', readOnly: true, top: t(22.34), left: 24.13, width: 9.59, height: 2.73 },
    { kind: 'label', text: '月', top: t(22.34), left: 33.72, width: 1.9, height: 2.73, fontSize: 7 },
    { field: cfg.months[2], kind: 'input', readOnly: true, top: t(22.34), left: 35.62, width: 11.08, height: 2.73 },
    { kind: 'label', text: '月', top: t(22.34), left: 46.7, width: 1.93, height: 2.73, fontSize: 7 },
    // 株価
    { field: cfg.prices[0], kind: 'input', commaInteger: true, cornerLabel: cfg.prices[0], highlightWhen: minValueHighlight(cfg.aHighlight, cfg.prices[0]), top: t(25.07), left: 11.72, width: 10.52, height: 2.74, align: 'right' },
    { kind: 'label', text: '円', top: t(25.07), left: 22.24, width: 1.89, height: 2.74, fontSize: 7 },
    { field: cfg.prices[1], kind: 'input', commaInteger: true, cornerLabel: cfg.prices[1], highlightWhen: minValueHighlight(cfg.aHighlight, cfg.prices[1]), top: t(25.07), left: 24.13, width: 9.59, height: 2.74, align: 'right' },
    { kind: 'label', text: '円', top: t(25.07), left: 33.72, width: 1.9, height: 2.74, fontSize: 7 },
    { field: cfg.prices[2], kind: 'input', commaInteger: true, cornerLabel: cfg.prices[2], highlightWhen: minValueHighlight(cfg.aHighlight, cfg.prices[2]), top: t(25.07), left: 35.62, width: 11.08, height: 2.74, align: 'right' },
    { kind: 'label', text: '円', top: t(25.07), left: 46.7, width: 1.93, height: 2.74, fontSize: 7 },
    { field: cfg.prices[3], kind: 'input', commaInteger: true, cornerLabel: cfg.prices[3], highlightWhen: minValueHighlight(cfg.aHighlight, cfg.prices[3]), top: t(25.07), left: 48.63, width: 9.75, height: 2.74, align: 'right' },
    { kind: 'label', text: '円', top: t(25.07), left: 58.38, width: 1.89, height: 2.74, fontSize: 7 },
    { field: cfg.prices[4], kind: 'input', commaInteger: true, cornerLabel: cfg.prices[4], highlightWhen: minValueHighlight(cfg.aHighlight, cfg.prices[4]), top: t(25.07), left: 60.27, width: 9.59, height: 2.74, align: 'right' },
    { kind: 'label', text: '円', top: t(25.07), left: 69.86, width: 1.9, height: 2.74, fontSize: 7 },
    { kind: 'label', text: cfg.aMark, top: t(25.07), left: 71.76, width: 1.93, height: 2.74 },
    { kind: 'cell', codeLabel: cfg.aCode, top: t(25.07), left: 73.69, width: 1.89, height: 2.74 },
    { field: cfg.aField, kind: 'input', readOnly: true, top: t(25.07), left: 75.58, width: 15.31, height: 2.74, align: 'right' },
    { kind: 'label', text: '円', top: t(25.07), left: 90.89, width: 1.94, height: 2.74, fontSize: 7 },
    // 比準割合の計算 ヘッダー
    { kind: 'label', text: '比 準 割 合 の 計 算', top: t(27.81), left: 11.72, width: 1.94, height: 16.66, align: 'center' },
    { kind: 'label', text: '区　分', top: t(27.81), left: 13.66, width: 5.72, height: 4.24 },
    { kind: 'label', text: '１株（50円）当たり\nの 年 配 当 金 額', top: t(27.81), left: 19.38, width: 19.1, height: 4.24, fontSize: 7 },
    { kind: 'label', text: '１株（50円）当たり\nの 年 利 益 金 額', top: t(27.81), left: 38.48, width: 17.81, height: 4.24, fontSize: 7 },
    { kind: 'label', text: '１株（50円）当たり\nの 純 資 産 価 額', top: t(27.81), left: 56.29, width: 19.29, height: 4.24, fontSize: 7 },
    { kind: 'label', text: '１株（50円）当たり\nの 比 準 価 額', top: t(27.81), left: 75.58, width: 17.33, height: 4.24, fontSize: 7 },
    // 評価会社 行
    { kind: 'label', text: '評価\n会社', top: t(32.05), left: 13.66, width: 5.72, height: 2.74, fontSize: 7 },
    { kind: 'label', text: 'Ⓑ', top: t(32.05), left: 19.38, width: 2.86, height: 2.74 },
    { kind: 'cell', codeLabel: cfg.vbCode, top: t(32.05), left: 22.24, width: 1.89, height: 2.74 },
    { field: `${fp}vB1`, kind: 'input', readOnly: true, top: t(32.05), left: 24.13, width: 5.77, height: 2.74, align: 'right' },
    { kind: 'label', text: '円', top: t(32.05), left: 29.9, width: 1.89, height: 2.74, fontSize: 7 },
    { field: `${fp}vB2`, kind: 'input', readOnly: true, top: t(32.05), left: 31.79, width: 3.83, height: 2.74, align: 'right' },
    { kind: 'label', text: '銭', top: t(32.05), left: 35.62, width: 2.86, height: 2.74, fontSize: 7 },
    { kind: 'label', text: 'Ⓒ', top: t(32.05), left: 38.48, width: 2.5, height: 2.74 },
    { kind: 'cell', codeLabel: cfg.vcCode, top: t(32.05), left: 40.98, width: 1.89, height: 2.74 },
    { field: `${fp}vC`, kind: 'input', readOnly: true, top: t(32.05), left: 42.87, width: 11.48, height: 2.74, align: 'right' },
    { kind: 'label', text: '円', top: t(32.05), left: 54.35, width: 1.94, height: 2.74, fontSize: 7 },
    { kind: 'label', text: 'Ⓓ', top: t(32.05), left: 56.29, width: 2.09, height: 2.74 },
    { kind: 'cell', codeLabel: cfg.vdCode, top: t(32.05), left: 58.38, width: 1.89, height: 2.74 },
    { field: `${fp}vD`, kind: 'input', readOnly: true, top: t(32.05), left: 60.27, width: 13.42, height: 2.74, align: 'right' },
    { kind: 'label', text: '円', top: t(32.05), left: 73.69, width: 1.89, height: 2.74, fontSize: 7 },
    // 比準価額（⑳×㉑×0.7）
    { kind: 'label', text: `${cfg.aMark} × ${cfg.ratioField} × ___\n中会社は0.6\n小会社は0.5\nとします。`, companyRateExpression: { a: cfg.aMark, ratio: cfg.ratioField, rateField: `${fp}shin`, sizeField: `${fp}size` }, top: t(32.05), left: 75.58, width: 17.33, height: 8.21 },
    // 類似業種 行
    { kind: 'label', text: '類似\n業種', top: t(34.79), left: 13.66, width: 5.72, height: 2.73, fontSize: 7 },
    { kind: 'label', text: 'B', top: t(34.79), left: 19.38, width: 2.86, height: 2.73 },
    { kind: 'cell', codeLabel: cfg.sbCode, top: t(34.79), left: 22.24, width: 1.89, height: 2.73 },
    { field: `${fp}sB1`, kind: 'input', commaInteger: true, top: t(34.79), left: 24.13, width: 5.77, height: 2.73, align: 'right' },
    { kind: 'label', text: '円', top: t(34.79), left: 29.9, width: 1.89, height: 2.73, fontSize: 7 },
    { field: `${fp}sB2`, kind: 'input', top: t(34.79), left: 31.79, width: 3.83, height: 2.73, align: 'right' },
    { kind: 'label', text: '銭', top: t(34.79), left: 35.62, width: 2.86, height: 2.73, fontSize: 7 },
    { kind: 'label', text: 'C', top: t(34.79), left: 38.48, width: 2.5, height: 2.73 },
    { kind: 'cell', codeLabel: cfg.scCode, top: t(34.79), left: 40.98, width: 1.89, height: 2.73 },
    { field: `${fp}sC`, kind: 'input', commaInteger: true, top: t(34.79), left: 42.87, width: 11.48, height: 2.73, align: 'right' },
    { kind: 'label', text: '円', top: t(34.79), left: 54.35, width: 1.94, height: 2.73, fontSize: 7 },
    { kind: 'label', text: 'D', top: t(34.79), left: 56.29, width: 2.09, height: 2.73 },
    { kind: 'cell', codeLabel: cfg.sdCode, top: t(34.79), left: 58.38, width: 1.89, height: 2.73 },
    { field: `${fp}sD`, kind: 'input', commaInteger: true, top: t(34.79), left: 60.27, width: 13.42, height: 2.73, align: 'right' },
    { kind: 'label', text: '円', top: t(34.79), left: 73.69, width: 1.89, height: 2.73, fontSize: 7 },
    // 要素別比準割合 行
    { kind: 'label', text: '要素別\n比準割合', top: t(37.52), left: 13.66, width: 5.72, height: 2.74, fontSize: 6.5 },
    { kind: 'label', text: 'Ⓑ÷B', simpleFraction: { numerator: 'Ⓑ', denominator: 'B' }, fontSize: 6.5, top: t(37.52), left: 19.38, width: 2.86, height: 2.74 },
    { field: `${fp}eB`, kind: 'input', readOnly: true, top: t(37.52), left: 22.24, width: 16.24, height: 2.74, align: 'right' },
    { kind: 'label', text: 'Ⓒ÷C', simpleFraction: { numerator: 'Ⓒ', denominator: 'C' }, fontSize: 6.5, top: t(37.52), left: 38.48, width: 2.5, height: 2.74 },
    { field: `${fp}eC`, kind: 'input', readOnly: true, top: t(37.52), left: 40.98, width: 15.31, height: 2.74, align: 'right' },
    { kind: 'label', text: 'Ⓓ÷D', simpleFraction: { numerator: 'Ⓓ', denominator: 'D' }, fontSize: 6.5, top: t(37.52), left: 56.29, width: 2.09, height: 2.74 },
    { field: `${fp}eD`, kind: 'input', readOnly: true, top: t(37.52), left: 58.38, width: 17.2, height: 2.74, align: 'right' },
    // 比準割合 行
    { kind: 'label', text: '比 準\n割 合', top: t(40.26), left: 13.66, width: 5.72, height: 4.21, fontSize: 7 },
    { kind: 'label', text: '（Ⓑ÷B＋Ⓒ÷C＋Ⓓ÷D）÷３＝', fractionExpression: { terms: [{ numerator: 'Ⓑ', denominator: 'B' }, { numerator: 'Ⓒ', denominator: 'C' }, { numerator: 'Ⓓ', denominator: 'D' }], denominator: '3', suffix: '＝' }, top: t(40.26), left: 19.38, width: 31.14, height: 4.21 },
    { kind: 'label', text: cfg.ratioField, top: t(40.26), left: 50.52, width: 1.94, height: 4.21 },
    { kind: 'cell', codeLabel: cfg.ratioCode, top: t(40.26), left: 52.46, width: 1.89, height: 4.21 },
    { field: cfg.ratioField, kind: 'input', readOnly: true, top: t(40.26), left: 54.35, width: 21.23, height: 4.21, align: 'right' },
    // 比準価額 ㉒/㉕
    { kind: 'label', text: cfg.priceField, top: t(40.26), left: 75.58, width: 1.94, height: 4.21 },
    { kind: 'cell', codeLabel: cfg.priceCode, top: t(40.26), left: 77.52, width: 1.89, height: 4.21 },
    { field: cfg.priceField, kind: 'input', readOnly: true, top: t(40.26), left: 79.41, width: 5.76, height: 4.21, align: 'right' },
    { kind: 'label', text: '円', top: t(40.26), left: 85.17, width: 1.9, height: 4.21, fontSize: 7 },
    { field: `${fp}px`, kind: 'input', readOnly: true, top: t(40.26), left: 87.07, width: 3.82, height: 4.21, align: 'right' },
    { kind: 'label', text: '銭', top: t(40.26), left: 90.89, width: 1.94, height: 4.21, fontSize: 7 },
  ];
}

const BLOCK1: BlockCfg = {
  fp: 'r1', months: ['h8', 'h11', 'h13'], prices: ['㋷', '㋦', '㋸', '㋾', '㋻'],
  aMark: '⑳', aField: '⑳', aCode: 'G02', vbCode: 'J01', vcCode: 'G03', vdCode: 'G05',
  sbCode: 'J02', scCode: 'G04', sdCode: 'G06', ratioField: '㉑', ratioCode: 'C01', priceField: '㉒', priceCode: 'J03',
  aHighlight: ['㋷', '㋦', '㋸', '㋾', '㋻'],
};
const BLOCK2: BlockCfg = {
  fp: 'r2', months: ['h61', 'h64', 'h67'], prices: ['㋕', '㋵', '㋟', '㋹', '㋞'],
  aMark: '㉓', aField: '㉓', aCode: 'G08', vbCode: 'J04', vcCode: 'G09', vdCode: 'G11',
  sbCode: 'J05', scCode: 'G10', sdCode: 'G12', ratioField: '㉔', ratioCode: 'C02', priceField: '㉕', priceCode: 'J06',
  aHighlight: ['㋕', '㋵', '㋟', '㋹', '㋞'],
};

const CELLS: GridCell[] = [
  // 続紙の各計算区分を、見た目を変えずに意味のあるDOMグループとしてまとめる。
  { kind: 'cell', text: '1株50円当たりの比準価額の計算', ariaLabel: '1株50円当たりの比準価額の計算', semanticRole: 'group', groupBorder: false, top: 14.96, left: 9.31, width: 83.6, height: 58.69 },
  { kind: 'cell', text: '1株当たりの比準価額', ariaLabel: '1株当たりの比準価額', semanticRole: 'group', groupBorder: false, top: 73.65, left: 9.31, width: 83.6, height: 4.81 },
  { kind: 'cell', text: '比準価額の修正', ariaLabel: '比準価額の修正', semanticRole: 'group', groupBorder: false, top: 78.46, left: 9.31, width: 83.6, height: 13.51 },
  // 会社名
  { kind: 'label', text: '会　社　名', top: 11.34, left: 58.26, width: 12.5, height: 2.73 },
  { field: 'company', kind: 'input', top: 11.34, left: 70.76, width: 22.15, height: 2.73, align: 'left' },
  // 左端の縦見出し
  { kind: 'label', text: '３．類似業種比準価額の計算', semanticRole: 'columnheader', top: 14.96, left: 6.81, width: 2.5, height: 77.01, align: 'center' },
  { kind: 'label', text: '１株（50円）当たりの比準価額の計算', semanticRole: 'columnheader', top: 14.96, left: 9.31, width: 2.41, height: 58.69, align: 'center' },
  // 1回目・2回目
  ...simBlock(0, BLOCK1),
  ...simBlock(29.51, BLOCK2),
  // ── 1株当たりの比準価額 ㉖ ──
  // ラベルは左端の縦見出し列（9.31-11.72）を含んで 9.31 起点（r08-07: この行では V 11.72 の縦線がない）
  { kind: 'label', text: '１株当たりの比準価額', semanticRole: 'columnheader', top: 73.65, left: 9.31, width: 16.76, height: 4.81 },
  { kind: 'label', text: '比準価額（㉒と㉕とのいずれか低い方の金額）×　第４表の１の④の金額 ÷ 50円', productFractionExpression: { prefixLines: ['比準価額', '（㉒と㉕とのいずれか', '低い方の金額）'], numerator: '第４表の１の④の金額', denominator: '50円' }, top: 73.65, left: 26.07, width: 49.51, height: 4.81 },
  { kind: 'label', text: '比準価額（円）', top: 73.65, left: 75.58, width: 17.33, height: 1.48, fontSize: 7 },
  { kind: 'label', text: '㉖', top: 75.13, left: 75.58, width: 2.0, height: 3.33 },
  { kind: 'cell', codeLabel: 'C03', top: 75.13, left: 77.58, width: 1.94, height: 3.33 },
  { field: '㉖', kind: 'input', readOnly: true, top: 75.13, left: 79.52, width: 13.39, height: 3.33, align: 'right' },
  // ── 比準価額の修正 ──
  { kind: 'label', text: '比 準 価 額 の 修 正', semanticRole: 'columnheader', top: 78.46, left: 9.31, width: 2.41, height: 13.51, align: 'center' },
  { kind: 'label', text: '直前期末の翌日から課税\n時期までの間に配当金交\n付の効力が発生した場合', fontSize: 6, top: 78.46, left: 11.72, width: 14.35, height: 5.3, align: 'left' },
  { kind: 'label', text: '１株当たりの配当金額', top: 78.46, left: 26.07, width: 16.8, height: 5.3, fontSize: 7 },
  { kind: 'label', text: '㉗', top: 78.46, left: 42.87, width: 1.93, height: 5.3 },
  { kind: 'cell', codeLabel: 'J07', top: 78.46, left: 44.8, width: 1.9, height: 5.3 },
  { field: 'mod_div', kind: 'input', commaInteger: true, top: 78.46, left: 46.7, width: 17.4, height: 5.3, align: 'right' },
  { kind: 'label', text: '円', top: 78.46, left: 64.1, width: 1.94, height: 5.3, fontSize: 7 },
  { field: 'mod_div_sen', kind: 'input', integerDigits: 2, top: 78.46, left: 66.04, width: 7.65, height: 5.3, align: 'right' },
  { kind: 'label', text: '銭', top: 78.46, left: 73.69, width: 1.89, height: 5.3, fontSize: 7 },
  { kind: 'label', text: '修正比準価額\n（㉖－㉗）（円）', top: 78.46, left: 75.58, width: 17.33, height: 2.57, fontSize: 6.5 },
  { kind: 'label', text: '㉘', top: 81.03, left: 75.58, width: 2.0, height: 2.73 },
  { kind: 'cell', codeLabel: 'C04', top: 81.03, left: 77.58, width: 1.94, height: 2.73 },
  { field: '㉘', kind: 'input', readOnly: true, top: 81.03, left: 79.52, width: 13.39, height: 2.73, align: 'right' },
  { kind: 'label', text: '直前期末の翌日から課税\n時期までの間に株式の割\n当て等の効力が発生した\n場合', fontSize: 6, top: 83.76, left: 11.72, width: 14.35, height: 8.21, align: 'left' },
  { kind: 'label', text: '割当株式１株\n当たりの払込金額', top: 83.76, left: 26.07, width: 16.8, height: 2.74, fontSize: 7 },
  { kind: 'label', text: '㉙', top: 83.76, left: 42.87, width: 1.93, height: 2.74 },
  { kind: 'cell', codeLabel: 'J08', top: 83.76, left: 44.8, width: 1.9, height: 2.74 },
  { field: 'mod_pay', kind: 'input', commaInteger: true, top: 83.76, left: 46.7, width: 17.4, height: 2.74, align: 'right' },
  { kind: 'label', text: '円', top: 83.76, left: 64.1, width: 1.94, height: 2.74, fontSize: 7 },
  { field: 'mod_pay_sen', kind: 'input', integerDigits: 2, top: 83.76, left: 66.04, width: 7.65, height: 2.74, align: 'right' },
  { kind: 'label', text: '銭', top: 83.76, left: 73.69, width: 1.89, height: 2.74, fontSize: 7 },
  { kind: 'label', text: '修正比準価額', titledFraction: { titleLines: ['修正比準価額'], numeratorLines: ['㉖（㉘があるときは㉘）＋㉙×㉚'], denominator: '１株＋㉛', suffix: '（円）' }, top: 83.76, left: 75.58, width: 17.33, height: 5.47, fontSize: 6 },
  { kind: 'label', text: '１株当たりの割当株式数', top: 86.5, left: 26.07, width: 16.8, height: 2.73, fontSize: 7 },
  { kind: 'label', text: '㉚', top: 86.5, left: 42.87, width: 1.93, height: 2.73 },
  { kind: 'cell', codeLabel: 'C05', top: 86.5, left: 44.8, width: 1.9, height: 2.73 },
  { field: 'mod_ratio', kind: 'input', top: 86.5, left: 46.7, width: 26.99, height: 2.73, align: 'right' },
  { kind: 'label', text: '株', top: 86.5, left: 73.69, width: 1.89, height: 2.73, fontSize: 7 },
  { kind: 'label', text: '１株当たりの割当株式数\n又は交付株式数', top: 89.23, left: 26.07, width: 16.8, height: 2.74, fontSize: 7 },
  { kind: 'label', text: '㉛', top: 89.23, left: 42.87, width: 1.93, height: 2.74 },
  { kind: 'cell', codeLabel: 'C06', top: 89.23, left: 44.8, width: 1.9, height: 2.74 },
  { field: 'mod_ratio2', kind: 'input', top: 89.23, left: 46.7, width: 26.99, height: 2.74, align: 'right' },
  { kind: 'label', text: '株', top: 89.23, left: 73.69, width: 1.89, height: 2.74, fontSize: 7 },
  { kind: 'label', text: '㉜', top: 89.23, left: 75.58, width: 2.0, height: 2.74 },
  { kind: 'cell', codeLabel: 'C07', top: 89.23, left: 77.58, width: 1.94, height: 2.74 },
  { field: '㉜', kind: 'input', readOnly: true, top: 89.23, left: 79.52, width: 13.39, height: 2.74, align: 'right' },
];

const fl = (v: number) => Math.floor(v + 1e-9);

/** 第4表の2（3.類似業種比準価額の計算＋修正） */
export function Table4_2Grid({ getField, updateField, onJump }: TableProps) {
  const raw = (f: string) => getField(T, f);
  const u = (f: string, v: string) => updateField(T, f, v);

  const fmt = (v: number | null) => (v === null ? '' : v.toLocaleString('ja-JP'));
  const yenPart = (v: number | null) => (v === null ? '' : fl(v).toLocaleString('ja-JP'));
  const senPart = (v: number | null) => (v === null ? '' : String(Math.round((v - fl(v)) * 100)).padStart(2, '0'));

  const c = calcTable4(getField);

  // 類似業種の株価の月は第1表の1の課税時期(f14)の月から導出
  const taxMonthRaw = getField('table1_1', 'f14_m');
  const taxMonth = Number(taxMonthRaw.replace(/,/g, '').trim());
  const taxMonthValid = taxMonthRaw.trim() !== '' && Number.isInteger(taxMonth) && taxMonth >= 1 && taxMonth <= 12;
  const prevMonth = (back: number): string => (taxMonthValid ? String(((taxMonth - 1 - back + 12) % 12) + 1) : '');

  const g = (f: string): string => {
    switch (f) {
      case 'h8': case 'h61': return taxMonthRaw;
      case 'h11': case 'h64': return prevMonth(1);
      case 'h13': case 'h67': return prevMonth(2);
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
      case '㉘': return fmt(c.v27);
      case '㉜': return fmt(c.v28);
      default: return raw(f);
    }
  };
  const { mainCells, headerExtra, aspectRatio } = extractCompanyFloatHeader(CELLS, g, u, T);
  return <GridForm cells={mainCells} g={g} u={u} formId={T} width="100%" aspectRatio={aspectRatio} title="第４表の２　類似業種比準価額等の計算明細書（続）" formCode="NTA0VNA210020010" headerExtra={headerExtra} onJump={onJump && ((t) => onJump({ tab: t.tab as TableId, field: t.field }))} />;
}
