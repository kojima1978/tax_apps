import { GridForm, type GridCell } from '@/components/ui/GridForm';
import { calcTable4 } from './Table4Grid';
import { extractCompanyFloatHeader } from '../companyFloatHeader';
import type { TableId, TableProps } from '@/types/form';

// ══ 第4表の1（令和8年4月1日以降用）══
// 旧第4表の前半（1.資本金等の計算 ＋ 2.比準要素等の金額の計算 ＋ 判定要素の金額の集約ブロック）。
// データは従来どおり 'table4' バケットに保存（calcTable4・第2/3/7表の参照を維持）。
// 3.類似業種比準価額の計算は第4表の2へ分離。判定要素（Ⓑ1/Ⓒ1/D1…）は右列→下部集約ブロックへ移動。

const T = 'table4' as const;

const CW = 1.89; // 標準コード／記号セル幅

/** [コードセル][値入力] を生成（コード左＝値左−CW） */
function ci(field: string, code: string, top: number, h: number, valL: number, valEnd: number, extra: Partial<GridCell> = {}): GridCell[] {
  return [
    { kind: 'cell', codeLabel: code, top, left: +(valL - CW).toFixed(2), width: CW, height: h },
    { field, kind: 'input', commaInteger: true, top, left: valL, width: +(valEnd - valL).toFixed(2), height: h, align: 'right', ...extra },
  ];
}
/** [記号セル][自動計算値] を生成（㋑㋺㋩ ㊁㋭㋬ ㋣㋠ 等の丸カタカナ） */
function mi(field: string, mark: string, top: number, h: number, valL: number, valEnd: number, extra: Partial<GridCell> = {}): GridCell[] {
  return [
    { kind: 'label', text: mark, top, left: +(valL - CW).toFixed(2), width: CW, height: h },
    { field, kind: 'input', readOnly: true, top, left: valL, width: +(valEnd - valL).toFixed(2), height: h, align: 'right', ...extra },
  ];
}

const CELLS: GridCell[] = [
  // 表内の計算区分を、見た目を変えずに意味のあるDOMグループとしてまとめる。
  { kind: 'cell', text: '1株当たりの資本金等の額等の計算', ariaLabel: '1株当たりの資本金等の額等の計算', semanticRole: 'group', groupBorder: false, top: 14.87, left: 7.17, width: 85.26, height: 7.3 },
  { kind: 'cell', text: '比準要素等の金額の計算', ariaLabel: '比準要素等の金額の計算', semanticRole: 'group', groupBorder: false, top: 22.39, left: 7.17, width: 85.26, height: 57.89 },
  // ── 会社名 ──
  { kind: 'label', text: '会　社　名', top: 11.28, left: 57.7, width: 12.5, height: 2.71 },
  { field: 'company', kind: 'input', top: 11.28, left: 70.2, width: 22.31, height: 2.71, align: 'left' },
  // ── 1. 1株当たりの資本金等の額等の計算 ──
  { kind: 'label', text: '１．１株当たりの資本金\n　　等の額等の計算', semanticRole: 'columnheader', align: 'left', noWrap: true, top: 14.87, left: 7.17, width: 15.92, height: 7.3, fontSize: 7.5 },
  { kind: 'label', text: '①　直前期末の\n　　資本金等の額', bottomLabel: '（千円）', bottomLabelAlign: 'right', fontSize: 7, top: 14.87, left: 23.09, width: 13.25, height: 4.7 },
  { kind: 'label', text: '②　直前期末の\n　　発行済株式数', bottomLabel: '（株）', bottomLabelAlign: 'right', fontSize: 7, top: 14.87, left: 36.34, width: 13.86, height: 4.7 },
  { kind: 'label', text: '③　直前期末の\n　　自己株式数', bottomLabel: '（株）', bottomLabelAlign: 'right', fontSize: 7, top: 14.87, left: 50.2, width: 13.26, height: 4.7 },
  { kind: 'label', text: '④　１株当たりの\n　　資本金等の額\n（①÷（②－③））', bottomLabel: '（円）', bottomLabelAlign: 'right', fontSize: 7, top: 14.87, left: 63.46, width: 13.82, height: 4.7 },
  { kind: 'label', text: '⑤　１株当たりの資本金等の\n　　額を50円とした場合の発\n　　行済株式数（①÷50円）', bottomLabel: '（株）', bottomLabelAlign: 'right', fontSize: 6.5, top: 14.87, left: 77.28, width: 15.15, height: 4.7 },
  ...ci('①', 'G01', 19.57, 2.6, 24.98, 36.34),
  ...ci('②', 'G02', 19.57, 2.6, 38.24, 50.2, { readOnly: true, jumpTo: { tab: 'table1_1', field: '⑤', hint: 'クリックで入力元（第１表の１⑤・発行済株式数）へ移動します' } }),
  ...ci('③', 'G03', 19.57, 2.6, 52.1, 63.46, { readOnly: true, jumpTo: { tab: 'table1_1', field: 'f63', hint: 'クリックで入力元（第１表の１・自己株式数）へ移動します' } }),
  { field: '④', kind: 'input', readOnly: true, top: 19.57, left: 63.46, width: 13.82, height: 2.6, align: 'right' },
  { field: '⑤', kind: 'input', readOnly: true, top: 19.57, left: 77.28, width: 15.15, height: 2.6, align: 'right' },
  // ── 2. 比準要素等の金額の計算（左端の縦見出し：判定要素ブロックまで通し） ──
  { kind: 'label', text: '２．比準要素等の金額の計算', semanticRole: 'columnheader', top: 22.39, left: 7.17, width: 2.5, height: 57.89, align: 'center' },
  // === 年配当金額ブロック ===
  { kind: 'label', text: '１株（50円）当たりの年配当金額', top: 22.39, left: 9.67, width: 3.38, height: 13.56 },
  { kind: 'label', text: '直 前 期 末 以 前 ２ （ ３ ） 年 間 の 年 平 均 配 当 金 額', bottomLabel: '（千円）', bottomLabelAlign: 'right', top: 22.39, left: 13.05, width: 79.38, height: 2.34 },
  { kind: 'label', text: '事 業 年 度', top: 24.73, left: 13.05, width: 6.25, height: 2.96 },
  { kind: 'label', text: '⑥　年 配 当 金 額', top: 24.73, left: 19.3, width: 15.15, height: 2.96, fontSize: 7 },
  { kind: 'label', text: '⑦　左のうち非経常\n　　的な配当金額', top: 24.73, left: 34.45, width: 15.75, height: 2.96, fontSize: 7 },
  { kind: 'label', text: '⑧　差引経常的な年配当\n　　金額（⑥－⑦）', top: 24.73, left: 50.2, width: 17.04, height: 2.96, fontSize: 7 },
  { kind: 'label', text: '年 平 均 配 当 金 額', top: 24.73, left: 67.24, width: 25.19, height: 2.96 },
  { kind: 'label', text: '直　前　期', top: 27.69, left: 13.05, width: 6.25, height: 2.79 },
  ...ci('f28', 'G04', 27.69, 2.79, 21.19, 34.45),
  ...ci('f29', 'G07', 27.69, 2.79, 36.34, 50.2),
  ...mi('㋑', '㋑', 27.69, 2.79, 52.1, 67.24),
  { kind: 'label', text: '直 前 々 期', top: 30.48, left: 13.05, width: 6.25, height: 2.71 },
  ...ci('f32', 'G05', 30.48, 2.71, 21.19, 34.45),
  ...ci('f33', 'G08', 30.48, 2.71, 36.34, 50.2),
  ...mi('㋺', '㋺', 30.48, 2.71, 52.1, 67.24),
  { kind: 'label', text: '直前々期\nの前期', top: 33.19, left: 13.05, width: 6.25, height: 2.76, fontSize: 7 },
  ...ci('f36', 'G06', 33.19, 2.76, 21.19, 34.45),
  ...ci('f37', 'G09', 33.19, 2.76, 36.34, 50.2),
  ...mi('㋩', '㋩', 33.19, 2.76, 52.1, 67.24),
  // ⑨=(㋑+㋺)÷2（上半分）、⑩=(㋺+㋩)÷2（下半分）
  { kind: 'label', text: '⑨', top: 27.69, left: 67.24, width: CW, height: 4.13 },
  { kind: 'label', text: '（㋑＋㋺）÷２', top: 27.69, left: 69.14, width: 23.29, height: 1.4, fontSize: 7 },
  { field: '⑨', kind: 'input', readOnly: true, top: 29.09, left: 69.14, width: 23.29, height: 2.73, align: 'right' },
  { kind: 'label', text: '⑩', top: 31.82, left: 67.24, width: CW, height: 4.13 },
  { kind: 'label', text: '（㋺＋㋩）÷２', top: 31.82, left: 69.14, width: 23.29, height: 1.4, fontSize: 7 },
  { field: '⑩', kind: 'input', readOnly: true, top: 33.22, left: 69.14, width: 23.29, height: 2.73, align: 'right' },
  // === 年利益金額ブロック ===
  { kind: 'label', text: '１株（50円）当たりの年利益金額', top: 35.95, left: 9.67, width: 3.38, height: 13.71 },
  { kind: 'label', text: '直 前 期 末 以 前 ２ （ ３ ） 年 間 の 利 益 金 額', bottomLabel: '（千円）', bottomLabelAlign: 'right', top: 35.95, left: 13.05, width: 79.38, height: 2.4 },
  { kind: 'label', text: '事 業 年 度', top: 38.35, left: 13.05, width: 6.25, height: 3.19 },
  { kind: 'label', text: '⑪　法人税の\n　　課税所得金額', top: 38.35, left: 19.3, width: 13.25, height: 3.19, fontSize: 6.5 },
  { kind: 'label', text: '⑫　非経常的な\n　　利益金額', top: 38.35, left: 32.55, width: 11.37, height: 3.19, fontSize: 6.5 },
  { kind: 'label', text: '⑬　受取配当等の\n　　益金不算入額', top: 38.35, left: 43.92, width: 11.96, height: 3.19, fontSize: 6.5 },
  { kind: 'label', text: '⑭　左の所得税額', top: 38.35, left: 55.88, width: 11.36, height: 3.19, fontSize: 6.5 },
  { kind: 'label', text: '⑮　損金算入した\n　　繰越欠損金の\n　　控除額', top: 38.35, left: 67.24, width: 11.93, height: 3.19, fontSize: 6.5 },
  { kind: 'label', text: '⑯　差引利益金額\n　　（⑪－⑫＋⑬\n　　－⑭＋⑮）', top: 38.35, left: 79.17, width: 13.26, height: 3.19, fontSize: 6.5 },
  { kind: 'label', text: '直　前　期', top: 41.54, left: 13.05, width: 6.25, height: 2.71 },
  ...ci('e18', 'G10', 41.54, 2.71, 21.19, 32.55, { signedCommaInteger: true, commaInteger: false }),
  ...ci('e19', 'G13', 41.54, 2.71, 34.45, 43.92),
  ...ci('e20', 'G16', 41.54, 2.71, 45.81, 55.88),
  ...ci('e21', 'G19', 41.54, 2.71, 57.78, 67.24),
  ...ci('e22', 'G22', 41.54, 2.71, 69.14, 79.17),
  ...mi('㊁', '㊁', 41.54, 2.71, 81.06, 92.43),
  { kind: 'label', text: '直 前 々 期', top: 44.25, left: 13.05, width: 6.25, height: 2.7 },
  ...ci('e25', 'G11', 44.25, 2.7, 21.19, 32.55, { signedCommaInteger: true, commaInteger: false }),
  ...ci('e26', 'G14', 44.25, 2.7, 34.45, 43.92),
  ...ci('e27', 'G17', 44.25, 2.7, 45.81, 55.88),
  ...ci('e28', 'G20', 44.25, 2.7, 57.78, 67.24),
  ...ci('e29', 'G23', 44.25, 2.7, 69.14, 79.17),
  ...mi('㋭', '㋭', 44.25, 2.7, 81.06, 92.43),
  { kind: 'label', text: '直前々期\nの前期', top: 46.95, left: 13.05, width: 6.25, height: 2.71, fontSize: 7 },
  ...ci('e32', 'G12', 46.95, 2.71, 21.19, 32.55, { signedCommaInteger: true, commaInteger: false }),
  ...ci('e33', 'G15', 46.95, 2.71, 34.45, 43.92),
  ...ci('e34', 'G18', 46.95, 2.71, 45.81, 55.88),
  ...ci('e35', 'G21', 46.95, 2.71, 57.78, 67.24),
  ...ci('e36', 'G24', 46.95, 2.71, 69.14, 79.17),
  ...mi('㋬', '㋬', 46.95, 2.71, 81.06, 92.43),
  // === 純資産価額ブロック ===
  { kind: 'label', text: '１株（50円）当たりの純資産価額', top: 49.66, left: 9.67, width: 3.38, height: 10.62 },
  { kind: 'label', text: '直 前 期 末 （ 直 前 々 期 末 ） の 純 資 産 価 額', bottomLabel: '（千円）', bottomLabelAlign: 'right', top: 49.66, left: 13.05, width: 79.38, height: 2.45 },
  { kind: 'label', text: '事 業 年 度', top: 52.11, left: 13.05, width: 6.25, height: 2.79 },
  { kind: 'label', text: '⑰　資 本 金 等 の 額', top: 52.11, left: 19.3, width: 24.62, height: 2.79 },
  { kind: 'label', text: '⑱　利 益 積 立 金 額', top: 52.11, left: 43.92, width: 23.32, height: 2.79 },
  { kind: 'label', text: '⑲　純資産価額（⑰＋⑱）', top: 52.11, left: 67.24, width: 25.19, height: 2.79, fontSize: 7 },
  { kind: 'label', text: '直　前　期', top: 54.9, left: 13.05, width: 6.25, height: 2.68 },
  ...ci('n52', 'G25', 54.9, 2.68, 21.19, 43.92, { readOnly: true, jumpTo: { tab: 'table4', field: '①', hint: 'クリックで入力元（第４表の１①・直前期末の資本金等の額）へ移動します' } }),
  ...ci('n53', 'G27', 54.9, 2.68, 45.81, 67.24, { signedCommaInteger: true, commaInteger: false }),
  ...mi('㋣', '㋣', 54.9, 2.68, 69.14, 92.43),
  { kind: 'label', text: '直 前 々 期', top: 57.58, left: 13.05, width: 6.25, height: 2.7 },
  ...ci('n56', 'G26', 57.58, 2.7, 21.19, 43.92),
  ...ci('n57', 'G28', 57.58, 2.7, 45.81, 67.24),
  ...mi('㋠', '㋠', 57.58, 2.7, 69.14, 92.43),
  // ── 比準要素数1／0の会社の判定要素の金額（下部集約ブロック） ──
  { kind: 'label', text: '比 準 要 素 数 １ の 会 社 ・ 比 準 要 素 数 ０ の 会 社 の 判 定 要 素 の 金 額', top: 60.28, left: 9.67, width: 82.76, height: 2.46 },
  { kind: 'label', text: '１株（50円）当たりの年配当金額の計算', top: 62.74, left: 9.67, width: 24.78, height: 1.79, fontSize: 7 },
  { kind: 'label', text: '１株（50円）当たりの年利益金額の計算', top: 62.74, left: 34.45, width: 29.01, height: 1.79, fontSize: 7 },
  { kind: 'label', text: '１株（50円）当たりの純資産価額の計算', top: 62.74, left: 63.46, width: 28.97, height: 1.79, fontSize: 7 },
  // 行1: Ⓑ1 / Ⓒ1 / D1（Ⓑ列は 9.67 起点: [⑨/⑤ 9.67-13.05][Ⓑ₁ 13.05-15.51][値 15.51-24.98]）
  { kind: 'label', text: '⑨÷⑤', simpleFraction: { numerator: '⑨', denominator: '⑤' }, fontSize: 6.5, top: 64.53, left: 9.67, width: 3.38, height: 3.7 },
  { kind: 'label', text: 'Ⓑ₁', top: 64.53, left: 13.05, width: 2.46, height: 3.7 },
  { field: 'B1', kind: 'input', readOnly: true, top: 64.53, left: 15.51, width: 9.47, height: 3.7, align: 'right' },
  { kind: 'label', text: '円', top: 64.53, left: 24.98, width: 1.89, height: 3.7, fontSize: 7 },
  { field: 'f45', kind: 'input', readOnly: true, top: 64.53, left: 26.87, width: 5.68, height: 3.7, align: 'right' },
  { kind: 'label', text: '銭', top: 64.53, left: 32.55, width: 1.9, height: 3.7, fontSize: 7 },
  { kind: 'label', text: '㋥/⑤ 又は (㋥＋㋭)÷２/⑤', alternativeFractions: { left: { numerator: '㊁', denominator: '⑤' }, right: { numerator: '(㊁＋㋭)÷２', denominator: '⑤' } }, top: 64.53, left: 34.45, width: 13.25, height: 3.7, fontSize: 6 },
  { kind: 'label', text: 'Ⓒ₁', top: 64.53, left: 47.7, width: 2.5, height: 3.7 },
  { field: 'C1', kind: 'input', readOnly: true, top: 64.53, left: 50.2, width: 11.36, height: 3.7, align: 'right' },
  { kind: 'label', text: '円', top: 64.53, left: 61.56, width: 1.9, height: 3.7, fontSize: 7 },
  { kind: 'label', text: '㋣\n⑤', simpleFraction: { numerator: '㋣', denominator: '⑤' }, top: 64.53, left: 63.46, width: 9.47, height: 3.7 },
  { kind: 'label', text: 'Ⓓ₁', top: 64.53, left: 72.93, width: 2.45, height: 3.7 },
  { field: 'D1', kind: 'input', readOnly: true, top: 64.53, left: 75.38, width: 15.15, height: 3.7, align: 'right' },
  { kind: 'label', text: '円', top: 64.53, left: 90.53, width: 1.9, height: 3.7, fontSize: 7 },
  // 行2: Ⓑ2 / Ⓒ2 / D2
  { kind: 'label', text: '⑩÷⑤', simpleFraction: { numerator: '⑩', denominator: '⑤' }, fontSize: 6.5, top: 68.23, left: 9.67, width: 3.38, height: 3.68 },
  { kind: 'label', text: 'Ⓑ₂', top: 68.23, left: 13.05, width: 2.46, height: 3.68 },
  { field: 'B2', kind: 'input', readOnly: true, top: 68.23, left: 15.51, width: 9.47, height: 3.68, align: 'right' },
  { kind: 'label', text: '円', top: 68.23, left: 24.98, width: 1.89, height: 3.68, fontSize: 7 },
  { field: 'f48', kind: 'input', readOnly: true, top: 68.23, left: 26.87, width: 5.68, height: 3.68, align: 'right' },
  { kind: 'label', text: '銭', top: 68.23, left: 32.55, width: 1.9, height: 3.68, fontSize: 7 },
  { kind: 'label', text: '㋭/⑤ 又は (㋭＋㋬)÷２/⑤', alternativeFractions: { left: { numerator: '㋭', denominator: '⑤' }, right: { numerator: '(㋭＋㋬)÷２', denominator: '⑤' } }, top: 68.23, left: 34.45, width: 13.25, height: 3.68, fontSize: 6 },
  { kind: 'label', text: 'Ⓒ₂', top: 68.23, left: 47.7, width: 2.5, height: 3.68 },
  { field: 'C2', kind: 'input', readOnly: true, top: 68.23, left: 50.2, width: 11.36, height: 3.68, align: 'right' },
  { kind: 'label', text: '円', top: 68.23, left: 61.56, width: 1.9, height: 3.68, fontSize: 7 },
  { kind: 'label', text: '㋠\n⑤', simpleFraction: { numerator: '㋠', denominator: '⑤' }, top: 68.23, left: 63.46, width: 9.47, height: 3.68 },
  { kind: 'label', text: 'Ⓓ₂', top: 68.23, left: 72.93, width: 2.45, height: 3.68 },
  { field: 'D2', kind: 'input', readOnly: true, top: 68.23, left: 75.38, width: 15.15, height: 3.68, align: 'right' },
  { kind: 'label', text: '円', top: 68.23, left: 90.53, width: 1.9, height: 3.68, fontSize: 7 },
  // 行3: キャプション
  { kind: 'label', text: '１株（50円）当たりの年配当金額\n（　Ⓑ₁　の 金 額 ）', top: 71.91, left: 9.67, width: 24.78, height: 4.67, fontSize: 7 },
  { kind: 'label', text: '１株（50円）当たりの年利益金額［㋥/⑤ 又は (㋥＋㋭)÷２/⑤ の金額］', alternativeFractions: { caption: '１株（50円）当たりの年利益金額', prefix: '［', left: { numerator: '㊁', denominator: '⑤' }, right: { numerator: '(㊁＋㋭)÷２', denominator: '⑤' }, suffix: 'の金額 ］' }, top: 71.91, left: 34.45, width: 29.01, height: 4.67, fontSize: 6.5 },
  { kind: 'label', text: '１株（50円）当たりの純資産価額\n（　Ⓓ₁　の 金 額 ）', top: 71.91, left: 63.46, width: 28.97, height: 4.67, fontSize: 7 },
  // 行4: Ⓑ / Ⓒ / Ⓓ（Ⓑ列は 9.67 起点: [Ⓑ 9.67-13.05][J01 13.05-15.51][値 15.51-24.98]）
  { kind: 'label', text: 'Ⓑ', top: 76.58, left: 9.67, width: 3.38, height: 3.7 },
  { kind: 'cell', codeLabel: 'J01', top: 76.58, left: 13.05, width: 2.46, height: 3.7 },
  { field: 'B', kind: 'input', readOnly: true, top: 76.58, left: 15.51, width: 9.47, height: 3.7, align: 'right' },
  { kind: 'label', text: '円', top: 76.58, left: 24.98, width: 1.89, height: 3.7, fontSize: 7 },
  { field: 'f52', kind: 'input', readOnly: true, top: 76.58, left: 26.87, width: 5.68, height: 3.7, align: 'right' },
  { kind: 'label', text: '銭', top: 76.58, left: 32.55, width: 1.9, height: 3.7, fontSize: 7 },
  { kind: 'label', text: 'Ⓒ', top: 76.58, left: 34.45, width: 1.89, height: 3.7 },
  { kind: 'cell', codeLabel: 'G29', top: 76.58, left: 36.34, width: 1.9, height: 3.7 },
  { field: 'C', kind: 'input', readOnly: true, top: 76.58, left: 38.24, width: 23.32, height: 3.7, align: 'right' },
  { kind: 'label', text: '円', top: 76.58, left: 61.56, width: 1.9, height: 3.7, fontSize: 7 },
  { kind: 'label', text: 'Ⓓ', top: 76.58, left: 63.46, width: 1.89, height: 3.7 },
  { kind: 'cell', codeLabel: 'G30', top: 76.58, left: 65.35, width: 1.89, height: 3.7 },
  { field: 'D', kind: 'input', readOnly: true, top: 76.58, left: 67.24, width: 23.29, height: 3.7, align: 'right' },
  { kind: 'label', text: '円', top: 76.58, left: 90.53, width: 1.9, height: 3.7, fontSize: 7 },
];

const fl = (v: number) => Math.floor(v + 1e-9);

/** 第4表の1（1.資本金等 ＋ 2.比準要素等の金額の計算） */
export function Table4_1Grid({ getField, updateField, onJump }: TableProps) {
  const raw = (f: string) => getField(T, f);
  const u = (f: string, v: string) => updateField(T, f, v);

  const fmt = (v: number | null) => (v === null ? '' : v.toLocaleString('ja-JP'));
  const fmtDec1 = (v: number | null) => (v === null ? '' : v.toLocaleString('ja-JP', { maximumFractionDigits: 1 }));
  const yenPart = (v: number | null) => (v === null ? '' : fl(v).toLocaleString('ja-JP'));
  const senPart = (v: number | null) => (v === null ? '' : String(Math.round((v - fl(v)) * 100)).padStart(2, '0'));

  const c = calcTable4(getField);

  const g = (f: string): string => {
    switch (f) {
      case '②': return fmt(c.issued);
      case '③': return fmt(c.treasuryShares);
      case '④': return c.cap4disp;
      case '⑤': return fmt(c.cap5);
      case '㋑': return fmtDec1(c.i1);
      case '㋺': return fmtDec1(c.i2);
      case '㋩': return fmtDec1(c.i3);
      case '⑨': return fmtDec1(c.v9);
      case '⑩': return fmtDec1(c.v10);
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
      default: return raw(f);
    }
  };
  const modeSelect = (field: string, singleLabel: string) => (
    <select id={`table4_1-${field}-toolbar`} name={`table4.${field}`} value={raw(field)} onChange={(e) => u(field, e.target.value)} style={{ fontSize: 11, padding: '1px 2px' }}>
      <option value="">低い方（自動）</option>
      <option value="single">{singleLabel}</option>
      <option value="avg">２年平均</option>
    </select>
  );
  const toolbar = (
    <span className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, whiteSpace: 'nowrap' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 3 }}>Ⓒ1:{modeSelect('c1_mode', '単年（㋥÷⑤）')}</label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 3 }}>Ⓒ2:{modeSelect('c2_mode', '単年（㋭÷⑤）')}</label>
    </span>
  );
  const cells = CELLS.map((cell) => {
    if (cell.kind === 'label' && cell.text?.startsWith('㋥/⑤ 又は') && cell.alternativeFractions) {
      return { ...cell, alternativeFractions: { ...cell.alternativeFractions, selectedSide: c.c1baseSide } };
    }
    if (cell.kind === 'label' && cell.text?.startsWith('㋭/⑤ 又は') && cell.alternativeFractions) {
      return { ...cell, alternativeFractions: { ...cell.alternativeFractions, selectedSide: c.c2baseSide } };
    }
    return cell;
  });
  const { mainCells, headerExtra, aspectRatio } = extractCompanyFloatHeader(cells, g, u, T);
  return <GridForm cells={mainCells} g={g} u={u} formId={T} width="100%" aspectRatio={aspectRatio} title="第４表の１　類似業種比準価額等の計算明細書" formCode="NTA0VNA210010010" headerExtra={headerExtra} toolbar={toolbar} onJump={onJump && ((t) => onJump({ tab: t.tab as TableId, field: t.field }))} />;
}
