import { GridForm, type GridCell } from '@/components/ui/GridForm';
import { calcTable5 } from '../table5/Table5Grid';
import { calcTable7 } from '../table7/Table7Grid';
import { calcTable2 } from '../table2/Table2Grid';
import { calcCompanySize } from '../table1-2/Table1_2Grid';
import type { TableId, TableProps } from '@/types/form';

const T = 'table8' as const;

// ── 計算の根拠（参考リンク） ──
const REFERENCES = [
  { label: '評価通達189-3（株式等保有特定会社のS1+S2方式）', url: 'https://www.nta.go.jp/law/tsutatsu/kihon/sisan/hyoka_new/08/05.htm#a-189' },
  { label: '評価通達186-2（純資産価額・法人税額等相当額）', url: 'https://www.nta.go.jp/law/tsutatsu/kihon/sisan/hyoka_new/08/04.htm#a-186_2' },
];

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

/** 第8表のグリッドセル（測定値＋S1適用区分ハイライト） */
function buildCells(cls: S1Class): GridCell[] {
  const lText = cls.lRate === null ? '0.＿' : cls.lRate.toFixed(2);
  return [
  // ── 外枠 ──
  { kind: 'cell', text: '', top: 9.28, left: 8.64, width: 81.69, height: 85.01 },
  // ── 1. S1の金額（続）純資産価額（相続税評価額）の修正計算 ──
  { kind: 'label', text: '１．S1の金額（続）', top: 9.28, left: 8.51, width: 2.73, height: 59.85 },
  { kind: 'label', text: '純 資 産 価 額( 相 続 税 評 価 額 )の 修 正 計 算', top: 9.19, left: 10.96, width: 10.91, height: 29.01 },
  { kind: 'label', text: '相続税評価額による純資産価額\n(第５表の⑤の金額)', top: 9.19, left: 21.6, width: 22.91, height: 4.24 },
  { kind: 'label', text: '課税時期現在の株式等の価額の合計額\n(第５表の㋑の金額)', top: 9.19, left: 44.24, width: 23.05, height: 4.24 },
  { kind: 'label', text: '差引\n（①-②）', top: 9.28, left: 67.01, width: 23.32, height: 4.14 },
  { field: '①', kind: 'input', readOnly: true, jumpTo: { tab: 'table5', field: '⑤', hint: 'クリックで転記元（第５表 ⑤・相続税評価額による純資産価額）へ移動します' }, cornerLabel: '①', topRightLabel: '千円', top: 13.33, left: 21.74, width: 22.78, height: 3.08 },
  { field: '②', kind: 'input', readOnly: true, jumpTo: { tab: 'table5', field: 'イ', hint: 'クリックで転記元（第５表 イ・株式等の相続税評価額の合計額）へ移動します' }, cornerLabel: '②', topRightLabel: '千円', top: 13.33, left: 44.37, width: 22.78, height: 3.08 },
  { field: '③', kind: 'input', readOnly: true, cornerLabel: '③', topRightLabel: '千円', top: 13.14, left: 67.01, width: 23.32, height: 3.28 },
  { kind: 'label', text: '帳簿価額による純資産価額\n（第５表の⑥の金額）', top: 16.32, left: 21.74, width: 22.78, height: 4.14 },
  { kind: 'label', text: '株式等の帳簿価額の合計額\n(第５表の㋺＋（㊁－㋭）の金額)\n(注）', top: 16.22, left: 44.37, width: 22.78, height: 4.24 },
  { kind: 'label', text: '差引\n（④－⑤）', top: 16.22, left: 67.01, width: 23.32, height: 4.14 },
  { field: '④', kind: 'input', readOnly: true, cornerLabel: '④', topRightLabel: '千円', top: 20.27, left: 21.6, width: 22.91, height: 3.28 },
  { field: '⑤', kind: 'input', readOnly: true, jumpTo: { tab: 'table5', field: 'ロ', hint: 'クリックで転記元（第５表 ロ・株式等の帳簿価額の合計額）へ移動します' }, cornerLabel: '⑤', topRightLabel: '千円', top: 20.27, left: 44.37, width: 22.78, height: 3.18 },
  { field: '⑥', kind: 'input', readOnly: true, cornerLabel: '⑥', topRightLabel: '千円', top: 20.27, left: 66.88, width: 23.46, height: 3.18 },
  { kind: 'label', text: '評価差額に相当する金額\n(③－⑥)', top: 23.45, left: 21.74, width: 22.78, height: 4.05 },
  { kind: 'label', text: '評価差額に対する法人税額等相当額\n（⑦×38％）', top: 23.36, left: 44.37, width: 22.78, height: 4.14 },
  { kind: 'label', text: '課税時期現在の修正純資産価額\n（相続税評価額）\n（③－⑧）', top: 23.45, left: 66.88, width: 23.46, height: 3.95 },
  { field: '⑦', kind: 'input', readOnly: true, cornerLabel: '⑦', topRightLabel: '千円', top: 27.5, left: 21.74, width: 22.78, height: 2.99 },
  { field: '⑧', kind: 'input', readOnly: true, cornerLabel: '⑧', topRightLabel: '千円', top: 27.4, left: 44.37, width: 22.78, height: 3.08 },
  { field: '⑨', kind: 'input', readOnly: true, cornerLabel: '⑨', topRightLabel: '千円', top: 27.4, left: 67.01, width: 23.19, height: 3.18 },
  { kind: 'label', text: '課税時期現在の発行済株式数\n(第５表の⑩の株式数)', top: 30.49, left: 21.74, width: 22.78, height: 3.76 },
  { kind: 'label', text: '課税時期現在の修正後の１株当たりの 純資産価額\n(相続税評価額)\n(⑨ ÷ ⑩)', top: 30.39, left: 44.37, width: 22.78, height: 4.05 },
  { kind: 'label', text: '（注）第５表のニ及びホの金額に株式等\n以外の資産に係る金額が含まれている場合には、\nその金額を除いて計算します。', top: 30.39, left: 67.01, width: 23.32, height: 7.81 },
  { field: '⑩', kind: 'input', readOnly: true, jumpTo: { tab: 'table5', field: '⑩', hint: 'クリックで転記元（第５表 ⑩・課税時期現在の発行済株式数）へ移動します' }, cornerLabel: '⑩', topRightLabel: '株', top: 34.25, left: 21.6, width: 23.05, height: 3.95 },
  { field: '⑪', kind: 'input', readOnly: true, cornerLabel: '⑪', codeLabel: 'C01', cornerLabelTop: 9, topRightLabel: '円', top: 34.34, left: 44.37, width: 22.91, height: 3.95 },
  // 1株当たりのS1の金額の計算の基となる金額
  { kind: 'label', text: '１株当たりのＳ1の金額の\n計算の基となる金額', top: 38.1, left: 10.96, width: 15.68, height: 8.29 },
  { kind: 'label', text: '修正後の類似業種比準価額\n（第７表の２の㉔、㉖又は㉚の金額）', top: 38.01, left: 26.37, width: 20.59, height: 4.34 },
  { kind: 'label', text: '修正後の１株当たりの純資産価額\n（相続税評価額）\n（⑪の金額）', top: 38.1, left: 46.69, width: 20.59, height: 4.24 },
  { field: '⑫', kind: 'input', readOnly: true, cornerLabel: '⑫', codeLabel: 'C02', cornerLabelTop: 9, topRightLabel: '円', top: 42.25, left: 26.37, width: 20.59, height: 4.14 },
  { field: '⑬', kind: 'input', readOnly: true, cornerLabel: '⑬', codeLabel: 'C03', cornerLabelTop: 9, topRightLabel: '円', top: 42.06, left: 46.69, width: 20.46, height: 4.34 },
  { kind: 'cell', diagonal: 'bltr', top: 38.1, left: 67.01, width: 23.32, height: 8.29 },
  // 1株当たりのS1の金額の計算
  { kind: 'label', text: '１株当たりのS1の金額の計算', top: 46.3, left: 10.96, width: 2.63, height: 22.84 },
  { kind: 'label', text: '区 分', top: 46.2, left: 13.28, width: 8.59, height: 2.89 },
  { kind: 'label', text: '１ 株 当 た り の Ｓ 1 の 金 額 の 算 定 方 法', top: 46.2, left: 21.6, width: 50.33, height: 2.89 },
  { kind: 'label', text: '１株当たりのＳ1の金額', top: 46.3, left: 71.79, width: 18.55, height: 2.7 },
  { kind: 'label', text: '比準要素数１である会社のＳ1 の 金 額', highlightWhen: () => cls.hijun1, top: 48.9, left: 13.28, width: 8.59, height: 5.3 },
  { kind: 'label', text: '次のうちいずれか低い方の金額\nイ　⑬の金額\nロ　（⑫の金額×0.25）＋（⑬の金額×0.75）', textAlign: 'left', top: 48.9, left: 21.74, width: 50.19, height: 5.3 },
  { field: '⑭', kind: 'input', readOnly: true, highlightWhen: () => cls.hijun1, cornerLabel: '⑭', codeLabel: 'C04', cornerLabelTop: 9, topRightLabel: '円', top: 48.9, left: 71.65, width: 18.68, height: 5.3 },
  { kind: 'label', text: '上 記 以 外 の 会 社', top: 54.1, left: 13.28, width: 2.76, height: 15.04 },
  { kind: 'label', text: '大 会 社 のＳ1の金額', highlightWhen: () => cls.big, top: 54.01, left: 15.73, width: 6.14, height: 5.11 },
  { kind: 'label', text: '次のうちいずれか低い方の金額\n（⑬の記載がないときは⑫の金額）\nイ　⑫の金額\nロ　⑬の金額', textAlign: 'left', top: 54.01, left: 21.74, width: 50.19, height: 5.11 },
  { field: '⑮', kind: 'input', readOnly: true, highlightWhen: () => cls.big, cornerLabel: '⑮', codeLabel: 'C05', cornerLabelTop: 9, topRightLabel: '円', top: 54.01, left: 71.65, width: 18.82, height: 5.1 },
  { kind: 'label', text: '中 会 社 のＳ1の金額', highlightWhen: () => cls.mid, top: 58.92, left: 15.73, width: 6.14, height: 5.01 },
  { kind: 'label', text: `（⑫と⑬とのいずれか 低い方の金額×Lの割合${lText}）＋（⑬の金額×（１－Lの割合${lText}））`, top: 58.92, left: 21.74, width: 50.19, height: 5.01 },
  { field: '⑯', kind: 'input', readOnly: true, highlightWhen: () => cls.mid, cornerLabel: '⑯', codeLabel: 'C06', cornerLabelTop: 9, topRightLabel: '円', top: 58.92, left: 71.79, width: 18.55, height: 5.01 },
  { kind: 'label', text: '小 会 社 のＳ1の金額', highlightWhen: () => cls.small, top: 63.74, left: 15.73, width: 6.14, height: 5.3 },
  { kind: 'label', text: '次のうちいずれか低い方の金額\nイ　⑬の金額\nロ　（⑫の金額×0.50）＋（⑬の金額×0.50）', textAlign: 'left', top: 63.75, left: 21.74, width: 50.19, height: 5.39 },
  { field: '⑰', kind: 'input', readOnly: true, highlightWhen: () => cls.small, cornerLabel: '⑰', codeLabel: 'C07', cornerLabelTop: 9, topRightLabel: '円', top: 63.74, left: 71.79, width: 18.55, height: 5.4 },
  // ── 2. S2の金額 ──
  { kind: 'label', text: '２．S2の金額', top: 69.04, left: 8.51, width: 2.73, height: 16.39 },
  { kind: 'label', text: '課税時期現在の株式等の価額の合計額\n（第５表の㋑の金額）', top: 68.95, left: 10.96, width: 19.23, height: 4.72 },
  { kind: 'label', text: '株式等の帳簿価額の合計額\n(第５表の㋺＋(㊁－㋭)の金額)\n(注)', top: 69.04, left: 30.05, width: 20.59, height: 4.63 },
  { kind: 'label', text: '株式等に係る評価差額に相当する金額\n（⑱－⑲）', top: 68.95, left: 50.38, width: 20.32, height: 4.63 },
  { kind: 'label', text: '⑳の評価差額に対する法人税額等相当額\n（⑳×38％）', top: 69.04, left: 70.56, width: 19.78, height: 4.53 },
  { field: '⑱', kind: 'input', cornerLabel: '⑱', topRightLabel: '千円', top: 73.57, left: 11.1, width: 19.09, height: 2.89 },
  { field: '⑲', kind: 'input', cornerLabel: '⑲', topRightLabel: '千円', top: 73.57, left: 30.05, width: 20.46, height: 2.89 },
  { field: '⑳', kind: 'input', readOnly: true, cornerLabel: '⑳', topRightLabel: '千円', top: 73.48, left: 50.38, width: 20.32, height: 2.99 },
  { field: '㉑', kind: 'input', readOnly: true, cornerLabel: '㉑', topRightLabel: '千円', top: 73.48, left: 70.56, width: 19.78, height: 2.98 },
  { kind: 'label', text: 'Ｓ2の純資産価額相当額\n（⑱－㉑）', top: 76.37, left: 11.1, width: 19.09, height: 4.53 },
  { kind: 'label', text: '課税時期現在の発行済株式数\n（第５表の⑩の株式数）', top: 76.37, left: 30.05, width: 20.46, height: 4.43 },
  { kind: 'label', text: 'Ｓ2の金額\n（㉒÷㉓）', top: 76.37, left: 50.38, width: 20.46, height: 4.44 },
  { kind: 'label', text: '(注）第５表の㊁及び㋭の金額に株式等以外の\n資産に係る金額が含まれている場合には、\nその金額を除いて計算します。', top: 76.27, left: 70.56, width: 19.78, height: 9.16 },
  { field: '㉒', kind: 'input', readOnly: true, cornerLabel: '㉒', topRightLabel: '千円', top: 80.8, left: 11.1, width: 19.09, height: 4.43 },
  { field: '㉓', kind: 'input', readOnly: true, cornerLabel: '㉓', topRightLabel: '株', top: 80.8, left: 30.05, width: 20.46, height: 4.53 },
  { field: '㉔', kind: 'input', readOnly: true, cornerLabel: '㉔', codeLabel: 'C08', cornerLabelTop: 9, topRightLabel: '円', top: 80.71, left: 50.38, width: 20.46, height: 4.63 },
  // ── 3. 株式等保有特定会社の株式の価額 ──
  { kind: 'label', text: '３.株式等保有特定会社の\n株式の価額', top: 85.33, left: 8.78, width: 13.09, height: 8.96 },
  { kind: 'label', text: '１株当たりの純資産価額\n（第５表の⑪の金額\n（第５表の⑫の金額がある ときはその金額）)', top: 85.33, left: 21.74, width: 22.91, height: 4.43 },
  { kind: 'label', text: 'Ｓ1の金額とＳ2の金額との合計額\n（（⑭、⑮、⑯又は⑰）＋㉔）', top: 85.33, left: 44.37, width: 22.78, height: 4.53 },
  { kind: 'label', text: '株式等保有特定会社の株式の価額\n（㉕と㉖とのいずれか低い方の金額）', top: 85.24, left: 66.88, width: 23.46, height: 4.53 },
  { field: '㉕', kind: 'input', readOnly: true, cornerLabel: '㉕', codeLabel: 'C09', cornerLabelTop: 9, topRightLabel: '円', top: 89.67, left: 21.6, width: 22.91, height: 4.53 },
  { field: '㉖', kind: 'input', readOnly: true, cornerLabel: '㉖', topRightLabel: '円', top: 89.77, left: 44.37, width: 22.78, height: 4.53 },
  { field: '㉗', kind: 'input', readOnly: true, cornerLabel: '㉗', codeLabel: 'C10', cornerLabelTop: 9, topRightLabel: '円', top: 89.67, left: 67.01, width: 23.32, height: 4.53 },
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

  return <GridForm cells={buildCells(cls)} g={g} u={u} formId={T} width="100%" title="第７表の３　株式等保有特定会社の株式の価額の計算明細書（続）" formCode="NTA0VNA240030010" references={REFERENCES} onJump={onJump && ((t) => onJump({ tab: t.tab as TableId, field: t.field }))} />;
}
