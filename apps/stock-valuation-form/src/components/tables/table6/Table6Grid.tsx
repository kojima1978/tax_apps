import { GridForm, type GridCell } from '@/components/ui/GridForm';
import { calcTable4 } from '../table4/Table4Grid';
import { calcTable5 } from '../table5/Table5Grid';
import { calcTable2 } from '../table2/Table2Grid';
import { calcShareholderJudgment } from '../Table1_1Grid';
import type { TableId, TableProps } from '@/types/form';

const T = 'table6' as const;

// ══ 令和8年4月1日以降用の様式 ══
// 円数字が㊱まで再割当（第3表に準じ修正欄が⑨〜⑭に展開）。株式の区分は5行（比準要素数1/株式等保有特定/
// 土地保有特定/開業後3年未満/開業前休業中）＝④⑤⑥⑦⑧。⑤=第7表の3の㉗（旧第8表、データはtable8バケット）。
// 保存フィールド名（mod9_div/mod10_pay等）は旧名を維持。識別コード（J/G/C）を独立セルで再現。

const REFERENCES = [
  { label: '評価通達189（特定の評価会社の株式の評価）', url: 'https://www.nta.go.jp/law/tsutatsu/kihon/sisan/hyoka_new/08/05.htm#a-189' },
  { label: '評価通達187（株式の価額の修正）', url: 'https://www.nta.go.jp/law/tsutatsu/kihon/sisan/hyoka_new/08/04.htm#a-187' },
  { label: '評価通達190〜193（株式に関する権利の評価）', url: 'https://www.nta.go.jp/law/tsutatsu/kihon/sisan/hyoka_new/08/06.htm#a-190' },
];

const fl = (v: number) => Math.floor(v + 1e-9);
const fl10sen = (v: number) => Math.floor(v * 10 + 1e-7) / 10;
const fl2sen = (v: number) => Math.floor(v * 100 + 1e-7) / 100;

// 円・銭サブセル付き金額入力（[コード][円値][円][銭値][銭]）
function yenSenInput(code: string, yenField: string, senField: string, top: number, height: number, codeL: number, yenL: number, yenUnitL: number, senL: number, senUnitL: number, end: number, props: Partial<GridCell> = {}): GridCell[] {
  return [
    { kind: 'cell', codeLabel: code, top, left: codeL, width: +(yenL - codeL).toFixed(2), height },
    { field: yenField, kind: 'input', commaInteger: true, top, left: yenL, width: +(yenUnitL - yenL).toFixed(2), height, align: 'right', ...props },
    { kind: 'label', text: '円', top, left: yenUnitL, width: +(senL - yenUnitL).toFixed(2), height, fontSize: 7 },
    { field: senField, kind: 'input', integerDigits: 2, top, left: senL, width: +(senUnitL - senL).toFixed(2), height, align: 'right', ...props },
    { kind: 'label', text: '銭', top, left: senUnitL, width: +(end - senUnitL).toFixed(2), height, fontSize: 7 },
  ];
}

// 株式の区分5行（④〜⑧）
const KUBUN_ROWS = [
  { field: '④', code: 'C01', top: 22.28, h: 3.79, label: '比準要素数１の会社\nの株式', method: '次のうちいずれか低い方の金額\nイ　②の金額（③の金額があるときは③の金額）\nロ　（①の金額 × 0.25）＋（イの金額 × 0.75）' },
  { field: '⑤', code: 'C02', top: 26.07, h: 2.62, label: '株式等保有特定会社\nの株式', method: '（第７表の３の㉗の金額）' },
  { field: '⑥', code: 'C03', top: 28.69, h: 2.62, label: '土地保有特定会社\nの株式', method: '（②の金額（③の金額があるときは③の金額））' },
  { field: '⑦', code: 'C04', top: 31.31, h: 2.62, label: '開業後３年未満の\n会社等の株式', method: '（②の金額（③の金額があるときは③の金額））' },
  { field: '⑧', code: 'C05', top: 33.93, h: 2.65, label: '開業前又は休業中の\n会社の株式', method: '（②の金額）' },
] as const;

const CELLS: GridCell[] = [
  // 会社名
  { kind: 'label', text: '会　社　名', top: 11.0, left: 56.0, width: 13.98, height: 2.08 },
  { field: 'company', kind: 'input', top: 11.0, left: 69.98, width: 22.53, height: 2.08, align: 'left' },
  // ── 1. 純資産価額方式等による価額 ──
  { kind: 'label', text: '１．純資産価額方式等による価額', top: 13.93, left: 7.25, width: 3.51, height: 36.35, align: 'center' },
  { kind: 'label', text: '１株当たりの\n価額の計算の\n基となる金額', fontSize: 7, top: 13.93, left: 10.76, width: 10.51, height: 6.53 },
  { kind: 'label', text: '①　類 似 業 種 比 準 価 額\n（第４表の２の㉖、㉘又は㉜の金額）\n（円）', fontSize: 6.5, top: 13.93, left: 21.27, width: 22.0, height: 3.88 },
  { kind: 'label', text: '②　１株当たりの純資産価額\n（第５表の⑪の金額）\n（円）', fontSize: 6.5, top: 13.93, left: 43.27, width: 23.05, height: 3.88 },
  { kind: 'label', text: '③　１株当たりの純資産価額の80％相当額\n（第５表の⑫の記載がある場合のその金額）\n（円）', fontSize: 6.5, top: 13.93, left: 66.32, width: 26.11, height: 3.88 },
  { field: '①', kind: 'input', readOnly: true, jumpTo: { tab: 'table4', field: '㉖', hint: 'クリックで転記元（第４表の類似業種比準価額）へ移動します' }, top: 17.81, left: 21.27, width: 22.0, height: 2.65, align: 'right' },
  { field: '②', kind: 'input', readOnly: true, jumpTo: { tab: 'table5', field: '⑪', hint: 'クリックで転記元（第５表の⑪・1株当たりの純資産価額）へ移動します' }, top: 17.81, left: 43.27, width: 23.05, height: 2.65, align: 'right' },
  { field: '③', kind: 'input', readOnly: true, jumpTo: { tab: 'table5', field: '⑫', hint: 'クリックで転記元（第５表の⑫・1株当たりの純資産価額の80％相当額）へ移動します' }, top: 17.81, left: 66.32, width: 26.11, height: 2.65, align: 'right' },
  // 区分テーブル
  { kind: 'label', text: '１株当たりの価額の計算', verticalSectionHeading: { number: '1', text: '株当たりの価額の計算', compact: true }, top: 20.46, left: 10.76, width: 2.62, height: 16.12 },
  { kind: 'label', text: '株 式 の 区 分', top: 20.46, left: 13.38, width: 13.41, height: 1.82 },
  { kind: 'label', text: '１ 株 当 た り の 価 額 の 算 定 方 法 等', top: 20.46, left: 26.79, width: 43.19, height: 1.82 },
  { kind: 'label', text: '１株当たりの価額\n（円）', fontSize: 7, top: 20.46, left: 69.98, width: 22.45, height: 1.82 },
  ...KUBUN_ROWS.flatMap((r): GridCell[] => [
    { kind: 'label', text: r.label, fontSize: 6.5, top: r.top, left: 13.38, width: 13.41, height: r.h },
    { kind: 'label', text: r.method, align: 'left', fontSize: 6.5, top: r.top, left: 26.79, width: 43.19, height: r.h },
    { kind: 'label', text: r.field, top: r.top, left: 69.98, width: 2.42, height: r.h },
    { kind: 'cell', codeLabel: r.code, top: r.top, left: 72.4, width: 2.62, height: r.h },
    { field: r.field, kind: 'input', readOnly: true, top: r.top, left: 75.02, width: 17.41, height: r.h, align: 'right' },
  ]),
  // 株式の価額の修正
  { kind: 'label', text: '株 式 の 価 額 の 修 正', top: 36.58, left: 10.76, width: 2.62, height: 13.7, align: 'center' },
  { kind: 'label', text: '課税時期において\n配当期待権の発生\nしている場合', fontSize: 6.5, top: 36.58, left: 13.38, width: 13.41, height: 3.08 },
  { kind: 'label', text: '⑨　１株当たりの配当金額', fontSize: 7, top: 36.58, left: 26.79, width: 22.0, height: 3.08 },
  ...yenSenInput('J01', 'mod9_div', 'mod9_div_sen', 36.58, 3.08, 48.79, 50.6, 59.79, 61.6, 68.17, 69.98),
  { kind: 'label', text: '⑩　修正後の株式の価額\n（（④、⑤、⑥、⑦又は⑧）－⑨）（円）', fontSize: 6.5, top: 36.58, left: 69.98, width: 22.45, height: 1.54 },
  { field: '⑩', kind: 'input', readOnly: true, top: 39.66, left: 69.98, width: 22.45, height: 2.62, align: 'right' },
  { kind: 'label', text: '課税時期において株式\nの割当てを受ける権\n利、株主となる権利又\nは株式無償交付期待権\nの発生している場合', fontSize: 6, top: 42.28, left: 13.38, width: 13.41, height: 8.0, align: 'left' },
  { kind: 'label', text: '⑪　割当株式１株当たりの払込金額', fontSize: 7, align: 'left', top: 42.28, left: 26.79, width: 22.0, height: 2.62 },
  { kind: 'cell', codeLabel: 'G01', top: 42.28, left: 48.79, width: 1.81, height: 2.62 },
  { field: 'mod10_pay', kind: 'input', commaInteger: true, top: 42.28, left: 50.6, width: 17.57, height: 2.62, align: 'right' },
  { kind: 'label', text: '円', top: 42.28, left: 68.17, width: 1.81, height: 2.62, fontSize: 7 },
  { kind: 'label', text: '⑫　１株当たりの割当株式数', fontSize: 7, align: 'left', top: 44.9, left: 26.79, width: 22.0, height: 2.85 },
  { kind: 'cell', codeLabel: 'C06', top: 44.9, left: 48.79, width: 1.81, height: 2.85 },
  { field: 'mod10_ratio', kind: 'input', top: 44.9, left: 50.6, width: 17.57, height: 2.85, align: 'right' },
  { kind: 'label', text: '株', top: 44.9, left: 68.17, width: 1.81, height: 2.85, fontSize: 7 },
  { kind: 'label', text: '⑬　１株当たりの割当株式数又は\n　　交付株式数', fontSize: 7, align: 'left', top: 47.75, left: 26.79, width: 22.0, height: 2.53 },
  { kind: 'cell', codeLabel: 'C07', top: 47.75, left: 48.79, width: 1.81, height: 2.53 },
  { field: 'mod10_ratio2', kind: 'input', top: 47.75, left: 50.6, width: 17.57, height: 2.53, align: 'right' },
  { kind: 'label', text: '株', top: 47.75, left: 68.17, width: 1.81, height: 2.53, fontSize: 7 },
  { kind: 'label', text: '⑭　修正後の株式の価額\n④、⑤、⑥、⑦又は⑧\n（⑩があるときは⑩）＋⑪×⑫\n÷（１株＋⑬）（円）', fontSize: 6, top: 42.28, left: 69.98, width: 22.45, height: 5.47 },
  { field: '⑭', kind: 'input', readOnly: true, top: 47.75, left: 69.98, width: 22.45, height: 2.53, align: 'right' },
  // ── 2. 配当還元方式による価額 ──
  { kind: 'label', text: '２．配当還元方式による価額', top: 50.48, left: 7.25, width: 3.51, height: 24.56, align: 'center' },
  { kind: 'label', text: '１ 株 当 た り の 資 本 金 等 の 額 、 発 行 済 株 式 数 等', top: 50.48, left: 10.76, width: 81.67, height: 1.88 },
  { kind: 'label', text: '⑮　直前期末の\n資本金等の額\n（千円）', fontSize: 6.5, top: 52.36, left: 13.38, width: 15.23, height: 4.02 },
  { kind: 'label', text: '⑯　直前期末の\n発行済株式数\n（株）', fontSize: 6.5, top: 52.36, left: 28.61, width: 14.66, height: 4.02 },
  { kind: 'label', text: '⑰　直前期末の\n自己株式数\n（株）', fontSize: 6.5, top: 52.36, left: 43.27, width: 14.67, height: 4.02 },
  { kind: 'label', text: '⑱　１株当たりの資本金等\nの額を50円とした場合の\n発行済株式数（⑮÷50円）（株）', fontSize: 6, top: 52.36, left: 57.94, width: 17.08, height: 4.02 },
  { kind: 'label', text: '⑲　１株当たりの\n資本金等の額\n（⑮÷（⑯－⑰））（円）', fontSize: 6, top: 52.36, left: 75.02, width: 17.41, height: 4.02 },
  { kind: 'cell', codeLabel: 'G02', top: 56.38, left: 13.38, width: 1.81, height: 2.62 },
  { field: '⑮', kind: 'input', commaInteger: true, readOnly: true, jumpTo: { tab: 'table4', field: '①', hint: 'クリックで入力元（第４表の１①・直前期末の資本金等の額）へ移動します' }, top: 56.38, left: 15.19, width: 13.42, height: 2.62, align: 'right' },
  { kind: 'cell', codeLabel: 'G03', top: 56.38, left: 28.61, width: 1.85, height: 2.62 },
  { field: '⑯', kind: 'input', commaInteger: true, readOnly: true, jumpTo: { tab: 'table4', field: '②', hint: 'クリックで転記元（第４表の１②・直前期末の発行済株式数）へ移動します' }, top: 56.38, left: 30.46, width: 12.81, height: 2.62, align: 'right' },
  { kind: 'cell', codeLabel: 'G04', top: 56.38, left: 43.27, width: 1.85, height: 2.62 },
  { field: '⑰', kind: 'input', commaInteger: true, readOnly: true, jumpTo: { tab: 'table4', field: '③', hint: 'クリックで転記元（第４表の１③・直前期末の自己株式数）へ移動します' }, top: 56.38, left: 45.12, width: 12.82, height: 2.62, align: 'right' },
  { field: '⑱', kind: 'input', readOnly: true, topRightLabel: '株', top: 56.38, left: 57.94, width: 17.08, height: 2.62, align: 'right' },
  { kind: 'cell', codeLabel: 'C08', top: 56.38, left: 75.02, width: 2.42, height: 2.62 },
  { field: '⑲', kind: 'input', readOnly: true, topRightLabel: '円', top: 56.38, left: 77.44, width: 14.99, height: 2.62, align: 'right' },
  // 配当金額表
  { kind: 'label', text: '直 前 期 末 以 前 ２ 年 間 の 配 当 金 額　（千円）', top: 59.0, left: 10.76, width: 81.67, height: 2.0 },
  { kind: 'label', text: '事 業 年 度', top: 61.0, left: 10.76, width: 10.51, height: 2.36 },
  { kind: 'label', text: '⑳　年 配 当 金 額', top: 61.0, left: 21.27, width: 16.52, height: 2.36, fontSize: 7 },
  { kind: 'label', text: '㉑　左のうち非経常的\n　　な配当金額', top: 61.0, left: 37.79, width: 16.48, height: 2.36, fontSize: 6.5 },
  { kind: 'label', text: '㉒　差引経常的な年配当\n　　金額（⑳－㉑）', top: 61.0, left: 54.27, width: 18.13, height: 2.36, fontSize: 6.5 },
  { kind: 'label', text: '㉓　年平均配当金額\n　　（（㋑＋㋺）÷２）', top: 61.0, left: 72.4, width: 20.03, height: 2.36, fontSize: 6.5 },
  { kind: 'label', text: '直　前　期', top: 63.36, left: 10.76, width: 10.51, height: 2.62 },
  { kind: 'cell', codeLabel: 'G05', top: 63.36, left: 21.27, width: 1.86, height: 2.62 },
  { field: 'f61', kind: 'input', commaInteger: true, readOnly: true, jumpTo: { tab: 'table4', field: 'f28', hint: 'クリックで入力元（第４表・⑥年配当金額・直前期）へ移動します' }, top: 63.36, left: 23.13, width: 14.66, height: 2.62, align: 'right' },
  { kind: 'cell', codeLabel: 'G07', top: 63.36, left: 37.79, width: 1.82, height: 2.62 },
  { field: 'f62', kind: 'input', commaInteger: true, readOnly: true, jumpTo: { tab: 'table4', field: 'f29', hint: 'クリックで入力元（第４表・⑦非経常的な配当金額・直前期）へ移動します' }, top: 63.36, left: 39.61, width: 14.66, height: 2.62, align: 'right' },
  { kind: 'label', text: '㋑', top: 63.36, left: 54.27, width: 1.85, height: 2.62 },
  { kind: 'cell', codeLabel: 'G09', top: 63.36, left: 56.12, width: 1.82, height: 2.62 },
  { field: '㋑', kind: 'input', readOnly: true, top: 63.36, left: 57.94, width: 14.46, height: 2.62, align: 'right' },
  { kind: 'label', text: '直 前 々 期', top: 65.98, left: 10.76, width: 10.51, height: 2.62 },
  { kind: 'cell', codeLabel: 'G06', top: 65.98, left: 21.27, width: 1.86, height: 2.62 },
  { field: 'f66', kind: 'input', commaInteger: true, readOnly: true, jumpTo: { tab: 'table4', field: 'f32', hint: 'クリックで入力元（第４表・⑥年配当金額・直前々期）へ移動します' }, top: 65.98, left: 23.13, width: 14.66, height: 2.62, align: 'right' },
  { kind: 'cell', codeLabel: 'G08', top: 65.98, left: 37.79, width: 1.82, height: 2.62 },
  { field: 'f67', kind: 'input', commaInteger: true, readOnly: true, jumpTo: { tab: 'table4', field: 'f33', hint: 'クリックで入力元（第４表・⑦非経常的な配当金額・直前々期）へ移動します' }, top: 65.98, left: 39.61, width: 14.66, height: 2.62, align: 'right' },
  { kind: 'label', text: '㋺', top: 65.98, left: 54.27, width: 1.85, height: 2.62 },
  { kind: 'cell', codeLabel: 'G10', top: 65.98, left: 56.12, width: 1.82, height: 2.62 },
  { field: '㋺', kind: 'input', readOnly: true, top: 65.98, left: 57.94, width: 14.46, height: 2.62, align: 'right' },
  { kind: 'cell', codeLabel: 'G11', top: 63.36, left: 72.4, width: 1.86, height: 5.24 },
  { field: '㉓', kind: 'input', readOnly: true, topRightLabel: '千円', top: 63.36, left: 74.26, width: 18.17, height: 5.24, align: 'right' },
  // ㉔ 1株50円年配当
  { kind: 'label', text: '㉔　１株（50円）当たりの年配当金額\n（㉓÷⑱）', fontSize: 7, top: 68.6, left: 10.76, width: 27.03, height: 2.63 },
  ...yenSenInput('J02', '㉔円', '㉔銭', 68.6, 2.63, 37.79, 39.61, 48.79, 50.6, 57.94, 59.79, { readOnly: true }),
  { kind: 'label', text: 'この金額が２円50銭未満の場合は\n２円50銭とします。', align: 'left', top: 68.6, left: 59.79, width: 32.64, height: 2.63, fontSize: 6 },
  // ㉕㉖
  { kind: 'label', text: '㉕　配 当 還 元 価 額\n（（㉔÷10％）×（⑲÷50円））', fontSize: 7, top: 71.23, left: 10.76, width: 21.51, height: 3.61 },
  { kind: 'cell', codeLabel: 'C09', top: 71.23, left: 32.27, width: 1.86, height: 3.61 },
  { field: '㉕', kind: 'input', readOnly: true, top: 71.23, left: 34.13, width: 10.99, height: 3.61, align: 'right' },
  { kind: 'label', text: '円', top: 71.23, left: 45.12, width: 1.82, height: 3.61, fontSize: 7 },
  { kind: 'label', text: '㉖　配当還元方式による価額\n㉕の金額が、純資産価額方式等により計算した価額を\n超える場合には、純資産価額方式等により計算した\n価額とします。', align: 'left', fontSize: 6, top: 71.23, left: 46.94, width: 30.5, height: 3.61 },
  { kind: 'cell', codeLabel: 'C10', top: 71.23, left: 77.44, width: 1.81, height: 3.61 },
  { field: '㉖', kind: 'input', readOnly: true, top: 71.23, left: 79.25, width: 11.0, height: 3.61, align: 'right' },
  { kind: 'label', text: '円', top: 71.23, left: 90.25, width: 2.18, height: 3.61, fontSize: 7 },
  // ── 3. 株式に関する権利の評価（1及び2に共通） ──
  { kind: 'label', text: '３．株式に関する権利の評価（１及び２に共通）', top: 75.04, left: 7.25, width: 3.51, height: 18.55, align: 'center' },
  { kind: 'label', text: '配　当　期　待　権', ariaLabel: '配当期待権を選択', toggleField: 'right_haito', highlightWhen: (g) => g('right_haito') === '1', top: 75.04, left: 10.76, width: 17.85, height: 5.33 },
  { kind: 'label', text: '㉗　１株当たりの\n予想配当金額', fontSize: 7, top: 75.04, left: 28.61, width: 22.0, height: 2.71 },
  { kind: 'label', text: '㉘　源泉徴収されるべき\n所得税相当額', fontSize: 7, top: 75.04, left: 50.6, width: 21.8, height: 2.71 },
  { kind: 'label', text: '㉙　配当期待権の価額\n（㉗－㉘）', fontSize: 7, top: 75.04, left: 72.4, width: 20.03, height: 2.71 },
  ...yenSenInput('J03', 'exp_div', 'exp_div_sen', 77.75, 2.62, 28.61, 30.46, 39.61, 41.46, 46.94, 48.79),
  ...yenSenInput('J04', 'exp_tax', 'exp_tax_sen', 77.75, 2.62, 50.6, 52.46, 59.79, 61.6, 66.32, 68.17),
  ...yenSenInput('J05', '㉙円', 'f82', 77.75, 2.62, 72.4, 74.26, 82.92, 84.77, 90.25, 92.43, { readOnly: true }),
  // 株式の割当てを受ける権利
  { kind: 'label', text: '株式の割当てを受ける権利\n（割当株式１株当たりの価額）', fontSize: 6.5, ariaLabel: '割当てを受ける権利を選択', toggleField: 'right_wariate', highlightWhen: (g) => g('right_wariate') === '1', top: 80.37, left: 10.76, width: 17.85, height: 5.1 },
  { kind: 'label', text: '㉚　⑭の金額\n（配当還元方式の場合は㉖の金額）', fontSize: 6.5, top: 80.37, left: 28.61, width: 22.0, height: 2.55 },
  { kind: 'label', text: '㉛　割当株式１株当たりの\n払込金額', fontSize: 6.5, top: 80.37, left: 50.6, width: 21.8, height: 2.55 },
  { kind: 'label', text: '㉜　株式の割当てを受ける権利\nの価額（㉚－㉛）', fontSize: 6.5, top: 80.37, left: 72.4, width: 20.03, height: 2.55 },
  { kind: 'cell', codeLabel: 'G12', top: 82.92, left: 28.61, width: 1.85, height: 2.55 },
  { field: '㉚', kind: 'input', readOnly: true, top: 82.92, left: 30.46, width: 17.51, height: 2.55, align: 'right' },
  { kind: 'label', text: '円', top: 82.92, left: 47.97, width: 1.82, height: 2.55, fontSize: 7 },
  { kind: 'cell', codeLabel: 'G13', top: 82.92, left: 50.6, width: 1.86, height: 2.55 },
  { field: 'r24_pay', kind: 'input', commaInteger: true, top: 82.92, left: 52.46, width: 17.52, height: 2.55, align: 'right' },
  { kind: 'label', text: '円', top: 82.92, left: 69.98, width: 1.19, height: 2.55, fontSize: 7 },
  { kind: 'cell', codeLabel: 'C11', top: 82.92, left: 72.4, width: 2.37, height: 2.55 },
  { field: '㉜', kind: 'input', readOnly: true, top: 82.92, left: 74.77, width: 15.48, height: 2.55, align: 'right' },
  { kind: 'label', text: '円', top: 82.92, left: 90.25, width: 2.18, height: 2.55, fontSize: 7 },
  // 株主となる権利
  { kind: 'label', text: '株 主 と な る 権 利\n（割当株式１株当たりの価額）', fontSize: 6.5, ariaLabel: '株主となる権利を選択', toggleField: 'right_kabunushi', highlightWhen: (g) => g('right_kabunushi') === '1', top: 85.47, left: 10.76, width: 17.85, height: 3.99 },
  { kind: 'label', text: '⑭の金額（配当還元方式の場合は㉖の金額）\n（課税時期後にその株主となる権利につき払い込むべき\n金額があるときは、その金額を控除した金額）', align: 'left', fontSize: 6, top: 85.47, left: 28.61, width: 43.79, height: 3.99 },
  { kind: 'label', text: '㉝　株主となる権利の価額', fontSize: 7, top: 85.47, left: 72.4, width: 20.03, height: 1.37 },
  { kind: 'cell', codeLabel: 'C12', top: 86.84, left: 72.4, width: 2.37, height: 2.62 },
  { field: '㉝', kind: 'input', readOnly: true, top: 86.84, left: 74.77, width: 15.48, height: 2.62, align: 'right' },
  { kind: 'label', text: '円', top: 86.84, left: 90.25, width: 2.18, height: 2.62, fontSize: 7 },
  // 株式無償交付期待権
  { kind: 'label', text: '株 式 無 償 交 付 期 待 権\n（交付される株式１株当たりの価額）', fontSize: 6, ariaLabel: '無償交付期待権を選択', toggleField: 'right_musho', highlightWhen: (g) => g('right_musho') === '1', top: 89.46, left: 10.76, width: 17.85, height: 3.9 },
  { kind: 'label', text: '⑭の金額（配当還元方式の場合は㉖の金額）', align: 'left', fontSize: 6.5, top: 89.46, left: 28.61, width: 43.79, height: 3.9 },
  { kind: 'label', text: '㉞　株式無償交付期待権の価額', fontSize: 7, top: 89.46, left: 72.4, width: 20.03, height: 1.39 },
  { kind: 'cell', codeLabel: 'C13', top: 90.85, left: 72.4, width: 2.37, height: 2.51 },
  { field: '㉞', kind: 'input', readOnly: true, top: 90.85, left: 74.77, width: 15.48, height: 2.51, align: 'right' },
  { kind: 'label', text: '円', top: 90.85, left: 90.25, width: 2.18, height: 2.51, fontSize: 7 },
  // ── 4. 株式及び株式に関する権利の価額 ──
  { kind: 'label', text: '４．株式及び株式に関する\n権利の価額\n（１．及び２．に共通）', fontSize: 6.5, top: 93.59, left: 7.25, width: 15.88, height: 3.48 },
  { kind: 'label', text: '㉟　株式の評価額', fontSize: 7, top: 93.59, left: 23.13, width: 11.0, height: 3.48 },
  { kind: 'cell', codeLabel: 'C14', top: 93.59, left: 34.13, width: 1.81, height: 3.48 },
  { field: '㉟', kind: 'input', readOnly: true, top: 93.59, left: 35.94, width: 14.66, height: 3.48, align: 'right' },
  { kind: 'label', text: '円', top: 93.59, left: 50.6, width: 1.86, height: 3.48, fontSize: 7 },
  { kind: 'label', text: '㊱　株式に関する\n権利の評価額', fontSize: 7, top: 93.59, left: 52.46, width: 11.0, height: 3.48 },
  { kind: 'cell', codeLabel: 'J06', top: 93.59, left: 63.46, width: 2.86, height: 3.48 },
  { field: '㊱', kind: 'input', readOnly: true, multiline: true, fontSize: 7, top: 93.59, left: 66.32, width: 26.11, height: 3.48 },
];

/** 第6表（CSSグリッド方式・令和8年4月1日以降用） */
export function Table6Grid({ getField, updateField, onJump }: TableProps) {
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

  const t4 = calcTable4(getField);
  const t5 = calcTable5(getField);
  const t2 = calcTable2(getField);
  const judge = calcShareholderJudgment(getField);

  // 1. 純資産価額方式等
  const v1 = t4.v28 ?? t4.v27 ?? t4.v26;  // ①
  const v2 = t5['⑪'] ?? null;             // ②
  const v3 = t5['⑫'] ?? null;             // ③（80%相当額）
  const iValue = v3 ?? v2;
  const p4 = iValue === null ? null : v1 === null ? fl(iValue) : fl(Math.min(iValue, v1 * 0.25 + iValue * 0.75)); // ④
  const p5 = numOf(getField('table8', '㉗'));           // ⑤ 第7表の3の㉗
  const p6 = iValue === null ? null : fl(iValue);        // ⑥
  const p7 = iValue === null ? null : fl(iValue);        // ⑦
  const p8 = v2 === null ? null : fl(v2);                // ⑧
  const baseByResult: Record<number, number | null> = { 1: p4, 2: p5, 3: p6, 4: p7, 5: p8 };
  const base = baseByResult[t2.result] ?? null;

  // 修正（⑩＝base－配当金額、⑭＝(⑩(なければbase)＋⑪×⑫)÷(1株＋⑬)）
  const mod9Div = amountWithSen('mod9_div', 'mod9_div_sen');
  const v10 = base !== null && mod9Div !== null ? fl(base - mod9Div) : null;
  const mod10Pay = num('mod10_pay'), mod10Ratio = num('mod10_ratio'), mod10Ratio2 = num('mod10_ratio2');
  const base14 = v10 ?? base;
  const v14 = base14 !== null && mod10Ratio2 !== null ? fl((base14 + (mod10Pay ?? 0) * (mod10Ratio ?? 0)) / (1 + mod10Ratio2)) : null;
  const jun = v14 ?? v10 ?? base; // 純資産価額方式等の最終価額

  // 2. 配当還元方式（⑮⑯⑰は第4表①②③を初期表示・手入力上書き可）
  const effStr = (own: string, fb: string) => (raw(own).trim() !== '' ? raw(own) : getField('table4', fb));
  const cap = numOf(effStr('⑮', '①'));
  const issued = numOf(effStr('⑯', '②'));
  const treasury = numOf(effStr('⑰', '③'));
  const v18 = cap !== null ? fl(cap * 20) : null; // ⑱=⑮×1000÷50
  const sharesNet = issued !== null ? issued - (treasury ?? 0) : null;
  let v19: number | null = null;
  let v19disp = '';
  if (cap !== null && sharesNet !== null && sharesNet > 0) {
    const v = (cap * 1000) / sharesNet;
    if (fl(v) > 0) { v19 = fl(v); v19disp = v19.toLocaleString('ja-JP'); }
    else { const m = Math.pow(10, String(Math.floor(sharesNet)).length); v19 = Math.floor(v * m + 1e-9) / m; v19disp = String(v19); }
  }
  const t4num = (f: string) => numOf(getField('table4', f));
  const subT4 = (a: string, b: string) => { const x = t4num(a); return x === null ? null : x - (t4num(b) ?? 0); };
  const ia = subT4('f28', 'f29');  // ㋑
  const ro = subT4('f32', 'f33');  // ㋺
  const v23 = ia !== null && ro !== null ? (ia + ro) / 2 : null; // ㉓年平均配当金額
  const v24raw = v23 !== null && v18 !== null && v18 > 0 ? fl10sen((v23 * 1000) / v18) : null; // ㉔切上前
  const v24 = v24raw === null ? null : Math.max(2.5, v24raw);
  const v24Floored = v24raw !== null && v24raw < 2.5;
  const v25 = v24 !== null && v19 !== null ? fl((v24 * v19) / 5) : null; // ㉕=㉔÷10%×⑲÷50円
  const v26 = v25 === null ? null : jun !== null && v25 > jun ? jun : v25; // ㉖

  const mode = raw('hoshiki');
  const useHaito = mode === 'haito' ? true : mode === 'junshisan' ? false : judge.isDozokuFinal === null ? null : !judge.isDozokuFinal;
  const finalPrice = useHaito === null ? null : useHaito ? v26 ?? v25 : jun; // ㉟

  // 3. 権利
  const expDiv = amountWithSen('exp_div', 'exp_div_sen');
  const expTax = amountWithSen('exp_tax', 'exp_tax_sen');
  const v29 = expDiv !== null ? fl2sen(expDiv - (expTax ?? 0)) : null; // ㉙配当期待権
  const baseRight = useHaito === null ? null : useHaito ? v26 ?? v25 : jun; // ⑭(配当還元は㉖)
  const v32 = baseRight !== null ? fl(baseRight - (num('r24_pay') ?? 0)) : null; // ㉜
  const v33 = baseRight === null ? null : fl(baseRight); // ㉝
  const v34 = baseRight; // ㉞

  const RIGHTS = [
    { key: 'right_haito', mark: '㉙', text: v29 === null ? null : `㉙ ${fl(v29).toLocaleString('ja-JP')}円${String(Math.round((v29 - fl(v29)) * 100)).padStart(2, '0')}銭` },
    { key: 'right_wariate', mark: '㉜', text: v32 === null ? null : `㉜ ${v32.toLocaleString('ja-JP')}円` },
    { key: 'right_kabunushi', mark: '㉝', text: v33 === null ? null : `㉝ ${v33.toLocaleString('ja-JP')}円` },
    { key: 'right_musho', mark: '㉞', text: v34 === null ? null : `㉞ ${v34.toLocaleString('ja-JP')}円` },
  ];
  const rightsText = RIGHTS.filter((r) => raw(r.key) === '1').map((r) => r.text ?? `${r.mark} －`).join('\n');

  const g = (f: string): string => {
    switch (f) {
      case '①': return fmt(v1); case '②': return fmt(v2); case '③': return fmt(v3);
      case '④': return fmt(p4); case '⑤': return getField('table8', '㉗');
      case '⑥': return fmt(p6); case '⑦': return fmt(p7); case '⑧': return fmt(p8);
      case 'mod9_div': return yenPart(num('mod9_div'));
      case 'mod9_div_sen': return raw('mod9_div_sen').trim() !== '' ? raw('mod9_div_sen') : senPart(num('mod9_div'));
      case '⑩': return fmt(v10);
      case '⑭': return fmt(v14);
      case '⑮': return raw('⑮').trim() !== '' ? raw('⑮') : getField('table4', '①');
      case '⑯': return raw('⑯').trim() !== '' ? raw('⑯') : getField('table4', '②');
      case '⑰': return raw('⑰').trim() !== '' ? raw('⑰') : getField('table4', '③');
      case '⑱': return fmt(v18); case '⑲': return v19disp;
      case 'f61': return getField('table4', 'f28'); case 'f62': return getField('table4', 'f29');
      case 'f66': return getField('table4', 'f32'); case 'f67': return getField('table4', 'f33');
      case '㋑': return fmtDec1(ia); case '㋺': return fmtDec1(ro);
      case '㉓': return fmtDec1(v23);
      case '㉔円': return yenPart(v24); case '㉔銭': return senPart(v24);
      case '㉕': return fmt(v25); case '㉖': return fmt(v26);
      case 'exp_div': return yenPart(num('exp_div'));
      case 'exp_div_sen': return raw('exp_div_sen').trim() !== '' ? raw('exp_div_sen') : senPart(num('exp_div'));
      case 'exp_tax': return yenPart(num('exp_tax'));
      case 'exp_tax_sen': return raw('exp_tax_sen').trim() !== '' ? raw('exp_tax_sen') : senPart(num('exp_tax'));
      case '㉙円': return yenPart(v29); case 'f82': return senPart(v29);
      case '㉚': return fmt(baseRight); case '㉜': return fmt(v32);
      case '㉝': return fmt(v33); case '㉞': return fmt(v34);
      case '㉟': return finalPrice === null ? '' : fmt(finalPrice);
      case '㊱': return rightsText;
      default: return raw(f);
    }
  };

  const toolbar = (
    <span className="no-print" style={{ display: 'flex', alignItems: 'center', fontSize: 11, whiteSpace: 'nowrap' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        適用方式：
        <select id="table6-hoshiki-toolbar" name="table6.hoshiki" value={raw('hoshiki')} onChange={(e) => u('hoshiki', e.target.value)} style={{ fontSize: 11, padding: '1px 2px' }}>
          <option value="">自動（第1表の判定に連動）</option>
          <option value="junshisan">純資産価額方式等</option>
          <option value="haito">配当還元方式</option>
        </select>
      </label>
    </span>
  );
  const noteText = v24Floored && v24raw !== null
    ? `計算値 ${yenPart(v24raw)}円${senPart(v24raw)}銭\n→ 下限の２円50銭を適用`
    : 'この金額が２円50銭未満の場合は\n２円50銭とします。';
  const cells = CELLS.map((cell) => {
    if (cell.kind === 'label' && cell.text === 'この金額が２円50銭未満の場合は\n２円50銭とします。') {
      return { ...cell, text: noteText, highlightWhen: () => v24Floored };
    }
    if (cell.field === '㉔円' || cell.field === '㉔銭') return { ...cell, highlightWhen: () => v24Floored };
    return cell;
  });
  return <GridForm cells={cells} g={g} u={u} formId={T} width="100%" title="第６表　特定の評価会社の株式及び株式に関する権利の価額の計算明細書" toolbar={toolbar} references={REFERENCES} onJump={onJump && ((t) => onJump({ tab: t.tab as TableId, field: t.field }))} />;
}
