import { GridForm, type GridCell } from '@/components/ui/GridForm';
import { calcTable4 } from '../table4/Table4Grid';
import { calcTable5 } from '../table5/Table5Grid';
import { calcCompanySize } from '../table1-2/Table1_2Grid';
import { extractCompanyFloatHeader } from '../companyFloatHeader';
import type { TableProps } from '@/types/form';

const T = 'table2' as const;

// ══ 令和8年4月1日以降用の様式 ══
// ・判定要素の転記元表示が「第４表の１」（Ⓑ１Ⓒ１Ⓓ１／Ⓑ２Ⓒ２Ⓓ２）に変更
// ・識別コード（G01〜G31・N01）は様式どおり独立セルで再現し、判定の「１」記入枠は該当時に自動表示
// ・開業年月日（N01）は元号/年/月/日の4列プルダウン
// ・判定ロジックは通達189のまま（比準要素数1/株保50%/土地保有70・90%/開業3年/開業前・休業中/清算中）

const fl = (v: number) => Math.floor(v + 1e-9);

// ── 和暦日付の4列プルダウン（第1表の1と同方式・第2表の列位置） ──
const numOptions = (n: number) => ['', ...Array.from({ length: n }, (_, i) => String(i + 1))];
const DATE_OPTS = {
  g: ['令和', '平成', '昭和'],
  y: numOptions(64),
  m: numOptions(12),
  d: numOptions(31),
} as const;

/** 第2表の判定結果（ハイライト・「１」記入枠の表示に使用） */
interface Judgments {
  s1: boolean | null;            // 1. 比準要素数1の会社
  kabuRatio: number | null;      // ③ 株式等保有割合（1%未満切捨て）
  s2: boolean | null;            // 2. 株式等保有特定会社
  landRatio: number | null;      // ⑥ 土地保有割合（1%未満切捨て）
  landCol: 'big' | 'mid' | 'smallA' | 'smallB' | null; // 適用列（大70/中90/小イ70/小ロ90）
  landIndustryPrefix: '･卸売業' | '･小売・サービス業' | '･上記以外の業種' | null;
  sizeRank: number | null;       // 会社規模（4大/3-1中/0小）
  s3: boolean | null;            // 3. 土地保有特定会社
  s4a: boolean | null;           // 4(1) 開業後3年未満
  s4b: boolean | null;           // 4(2) 比準要素数0
  s5a: boolean;                  // 5. 開業前
  s5b: boolean;                  // 5. 休業中
  s6: boolean;                   // 6. 清算中
}

/** 「１」記入枠（b_G01〜b_G31）の該当状態 */
function flagStates(c: ReturnType<typeof calcTable2>): Record<string, boolean> {
  const j = c.j;
  const landTh = j.landCol === 'big' || j.landCol === 'smallA' ? 70 : j.landCol === 'mid' || j.landCol === 'smallB' ? 90 : null;
  const landHit = (col: Judgments['landCol'], over: boolean) =>
    j.landCol === col && j.landRatio !== null && landTh !== null && (over ? j.landRatio >= landTh : j.landRatio < landTh);
  return {
    b_G01: j.s1 === true, b_G02: j.s1 === false,
    b_G03: j.s2 === true, b_G04: j.s2 === false,
    b_G05: j.sizeRank === 4, b_G06: j.sizeRank !== null && j.sizeRank >= 1 && j.sizeRank <= 3, b_G07: j.sizeRank === 0,
    b_G08: landHit('big', true), b_G09: landHit('big', false),
    b_G10: landHit('mid', true), b_G11: landHit('mid', false),
    b_G12: landHit('smallA', true), b_G13: landHit('smallA', false),
    b_G14: landHit('smallB', true), b_G15: landHit('smallB', false),
    b_G16: j.s4a === true, b_G17: j.s4a === false,
    b_G18: j.s4b === true, b_G19: j.s4b === false,
    b_G20: j.s5a, b_G21: !j.s5a,
    b_G22: j.s5b, b_G23: !j.s5b,
    b_G24: j.s6, b_G25: !j.s6,
    b_G26: c.result === 1, b_G27: c.result === 2, b_G28: c.result === 3,
    b_G29: c.result === 4, b_G30: c.result === 5, b_G31: c.result === 6,
  };
}

/** 判定セル（[コード][１記入枠][項目]）を生成。textPropsでselectValue等を追加 */
function judgeCells(
  flags: Record<string, boolean>,
  top: number,
  height: number,
  code: string,
  text: string,
  codeL: number,
  boxL: number,
  textL: number,
  textEnd: number,
  textProps?: Partial<GridCell>,
): GridCell[] {
  const hl = () => flags[`b_${code}`] === true;
  return [
    { kind: 'cell', codeLabel: code, top, left: codeL, width: +(boxL - codeL).toFixed(2), height },
    { field: `b_${code}`, kind: 'input', readOnly: true, ariaLabel: `${code}（該当時は１）`, highlightWhen: hl, top, left: boxL, width: +(textL - boxL).toFixed(2), height, align: 'center' },
    { kind: 'label', text, highlightWhen: hl, top, left: textL, width: +(textEnd - textL).toFixed(2), height, ...textProps },
  ];
}

/** 第2表のグリッドセル（令和8年様式・罫線座標はPNGからの機械抽出） */
function buildCells(c: ReturnType<typeof calcTable2>): GridCell[] {
  const j = c.j;
  const flags = flagStates(c);
  const fieldIsZero = (g: (field: string) => string, field: string) => {
    const value = g(field).replace(/,/g, '').trim();
    return value !== '' && Number(value) === 0;
  };
  const jc = (top: number, height: number, code: string, text: string, codeL: number, boxL: number, textL: number, textEnd: number, textProps?: Partial<GridCell>) =>
    judgeCells(flags, top, height, code, text, codeL, boxL, textL, textEnd, textProps);
  return [
    { kind: 'cell', semanticRole: 'group', groupBorder: false, ariaLabel: '比準要素数1の会社', top: 16.13, left: 6.04, width: 87.55, height: 10.54 },
    { kind: 'cell', semanticRole: 'group', groupBorder: false, ariaLabel: '株式等保有特定会社', top: 26.89, left: 6.04, width: 87.55, height: 8.69 },
    { kind: 'cell', semanticRole: 'group', groupBorder: false, ariaLabel: '土地保有特定会社', top: 35.81, left: 6.04, width: 87.55, height: 25.61 },
    { kind: 'cell', semanticRole: 'group', groupBorder: false, ariaLabel: '開業後3年未満の会社等', top: 61.65, left: 6.04, width: 87.55, height: 14.85 },
    { kind: 'cell', semanticRole: 'group', groupBorder: false, ariaLabel: '開業前又は休業中の会社', top: 76.7, left: 6.04, width: 55.32, height: 4.44 },
    { kind: 'cell', semanticRole: 'group', groupBorder: false, ariaLabel: '清算中の会社', top: 76.7, left: 61.36, width: 32.23, height: 4.44 },
    { kind: 'cell', semanticRole: 'group', groupBorder: false, ariaLabel: '特定の評価会社の判定結果', top: 81.37, left: 6.04, width: 87.55, height: 7.83 },
    // ── 会社名・注記 ──
    { kind: 'label', text: '会　社　名', top: 11.11, left: 51.13, width: 12.09, height: 2.62 },
    { field: 'company', kind: 'input', top: 11.11, left: 63.22, width: 30.37, height: 2.62, align: 'left' },
    { kind: 'label', text: '※　１〜６の「判定」欄並びに７の判定結果欄については、当てはまる項目の空欄に「１」を記入してください。', top: 14.59, left: 5.96, width: 87.63, height: 1.54, align: 'left', fontSize: 8 },
    // ── 1. 比準要素数1の会社 ──
    { kind: 'label', text: '１．\n比準要素数１\nの会社', semanticRole: 'columnheader', ariaLabel: '比準要素数1の会社', top: 16.13, left: 6.04, width: 9.47, height: 10.54, align: 'left' },
    { kind: 'label', text: '判　　定　　要　　素', top: 16.13, left: 15.51, width: 53.75, height: 2.08 },
    { kind: 'label', text: '⑴ 直前期末を基とした判定要素', top: 18.21, left: 15.51, width: 26.43, height: 1.99 },
    { kind: 'label', text: '⑵ 直前々期末を基とした判定要素', top: 18.21, left: 41.94, width: 27.32, height: 1.99 },
    { kind: 'label', text: '第４表の１\nⒷ１の金額', bottomSegments: [{ text: '（円）', width: 5.88 }, { text: '（銭）', width: 4.19 }], fontSize: 6.5, top: 20.2, left: 15.51, width: 10.07, height: 3.93 },
    { kind: 'label', text: '第４表の１\nⒸ１の金額', bottomLabel: '（円）', bottomLabelAlign: 'right', fontSize: 6.5, top: 20.2, left: 25.58, width: 7.98, height: 3.93 },
    { kind: 'label', text: '第４表の１\nⒹ１の金額', bottomLabel: '（円）', bottomLabelAlign: 'right', fontSize: 6.5, top: 20.2, left: 33.56, width: 8.38, height: 3.93 },
    { kind: 'label', text: '第４表の１\nⒷ２の金額', bottomSegments: [{ text: '（円）', width: 6.85 }, { text: '（銭）', width: 4.67 }], fontSize: 6.5, top: 20.2, left: 41.94, width: 11.52, height: 3.93 },
    { kind: 'label', text: '第４表の１\nⒸ２の金額', bottomLabel: '（円）', bottomLabelAlign: 'right', fontSize: 6.5, top: 20.2, left: 53.46, width: 7.9, height: 3.93 },
    { kind: 'label', text: '第４表の１\nⒹ２の金額', bottomLabel: '（円）', bottomLabelAlign: 'right', fontSize: 6.5, top: 20.2, left: 61.36, width: 7.9, height: 3.93 },
    { field: 'f16', kind: 'input', readOnly: true, highlightWhen: (g) => fieldIsZero(g, 'f16'), top: 24.13, left: 15.51, width: 5.88, height: 2.54, align: 'right' },
    { field: 'f17', kind: 'input', readOnly: true, highlightWhen: (g) => fieldIsZero(g, 'f16'), top: 24.13, left: 21.39, width: 4.19, height: 2.54, align: 'right' },
    { field: 'f18', kind: 'input', readOnly: true, highlightWhen: (g) => fieldIsZero(g, 'f18'), top: 24.13, left: 25.58, width: 7.98, height: 2.54, align: 'right' },
    { field: 'f19', kind: 'input', readOnly: true, highlightWhen: (g) => fieldIsZero(g, 'f19'), top: 24.13, left: 33.56, width: 8.38, height: 2.54, align: 'right' },
    { field: 'f23', kind: 'input', readOnly: true, highlightWhen: (g) => fieldIsZero(g, 'f23'), top: 24.13, left: 41.94, width: 6.85, height: 2.54, align: 'right' },
    { field: 'f24', kind: 'input', readOnly: true, highlightWhen: (g) => fieldIsZero(g, 'f23'), top: 24.13, left: 48.79, width: 4.67, height: 2.54, align: 'right' },
    { field: 'f25', kind: 'input', readOnly: true, highlightWhen: (g) => fieldIsZero(g, 'f25'), top: 24.13, left: 53.46, width: 7.9, height: 2.54, align: 'right' },
    { field: 'f26', kind: 'input', readOnly: true, highlightWhen: (g) => fieldIsZero(g, 'f26'), top: 24.13, left: 61.36, width: 7.9, height: 2.54, align: 'right' },
    { kind: 'label', text: '判定基準', top: 16.13, left: 69.26, width: 2.58, height: 8, align: 'center' },
    { kind: 'label', text: '⑴欄のいずれか２の判定要素が０であり、かつ、\n⑵欄のいずれか２以上の判定要素が０', top: 16.13, left: 71.84, width: 21.75, height: 5.27, align: 'left', fontSize: 7 },
    { kind: 'label', text: 'で　あ　る', highlightWhen: () => j.s1 === true, top: 21.4, left: 71.84, width: 11.28, height: 2.73 },
    { kind: 'label', text: 'で　な　い', highlightWhen: () => j.s1 === false, top: 21.4, left: 83.12, width: 10.47, height: 2.73 },
    { kind: 'label', text: '判定', top: 24.13, left: 69.26, width: 2.58, height: 2.54, align: 'center', fontSize: 7, forceVertical: true },
    ...jc(24.13, 2.54, 'G01', '該　　当', 71.84, 74.42, 77.07, 83.12),
    ...jc(24.13, 2.54, 'G02', '非　該　当', 83.12, 85.7, 88.28, 93.59),
    // ── 2. 株式等保有特定会社 ──
    { kind: 'label', text: '２．\n株式等保有\n特定会社', semanticRole: 'columnheader', ariaLabel: '株式等保有特定会社', top: 26.89, left: 6.04, width: 9.47, height: 8.69, align: 'left' },
    { kind: 'label', text: '判　　定　　要　　素', top: 26.89, left: 15.51, width: 53.75, height: 1.97 },
    { kind: 'label', text: '①　総　資　産　価　額\n（第５表の①の金額）', bottomLabel: '（千円）', bottomLabelAlign: 'right', fontSize: 6.5, top: 28.86, left: 15.51, width: 18.05, height: 4.19 },
    { kind: 'label', text: '②　株式等の価額の合計額\n（第５表の㋑の金額）', bottomLabel: '（千円）', bottomLabelAlign: 'right', fontSize: 6.5, top: 28.86, left: 33.56, width: 19.9, height: 4.19 },
    { kind: 'label', text: '③　株式等保有割合\n（　②　／　①　）', bottomLabel: '（％）', bottomLabelAlign: 'right', fontSize: 6.5, top: 28.86, left: 53.46, width: 15.8, height: 4.19 },
    { field: '①', kind: 'input', readOnly: true, top: 33.05, left: 15.51, width: 18.05, height: 2.53, align: 'right' },
    { field: '②', kind: 'input', readOnly: true, top: 33.05, left: 33.56, width: 19.9, height: 2.53, align: 'right' },
    { field: '③', kind: 'input', readOnly: true, top: 33.05, left: 53.46, width: 15.8, height: 2.53, align: 'right' },
    { kind: 'label', text: '判定基準', top: 26.89, left: 69.26, width: 2.58, height: 6.16, align: 'center' },
    { kind: 'label', text: '③の割合が', top: 26.89, left: 71.84, width: 21.75, height: 3.42, align: 'left' },
    { kind: 'label', text: '50％以上である', highlightWhen: () => j.s2 === true, top: 30.31, left: 71.84, width: 11.28, height: 2.74 },
    { kind: 'label', text: '50％未満である', highlightWhen: () => j.s2 === false, top: 30.31, left: 83.12, width: 10.47, height: 2.74 },
    { kind: 'label', text: '判定', top: 33.05, left: 69.26, width: 2.58, height: 2.53, align: 'center', fontSize: 7, forceVertical: true },
    ...jc(33.05, 2.53, 'G03', '該　　当', 71.84, 74.42, 77.07, 83.12),
    ...jc(33.05, 2.53, 'G04', '非　該　当', 83.12, 85.7, 88.28, 93.59),
    // ── 3. 土地保有特定会社 ──
    { kind: 'label', text: '３．\n土地保有\n特定会社', semanticRole: 'columnheader', ariaLabel: '土地保有特定会社', top: 35.81, left: 6.04, width: 9.47, height: 25.61, align: 'left', forceHorizontal: true },
    { kind: 'label', text: '判　　定　　要　　素', top: 35.81, left: 15.51, width: 53.75, height: 1.97 },
    { kind: 'label', text: '④　総　資　産　価　額\n（第５表の①の金額）', bottomLabel: '（千円）', bottomLabelAlign: 'right', fontSize: 6.5, top: 37.78, left: 15.51, width: 18.05, height: 4.33 },
    { kind: 'label', text: '⑤　土地等の価額の合計額\n（第５表の㋩の金額）', bottomLabel: '（千円）', bottomLabelAlign: 'right', fontSize: 6.5, top: 37.78, left: 33.56, width: 19.9, height: 4.33 },
    { kind: 'label', text: '⑥　土 地 保 有 割 合\n（　⑤　／　④　）', bottomLabel: '（％）', bottomLabelAlign: 'right', fontSize: 6.5, top: 37.78, left: 53.46, width: 15.8, height: 4.33 },
    { field: '④', kind: 'input', readOnly: true, top: 42.11, left: 15.51, width: 18.05, height: 2.65, align: 'right' },
    { field: '⑤', kind: 'input', readOnly: true, top: 42.11, left: 33.56, width: 19.9, height: 2.65, align: 'right' },
    { field: '⑥', kind: 'input', readOnly: true, top: 42.11, left: 53.46, width: 15.8, height: 2.65, align: 'right' },
    { kind: 'label', text: '会 社 の 規 模 の 判 定', top: 35.81, left: 69.26, width: 24.33, height: 1.97 },
    { kind: 'label', text: '大　会　社', top: 37.78, left: 69.26, width: 7.81, height: 1.59 },
    { kind: 'label', text: '中　会　社', top: 37.78, left: 77.07, width: 8.63, height: 1.59 },
    { kind: 'label', text: '小　会　社', top: 37.78, left: 85.7, width: 7.89, height: 1.59 },
    { kind: 'cell', codeLabel: 'G05', top: 39.37, left: 69.26, width: 2.58, height: 5.39 },
    { field: 'b_G05', kind: 'input', readOnly: true, ariaLabel: 'G05 大会社（該当時は１）', highlightWhen: () => flags['b_G05'] === true, top: 39.37, left: 71.84, width: 5.23, height: 5.39, align: 'center' },
    { kind: 'cell', codeLabel: 'G06', top: 39.37, left: 77.07, width: 2.58, height: 5.39 },
    { field: 'b_G06', kind: 'input', readOnly: true, ariaLabel: 'G06 中会社（該当時は１）', highlightWhen: () => flags['b_G06'] === true, top: 39.37, left: 79.65, width: 6.05, height: 5.39, align: 'center' },
    { kind: 'cell', codeLabel: 'G07', top: 39.37, left: 85.7, width: 2.58, height: 5.39 },
    { field: 'b_G07', kind: 'input', readOnly: true, ariaLabel: 'G07 小会社（該当時は１）', highlightWhen: () => flags['b_G07'] === true, top: 39.37, left: 88.28, width: 5.31, height: 5.39, align: 'center' },
    // 判定基準（会社規模×⑥の割合）
    { kind: 'label', text: '判定基準', top: 44.76, left: 15.51, width: 5.08, height: 14.13, align: 'center' },
    { kind: 'label', text: '会社の規模', top: 44.76, left: 20.59, width: 7.33, height: 12.53 },
    { kind: 'label', text: '大　会　社', highlightWhen: () => j.landCol === 'big', top: 44.76, left: 27.92, width: 15.88, height: 12.53 },
    { kind: 'label', text: '中　会　社', highlightWhen: () => j.landCol === 'mid', top: 44.76, left: 43.8, width: 15.22, height: 12.53 },
    { kind: 'label', text: '小　会　社\n（総資産価額（帳簿価額）が次の基準に該当する会社）', fontSize: 6.5, top: 44.76, left: 59.02, width: 34.57, height: 2.96 },
    { kind: 'label', text: '･卸売業\n　　　　20億円以上\n･小売・サービス業\n　　　　15億円以上\n･上記以外の業種\n　　　　15億円以上', align: 'left', fontSize: 6, highlightWhen: () => j.landCol === 'smallA', highlightLinePrefixes: () => j.landCol === 'smallA' && j.landIndustryPrefix ? [j.landIndustryPrefix] : [], top: 47.72, left: 59.02, width: 17.17, height: 9.57 },
    { kind: 'label', text: '･卸売業\n　7,000万円以上20億円未満\n･小売・サービス業\n　4,000万円以上15億円未満\n･上記以外の業種\n　5,000万円以上15億円未満', align: 'left', fontSize: 6, highlightWhen: () => j.landCol === 'smallB', highlightLinePrefixes: () => j.landCol === 'smallB' && j.landIndustryPrefix ? [j.landIndustryPrefix] : [], top: 47.72, left: 76.19, width: 17.4, height: 9.57 },
    { kind: 'label', text: '⑥の割合', top: 57.29, left: 20.59, width: 7.33, height: 1.6 },
    { kind: 'label', text: '70％以上', highlightWhen: () => flags['b_G08'] === true, top: 57.29, left: 27.92, width: 7.09, height: 1.6, fontSize: 7 },
    { kind: 'label', text: '70％未満', highlightWhen: () => flags['b_G09'] === true, top: 57.29, left: 35.01, width: 8.79, height: 1.6, fontSize: 7 },
    { kind: 'label', text: '90％以上', highlightWhen: () => flags['b_G10'] === true, top: 57.29, left: 43.8, width: 7.33, height: 1.6, fontSize: 7 },
    { kind: 'label', text: '90％未満', highlightWhen: () => flags['b_G11'] === true, top: 57.29, left: 51.13, width: 7.89, height: 1.6, fontSize: 7 },
    { kind: 'label', text: '70％以上', highlightWhen: () => flags['b_G12'] === true, top: 57.29, left: 59.02, width: 7.9, height: 1.6, fontSize: 7 },
    { kind: 'label', text: '70％未満', highlightWhen: () => flags['b_G13'] === true, top: 57.29, left: 66.92, width: 9.27, height: 1.6, fontSize: 7 },
    { kind: 'label', text: '90％以上', highlightWhen: () => flags['b_G14'] === true, top: 57.29, left: 76.19, width: 9.51, height: 1.6, fontSize: 7 },
    { kind: 'label', text: '90％未満', highlightWhen: () => flags['b_G15'] === true, top: 57.29, left: 85.7, width: 7.89, height: 1.6, fontSize: 7 },
    { kind: 'label', text: '判　　定', top: 58.89, left: 15.51, width: 12.41, height: 2.53 },
    ...jc(58.89, 2.53, 'G08', '該当', 27.92, 30.26, 32.11, 35.01, { fontSize: 7 }),
    ...jc(58.89, 2.53, 'G09', '非該当', 35.01, 37.35, 40.09, 43.8, { fontSize: 7 }),
    ...jc(58.89, 2.53, 'G10', '該当', 43.8, 46.13, 47.99, 51.13, { fontSize: 7 }),
    ...jc(58.89, 2.53, 'G11', '非該当', 51.13, 53.46, 55.32, 59.02, { fontSize: 7 }),
    ...jc(58.89, 2.53, 'G12', '該当', 59.02, 61.36, 63.22, 66.92, { fontSize: 7 }),
    ...jc(58.89, 2.53, 'G13', '非該当', 66.92, 69.26, 71.84, 76.19, { fontSize: 7 }),
    ...jc(58.89, 2.53, 'G14', '該当', 76.19, 78.77, 80.54, 85.7, { fontSize: 7 }),
    ...jc(58.89, 2.53, 'G15', '非該当', 85.7, 88.28, 90.05, 93.59, { fontSize: 7 }),
    // ── 4. 開業後3年未満の会社等 ──
    { kind: 'label', text: '４・開業後３年未満の会社等', semanticRole: 'columnheader', ariaLabel: '開業後3年未満の会社等', top: 61.65, left: 6.04, width: 1.86, height: 14.85, align: 'center' },
    // (1) 開業後3年未満の会社
    { kind: 'label', text: '⑴\n開業後３年未満\nの会社', top: 61.65, left: 7.9, width: 7.61, height: 7.12, align: 'left', fontSize: 7 },
    { kind: 'label', text: '判　　定　　要　　素', top: 61.65, left: 15.51, width: 32.52, height: 1.43 },
    { kind: 'label', text: '開業年月日', top: 63.08, left: 15.51, width: 5.88, height: 5.69, fontSize: 7.5 },
    { kind: 'label', text: '元　号', top: 63.08, left: 23.73, width: 6.53, height: 1.45, fontSize: 7 },
    { kind: 'label', text: '年', top: 63.08, left: 30.26, width: 4.75, height: 1.45, fontSize: 7 },
    { kind: 'label', text: '月', top: 63.08, left: 35.01, width: 6.93, height: 1.45, fontSize: 7 },
    { kind: 'label', text: '日', top: 63.08, left: 41.94, width: 6.09, height: 1.45, fontSize: 7 },
    { kind: 'cell', codeLabel: 'N01', top: 63.08, left: 21.39, width: 2.34, height: 5.69 },
    { field: 'f85_g', kind: 'input', options: [...DATE_OPTS.g], top: 64.53, left: 23.73, width: 6.53, height: 4.24 },
    { field: 'f85_y', kind: 'input', options: [...DATE_OPTS.y], top: 64.53, left: 30.26, width: 4.75, height: 4.24 },
    { field: 'f85_m', kind: 'input', options: [...DATE_OPTS.m], top: 64.53, left: 35.01, width: 6.93, height: 4.24 },
    { field: 'f85_d', kind: 'input', options: [...DATE_OPTS.d], top: 64.53, left: 41.94, width: 6.09, height: 4.24 },
    { kind: 'label', text: '判定\n基準', top: 61.65, left: 48.03, width: 3.06, height: 2.88, fontSize: 7 },
    { kind: 'label', text: '課 税 時 期 に お い て 開 業 後 ３ 年 未 満', top: 61.65, left: 51.09, width: 42.5, height: 1.43 },
    { kind: 'label', text: 'で　あ　る', highlightWhen: () => j.s4a === true, top: 63.08, left: 51.09, width: 20.75, height: 1.45 },
    { kind: 'label', text: 'で　な　い', highlightWhen: () => j.s4a === false, top: 63.08, left: 71.84, width: 21.75, height: 1.45 },
    { kind: 'label', text: '判定', top: 64.53, left: 48.03, width: 3.06, height: 4.24, fontSize: 7 },
    ...jc(64.53, 4.24, 'G16', '該　　当', 51.13, 53.46, 57.17, 71.84),
    ...jc(64.53, 4.24, 'G17', '非　該　当', 71.84, 74.42, 77.07, 93.59),
    // (2) 比準要素数0の会社
    { kind: 'label', text: '⑵\n比準要素数０\nの会社', top: 68.77, left: 7.9, width: 7.61, height: 7.73, align: 'left', fontSize: 7 },
    { kind: 'label', text: '判定要素', top: 68.77, left: 15.51, width: 5.88, height: 7.73 },
    { kind: 'label', text: '直　前　期　末　を　基　と　し　た　判　定　要　素', top: 68.77, left: 21.39, width: 39.97, height: 1.4 },
    { kind: 'label', text: '第４表の１\nⒷ１の金額', bottomSegments: [{ text: '（円）', width: 12.17 }, { text: '（銭）', width: 3.79 }], fontSize: 6.5, top: 70.17, left: 21.39, width: 15.96, height: 3.79 },
    { kind: 'label', text: '第４表の１\nⒸ１の金額', bottomLabel: '（円）', bottomLabelAlign: 'right', fontSize: 6.5, top: 70.17, left: 37.35, width: 11.44, height: 3.79 },
    { kind: 'label', text: '第４表の１\nⒹ１の金額', bottomLabel: '（円）', bottomLabelAlign: 'right', fontSize: 6.5, top: 70.17, left: 48.79, width: 12.57, height: 3.79 },
    { field: 'f96', kind: 'input', readOnly: true, highlightWhen: (g) => fieldIsZero(g, 'f96'), top: 73.96, left: 21.39, width: 12.17, height: 2.54, align: 'right' },
    { field: 'f97', kind: 'input', readOnly: true, highlightWhen: (g) => fieldIsZero(g, 'f96'), top: 73.96, left: 33.56, width: 3.79, height: 2.54, align: 'right' },
    { field: 'f99', kind: 'input', readOnly: true, highlightWhen: (g) => fieldIsZero(g, 'f99'), top: 73.96, left: 37.35, width: 11.44, height: 2.54, align: 'right' },
    { field: 'f101', kind: 'input', readOnly: true, highlightWhen: (g) => fieldIsZero(g, 'f101'), top: 73.96, left: 48.79, width: 12.57, height: 2.54, align: 'right' },
    { kind: 'label', text: '判定基準', top: 68.77, left: 61.36, width: 5.56, height: 5.19, align: 'center' },
    { kind: 'label', text: '直前期末を基とした判定要素がいずれも０', top: 68.77, left: 66.92, width: 26.67, height: 3.71, align: 'left', fontSize: 7 },
    { kind: 'label', text: 'で　あ　る', highlightWhen: () => j.s4b === true, top: 72.48, left: 66.92, width: 16.2, height: 1.48 },
    { kind: 'label', text: 'で　な　い', highlightWhen: () => j.s4b === false, top: 72.48, left: 83.12, width: 10.47, height: 1.48 },
    { kind: 'label', text: '判　　定', top: 73.96, left: 61.36, width: 7.9, height: 2.54 },
    ...jc(73.96, 2.54, 'G18', '該　　当', 69.26, 71.84, 74.42, 83.12),
    ...jc(73.96, 2.54, 'G19', '非　該　当', 83.12, 85.7, 88.28, 93.59),
    // ── 5. 開業前又は休業中の会社 / 6. 清算中の会社 ──
    { kind: 'label', text: '５．\n開業前\n又は\n休業中の会社', semanticRole: 'columnheader', ariaLabel: '開業前又は休業中の会社', top: 76.7, left: 6.04, width: 9.47, height: 4.44, align: 'left', fontSize: 7.5 },
    { kind: 'label', text: '開 業 前 の 会 社 の 判 定', top: 76.7, left: 15.51, width: 21.84, height: 1.9 },
    { kind: 'label', text: '休 業 中 の 会 社 の 判 定', top: 76.7, left: 37.35, width: 24.01, height: 1.9 },
    ...jc(78.6, 2.54, 'G20', '該　　当', 15.51, 17.85, 19.7, 25.58, { selectValue: { field: 's5_kaigyomae', value: '1' }, ariaLabel: '開業前の会社の判定：該当' }),
    ...jc(78.6, 2.54, 'G21', '非　該　当', 25.58, 27.92, 30.26, 37.35, { selectValue: { field: 's5_kaigyomae', value: '' }, ariaLabel: '開業前の会社の判定：非該当' }),
    ...jc(78.6, 2.54, 'G22', '該　　当', 37.35, 40.09, 41.94, 48.79, { selectValue: { field: 's5_kyugyo', value: '1' }, ariaLabel: '休業中の会社の判定：該当' }),
    ...jc(78.6, 2.54, 'G23', '非　該　当', 48.79, 51.13, 53.46, 61.36, { selectValue: { field: 's5_kyugyo', value: '' }, ariaLabel: '休業中の会社の判定：非該当' }),
    { kind: 'label', text: '６．清算中の\n会社', semanticRole: 'columnheader', ariaLabel: '清算中の会社', top: 76.7, left: 61.36, width: 10.36, height: 4.44, align: 'left', fontSize: 7.5 },
    { kind: 'label', text: '判　　　　　定', top: 76.7, left: 71.72, width: 21.87, height: 1.9 },
    ...jc(78.6, 2.54, 'G24', '該　　当', 71.84, 74.42, 77.07, 83.12, { selectValue: { field: 's6_seisan', value: '1' }, ariaLabel: '清算中の会社の判定：該当' }),
    ...jc(78.6, 2.54, 'G25', '非　該　当', 83.12, 85.7, 88.28, 93.59, { selectValue: { field: 's6_seisan', value: '' }, ariaLabel: '清算中の会社の判定：非該当' }),
    // ── 7. 特定の評価会社の判定結果 ──
    { kind: 'label', text: '７．\n特定の評価会社の\n判定結果', semanticRole: 'columnheader', ariaLabel: '特定の評価会社の判定結果', top: 81.37, left: 6.04, width: 9.47, height: 7.83, align: 'left', fontSize: 7.5 },
    ...jc(81.37, 2.53, 'G26', '１．比準要素数１の会社', 15.51, 17.85, 19.7, 37.35, { align: 'left' }),
    ...jc(81.37, 2.53, 'G27', '２．株式等保有特定会社', 37.35, 40.09, 41.94, 61.36, { align: 'left' }),
    ...jc(83.9, 2.65, 'G28', '３．土地保有特定会社', 15.51, 17.85, 19.7, 37.35, { align: 'left' }),
    ...jc(83.9, 2.65, 'G29', '４．開業後３年未満の会社等', 37.35, 40.09, 41.94, 61.36, { align: 'left' }),
    ...jc(86.55, 2.65, 'G30', '５．開業前又は休業中の会社', 15.51, 17.85, 19.7, 37.35, { align: 'left' }),
    ...jc(86.55, 2.65, 'G31', '６．清算中の会社', 37.35, 40.09, 41.94, 61.36, { align: 'left' }),
    { kind: 'label', text: '上記の「１．比準要素数１の会社」欄から\n「６．清算中の会社」欄の判定において２以上に該当する場合には、\n後の番号の判定によります。', top: 81.37, left: 61.36, width: 32.23, height: 7.83, align: 'left', fontSize: 7 },
  ];
}

/** 第2表の自動判定（第6表の評価方式選択などからも参照する） */
export function calcTable2(getField: TableProps['getField']) {
  const raw = (f: string) => getField('table2', f);

  // 転記元（第4表・第5表・第1表の2・第1表の1）
  const t4 = calcTable4(getField);
  const t5 = calcTable5(getField);
  const sizeRank = calcCompanySize((f) => getField('table1_2', f)).result;

  // 1. 比準要素数1（⑴のいずれか2が0かつ⑵の2以上が0。⑴がいずれも0なら比準要素数0=4⑵）
  const set1 = [t4.b1, t4.c1, t4.d1];
  const set2 = [t4.b2, t4.c2, t4.d2];
  const allKnown = (vs: (number | null)[]) => vs.every((v) => v !== null);
  const zeros = (vs: (number | null)[]) => vs.filter((v) => v === 0).length;
  const z1 = allKnown(set1) ? zeros(set1) : null;
  const z2 = allKnown(set2) ? zeros(set2) : null;
  const s1 = z1 === null || z2 === null ? null : z1 === 2 && z2 >= 2;
  const s4b = z1 === null ? null : z1 === 3;

  // 2. 株式等保有特定会社（③=②/①、1%未満切捨て、50%以上で該当）
  const a01 = t5['①'] ?? null;
  const a02 = t5['イ'] ?? null;
  const kabuRatio = a01 !== null && a01 > 0 && a02 !== null ? fl((a02 / a01) * 100) : null;
  const s2 = kabuRatio === null ? null : kabuRatio >= 50;

  // 3. 土地保有特定会社（⑥=⑤/④、大70%/中90%/小会社は総資産帳簿基準で70or90、基準未満は該当なし）
  const a05 = t5['ハ'] ?? null;
  const landRatio = a01 !== null && a01 > 0 && a05 !== null ? fl((a05 / a01) * 100) : null;
  const numOf = (s: string): number | null => { const t = s.replace(/,/g, '').trim(); if (t === '') return null; const n = Number(t); return isNaN(n) ? null : n; };
  const assetBook = numOf(getField('table1_2', 'f22')); // 千円
  const gyo = getField('table1_2', 'gyoshu');
  const landIndustryPrefix =
    gyo === '卸売業' ? '･卸売業'
      : gyo === '小売・サービス業' ? '･小売・サービス業'
        : gyo === 'その他' ? '･上記以外の業種'
          : null;
  let landCol: Judgments['landCol'] = null;
  if (sizeRank === 4) landCol = 'big';
  else if (sizeRank !== null && sizeRank >= 1 && sizeRank <= 3) landCol = 'mid';
  else if (sizeRank === 0 && assetBook !== null && gyo !== '') {
    const thA = gyo === '卸売業' ? 2000000 : 1500000;                                 // イ: 卸売20億/それ以外15億
    const thB = gyo === '卸売業' ? 70000 : gyo === '小売・サービス業' ? 40000 : 50000; // ロ: 7,000万/4,000万/5,000万
    landCol = assetBook >= thA ? 'smallA' : assetBook >= thB ? 'smallB' : null;
  }
  const landTh = landCol === 'big' || landCol === 'smallA' ? 70 : landCol === 'mid' || landCol === 'smallB' ? 90 : null;
  const s3 = landRatio === null ? null : landTh === null ? (sizeRank === 0 && assetBook !== null && gyo !== '' ? false : null) : landRatio >= landTh;

  // 4(1). 開業後3年未満（開業年月日=和暦入力、課税時期=第1表の1と比較。未入力は判定不能）
  const western = (g: string, y: number) => (g === '昭和' ? 1925 + y : g === '平成' ? 1988 + y : 2018 + y);
  const readDate = (gf: (f: string) => string, p: string): Date | null => {
    const y = Number(gf(`${p}_y`)), m = Number(gf(`${p}_m`)), d = Number(gf(`${p}_d`));
    if (!y || !m || !d) return null;
    return new Date(western(gf(`${p}_g`) || '令和', y), m - 1, d);
  };
  const taxDate = readDate((f) => getField('table1_1', f), 'f14');
  const openDate = readDate(raw, 'f85');
  const s4a = taxDate !== null && openDate !== null
    ? taxDate.getTime() < new Date(openDate.getFullYear() + 3, openDate.getMonth(), openDate.getDate()).getTime()
    : null;

  // 5・6. 開業前/休業中/清算中（判定セルを直接クリックして指定）
  const s5a = raw('s5_kaigyomae') === '1';
  const s5b = raw('s5_kyugyo') === '1';
  const s6 = raw('s6_seisan') === '1';

  const j: Judgments = { s1, kabuRatio, s2, landRatio, landCol, landIndustryPrefix, sizeRank, s3, s4a, s4b, s5a, s5b, s6 };

  // 7. 判定結果（2以上に該当する場合は後の番号）
  const result = s6 ? 6 : s5a || s5b ? 5 : s4a === true || s4b === true ? 4 : s3 === true ? 3 : s2 === true ? 2 : s1 === true ? 1 : 0;

  return { t4, a01, a02, a05, kabuRatio, landRatio, j, result };
}

const RESULT_NAMES: Record<number, string> = { 0: '一般の評価会社（非該当）', 1: '１．比準要素数１の会社', 2: '２．株式等保有特定会社', 3: '３．土地保有特定会社', 4: '４．開業後３年未満の会社等', 5: '５．開業前又は休業中の会社', 6: '６．清算中の会社' };

/** 第2表（CSSグリッド方式・令和8年4月1日以降用） */
export function Table2Grid({ getField, updateField }: TableProps) {
  const raw = (f: string) => getField(T, f);
  const u = (f: string, v: string) => updateField(T, f, v);

  const fmt = (v: number | null | undefined) => (v === null || v === undefined ? '' : v.toLocaleString('ja-JP'));
  const yenPart = (v: number | null) => (v === null ? '' : fl(v).toLocaleString('ja-JP'));
  const senPart = (v: number | null) => (v === null ? '' : String(Math.round((v - fl(v)) * 100)).padStart(2, '0'));

  const c = calcTable2(getField);
  const flags = flagStates(c);

  const g = (f: string): string => {
    if (f.startsWith('b_G')) return flags[f] ? '1' : '';
    switch (f) {
      case 'f16': return yenPart(c.t4.b1); case 'f17': return senPart(c.t4.b1);
      case 'f18': return fmt(c.t4.c1); case 'f19': return fmt(c.t4.d1);
      case 'f23': return yenPart(c.t4.b2); case 'f24': return senPart(c.t4.b2);
      case 'f25': return fmt(c.t4.c2); case 'f26': return fmt(c.t4.d2);
      case '①': return fmt(c.a01); case '②': return fmt(c.a02);
      case '③': return c.kabuRatio === null ? '' : String(c.kabuRatio);
      case '④': return fmt(c.a01); case '⑤': return fmt(c.a05);
      case '⑥': return c.landRatio === null ? '' : String(c.landRatio);
      case 'f96': return yenPart(c.t4.b1); case 'f97': return senPart(c.t4.b1);
      case 'f99': return fmt(c.t4.c1); case 'f101': return fmt(c.t4.d1);
      default: return raw(f);
    }
  };

  const toolbar = (
    <span className="no-print" style={{ fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
      判定結果：{RESULT_NAMES[c.result] ?? RESULT_NAMES[0]!}
    </span>
  );

  const { mainCells, headerExtra, aspectRatio } = extractCompanyFloatHeader(buildCells(c), g, u, T);
  return <GridForm cells={mainCells} g={g} u={u} formId={T} width="100%" aspectRatio={aspectRatio} title="第２表　特定の評価会社の判定の明細書" formCode="NTA0VNA190010010" headerExtra={headerExtra} toolbar={toolbar} />;
}
