import { GridForm, type GridCell } from '@/components/ui/GridForm';
import type { TableProps } from '@/types/form';

const T = 'table7' as const;

/** 比準価額計算の1ブロック分（類似業種株価＋比準割合＋比準価額）。1回目を基準に定義。 */
const BLOCK1_CALC: GridCell[] = [
  // 類似業種の株価
  { kind: 'label', text: '類似業種と業種目番号', top: 46.87, left: 13.28, width: 7.5, height: 2.99 },
  { field: 'f61', kind: 'input', top: 46.97, left: 20.51, width: 16.64, height: 2.89 },
  { kind: 'label', text: '類 似 業 種 の 株 価', top: 49.67, left: 13.28, width: 2.76, height: 14.17 },
  { kind: 'label', text: '課 税 時 期 の属 す る 月', top: 49.77, left: 15.73, width: 8.59, height: 2.22 },
  { kind: 'label', text: '課 税 時 期 の属する月の前月', top: 51.89, left: 15.73, width: 8.59, height: 2.22 },
  { kind: 'label', text: '課 税 時 期 の属す る月 の前 々月', top: 54.01, left: 15.87, width: 8.32, height: 2.12 },
  { field: 'f66', kind: 'input', top: 49.86, left: 24.05, width: 5.05, height: 2.12 },
  { field: '㊁', kind: 'input', top: 49.77, left: 28.83, width: 8.18, height: 2.22 },
  { field: 'f68', kind: 'input', top: 51.98, left: 24.05, width: 4.91, height: 2.02 },
  { field: '㋭', kind: 'input', top: 51.89, left: 28.83, width: 8.32, height: 2.12 },
  { field: 'f70', kind: 'input', top: 54.01, left: 24.05, width: 4.91, height: 2.02 },
  { field: '㋬', kind: 'input', top: 53.91, left: 28.83, width: 8.32, height: 2.12 },
  { kind: 'label', text: '前 年 平 均 株 価', top: 56.03, left: 15.87, width: 13.23, height: 2.12 },
  { kind: 'label', text: '課 税 時 期 の 属 す る 月以前２年間の平均株価', top: 58.15, left: 15.73, width: 13.37, height: 2.22 },
  { kind: 'label', text: 'Ａ（㋷、㋦、㋸、㋾及び㋻のうち最も低いもの）', top: 60.18, left: 15.87, width: 13.23, height: 3.57 },
  { field: '㋣', kind: 'input', top: 55.93, left: 28.83, width: 8.32, height: 2.31 },
  { field: '㋠', kind: 'input', top: 58.15, left: 28.83, width: 8.46, height: 2.12 },
  { field: '⑱', kind: 'input', top: 60.27, left: 28.96, width: 8.18, height: 3.37 },
  // 比準割合の計算
  { kind: 'label', text: '比 準 割 合 の 計 算', top: 47.07, left: 36.87, width: 2.73, height: 16.77 },
  { kind: 'label', text: '区　分', top: 46.87, left: 39.46, width: 7.23, height: 2.99 },
  { kind: 'label', text: '１株(50円)当たりの 年 配 当 金 額', top: 46.87, left: 46.42, width: 11.05, height: 2.99 },
  { kind: 'label', text: '１株(50円)当たりの 年 利 益 金 額', top: 46.97, left: 57.19, width: 11.05, height: 2.89 },
  { kind: 'label', text: '１株(50円)当たりの 純 資 産 価 額', top: 46.87, left: 68.11, width: 10.64, height: 2.99 },
  { kind: 'label', text: '１株(50円)当たりの比 準 価 額', top: 46.87, left: 78.61, width: 12.14, height: 2.89 },
  { kind: 'label', text: '評 価会 社', top: 49.77, left: 39.46, width: 7.23, height: 3.57 },
  { kind: 'label', text: '⑤', top: 49.67, left: 46.28, width: 2.86, height: 3.66 },
  { field: 'f103', kind: 'input', top: 49.77, left: 48.88, width: 4.91, height: 3.47 },
  { field: 'f104', kind: 'input', top: 49.57, left: 53.65, width: 3.68, height: 3.66 },
  { kind: 'label', text: '⑧', top: 49.77, left: 57.19, width: 2.59, height: 3.57 },
  { field: 'f106', kind: 'input', top: 49.77, left: 59.65, width: 8.46, height: 3.57 },
  { kind: 'label', text: '⑰', top: 49.77, left: 67.83, width: 2.73, height: 3.57 },
  { field: 'f108', kind: 'input', top: 49.77, left: 70.29, width: 8.59, height: 3.57 },
  { kind: 'label', text: '類　　似業　　種', top: 53.24, left: 39.33, width: 7.36, height: 3.66 },
  { kind: 'label', text: 'B', top: 53.24, left: 46.42, width: 2.73, height: 3.66 },
  { field: 'f110', kind: 'input', top: 53.24, left: 49.01, width: 4.77, height: 3.57 },
  { field: 'f111', kind: 'input', top: 53.14, left: 53.65, width: 3.68, height: 3.66 },
  { kind: 'label', text: 'C', top: 53.14, left: 57.19, width: 2.45, height: 3.76 },
  { field: 'f113', kind: 'input', top: 53.04, left: 59.51, width: 8.73, height: 3.86 },
  { kind: 'label', text: 'D', top: 53.24, left: 67.83, width: 2.59, height: 3.66 },
  { field: 'f115', kind: 'input', top: 53.14, left: 70.29, width: 8.46, height: 3.76 },
  { kind: 'label', text: '要 素 別比準割合', top: 56.71, left: 39.33, width: 7.36, height: 3.66 },
  { kind: 'label', text: '⑤÷Ⓑ', top: 56.71, left: 46.42, width: 2.73, height: 3.57 },
  { field: 'f117', kind: 'input', top: 56.71, left: 49.01, width: 8.32, height: 3.66 },
  { kind: 'label', text: '⑧÷©', top: 56.71, left: 57.19, width: 2.45, height: 3.66 },
  { field: 'f119', kind: 'input', top: 56.71, left: 59.65, width: 8.46, height: 3.66 },
  { kind: 'label', text: '⑰÷Ⓓ', top: 56.61, left: 67.97, width: 2.59, height: 3.76 },
  { field: 'f121', kind: 'input', top: 56.71, left: 70.29, width: 8.46, height: 3.66 },
  { kind: 'label', text: '比　　準割　　合', top: 60.18, left: 39.33, width: 7.23, height: 3.66 },
  { kind: 'label', text: '（⑤ /B＋⑧/C＋ ⑰/D）÷３＝', top: 60.18, left: 46.56, width: 20.49, height: 3.66 },
  { field: '⑲', kind: 'input', top: 60.08, left: 66.88, width: 12, height: 3.66 },
  // 比準価額
  { field: '⑳', kind: 'input', top: 60.27, left: 78.74, width: 7.36, height: 3.47 },
  { field: 'f125', kind: 'input', top: 60.27, left: 85.84, width: 4.77, height: 3.47 },
  { kind: 'label', text: '⑱ × ⑲ × 0.7　（中会社は0.6小会社は0.5とします。）', top: 49.67, left: 78.61, width: 12.14, height: 10.6 },
];

/** 2回目ブロック = 1回目を +16.87% でミラー（A=㉑/比準割合=㉒/比準価額=㉓）。記号系fieldはb2_接頭辞。 */
const NUM2: Record<string, string> = { '⑱': '㉑', '⑲': '㉒', '⑳': '㉓' };
const BLOCK2_CALC: GridCell[] = BLOCK1_CALC.map((c) => {
  const out: GridCell = { ...c, top: +(c.top + 16.87).toFixed(2) };
  if (c.field) out.field = NUM2[c.field] ?? `b2_${c.field}`;
  if (c.text) out.text = c.text.replace('⑱', '㉑').replace('⑲', '㉒').replace('⑳', '㉓');
  return out;
});

/** 第7表のグリッドセル（測定値＋2回目ブロックの自動ミラー） */
const CELLS: GridCell[] = [
  // ── 外枠・S1縦帯 ──
  { kind: 'cell', text: '', top: 9.28, left: 8.78, width: 81.83, height: 84.34 },
  { kind: 'label', text: '1.S1の金額（類似業種比準価額の修正計算）', top: 9.38, left: 8.64, width: 2.53, height: 84.24 },
  // 受取配当金等収受割合の計算
  { kind: 'label', text: '受取配当金等収受割合の計算', top: 9.28, left: 10.96, width: 11.05, height: 8.67 },
  { kind: 'label', text: '事 業 年 度', top: 9.28, left: 21.74, width: 9.55, height: 2.89 },
  { kind: 'label', text: '① 直 前 期', top: 9.28, left: 31.01, width: 14.46, height: 2.89 },
  { kind: 'label', text: '② 直 前 々 期', top: 9.19, left: 45.19, width: 14.59, height: 2.99 },
  { kind: 'label', text: '合計(①＋②)', top: 9.19, left: 59.51, width: 14.46, height: 2.99 },
  { kind: 'label', text: '受取配当金等の額', top: 11.98, left: 21.74, width: 9.55, height: 2.89 },
  { kind: 'label', text: '営業利益の金額', top: 14.78, left: 21.87, width: 9.41, height: 2.99 },
  { field: 'f10', kind: 'input', top: 11.98, left: 31.01, width: 14.46, height: 2.99 },
  { field: 'f11', kind: 'input', top: 11.99, left: 45.23, width: 14.46, height: 2.98 },
  { field: '㋑', kind: 'input', top: 12.08, left: 59.65, width: 14.46, height: 2.89 },
  { field: 'f13', kind: 'input', top: 14.78, left: 31.01, width: 14.59, height: 3.08 },
  { field: 'f14', kind: 'input', top: 14.78, left: 45.19, width: 14.59, height: 3.08 },
  { field: '㋺', kind: 'input', top: 14.78, left: 59.51, width: 14.59, height: 2.99 },
  { kind: 'label', text: '受 取 配 当 金 等 収 受 割 合 （㋑÷（㋑＋㋺））※小数点以下３位未満切り捨て', top: 9.19, left: 73.83, width: 16.78, height: 4.14 },
  { field: '㋩', kind: 'input', top: 13.04, left: 73.83, width: 16.78, height: 4.92 },
  // Ⓑ－ⓑの金額
  { kind: 'label', text: 'Ⓑ－ⓑの金額', top: 17.67, left: 10.96, width: 10.91, height: 5.88 },
  { kind: 'label', text: '１株（50円）当たりの年配当金額（第４表のⒷ）', top: 17.67, left: 21.74, width: 16.64, height: 3.08 },
  { kind: 'label', text: 'ⓑの金額（③×ハ）', top: 17.67, left: 38.1, width: 18.14, height: 2.99 },
  { kind: 'label', text: 'Ⓑ－ⓑの金額（③－④）', top: 17.77, left: 55.97, width: 18.14, height: 2.89 },
  { field: '③', kind: 'input', top: 20.66, left: 21.74, width: 11.87, height: 2.89 },
  { field: 'f23', kind: 'input', top: 20.56, left: 33.33, width: 5.05, height: 2.99 },
  { field: '④', kind: 'input', top: 20.56, left: 38.24, width: 13.23, height: 2.89 },
  { field: 'f25', kind: 'input', top: 20.56, left: 51.33, width: 4.77, height: 2.89 },
  { field: '⑤', kind: 'input', top: 20.47, left: 56.1, width: 13.23, height: 2.99 },
  { field: 'f27', kind: 'input', top: 20.56, left: 69.2, width: 4.91, height: 2.99 },
  // 🄫－©の金額
  { kind: 'label', text: '🄫－©の金額', top: 23.36, left: 10.96, width: 11.05, height: 5.59 },
  { kind: 'label', text: '１株（50円）当たりの年利益金額（第４表の🄫）', top: 23.45, left: 21.74, width: 16.64, height: 2.89 },
  { kind: 'label', text: '©の金額（⑥×㋩）', top: 23.36, left: 38.1, width: 18.14, height: 2.89 },
  { kind: 'label', text: '🄫－©の金額（⑥－⑦）', top: 23.26, left: 55.97, width: 18.14, height: 3.08 },
  { field: '⑥', kind: 'input', top: 26.25, left: 21.74, width: 16.64, height: 2.8 },
  { field: '⑦', kind: 'input', top: 26.15, left: 38.1, width: 18, height: 2.8 },
  { field: '⑧', kind: 'input', top: 26.15, left: 55.83, width: 18.28, height: 2.8 },
  { kind: 'cell', diagonal: 'bltr', top: 17.77, left: 73.97, width: 16.78, height: 11.18 },
  // Ⓓ－ⓓの金額
  { kind: 'label', text: 'Ⓓ－ⓓの金額', top: 28.85, left: 10.82, width: 8.73, height: 18.12 },
  { kind: 'label', text: '（イ）の金額', top: 28.85, left: 19.28, width: 2.59, height: 5.98 },
  { kind: 'label', text: '１株（50円）当たりの純資産価額（第４表のⒹ）', top: 28.85, left: 21.6, width: 16.81, height: 3.18 },
  { kind: 'label', text: '直 前 期 末 の 株 式 等 の帳 簿 価 額 の 合 計 額', top: 28.75, left: 38.24, width: 17.83, height: 3.28 },
  { kind: 'label', text: '直前期末の総資産価額(　帳　簿　価　額　）', top: 28.75, left: 55.97, width: 18, height: 3.28 },
  { kind: 'label', text: '（イ）　の　金　額（⑨×（⑩÷⑪））', top: 28.85, left: 73.83, width: 16.91, height: 3.28 },
  { field: '⑨', kind: 'input', top: 31.93, left: 21.6, width: 16.78, height: 2.8 },
  { field: '⑩', kind: 'input', top: 31.93, left: 38.24, width: 18, height: 2.89 },
  { field: '⑪', kind: 'input', top: 31.84, left: 55.97, width: 18.14, height: 2.89 },
  { field: '⑫', kind: 'input', top: 31.84, left: 73.83, width: 16.91, height: 2.89 },
  { kind: 'label', text: '（ロ）　の　金　額（⑨×（⑩÷⑪））', top: 34.63, left: 19.28, width: 2.73, height: 6.65 },
  { kind: 'label', text: '利　益　積　立　金　額（第４表の⑱の「直前期」欄の金額）', top: 34.73, left: 21.74, width: 26.05, height: 3.86 },
  { kind: 'label', text: '１ 株 当 た り の 資 本 金 等 の 額 を 50 円 とし た 場 合 の 発 行 済 株 式 数（第４表の⑤の株式数）', top: 34.73, left: 47.51, width: 26.46, height: 3.86 },
  { kind: 'label', text: '（ロ）　の　金　額（（⑬÷⑭）×ハ ）', top: 34.54, left: 73.83, width: 16.91, height: 3.95 },
  { field: '⑬', kind: 'input', top: 38.39, left: 21.87, width: 26.05, height: 2.8 },
  { field: '⑭', kind: 'input', top: 38.39, left: 47.65, width: 26.32, height: 2.8 },
  { field: '⑮', kind: 'input', top: 38.3, left: 73.97, width: 16.64, height: 2.99 },
  { kind: 'cell', text: '', top: 41.19, left: 19.28, width: 2.59, height: 5.88 },
  { kind: 'label', text: 'ⓓの金額（⑫＋⑮）', top: 41.09, left: 21.6, width: 16.78, height: 2.99 },
  { kind: 'label', text: 'Ⓓ－ⓓの金額（⑨－⑯）', top: 41.09, left: 38.1, width: 18.14, height: 2.89 },
  { field: '⑯', kind: 'input', top: 43.98, left: 21.74, width: 16.64, height: 2.99 },
  { field: '⑰', kind: 'input', top: 43.98, left: 38.24, width: 17.87, height: 2.99 },
  { kind: 'label', text: '（注）１ ㋩の割合は、１を上限とします。２　⑯の金額は、Ⓓの金額（⑨の金額）を上限とします。', top: 40.99, left: 55.97, width: 34.78, height: 5.98 },
  // 1株50円当たりの比準価額の計算（縦帯・2ブロック共通）
  { kind: 'label', text: '１ 株 50 円 当 た り の 比 準 価 額 の 計 算', top: 47.07, left: 10.96, width: 2.59, height: 33.54 },
  // 1回目ブロック（⑱⑲⑳）
  ...BLOCK1_CALC,
  // 2回目ブロック（㉑㉒㉓）＝1回目を+16.87%ミラー（推測）
  ...BLOCK2_CALC,
  // 1株当たりの比準価額・比準価額の修正（㉔㉕㉖）
  { kind: 'label', text: '１株当たりの比準価額', top: 80.51, left: 10.96, width: 18.14, height: 3.18 },
  { kind: 'label', text: '比準価額（ ⑳ と ㉓ とのいずれか低い方の金額）×第４表の④の金額÷50円', top: 80.42, left: 28.83, width: 46.51, height: 3.37 },
  { field: '㉔', kind: 'input', top: 80.51, left: 75.06, width: 15.55, height: 3.28 },
  { kind: 'label', text: '比 準 価 額 の 修 正', top: 83.69, left: 10.96, width: 2.73, height: 9.93 },
  { kind: 'label', text: '直 前 期 末 の 翌 日 か ら 課 税 時期 ま で の 間 に 配 当 金 交 付 の効 力 が 発 生 し た 場 合', top: 83.69, left: 13.28, width: 15.82, height: 5.01 },
  { kind: 'label', text: '比準価額( ㉔ の金額）－１株当たりの配 当 金 額', top: 83.69, left: 28.96, width: 46.23, height: 4.92 },
  { kind: 'label', text: '修正比準価額', top: 83.69, left: 75.2, width: 15.55, height: 1.73 },
  { field: '㉕', kind: 'input', top: 85.33, left: 75.2, width: 15.41, height: 3.37 },
  { kind: 'label', text: '直 前 期 末 の 翌 日 か ら 課 税 時期 ま で の 間 に 株 式 の 割 当 て等 の 効 力 が 発 生 し た 場 合', top: 88.51, left: 13.42, width: 15.55, height: 5.01 },
  { kind: 'label', text: '比準価額（㉔ （ ㉕ がある ときは ㉕ ）の金額）＋割当株式１株当たりの払込金額×１株当たりの割当株式数÷１株当たりの割当株式数又は交付株式数', top: 88.51, left: 28.83, width: 46.51, height: 5.11 },
  { kind: 'label', text: '修正比準価額', top: 88.61, left: 75.06, width: 15.68, height: 1.64 },
  { field: '㉖', kind: 'input', top: 90.25, left: 75.06, width: 15.68, height: 3.37 },
];

/** 第7表（CSSグリッド方式・完成版） */
export function Table7Grid({ getField, updateField }: TableProps) {
  const g = (f: string) => getField(T, f);
  const u = (f: string, v: string) => updateField(T, f, v);
  return <GridForm cells={CELLS} g={g} u={u} formId={T} width="100%" title="第７表　株式等保有特定会社の株式の価額の計算明細書" />;
}
