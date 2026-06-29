import { GridForm, type GridCell } from '@/components/ui/GridForm';
import { calcTable4 } from '../table4/Table4Grid';
import { calcTable5 } from '../table5/Table5Grid';
import { calcCompanySize } from '../table1-2/Table1_2Grid';
import type { TableProps } from '@/types/form';

const T = 'table2' as const;

// ── 計算の根拠（参考リンク） ──
const REFERENCES = [
  { label: '評価通達189（特定の評価会社の株式）', url: 'https://www.nta.go.jp/law/tsutatsu/kihon/sisan/hyoka_new/08/05.htm#a-189' },
];

const fl = (v: number) => Math.floor(v + 1e-9);

/** 第2表の判定結果（buildCellsのハイライトと判定結果表示に使用） */
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

/** 第2表のグリッドセル（ピッカー測定値＋判定ハイライト） */
function buildCells(j: Judgments, resultName: string): GridCell[] {
  const landTh = j.landCol === 'big' || j.landCol === 'smallA' ? 70 : j.landCol === 'mid' || j.landCol === 'smallB' ? 90 : null;
  const landHit = (col: Judgments['landCol'], over: boolean) =>
    j.landCol === col && j.landRatio !== null && landTh !== null && (over ? j.landRatio >= landTh : j.landRatio < landTh);
  const fieldIsZero = (g: (field: string) => string, field: string) => {
    const value = g(field).replace(/,/g, '').trim();
    return value !== '' && Number(value) === 0;
  };
  const sizeChoice =
    j.sizeRank === 4 ? 'large' :
    j.sizeRank !== null && j.sizeRank >= 1 && j.sizeRank <= 3 ? 'medium' :
    j.sizeRank === 0 ? 'small' :
    undefined;
  return [
  // ── 外枠・区分 ──
  { kind: 'cell', text: '', top: 8.51, left: 8.64, width: 85.38, height: 80.58 },
  { kind: 'cell', text: '', top: 8.51, left: 8.51, width: 85.51, height: 12.05 },
  { kind: 'cell', text: '', top: 20.37, left: 8.51, width: 85.51, height: 9.83 },
  { kind: 'cell', text: '', top: 30.01, left: 8.51, width: 85.51, height: 25.73 },
  { kind: 'cell', text: '', top: 55.65, left: 8.51, width: 85.51, height: 15.52 },
  { kind: 'cell', text: '', top: 70.87, left: 8.51, width: 43.37, height: 5.11 },
  { kind: 'cell', text: '', top: 70.87, left: 51.74, width: 42.28, height: 5.11 },
  { kind: 'cell', text: '', top: 75.89, left: 8.51, width: 85.51, height: 13.2 },
  // ── 1. 比準要素数1の会社（判定要素は第4表から自動転記） ──
  { kind: 'label', text: '１. 比準要素数１の会社', top: 8.51, left: 8.51, width: 15, height: 12.05 },
  { kind: 'label', text: '判 定 要 素', top: 8.51, left: 23.34, width: 44.73, height: 2.6 },
  { kind: 'label', text: '(１)直前期末を基とした判定要素', top: 10.92, left: 23.34, width: 22.48, height: 2.6 },
  { kind: 'label', text: '(２)直前々期末を基とした判定要素', top: 10.92, left: 45.6, width: 22.37, height: 2.6 },
  { kind: 'label', text: '第４表の\nB１の金額', top: 13.34, left: 23.24, width: 7.5, height: 3.76 },
  { kind: 'label', text: '第４表の\nC１の金額', top: 13.24, left: 30.46, width: 7.77, height: 3.95 },
  { kind: 'label', text: '第４表の\nD１の金額', top: 13.24, left: 38.1, width: 7.77, height: 3.86 },
  { field: 'f16', kind: 'input', readOnly: true, highlightWhen: (g) => fieldIsZero(g, 'f16'), top: 16.9, left: 23.24, width: 5.05, height: 3.66 },
  { field: 'f17', kind: 'input', readOnly: true, highlightWhen: (g) => fieldIsZero(g, 'f16'), topRightLabel: '銭', top: 16.9, left: 28.01, width: 2.73, height: 3.66 },
  { field: 'f18', kind: 'input', readOnly: true, highlightWhen: (g) => fieldIsZero(g, 'f18'), topRightLabel: '円', top: 17, left: 30.46, width: 7.77, height: 3.57 },
  { field: 'f19', kind: 'input', readOnly: true, highlightWhen: (g) => fieldIsZero(g, 'f19'), topRightLabel: '円', top: 16.9, left: 38.1, width: 7.77, height: 3.57 },
  { kind: 'label', text: '第４表の\nB２の金額', top: 13.24, left: 45.74, width: 7.36, height: 3.86 },
  { kind: 'label', text: '第４表の\nC２の金額', top: 13.33, left: 52.83, width: 7.64, height: 3.76 },
  { kind: 'label', text: '第４表の\nD２の金額', top: 13.24, left: 60.2, width: 7.77, height: 3.86 },
  { field: 'f23', kind: 'input', readOnly: true, highlightWhen: (g) => fieldIsZero(g, 'f23'), top: 16.9, left: 45.74, width: 4.91, height: 3.66 },
  { field: 'f24', kind: 'input', readOnly: true, highlightWhen: (g) => fieldIsZero(g, 'f23'), topRightLabel: '銭', top: 16.9, left: 50.38, width: 2.66, height: 3.57 },
  { field: 'f25', kind: 'input', readOnly: true, highlightWhen: (g) => fieldIsZero(g, 'f25'), topRightLabel: '円', top: 16.8, left: 52.83, width: 7.5, height: 3.76 },
  { field: 'f26', kind: 'input', readOnly: true, highlightWhen: (g) => fieldIsZero(g, 'f26'), topRightLabel: '円', top: 16.9, left: 60.2, width: 7.77, height: 3.57 },
  { kind: 'label', text: '判 定 基 準', top: 8.61, left: 67.83, width: 3.68, height: 8.58 },
  { kind: 'label', text: '⑴欄のいずれか２の判定要素が０であり、\nかつ、\n⑵欄のいずれか２以上の判定要素が0\nである（該当）・でない（非該当）', top: 8.51, left: 71.24, width: 22.78, height: 8.48 },
  { kind: 'label', text: '判定', top: 16.9, left: 67.83, width: 3.82, height: 3.66 },
  { kind: 'label', text: '該当', highlightWhen: () => j.s1 === true, top: 16.9, left: 71.38, width: 11.18, height: 3.47 },
  { kind: 'label', text: '非該当', highlightWhen: () => j.s1 === false, top: 16.8, left: 82.29, width: 11.59, height: 3.57 },
  // ── 2. 株式等保有特定会社（①②=第5表から自動転記） ──
  { kind: 'label', text: '２. 株式等保有特定会社', top: 20.37, left: 8.51, width: 15, height: 9.83 },
  { kind: 'label', text: '判 定 要 素', top: 20.37, left: 23.24, width: 70.78, height: 2.7 },
  { kind: 'label', text: '総資産価額\n（第５表の①の金額）', fontSize: 6, top: 22.78, left: 23.37, width: 18.55, height: 3.76 },
  { kind: 'label', text: '株式等の価額の合計額\n（第５表の㋑の金額）', fontSize: 6, top: 22.87, left: 41.65, width: 17.32, height: 3.76 },
  { kind: 'label', text: '株式等保有割合（②／①）', top: 22.87, left: 58.69, width: 9.27, height: 3.66 },
  { field: '①', kind: 'input', readOnly: true, cornerLabel: '①', topRightLabel: '千円', top: 26.44, left: 23.37, width: 18.41, height: 3.76 },
  { field: '②', kind: 'input', readOnly: true, cornerLabel: '②', topRightLabel: '千円', top: 26.54, left: 41.65, width: 17.32, height: 3.57 },
  { field: '③', kind: 'input', readOnly: true, cornerLabel: '③', topRightLabel: '％', top: 26.25, left: 58.69, width: 9.27, height: 3.86 },
  { kind: 'label', text: '判 定 基 準', top: 22.78, left: 67.7, width: 3.96, height: 4.63 },
  { kind: 'label', text: '③の割合が\n50％以上である', highlightWhen: () => j.s2 === true, top: 22.87, left: 71.38, width: 11.32, height: 4.43 },
  { kind: 'label', text: '③の割合が\n50％未満である', highlightWhen: () => j.s2 === false, top: 22.78, left: 82.43, width: 11.59, height: 4.43 },
  { kind: 'label', text: '判 定', top: 27.31, left: 67.7, width: 3.96, height: 2.8 },
  { kind: 'label', text: '該　　当', highlightWhen: () => j.s2 === true, top: 27.12, left: 71.38, width: 11.32, height: 3.08 },
  { kind: 'label', text: '非 該 当', highlightWhen: () => j.s2 === false, top: 27.21, left: 82.43, width: 11.59, height: 2.99 },
  // ── 3. 土地保有特定会社（④⑤=第5表・会社規模=第1表の2から自動） ──
  { kind: 'label', text: '３. 土地保有特定会社', top: 30.1, left: 8.51, width: 15.14, height: 25.73 },
  { kind: 'label', text: '判 定 要 素', top: 29.91, left: 23.37, width: 70.65, height: 2.8 },
  { kind: 'label', text: '総資産価額\n（第５表の①の金額）', fontSize: 6, top: 32.51, left: 23.37, width: 18.41, height: 3.86 },
  { kind: 'label', text: '土地等の価額の合計額\n（第５表の㋩の金額）', top: 32.51, left: 41.51, width: 17.59, height: 3.86 },
  { kind: 'label', text: '土地保有割合\n（⑤／④）', top: 32.51, left: 58.83, width: 9.14, height: 3.86 },
  { kind: 'label', text: '会社の規模の判定\n（第１表の２の３．会社の規模\n（Ｌの割合）の判定から自動）', fontSize: 7, top: 32.51, left: 67.7, width: 26.32, height: 3.86 },
  { field: '④', kind: 'input', readOnly: true, cornerLabel: '④', topRightLabel: '千円', top: 36.08, left: 23.24, width: 18.68, height: 3.76 },
  { field: '⑤', kind: 'input', readOnly: true, cornerLabel: '⑤', topRightLabel: '千円', top: 36.08, left: 41.51, width: 17.46, height: 3.76 },
  { field: '⑥', kind: 'input', readOnly: true, cornerLabel: '⑥', topRightLabel: '％', top: 36.18, left: 58.69, width: 9.27, height: 3.66 },
  {
    kind: 'label',
    text: '大会社 ・ 中会社 ・ 小会社',
    inlineChoices: {
      selectedKey: sizeChoice,
      choices: [
        { key: 'large', label: '大 会 社' },
        { key: 'medium', label: '中 会 社' },
        { key: 'small', label: '小 会 社' },
      ],
    },
    highlightWhen: () => j.sizeRank !== null,
    top: 36.18,
    left: 67.7,
    width: 26.05,
    height: 3.66,
  },
  { kind: 'label', text: '判 定 基 準', top: 39.55, left: 23.37, width: 8.59, height: 14.07 },
  { kind: 'label', text: '会社の規模', top: 39.65, left: 31.69, width: 7.77, height: 11.47 },
  { kind: 'label', text: '大 会 社', highlightWhen: () => j.landCol === 'big', top: 39.65, left: 39.16, width: 12.62, height: 11.47 },
  { kind: 'label', text: '中 会 社', highlightWhen: () => j.landCol === 'mid', top: 39.65, left: 51.6, width: 12.27, height: 11.37 },
  { kind: 'label', text: '小会社\n（総資産価額（帳簿価額）が次の基準に該当する会社）', top: 39.74, left: 63.74, width: 30.28, height: 3.37 },
  { kind: 'label', text: '･卸売業　　　　　：20億円以上\n･小売・サービス業：15億円以上\n･上記以外の業種　：15億円以上', align: 'left', highlightWhen: () => j.landCol === 'smallA', highlightLinePrefixes: () => j.landCol === 'smallA' && j.landIndustryPrefix ? [j.landIndustryPrefix] : [], top: 43.02, left: 63.74, width: 14.87, height: 8 },
  { kind: 'label', text: '･卸売業　　　　　：7,000万円以上20億円未満\n･小売・サービス業：4,000万円以上15億円未満\n･上記以外の業種　：5,000万円以上15億円未満', align: 'left', highlightWhen: () => j.landCol === 'smallB', highlightLinePrefixes: () => j.landCol === 'smallB' && j.landIndustryPrefix ? [j.landIndustryPrefix] : [], top: 43.02, left: 78.33, width: 15.68, height: 8 },
  { kind: 'label', text: '⑥の割合', top: 50.92, left: 31.69, width: 7.77, height: 2.6 },
  { kind: 'label', text: '70％以上', highlightWhen: () => landHit('big', true), top: 50.92, left: 39.19, width: 6.68, height: 2.7 },
  { kind: 'label', text: '70％未満', highlightWhen: () => landHit('big', false), top: 50.92, left: 45.6, width: 6.27, height: 2.6 },
  { kind: 'label', text: '90％以上', highlightWhen: () => landHit('mid', true), top: 50.83, left: 51.6, width: 6.27, height: 2.7 },
  { kind: 'label', text: '90％未満', highlightWhen: () => landHit('mid', false), top: 50.92, left: 57.6, width: 6.27, height: 2.51 },
  { kind: 'label', text: '70％以上', highlightWhen: () => landHit('smallA', true), top: 50.83, left: 63.6, width: 7.91, height: 2.7 },
  { kind: 'label', text: '70％未満', highlightWhen: () => landHit('smallA', false), top: 50.83, left: 71.38, width: 7.23, height: 2.7 },
  { kind: 'label', text: '90％以上', highlightWhen: () => landHit('smallB', true), top: 50.92, left: 78.33, width: 7.77, height: 2.6 },
  { kind: 'label', text: '90％未満', highlightWhen: () => landHit('smallB', false), top: 50.83, left: 85.84, width: 8.18, height: 2.7 },
  { kind: 'label', text: '判 定', top: 53.24, left: 23.37, width: 15.96, height: 2.51 },
  { kind: 'label', text: '該 当', highlightWhen: () => j.landCol === 'big' && j.s3 === true, top: 53.33, left: 39.06, width: 6.96, height: 2.41 },
  { kind: 'label', text: '非該当', highlightWhen: () => j.landCol === 'big' && j.s3 === false, top: 53.33, left: 45.74, width: 6, height: 2.41 },
  { kind: 'label', text: '該 当', highlightWhen: () => j.landCol === 'mid' && j.s3 === true, top: 53.33, left: 51.6, width: 6.14, height: 2.31 },
  { kind: 'label', text: '非該当', highlightWhen: () => j.landCol === 'mid' && j.s3 === false, top: 53.34, left: 57.6, width: 6.27, height: 2.4 },
  { kind: 'label', text: '該 当', highlightWhen: () => j.landCol === 'smallA' && j.s3 === true, top: 53.33, left: 63.74, width: 7.64, height: 2.31 },
  { kind: 'label', text: '非該当', highlightWhen: () => j.landCol === 'smallA' && j.s3 === false, top: 53.33, left: 71.24, width: 7.23, height: 2.31 },
  { kind: 'label', text: '該 当', highlightWhen: () => j.landCol === 'smallB' && j.s3 === true, top: 53.43, left: 78.33, width: 7.77, height: 2.22 },
  { kind: 'label', text: '非該当', highlightWhen: () => j.landCol === 'smallB' && j.s3 === false, top: 53.24, left: 85.84, width: 8.05, height: 2.41 },
  // ── 4. 開業後3年未満の会社等 ──
  { kind: 'label', text: '４ 開 業 後 ３ 年 未 満 の 会 社 等', top: 55.65, left: 8.51, width: 2.73, height: 15.42 },
  { kind: 'label', text: '⑴ 開業後３年未満\nの会社', top: 55.65, left: 10.96, width: 12.55, height: 6.07 },
  { kind: 'label', text: '判 定 要 素', top: 55.55, left: 23.24, width: 19.78, height: 2.7 },
  { kind: 'label', text: ' 開業年月日', top: 58.05, left: 23.24, width: 7.5, height: 3.57 },
  { field: 'f85', kind: 'input', date: true, top: 58.05, left: 30.46, width: 12.55, height: 3.57 },
  { kind: 'label', text: '判 定 基 準', top: 55.65, left: 42.74, width: 9.14, height: 3.66 },
  { kind: 'label', text: '課税時期において\n開業後３年未満である', top: 55.55, left: 51.6, width: 19.78, height: 3.76 },
  { kind: 'label', text: '課税時期において\n開業後３年未満でない', top: 55.65, left: 71.24, width: 22.64, height: 3.66 },
  { kind: 'label', text: ' 判 定', top: 59.12, left: 42.74, width: 9, height: 2.41 },
  { kind: 'label', text: '該 当', highlightWhen: () => j.s4a === true, top: 59.12, left: 51.6, width: 19.78, height: 2.41 },
  { kind: 'label', text: '非 該 当', highlightWhen: () => j.s4a === false, top: 59.21, left: 71.24, width: 22.64, height: 2.41 },
  { kind: 'label', text: '⑵ 比準要素数0\nの会社', top: 61.52, left: 10.96, width: 12.62, height: 9.54 },
  { kind: 'label', text: '判 定 要 素', top: 61.52, left: 23.37, width: 7.36, height: 9.54 },
  { kind: 'label', text: '直前期末を基とした判定要素', top: 61.43, left: 30.46, width: 27.28, height: 2.7 },
  { kind: 'label', text: '第４表の\nB１の金額', top: 64.03, left: 30.6, width: 9.96, height: 3.57 },
  { field: 'f96', kind: 'input', readOnly: true, highlightWhen: (g) => fieldIsZero(g, 'f96'), top: 67.5, left: 30.6, width: 6.14, height: 3.47 },
  { field: 'f97', kind: 'input', readOnly: true, highlightWhen: (g) => fieldIsZero(g, 'f96'), topRightLabel: '銭', top: 67.5, left: 36.46, width: 4.09, height: 3.57 },
  { kind: 'label', text: '第４表の\nC１の金額', top: 63.93, left: 40.28, width: 8.86, height: 3.66 },
  { field: 'f99', kind: 'input', readOnly: true, highlightWhen: (g) => fieldIsZero(g, 'f99'), topRightLabel: '円', top: 67.5, left: 40.28, width: 8.73, height: 3.57 },
  { kind: 'label', text: '第４表の\nD１の金額', top: 63.93, left: 48.88, width: 8.86, height: 3.66 },
  { field: 'f101', kind: 'input', readOnly: true, highlightWhen: (g) => fieldIsZero(g, 'f101'), topRightLabel: '円', top: 67.6, left: 48.88, width: 8.86, height: 3.37 },
  { kind: 'label', text: '判 定基 準', top: 61.62, left: 57.6, width: 6.27, height: 5.98 },
  { kind: 'label', text: '直前期末を基とした判定要素がいずれも0\nである（該当）・でない（非該当）', top: 61.52, left: 63.6, width: 30.41, height: 6.17 },
  { kind: 'label', text: '判 定 ', top: 67.5, left: 57.6, width: 6.41, height: 3.47 },
  { kind: 'label', text: '該 当', highlightWhen: () => j.s4b === true, top: 67.5, left: 63.74, width: 14.87, height: 3.47 },
  { kind: 'label', text: '非 該 当', highlightWhen: () => j.s4b === false, top: 67.6, left: 78.47, width: 15.55, height: 3.47 },
  // ── 5. 開業前又は休業中の会社（判定セルを直接クリックして指定） ──
  { kind: 'label', text: '５. 開業前又は休業中の会社', top: 70.97, left: 8.51, width: 18.68, height: 5.01 },
  { kind: 'label', text: '開業前の会社の判定', top: 70.97, left: 26.92, width: 12.41, height: 2.6 },
  { kind: 'label', text: '該　当', ariaLabel: '開業前の会社の判定：該当', selectValue: { field: 's5_kaigyomae', value: '1' }, highlightWhen: () => j.s5a, top: 73.48, left: 26.92, width: 6.14, height: 2.51 },
  { kind: 'label', text: '非該当', ariaLabel: '開業前の会社の判定：非該当', selectValue: { field: 's5_kaigyomae', value: '' }, highlightWhen: () => !j.s5a, top: 73.48, left: 32.78, width: 6.68, height: 2.51 },
  { kind: 'label', text: ' 休業中の会社の判定', top: 70.97, left: 39.19, width: 12.68, height: 2.6 },
  { kind: 'label', text: '該　当', ariaLabel: '休業中の会社の判定：該当', selectValue: { field: 's5_kyugyo', value: '1' }, highlightWhen: () => j.s5b, top: 73.38, left: 39.19, width: 6.68, height: 2.51 },
  { kind: 'label', text: '非該当', ariaLabel: '休業中の会社の判定：非該当', selectValue: { field: 's5_kyugyo', value: '' }, highlightWhen: () => !j.s5b, top: 73.48, left: 45.74, width: 6, height: 2.51 },
  // ── 6. 清算中の会社 ──
  { kind: 'label', text: '６． 清 算 中 の 会 社', top: 70.87, left: 51.6, width: 19.91, height: 5.01 },
  { kind: 'label', text: '判 定', top: 70.97, left: 71.38, width: 22.64, height: 2.51 },
  { kind: 'label', text: '該 当', ariaLabel: '清算中の会社の判定：該当', selectValue: { field: 's6_seisan', value: '1' }, highlightWhen: () => j.s6, top: 73.38, left: 71.38, width: 11.18, height: 2.51 },
  { kind: 'label', text: '非 該 当', ariaLabel: '清算中の会社の判定：非該当', selectValue: { field: 's6_seisan', value: '' }, highlightWhen: () => !j.s6, top: 73.28, left: 82.43, width: 11.46, height: 2.7 },
  // ── 7. 特定の評価会社の判定結果 ──
  { kind: 'label', text: '７. 特定の評価会社の判定結果', top: 75.89, left: 8.51, width: 18.55, height: 13.2 },
  {
    kind: 'label',
    text: `１．比準要素数１の会社

２．株式等保有特定会社

３．土地保有特定会社

４．開業後３年未満の会社等

５．開業前又は休業中の会社

６．清算中の会社

判定結果　${resultName}

（なお、上記の「１．比準要素数１の会社」欄から「６．清算中の会社」欄の判定において
２以上に該当する場合には、後の番号の判定によります。）`,
    align: 'left',
    fontSize: 6.5,
    emphasizeLinePrefix: '判定結果　',
    top: 75.79,
    left: 26.92,
    width: 67.1,
    height: 13.2,
  },
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

  // 4(1). 開業後3年未満（開業年月日=和暦入力、課税時期=第1表の1と比較）
  const western = (g: string, y: number) => (g === '平成' ? 1988 + y : 2018 + y);
  const readDate = (gf: (f: string) => string, p: string): Date | null => {
    const y = Number(gf(`${p}_y`)), m = Number(gf(`${p}_m`)), d = Number(gf(`${p}_d`));
    if (!y || !m || !d) return null;
    return new Date(western(gf(`${p}_g`) || '令和', y), m - 1, d);
  };
  const taxDate = readDate((f) => getField('table1_1', f), 'f14');
  const openDate = readDate(raw, 'f85');
  const s4a = taxDate !== null && openDate !== null
    ? taxDate.getTime() < new Date(openDate.getFullYear() + 3, openDate.getMonth(), openDate.getDate()).getTime()
    : false;

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

/** 第2表（CSSグリッド方式・完成版） */
export function Table2Grid({ getField, updateField }: TableProps) {
  const raw = (f: string) => getField(T, f);
  const u = (f: string, v: string) => updateField(T, f, v);

  const fmt = (v: number | null | undefined) => (v === null || v === undefined ? '' : v.toLocaleString('ja-JP'));
  const yenPart = (v: number | null) => (v === null ? '' : fl(v).toLocaleString('ja-JP'));
  const senPart = (v: number | null) => (v === null ? '' : String(Math.round((v - fl(v)) * 100)).padStart(2, '0'));

  const c = calcTable2(getField);

  const g = (f: string): string => {
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

  return <GridForm cells={buildCells(c.j, RESULT_NAMES[c.result] ?? RESULT_NAMES[0]!)} g={g} u={u} formId={T} width="100%" title="第２表　特定の評価会社の判定の明細書" references={REFERENCES} />;
}
