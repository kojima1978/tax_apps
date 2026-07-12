import { GridForm, type GridCell } from '@/components/ui/GridForm';
import { calcTable7 } from './Table7Grid';
import { calcTable2 } from '../table2/Table2Grid';
import { extractCompanyFloatHeader } from '../companyFloatHeader';
import type { TableId, TableProps } from '@/types/form';

// ══ 第7表の1（令和8年4月1日以降用）══
// 旧第7表の前半（受取配当金等収受割合の計算 ＋ Ⓑ-ⓑ／Ⓒ-ⓒ／Ⓓ-ⓓ の金額＝①〜⑰）。
// データは 'table7' バケット共通、計算は calcTable7 を再利用。S1の類似業種比準価額（⑱〜㉚）は第7表の2へ分離。

const T = 'table7' as const;
const fl = (v: number) => Math.floor(v + 1e-9);

// [コード][円値][円][銭値][銭] の金額入力
function yenSen(code: string, yenField: string, senField: string, top: number, h: number, codeL: number, yenL: number, yenU: number, senL: number, senU: number, end: number): GridCell[] {
  return [
    ...(code ? [{ kind: 'cell' as const, codeLabel: code, top, left: codeL, width: +(yenL - codeL).toFixed(2), height: h }] : []),
    { field: yenField, kind: 'input', readOnly: true, top, left: yenL, width: +(yenU - yenL).toFixed(2), height: h, align: 'right' },
    { kind: 'label', text: '円', top, left: yenU, width: +(senL - yenU).toFixed(2), height: h, fontSize: 7 },
    { field: senField, kind: 'input', readOnly: true, top, left: senL, width: +(senU - senL).toFixed(2), height: h, align: 'right' },
    { kind: 'label', text: '銭', top, left: senU, width: +(end - senU).toFixed(2), height: h, fontSize: 7 },
  ];
}

const CELLS: GridCell[] = [
  // S1の計算区分全体を、見た目を変えずに意味のあるDOMグループとしてまとめる。
  { kind: 'cell', text: 'S1の金額（類似業種比準価額の修正計算）', ariaLabel: 'S1の金額（類似業種比準価額の修正計算）', semanticRole: 'group', groupBorder: false, top: 15.1, left: 7.74, width: 84.28, height: 58.69 },
  // 会社名
  { kind: 'label', text: '会　社　名', top: 11.42, left: 56.97, width: 12.5, height: 2.77 },
  { field: 'company', kind: 'input', top: 11.42, left: 69.47, width: 22.55, height: 2.77, align: 'left' },
  // 左端の縦見出し
  { kind: 'label', text: '１．S１の金額（類似業種比準価額の修正計算）', semanticRole: 'columnheader', top: 15.1, left: 7.74, width: 2.25, height: 58.69, align: 'center' },
  // ── 受取配当金等収受割合の計算 ──
  { kind: 'label', text: '受 取 配 当 金 等 収 受 割 合 の 計 算 （ 千 円 ）', top: 15.1, left: 9.99, width: 62.57, height: 2.51 },
  { kind: 'label', text: '受取配当金等収受割合\n（㋑÷（㋑＋㋺））\n※少数点以下３位未満切り捨て', fontSize: 6.5, top: 15.1, left: 72.56, width: 19.34, height: 6.44 },
  { kind: 'label', text: '事 業 年 度', top: 17.61, left: 9.99, width: 16.0, height: 3.93 },
  { kind: 'label', text: '①　直 前 期', top: 17.61, left: 25.99, width: 15.47, height: 3.93 },
  { kind: 'label', text: '②　直 前 々 期', top: 17.61, left: 41.46, width: 15.63, height: 3.93 },
  { kind: 'label', text: '合計（①＋②）', top: 17.61, left: 57.09, width: 15.47, height: 3.93 },
  { kind: 'label', text: '受取配当金等の額', top: 21.54, left: 9.99, width: 16.0, height: 3.33 },
  { kind: 'cell', codeLabel: 'G01', top: 21.54, left: 25.99, width: 1.93, height: 3.33 },
  { field: 'f10', kind: 'input', commaInteger: true, top: 21.54, left: 27.92, width: 13.54, height: 3.33, align: 'right' },
  { kind: 'cell', codeLabel: 'G03', top: 21.54, left: 41.46, width: 2.09, height: 3.33 },
  { field: 'f11', kind: 'input', commaInteger: true, top: 21.54, left: 43.55, width: 13.54, height: 3.33, align: 'right' },
  { kind: 'label', text: '㋑', top: 21.54, left: 57.09, width: 1.93, height: 3.33 },
  { field: '㋑', kind: 'input', readOnly: true, top: 21.54, left: 59.02, width: 13.54, height: 3.33, align: 'right' },
  { kind: 'label', text: '営 業 利 益 の 金 額', top: 24.87, left: 9.99, width: 16.0, height: 3.36 },
  { kind: 'cell', codeLabel: 'G02', top: 24.87, left: 25.99, width: 1.93, height: 3.36 },
  { field: 'f13', kind: 'input', commaInteger: true, top: 24.87, left: 27.92, width: 13.54, height: 3.36, align: 'right' },
  { kind: 'cell', codeLabel: 'G04', top: 24.87, left: 41.46, width: 2.09, height: 3.36 },
  { field: 'f14', kind: 'input', commaInteger: true, top: 24.87, left: 43.55, width: 13.54, height: 3.36, align: 'right' },
  { kind: 'label', text: '㋺', top: 24.87, left: 57.09, width: 1.93, height: 3.36 },
  { field: '㋺', kind: 'input', readOnly: true, top: 24.87, left: 59.02, width: 13.54, height: 3.36, align: 'right' },
  { kind: 'label', text: '㋩', top: 21.54, left: 72.56, width: 1.94, height: 6.69 },
  { kind: 'cell', codeLabel: 'C01', top: 21.54, left: 74.5, width: 1.93, height: 6.69 },
  { field: '㋩', kind: 'input', readOnly: true, top: 21.54, left: 76.43, width: 15.47, height: 6.69, align: 'right' },
  // ── Ⓑ－ⓑの金額 ──
  { kind: 'label', text: 'Ⓑ　　－　　ⓑ　　の　　金　　額', top: 28.23, left: 9.99, width: 62.57, height: 2.51 },
  { kind: 'cell', diagonal: 'tlbr', top: 28.23, left: 72.56, width: 19.34, height: 9.8 },
  { kind: 'label', text: '③　１株（50円）当たりの\n　　年配当金額（第４表の１のⒷ）', fontSize: 6.5, top: 30.74, left: 9.99, width: 21.8, height: 3.96 },
  { kind: 'label', text: '④　ⓑ の 金 額\n　　（③×㋩）', fontSize: 6.5, top: 30.74, left: 31.79, width: 19.5, height: 3.96 },
  { kind: 'label', text: '⑤　Ⓑ － ⓑ の 金 額\n　　（③－④）', fontSize: 6.5, top: 30.74, left: 51.29, width: 21.27, height: 3.96 },
  ...yenSen('', '③', 'f23', 34.7, 3.33, 9.99, 9.99, 24.05, 25.99, 29.9, 31.79),
  ...yenSen('', '④', 'f25', 34.7, 3.33, 31.79, 31.79, 43.55, 45.49, 49.4, 51.29),
  ...yenSen('J01', '⑤', 'f27', 34.7, 3.33, 51.29, 53.22, 62.89, 64.83, 70.63, 72.56),
  // ── Ⓒ－ⓒの金額 ──
  { kind: 'label', text: 'Ⓒ　　－　　ⓒ　　の　　金　　額', top: 38.03, left: 9.99, width: 62.57, height: 2.51 },
  { kind: 'cell', diagonal: 'tlbr', top: 38.03, left: 72.56, width: 19.34, height: 9.72 },
  { kind: 'label', text: '⑥　１株（50円）当たりの\n　　年利益金額（第４表の１のⒸ）', fontSize: 6.5, top: 40.54, left: 9.99, width: 21.8, height: 3.85 },
  { kind: 'label', text: '⑦　ⓒ の 金 額\n　　（⑥×㋩）', fontSize: 6.5, top: 40.54, left: 31.79, width: 19.5, height: 3.85 },
  { kind: 'label', text: '⑧　Ⓒ － ⓒ の 金 額\n　　（⑥－⑦）', fontSize: 6.5, top: 40.54, left: 51.29, width: 21.27, height: 3.85 },
  { field: '⑥', kind: 'input', readOnly: true, topRightLabel: '円', top: 44.39, left: 9.99, width: 21.8, height: 3.36, align: 'right' },
  { field: '⑦', kind: 'input', readOnly: true, topRightLabel: '円', top: 44.39, left: 31.79, width: 19.5, height: 3.36, align: 'right' },
  { kind: 'cell', codeLabel: 'G05', top: 44.39, left: 51.29, width: 1.93, height: 3.36 },
  { field: '⑧', kind: 'input', readOnly: true, topRightLabel: '円', top: 44.39, left: 53.22, width: 19.34, height: 3.36, align: 'right' },
  // ── Ⓓ－ⓓの金額 ──
  { kind: 'label', text: 'Ⓓ　　－　　ⓓ　　の　　金　　額', top: 47.75, left: 9.99, width: 82.03, height: 2.51 },
  { kind: 'label', text: '（イ）\nの金額', fontSize: 6.5, top: 50.26, left: 9.99, width: 4.39, height: 7.77 },
  { kind: 'label', text: '⑨　１株（50円）当たりの純資\n　　産価額（第４表の１のⒹ）', fontSize: 6.5, top: 50.26, left: 14.38, width: 17.41, height: 4.44 },
  { kind: 'label', text: '⑩　直前期末の株式等の\n　　帳簿価額の合計額', fontSize: 6.5, top: 50.26, left: 31.79, width: 19.5, height: 4.44 },
  { kind: 'label', text: '⑪　直前期末の総資産価額\n　　（帳 簿 価 額）', fontSize: 6.5, top: 50.26, left: 51.29, width: 19.34, height: 4.44 },
  { kind: 'label', text: '⑫　（イ）の金額\n　　（⑨×（⑩÷⑪））', fontSize: 6.5, top: 50.26, left: 70.63, width: 21.27, height: 4.44 },
  { field: '⑨', kind: 'input', readOnly: true, topRightLabel: '円', top: 54.7, left: 14.38, width: 17.41, height: 3.33, align: 'right' },
  { kind: 'cell', codeLabel: 'G06', top: 54.7, left: 31.79, width: 1.93, height: 3.33 },
  { field: '⑩', kind: 'input', commaInteger: true, topRightLabel: '千円', top: 54.7, left: 33.72, width: 17.57, height: 3.33, align: 'right' },
  { kind: 'cell', codeLabel: 'G07', top: 54.7, left: 51.29, width: 1.93, height: 3.33 },
  { field: '⑪', kind: 'input', commaInteger: true, topRightLabel: '千円', top: 54.7, left: 53.22, width: 17.41, height: 3.33, align: 'right' },
  { kind: 'cell', codeLabel: 'G08', top: 54.7, left: 70.63, width: 1.93, height: 3.33 },
  { field: '⑫', kind: 'input', readOnly: true, topRightLabel: '円', top: 54.7, left: 72.56, width: 19.34, height: 3.33, align: 'right' },
  { kind: 'label', text: '（ロ）\nの金額', fontSize: 6.5, top: 58.03, left: 9.99, width: 4.39, height: 8.29 },
  { kind: 'label', text: '⑬　利益積立金額\n　　（第４表の１の⑱の「直前期」欄の金額）', fontSize: 6.5, top: 58.03, left: 14.38, width: 36.91, height: 4.96 },
  { kind: 'label', text: '⑭　１株当たりの資本金等の額を50円とした場合\n　　の発行済株式数（第４表の１の⑤の株式数）', fontSize: 6.5, top: 58.03, left: 51.29, width: 19.34, height: 4.96 },
  { kind: 'label', text: '⑮　（ロ）の金額\n　　（（⑬÷⑭）×㋩）', fontSize: 6.5, top: 58.03, left: 70.63, width: 21.27, height: 4.96 },
  { field: '⑬', kind: 'input', readOnly: true, topRightLabel: '千円', top: 62.99, left: 14.38, width: 36.91, height: 3.33, align: 'right' },
  { field: '⑭', kind: 'input', readOnly: true, topRightLabel: '株', top: 62.99, left: 51.29, width: 19.34, height: 3.33, align: 'right' },
  { kind: 'cell', codeLabel: 'G09', top: 62.99, left: 70.63, width: 1.93, height: 3.33 },
  { field: '⑮', kind: 'input', readOnly: true, topRightLabel: '円', top: 62.99, left: 72.56, width: 19.34, height: 3.33, align: 'right' },
  { kind: 'label', text: '⑯　ⓓの金額（⑫＋⑮）', fontSize: 6.5, top: 66.32, left: 9.99, width: 21.8, height: 4.11 },
  { kind: 'label', text: '⑰　Ⓓ－ⓓの金額（⑨－⑯）', fontSize: 6.5, top: 66.32, left: 31.79, width: 21.55, height: 4.11 },
  { kind: 'label', text: '（注）１　㋩の割合は、１を上限とします。\n　　　２　⑯の金額は、Ⓓの金額（⑨の金額）を上限とします。', fontSize: 7, align: 'left', top: 66.32, left: 53.34, width: 38.68, height: 7.47 },
  { field: '⑯', kind: 'input', readOnly: true, topRightLabel: '円', top: 70.43, left: 9.99, width: 21.8, height: 3.36, align: 'right' },
  { kind: 'cell', codeLabel: 'G10', top: 70.43, left: 31.79, width: 1.93, height: 3.36 },
  { field: '⑰', kind: 'input', readOnly: true, topRightLabel: '円', top: 70.43, left: 33.72, width: 19.62, height: 3.36, align: 'right' },
];

/** 第7表の1（受取配当金等収受割合の計算＋Ⓑ-ⓑ／Ⓒ-ⓒ／Ⓓ-ⓓ） */
export function Table7_1Grid({ getField, updateField, onJump }: TableProps) {
  const raw = (f: string) => getField(T, f);
  const u = (f: string, v: string) => updateField(T, f, v);
  const fmt = (v: number | null) => (v === null ? '' : v.toLocaleString('ja-JP'));
  const yenPart = (v: number | null) => (v === null ? '' : fl(v).toLocaleString('ja-JP'));
  const senPart = (v: number | null) => (v === null ? '' : String(Math.round((v - fl(v)) * 100)).padStart(2, '0'));

  const c = calcTable7(getField);
  const judge = calcTable2(getField).j;

  const g = (f: string): string => {
    switch (f) {
      case '㋑': return fmt(c.ia);
      case '㋺': return fmt(c.ro);
      case '㋩': return c.ha === null ? '' : c.ha.toFixed(3);
      case '③': return yenPart(c.Bv); case 'f23': return senPart(c.Bv);
      case '④': return yenPart(c.lowerB); case 'f25': return senPart(c.lowerB);
      case '⑤': return yenPart(c.adjB); case 'f27': return senPart(c.adjB);
      case '⑥': return fmt(c.Cv);
      case '⑦': return fmt(c.lowerC);
      case '⑧': return fmt(c.adjC);
      case '⑨': return fmt(c.Dv);
      case '⑩': return raw('⑩').trim() !== '' ? raw('⑩') : fmt(c.kabuBook);
      case '⑪': return raw('⑪').trim() !== '' ? raw('⑪') : fmt(c.totalBook);
      case '⑫': return fmt(c.iKin);
      case '⑬': return fmt(c.ekiseki);
      case '⑭': return fmt(c.shares50);
      case '⑮': return fmt(c.roKin);
      case '⑯': return fmt(c.lowerD);
      case '⑰': return fmt(c.adjD);
      default: return raw(f);
    }
  };
  const toolbar = (
    <span className="no-print" style={{ fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', color: judge.s2 === true ? '#b45309' : '#555' }}>
      第2表判定：株式等保有特定会社に{judge.s2 === true ? '該当' : judge.s2 === false ? '非該当' : '未判定'}
    </span>
  );
  const { mainCells, headerExtra, aspectRatio } = extractCompanyFloatHeader(CELLS, g, u, T);
  return <GridForm cells={mainCells} g={g} u={u} formId={T} width="100%" aspectRatio={aspectRatio} title="第７表の１　株式等保有特定会社の株式の価額の計算明細書" formCode="NTA0VNA240010010" headerExtra={headerExtra} toolbar={toolbar} onJump={onJump && ((t) => onJump({ tab: t.tab as TableId, field: t.field }))} />;
}
