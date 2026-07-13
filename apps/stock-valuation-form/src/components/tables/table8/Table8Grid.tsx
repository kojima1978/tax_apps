import { GridForm, type GridCell } from '@/components/ui/GridForm';
import { companyFloatBox } from '../companyFloatHeader';
import { calcTable5 } from '../table5/Table5Grid';
import { calcTable7 } from '../table7/Table7Grid';
import { calcTable2 } from '../table2/Table2Grid';
import { calcCompanySize } from '../table1-2/Table1_2Grid';
import type { TableId, TableProps } from '@/types/form';

const T = 'table8' as const;

// ── 端数処理 ──
const CORPORATE_TAX_RATE = 0.38;                 // 評価差額に対する法人税額等相当額（令和8年様式：38％）
const fl = (v: number) => Math.floor(v + 1e-9);  // 表示単位未満切捨て

/** S1の金額の適用区分（該当行のハイライト用） */
interface S1Class {
  hijun1: boolean;   // 比準要素数1である会社
  big: boolean;      // 大会社
  mid: boolean;      // 中会社
  small: boolean;    // 小会社
  lRate: number | null;
}

/**
 * 第8表（第7表の3）のグリッドセル。座標は r08-13 の罫線実測値。
 * 様式どおり「番号＋ラベルのヘッダー行（単位は右下）」＋「空欄の値行」の2段構成。
 * 入力欄には番号・単位を表示しない（C01〜C10 の識別コードのみ独立セル）。
 */
function buildCells(cls: S1Class): GridCell[] {
  const lText = cls.lRate === null ? '0.＿' : cls.lRate.toFixed(2);
  // 修正計算ブロックのヘッダーセル（番号＋ラベル、右下に単位）
  const head = (text: string, unit: string, top: number, h: number, left: number, right: number): GridCell =>
    ({ kind: 'label', text, bottomLabel: unit, bottomLabelAlign: 'right', align: 'left', fontSize: 6.5, top, left, width: +(right - left).toFixed(2), height: h });
  return [
  // 続紙の各計算区分を、見た目を変えずに意味のあるDOMグループとしてまとめる。
  { kind: 'cell', text: 'S1の金額（続）', ariaLabel: 'S1の金額（続）', semanticRole: 'group', groupBorder: false, top: 15.16, left: 8.3, width: 83.08, height: 56.41 },
  { kind: 'cell', text: 'S2の金額', ariaLabel: 'S2の金額', semanticRole: 'group', groupBorder: false, top: 71.79, left: 8.3, width: 83.08, height: 13.28 },
  { kind: 'cell', text: '株式等保有特定会社の株式の価額', ariaLabel: '株式等保有特定会社の株式の価額', semanticRole: 'group', groupBorder: false, top: 85.3, left: 8.3, width: 83.08, height: 7.86 },
  // ── 外枠 ──
  { kind: 'cell', text: '', top: 15.16, left: 8.3, width: 83.08, height: 78.0 },
  // ── 1. S1の金額（続）純資産価額（相続税評価額）の修正計算 ──
  { kind: 'label', text: '１．Ｓ1の金額（続）', semanticRole: 'columnheader', top: 15.16, left: 8.3, width: 1.85, height: 56.41 },
  { kind: 'label', text: '純資産価額（相続税評価額）の修正計算', top: 15.16, left: 10.15, width: 3.87, height: 27.23 },
  // 行1: ① ② ③（ヘッダー 15.16-19.15 / 値 19.15-21.88）
  head('①　相続税評価額による純資産価額\n　　（第５表の⑤の金額）', '（千円）', 15.16, 3.99, 14.02, 39.16),
  head('②　課税時期現在の株式等の価額の\n　　合計額（第５表の㋑の金額）', '（千円）', 15.16, 3.99, 39.16, 64.3),
  head('③　差引（①－②）', '（千円）', 15.16, 3.99, 64.3, 91.38),
  { field: '①', kind: 'input', readOnly: true, jumpTo: { tab: 'table5', field: '⑤', hint: 'クリックで転記元（第５表 ⑤・相続税評価額による純資産価額）へ移動します' }, top: 19.15, left: 14.02, width: 25.14, height: 2.73, align: 'right' },
  { field: '②', kind: 'input', readOnly: true, jumpTo: { tab: 'table5', field: 'イ', hint: 'クリックで転記元（第５表 イ・株式等の相続税評価額の合計額）へ移動します' }, top: 19.15, left: 39.16, width: 25.14, height: 2.73, align: 'right' },
  { field: '③', kind: 'input', readOnly: true, top: 19.15, left: 64.3, width: 27.08, height: 2.73, align: 'right' },
  // 行2: ④ ⑤ ⑥（ヘッダー 21.88-25.93 / 値 25.93-28.72）
  head('④　帳簿価額による純資産価額\n　　（第５表の⑥の金額）', '（千円）', 21.88, 4.05, 14.02, 39.16),
  head('⑤　株式等の帳簿価額の合計額\n　　（第５表の㋺＋（㊁－㋭）の金額）（注）', '（千円）', 21.88, 4.05, 39.16, 64.3),
  head('⑥　差引（④－⑤）', '（千円）', 21.88, 4.05, 64.3, 91.38),
  { field: '④', kind: 'input', readOnly: true, top: 25.93, left: 14.02, width: 25.14, height: 2.79, align: 'right' },
  { field: '⑤', kind: 'input', readOnly: true, jumpTo: { tab: 'table5', field: 'ロ', hint: 'クリックで転記元（第５表 ロ・株式等の帳簿価額の合計額）へ移動します' }, top: 25.93, left: 39.16, width: 25.14, height: 2.79, align: 'right' },
  { field: '⑥', kind: 'input', readOnly: true, top: 25.93, left: 64.3, width: 27.08, height: 2.79, align: 'right' },
  // 行3: ⑦ ⑧ ⑨（ヘッダー 28.72-32.71 / 値 32.71-35.50）
  head('⑦　評価差額に相当する金額\n　　（③－⑥）', '（千円）', 28.72, 3.99, 14.02, 39.16),
  head('⑧　評価差額に対する法人税額等相当額\n　　（⑦×38％）', '（千円）', 28.72, 3.99, 39.16, 64.3),
  head('⑨　課税時期現在の修正純資産価額\n　　（相続税評価額）（③－⑧）', '（千円）', 28.72, 3.99, 64.3, 91.38),
  { field: '⑦', kind: 'input', readOnly: true, top: 32.71, left: 14.02, width: 25.14, height: 2.79, align: 'right' },
  { field: '⑧', kind: 'input', readOnly: true, top: 32.71, left: 39.16, width: 25.14, height: 2.79, align: 'right' },
  { field: '⑨', kind: 'input', readOnly: true, top: 32.71, left: 64.3, width: 27.08, height: 2.79, align: 'right' },
  // 行4: ⑩ ⑪（ヘッダー 35.50-39.60 / 値 39.60-42.39）＋（注）
  head('⑩　課税時期現在の発行済株式数\n　　（第５表の⑩の株式数）', '（株）', 35.5, 4.1, 14.02, 39.16),
  head('⑪　課税時期現在の修正後の１株当たりの\n　　純資産価額（相続税評価額）（⑨÷⑩）', '（円）', 35.5, 4.1, 39.16, 64.3),
  { kind: 'label', text: '（注）第５表の㊁及び㋭の金額に株式等以\n　　外の資産に係る金額が含まれている\n　　場合には、その金額を除いて計算し\n　　ます。', align: 'left', fontSize: 6.5, top: 35.5, left: 64.3, width: 27.08, height: 6.89 },
  { field: '⑩', kind: 'input', readOnly: true, jumpTo: { tab: 'table5', field: '⑩', hint: 'クリックで転記元（第５表 ⑩・課税時期現在の発行済株式数）へ移動します' }, top: 39.6, left: 14.02, width: 25.14, height: 2.79, align: 'right' },
  { kind: 'cell', codeLabel: 'C01', top: 39.6, left: 39.16, width: 1.94, height: 2.79 },
  { field: '⑪', kind: 'input', readOnly: true, top: 39.6, left: 41.1, width: 23.2, height: 2.79, align: 'right' },
  // ── 1株当たりのS1の金額の計算の基となる金額（42.39-48.83） ──
  { kind: 'label', text: '１株当たりのＳ1の金額\nの計算の基となる金額', top: 42.39, left: 10.15, width: 19.34, height: 6.44 },
  head('⑫　修正後の類似業種比準価額\n　　（第７表の２の㉔、㉖又は㉚の金額）', '（円）', 42.39, 3.65, 29.49, 50.77),
  head('⑬　修正後の１株当たりの純資産価額\n　　（相続税評価額）（⑪の金額）', '（円）', 42.39, 3.65, 50.77, 72.04),
  { kind: 'cell', codeLabel: 'C02', top: 46.04, left: 29.49, width: 1.94, height: 2.79 },
  { field: '⑫', kind: 'input', readOnly: true, top: 46.04, left: 31.43, width: 19.34, height: 2.79, align: 'right' },
  { kind: 'cell', codeLabel: 'C03', top: 46.04, left: 50.77, width: 1.93, height: 2.79 },
  { field: '⑬', kind: 'input', readOnly: true, top: 46.04, left: 52.7, width: 19.34, height: 2.79, align: 'right' },
  { kind: 'cell', diagonal: 'bltr', top: 42.39, left: 72.04, width: 19.34, height: 6.44 },
  // ── 1株当たりのS1の金額の計算（48.83-71.57） ──
  { kind: 'label', text: '１株当たりのＳ1の金額の計算', top: 48.83, left: 10.15, width: 1.94, height: 22.74 },
  { kind: 'label', text: '区分', top: 48.83, left: 12.09, width: 7.73, height: 2.74 },
  { kind: 'label', text: '１ 株 当 た り の Ｓ 1 の 金 額 の 算 定 方 法', top: 48.83, left: 19.82, width: 50.28, height: 2.74 },
  { kind: 'label', text: '１株当たりのＳ1の金額', bottomLabel: '（円）', bottomLabelAlign: 'right', fontSize: 7, top: 48.83, left: 70.1, width: 21.28, height: 2.68 },
  // 比準要素数1（51.57-56.58）
  { kind: 'label', text: '比準要素数１\nである会社の\nＳ1の金額', fontSize: 6.5, highlightWhen: () => cls.hijun1, top: 51.57, left: 12.09, width: 7.73, height: 5.01 },
  { kind: 'label', text: '次のうちいずれか低い方の金額\nイ　⑬の金額\nロ　（⑫の金額 × 0.25）＋（⑬の金額 × 0.75）', textAlign: 'left', top: 51.57, left: 19.82, width: 50.2, height: 5.01 },
  { kind: 'label', text: '⑭', highlightWhen: () => cls.hijun1, top: 51.57, left: 70.02, width: 2.02, height: 5.01 },
  { kind: 'cell', codeLabel: 'C04', top: 51.57, left: 72.04, width: 1.93, height: 5.01 },
  { field: '⑭', kind: 'input', readOnly: true, highlightWhen: () => cls.hijun1, top: 51.57, left: 73.97, width: 17.41, height: 5.01, align: 'right' },
  // 大会社（56.58-61.60）
  { kind: 'label', text: '上記以外の会社', top: 56.58, left: 12.09, width: 1.93, height: 14.99 },
  { kind: 'label', text: '大会社の\nＳ1の金額', fontSize: 6.5, highlightWhen: () => cls.big, top: 56.58, left: 14.02, width: 5.8, height: 5.02 },
  { kind: 'label', text: '次のうちいずれか低い方の金額（⑬の記載がないときは⑫の金額）\nイ　⑫の金額\nロ　⑬の金額', textAlign: 'left', top: 56.58, left: 19.82, width: 50.2, height: 5.02 },
  { kind: 'label', text: '⑮', highlightWhen: () => cls.big, top: 56.58, left: 70.02, width: 2.02, height: 5.02 },
  { kind: 'cell', codeLabel: 'C05', top: 56.58, left: 72.04, width: 1.93, height: 5.02 },
  { field: '⑮', kind: 'input', readOnly: true, highlightWhen: () => cls.big, top: 56.58, left: 73.97, width: 17.41, height: 5.02, align: 'right' },
  // 中会社（61.60-66.67）
  { kind: 'label', text: '中会社の\nＳ1の金額', fontSize: 6.5, highlightWhen: () => cls.mid, top: 61.6, left: 14.02, width: 5.8, height: 5.07 },
  { kind: 'label', text: `（⑫と⑬とのいずれか低い方の金額 × Lの割合${lText}）＋（⑬の金額 ×（１－Lの割合${lText}））`, top: 61.6, left: 19.82, width: 50.2, height: 5.07 },
  { kind: 'label', text: '⑯', highlightWhen: () => cls.mid, top: 61.6, left: 70.02, width: 2.02, height: 5.07 },
  { kind: 'cell', codeLabel: 'C06', top: 61.6, left: 72.04, width: 1.93, height: 5.07 },
  { field: '⑯', kind: 'input', readOnly: true, highlightWhen: () => cls.mid, top: 61.6, left: 73.97, width: 17.41, height: 5.07, align: 'right' },
  // 小会社（66.67-71.57）
  { kind: 'label', text: '小会社の\nＳ1の金額', fontSize: 6.5, highlightWhen: () => cls.small, top: 66.67, left: 14.02, width: 5.8, height: 4.9 },
  { kind: 'label', text: '次のうちいずれか低い方の金額\nイ　⑬の金額\nロ　（⑫の金額 × 0.50）＋（⑬の金額 × 0.50）', textAlign: 'left', top: 66.67, left: 19.82, width: 50.2, height: 4.9 },
  { kind: 'label', text: '⑰', highlightWhen: () => cls.small, top: 66.67, left: 70.02, width: 2.02, height: 4.9 },
  { kind: 'cell', codeLabel: 'C07', top: 66.67, left: 72.04, width: 1.93, height: 4.9 },
  { field: '⑰', kind: 'input', readOnly: true, highlightWhen: () => cls.small, top: 66.67, left: 73.97, width: 17.41, height: 4.9, align: 'right' },
  // ── 2. S2の金額（71.79-85.07） ──
  { kind: 'label', text: '２．Ｓ2の金額', semanticRole: 'columnheader', top: 71.79, left: 8.3, width: 1.85, height: 13.28 },
  // 行1: ⑱ ⑲ ⑳ ㉑（ヘッダー 71.79-75.90 / 値 75.90-78.63）
  head('⑱　課税時期現在の株式等の価額の合計額\n　　（第５表の㋑の金額）', '（千円）', 71.79, 4.11, 10.15, 31.43),
  head('⑲　株式等の帳簿価額の合計額\n　　（第５表の㋺＋（㊁－㋭）の金額）（注）', '（千円）', 71.79, 4.11, 31.43, 52.7),
  head('⑳　株式等に係る評価差額に相当\n　　する金額（⑱－⑲）', '（千円）', 71.79, 4.11, 52.7, 72.04),
  head('㉑　⑳の評価差額に対する法人税額\n　　等相当額（⑳×38％）', '（千円）', 71.79, 4.11, 72.04, 91.38),
  { field: '⑱', kind: 'input', top: 75.9, left: 10.15, width: 21.28, height: 2.73, align: 'right' },
  { field: '⑲', kind: 'input', top: 75.9, left: 31.43, width: 21.27, height: 2.73, align: 'right' },
  { field: '⑳', kind: 'input', readOnly: true, top: 75.9, left: 52.7, width: 19.34, height: 2.73, align: 'right' },
  { field: '㉑', kind: 'input', readOnly: true, top: 75.9, left: 72.04, width: 19.34, height: 2.73, align: 'right' },
  // 行2: ㉒ ㉓ ㉔（ヘッダー 78.63-82.45 / 値 82.45-85.07）＋（注）
  head('㉒　Ｓ2の純資産価額相当額\n　　（⑱－㉑）', '（千円）', 78.63, 3.82, 10.15, 31.43),
  head('㉓　課税時期現在の発行済株式数\n　　（第５表の⑩の株式数）', '（株）', 78.63, 3.82, 31.43, 52.7),
  head('㉔　Ｓ2の金額（㉒÷㉓）', '（円）', 78.63, 3.82, 52.7, 72.04),
  { kind: 'label', text: '（注）第５表の㊁及び㋭の金額\n　　に株式等以外の資産に係る\n　　金額が含まれている場合に\n　　は、その金額を除いて計算\n　　します。', align: 'left', fontSize: 6.5, top: 78.63, left: 72.04, width: 19.34, height: 6.44 },
  { field: '㉒', kind: 'input', readOnly: true, top: 82.45, left: 10.15, width: 21.28, height: 2.62, align: 'right' },
  { field: '㉓', kind: 'input', readOnly: true, top: 82.45, left: 31.43, width: 21.27, height: 2.62, align: 'right' },
  { kind: 'cell', codeLabel: 'C08', top: 82.45, left: 52.7, width: 1.93, height: 2.62 },
  { field: '㉔', kind: 'input', readOnly: true, top: 82.45, left: 54.63, width: 17.41, height: 2.62, align: 'right' },
  // ── 3. 株式等保有特定会社の株式の価額（85.30-93.16） ──
  { kind: 'label', text: '３．株式等保有特定会社の\n　　株式の価額', semanticRole: 'columnheader', align: 'left', top: 85.3, left: 8.3, width: 19.26, height: 7.86 },
  head('㉕　１株当たりの純資産価額（第５表\n　　の⑪の金額（第５表の⑫の金額が\n　　あるときはその金額））', '（円）', 85.3, 5.01, 27.56, 48.83),
  head('㉖　Ｓ1の金額とＳ2の金額との合計額\n　　（（⑭、⑮、⑯又は⑰）＋㉔）', '（円）', 85.3, 5.01, 48.83, 70.1),
  head('㉗　株式等保有特定会社の株式の価額\n　　（㉕と㉖とのいずれか低い方の金額）', '（円）', 85.3, 5.01, 70.1, 91.38),
  { field: '㉕', kind: 'input', readOnly: true, top: 90.31, left: 27.56, width: 21.27, height: 2.85, align: 'right' },
  { kind: 'cell', codeLabel: 'C09', top: 90.31, left: 48.83, width: 1.94, height: 2.85 },
  { field: '㉖', kind: 'input', readOnly: true, top: 90.31, left: 50.77, width: 19.33, height: 2.85, align: 'right' },
  { kind: 'cell', codeLabel: 'C10', top: 90.31, left: 70.1, width: 1.94, height: 2.85 },
  { field: '㉗', kind: 'input', readOnly: true, top: 90.31, left: 72.04, width: 19.34, height: 2.85, align: 'right' },
  ];
}

/** 第8表のS1の続き・S2・株式の価額の自動計算（第6表からも参照する） */
export function calcTable8(getField: TableProps['getField']) {
  const raw = (f: string) => getField(T, f);
  const parseNum = (value: string): number | null => {
    const s = value.replace(/,/g, '').trim();
    if (s === '') return null;
    const v = Number(s);
    return isNaN(v) ? null : v;
  };
  const num = (f: string) => parseNum(raw(f));

  const t5 = calcTable5(getField);
  const t7 = calcTable7(getField);
  const size = calcCompanySize((f) => getField('table1_2', f)).result;
  const isHijun1 = calcTable2(getField).j.s1 === true;

  // ── 1. S1の金額（続）純資産価額（相続税評価額）の修正計算 ──
  const v1 = t5['⑤'] ?? null;                                  // ① 相続税評価額純資産（第5表⑤）
  const v2: number | null = t5['イ'] ?? null;                  // ② 株式等の相続税評価額（第5表イを転記）
  const v3 = v1 !== null && v2 !== null ? v1 - v2 : null;       // ③ ①－②
  const v4 = t5['⑥'] ?? null;                                  // ④ 帳簿価額純資産（第5表⑥）
  const v5: number | null = t5['ロ'] ?? null;                  // ⑤ 株式等の帳簿価額（第5表ロを転記）
  const v6 = v4 !== null && v5 !== null ? v4 - v5 : null;       // ⑥ ④－⑤
  const v7 = v3 !== null && v6 !== null ? Math.max(0, v3 - v6) : null; // ⑦ 評価差額（負数→0）
  const v8 = v7 !== null ? fl(v7 * CORPORATE_TAX_RATE) : null;  // ⑧ 法人税額等相当額（37％）
  const v9 = v3 !== null && v8 !== null ? v3 - v8 : null;       // ⑨ 修正純資産価額（③－⑧）
  const v10 = t5['⑩'] ?? null;                                 // ⑩ 発行済株式数（第5表⑩）
  const v11 = v9 !== null && v10 !== null && v10 > 0 ? fl((v9 * 1000) / v10) : null; // ⑪ 修正後1株純資産（円）

  // 1株当たりのS1の金額の基となる金額
  const v12 = t7.s1Hijun;   // ⑫ 修正後の類似業種比準価額（第7表㉔㉕㉖）
  const v13 = v11;          // ⑬ 修正後の1株当たり純資産価額（⑪）

  // 1株当たりのS1の金額（区分別）
  const lRate = size === 3 ? 0.9 : size === 2 ? 0.75 : size === 1 ? 0.6 : null;
  const v14 = v13 !== null ? (v12 !== null ? Math.min(v13, fl(v12 * 0.25 + v13 * 0.75)) : v13) : null; // 比準要素数1
  const v15 = v12 !== null ? (v13 !== null ? Math.min(v12, v13) : v12) : v13;                          // 大会社
  const v16 = v12 !== null && v13 !== null && lRate !== null ? fl(Math.min(v12, v13) * lRate + v13 * (1 - lRate)) : null; // 中会社
  const v17 = v13 !== null ? (v12 !== null ? Math.min(v13, fl(v12 * 0.5 + v13 * 0.5)) : v13) : null;   // 小会社
  const s1 = isHijun1 ? v14 : size === 4 ? v15 : size === 3 || size === 2 || size === 1 ? v16 : size === 0 ? v17 : null;

  // ── 2. S2の金額 ──
  const v18: number | null = num('⑱') ?? t5['イ'] ?? null;     // ⑱ 株式等の相続税評価額（第5表イ・上書き可）
  const v19: number | null = num('⑲') ?? t5['ロ'] ?? null;     // ⑲ 株式等の帳簿価額（第5表ロ・上書き可）
  const v20 = v18 !== null && v19 !== null ? Math.max(0, v18 - v19) : null; // ⑳ 評価差額（負数→0）
  const v21 = v20 !== null ? fl(v20 * CORPORATE_TAX_RATE) : null; // ㉑ 法人税額等相当額（37％）
  const v22 = v18 !== null && v21 !== null ? v18 - v21 : null;  // ㉒ S2純資産価額相当額（⑱－㉑）
  const v23 = t5['⑩'] ?? null;                                 // ㉓ 発行済株式数（第5表⑩）
  const v24 = v22 !== null && v23 !== null && v23 > 0 ? fl((v22 * 1000) / v23) : null; // ㉔ S2の金額（円）

  // ── 3. 株式等保有特定会社の株式の価額 ──
  const v25 = t5['⑫'] ?? t5['⑪'] ?? null;                     // ㉕ 1株純資産（⑫があれば⑫）
  const v26 = s1 !== null && v24 !== null ? s1 + v24 : null;   // ㉖ S1＋S2
  const v27 = v25 !== null && v26 !== null ? Math.min(v25, v26) : null; // ㉗ ㉕と㉖の低い方

  const cls: S1Class = {
    hijun1: isHijun1,
    big: !isHijun1 && size === 4,
    mid: !isHijun1 && (size === 3 || size === 2 || size === 1),
    small: !isHijun1 && size === 0,
    lRate,
  };

  return { v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13, v14, v15, v16, v17, s1, v18, v19, v20, v21, v22, v23, v24, v25, v26, v27, cls };
}

/** 第8表（CSSグリッド方式・完成版） */
export function Table8Grid({ getField, updateField, onJump }: TableProps) {
  const raw = (f: string) => getField(T, f);
  const u = (f: string, v: string) => updateField(T, f, v);

  const fmt = (v: number | null) => (v === null ? '' : v.toLocaleString('ja-JP'));
  const c = calcTable8(getField);
  const cls = c.cls;

  const g = (f: string): string => {
    switch (f) {
      case '①': return fmt(c.v1);
      case '②': return fmt(c.v2);
      case '③': return fmt(c.v3);
      case '④': return fmt(c.v4);
      case '⑤': return fmt(c.v5);
      case '⑥': return fmt(c.v6);
      case '⑦': return fmt(c.v7);
      case '⑧': return fmt(c.v8);
      case '⑨': return fmt(c.v9);
      case '⑩': return fmt(c.v10);
      case '⑪': return fmt(c.v11);
      case '⑫': return fmt(c.v12);
      case '⑬': return fmt(c.v13);
      case '⑭': return cls.hijun1 ? fmt(c.v14) : '';
      case '⑮': return cls.big ? fmt(c.v15) : '';
      case '⑯': return cls.mid ? fmt(c.v16) : '';
      case '⑰': return cls.small ? fmt(c.v17) : '';
      case '⑱': return raw('⑱').trim() !== '' ? raw('⑱') : fmt(c.v18);
      case '⑲': return raw('⑲').trim() !== '' ? raw('⑲') : fmt(c.v19);
      case '⑳': return fmt(c.v20);
      case '㉑': return fmt(c.v21);
      case '㉒': return fmt(c.v22);
      case '㉓': return fmt(c.v23);
      case '㉔': return fmt(c.v24);
      case '㉕': return fmt(c.v25);
      case '㉖': return fmt(c.v26);
      case '㉗': return fmt(c.v27);
      default: return raw(f);
    }
  };

  // 会社名は第7表の1・2（table7バケット）と共有
  const gCompany = (f: string) => (f === 'company' ? getField('table7', 'company') : g(f));
  const uCompany = (f: string, v: string) => (f === 'company' ? updateField('table7', 'company', v) : u(f, v));
  return <GridForm cells={buildCells(cls)} g={g} u={u} formId={T} width="100%" title="第７表の３　株式等保有特定会社の株式の価額の計算明細書（続）" formCode="NTA0VNA240030010" headerExtra={companyFloatBox(gCompany, uCompany, T, { widthPct: 42, aspect: 9, labelFrac: 0.33 })} onJump={onJump && ((t) => onJump({ tab: t.tab as TableId, field: t.field }))} />;
}
