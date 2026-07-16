import { GridForm, type GridCell } from '@/components/ui/GridForm';
import type { TableProps } from '@/types/form';
import { calcShareholderJudgment } from '../Table1_1Grid';
import { extractCompanyFloatHeader } from '../companyFloatHeader';

const T = 'table1_2' as const;

// ══ 令和8年4月1日以降用の様式 ══
// ・「２．少数株式所有者の評価方式の判定」が第１表の１から本表へ移動（判定要素㋭㋬㋣、j_*フィールドは本表に保存）
// ・「３．会社の規模（Ｌの割合）の判定」に労働時間換算欄が様式化:
//   ㋠継続勤務従業員数(emp_regular) ＋ ㋦（㋷労働時間合計(emp_hours)÷1,800時間）＝ ㋸従業員数（判定に使用）
// ・様式の識別コード（E01/G09等）は codeLabel で再現

const ENTER_LOOP = [
  '直前期末の総資産価額',
  '直前期末以前１年間の取引金額',
  '継続勤務従業員数',
  '継続勤務従業員以外の労働時間の合計時間数',
];

// ── 会社規模（Ｌの割合）の自動判定（評価通達178） ──
// ランク: 4=大会社, 3=中0.90, 2=中0.75, 1=中0.60, 0=小会社
type G = (f: string) => string;
type Gyo = '卸売業' | '小売・サービス業' | 'その他';
type Band = 'over35' | 'b075' | 'b060' | 'small';

// 閾値（千円）: [大, 0.90, 0.75, 0.60] 以上で各ランク
const ASSET_TH: Record<Gyo, readonly [number, number, number, number]> = {
  '卸売業': [2000000, 400000, 200000, 70000],
  '小売・サービス業': [1500000, 500000, 250000, 40000],
  'その他': [1500000, 500000, 250000, 50000],
};
const TX_TH: Record<Gyo, readonly [number, number, number, number]> = {
  '卸売業': [3000000, 700000, 350000, 200000],
  '小売・サービス業': [2000000, 500000, 250000, 60000],
  'その他': [1500000, 400000, 200000, 80000],
};

const rank = (v: number, th: readonly [number, number, number, number]) =>
  v >= th[0] ? 4 : v >= th[1] ? 3 : v >= th[2] ? 2 : v >= th[3] ? 1 : 0;

const parseNumber = (value: string): number | null => {
  const s = value.replace(/,/g, '').trim();
  if (s === '') return null;
  const n = Number(s);
  return isNaN(n) ? null : n;
};

/** ㋸従業員数 ＝ ㋠継続勤務従業員数 ＋ ㋦（㋷労働時間合計÷1,800時間）。内訳未入力時は旧f28（合計直接入力）にフォールバック */
function calcEmployees(g: G) {
  const regular = parseNumber(g('emp_regular'));
  const hours = parseNumber(g('emp_hours'));
  const nu = hours === null ? null : hours / 1800;
  const hasBreakdown = regular !== null || nu !== null;
  const total = hasBreakdown ? (regular ?? 0) + (nu ?? 0) : parseNumber(g('f28'));
  return { regular, nu, total };
}

const formatEmployee = (value: number | null) => value === null ? '' : value.toFixed(1);

function calc(g: G) {
  const num = (f: string): number | null => {
    return parseNumber(g(f) || '');
  };
  const raw = g('gyoshu');
  const gyo: Gyo | '' = raw === '卸売業' || raw === '小売・サービス業' || raw === 'その他' ? raw : '';
  const asset = num('f22');
  const tx = num('f24');
  const emp = calcEmployees(g).total;
  const assetRank = gyo !== '' && asset !== null ? rank(asset, ASSET_TH[gyo]) : null;
  const txRank = gyo !== '' && tx !== null ? rank(tx, TX_TH[gyo]) : null;
  const empBand: Band | null = emp === null ? null : emp > 35 ? 'over35' : emp > 20 ? 'b075' : emp > 5 ? 'b060' : 'small';
  const empRank = empBand === null ? null : { over35: 4, b075: 2, b060: 1, small: 0 }[empBand];
  // ㋻ = 総資産と従業員のいずれか下位、会社規模 = ㋻と㋕（取引金額）のいずれか上位。㋸70人以上は大会社。
  const wa = assetRank !== null && empRank !== null ? Math.min(assetRank, empRank) : null;
  const result = emp !== null && emp >= 70 ? 4 : wa !== null && txRank !== null ? Math.max(wa, txRank) : null;
  return { gyo, emp, assetRank, txRank, empBand, result };
}

/** 会社規模の判定結果（第4表の斟酌率などで他表からも参照） */
export const calcCompanySize = calc;

const isEmp70OrMore = (c: ReturnType<typeof calc>) => c.emp !== null && c.emp >= 70;
const assetHL = (gyo: Gyo, r: number) => (g: G) => { const c = calc(g); return !isEmp70OrMore(c) && c.gyo === gyo && c.assetRank === r; };
const txHL = (gyo: Gyo, r: number) => (g: G) => { const c = calc(g); return !isEmp70OrMore(c) && c.gyo === gyo && c.txRank === r; };
const empHL = (band: Band) => (g: G) => { const c = calc(g); return !isEmp70OrMore(c) && c.empBand === band; };
const resHL = (r: number) => (g: G) => calc(g).result === r;
const matrixResHL = (r: number) => (g: G) => { const c = calc(g); return !isEmp70OrMore(c) && c.result === r; };
const emp70HL = (g: G) => { const e = calc(g).emp; return e !== null && e >= 70; };
const empU70HL = (g: G) => { const e = calc(g).emp; return e !== null && e < 70; };

// ── 判定基準マトリクスの識別コード（列優先: 資産卸売G15〜/小売G20〜/以外G25〜/従業員G30〜/取引卸売G35〜/小売G40〜/以外G45〜） ──
const MATRIX_COLS = [
  { left: 11.0, width: 9.47, codes: ['G15', 'G16', 'G17', 'G18', 'G19'], texts: ['20億円以上', '４億円以上\n20億円未満', '２億円以上\n４億円未満', '7,000万円以上\n２億円未満', '7,000万円未満'], hl: (r: number) => assetHL('卸売業', r) },
  { left: 20.47, width: 11.36, codes: ['G20', 'G21', 'G22', 'G23', 'G24'], texts: ['15億円以上', '５億円以上\n15億円未満', '2億5,000万円以上\n５億円未満', '4,000万円以上\n2億5,000万円未満', '4,000万円未満'], hl: (r: number) => assetHL('小売・サービス業', r) },
  { left: 31.83, width: 11.36, codes: ['G25', 'G26', 'G27', 'G28', 'G29'], texts: ['15億円以上', '５億円以上\n15億円未満', '2億5,000万円以上\n５億円未満', '5,000万円以上\n2億5,000万円未満', '5,000万円未満'], hl: (r: number) => assetHL('その他', r) },
  { left: 43.19, width: 7.58, codes: ['G30', 'G31', 'G32', 'G33', 'G34'], texts: ['35人超', '35人超', '20人超\n35人以下', '５人超\n20人以下', '５人以下'], hl: null },
  { left: 50.77, width: 11.36, codes: ['G35', 'G36', 'G37', 'G38', 'G39'], texts: ['30億円以上', '７億円以上\n30億円未満', '3億5,000万円以上\n７億円未満', '２億円以上\n3億5,000万円未満', '２億円未満'], hl: (r: number) => txHL('卸売業', r) },
  { left: 62.13, width: 11.36, codes: ['G40', 'G41', 'G42', 'G43', 'G44'], texts: ['20億円以上', '５億円以上\n20億円未満', '2億5,000万円以上\n５億円未満', '6,000万円以上\n2億5,000万円未満', '6,000万円未満'], hl: (r: number) => txHL('小売・サービス業', r) },
  { left: 73.49, width: 9.47, codes: ['G45', 'G46', 'G47', 'G48', 'G49'], texts: ['15億円以上', '４億円以上\n15億円未満', '２億円以上\n４億円未満', '8,000万円以上\n２億円未満', '8,000万円未満'], hl: (r: number) => txHL('その他', r) },
] as const;
const MATRIX_ROW_TOPS = [61.6, 64.87, 68.15, 71.42, 74.7, 77.98] as const;
const EMP_BANDS: readonly (Band)[] = ['over35', 'over35', 'b075', 'b060', 'small'];
const RANK_OF_ROW = [4, 3, 2, 1, 0] as const;
// コード幅・「１」記入枠幅（%）: 様式の罫線位置に合わせる
const CODE_W = 1.89;
const FLAG_W = 1.9;

/** マトリクスの「１」記入枠の判定条件（コード→条件。コンポーネントのg()から参照） */
const MATRIX_HL: Record<string, (g: G) => boolean> = {};

function matrixCells(): GridCell[] {
  const out: GridCell[] = [];
  MATRIX_COLS.forEach((col) => {
    col.codes.forEach((code, row) => {
      const top = MATRIX_ROW_TOPS[row]!;
      const height = +(MATRIX_ROW_TOPS[row + 1]! - top).toFixed(2);
      const r = RANK_OF_ROW[row]!;
      const hl = col.hl ? col.hl(r) : empHL(EMP_BANDS[row]!);
      MATRIX_HL[code] = hl;
      out.push({ kind: 'cell', codeLabel: code, top, left: col.left, width: CODE_W, height });
      out.push({ field: `m_${code}`, kind: 'input', readOnly: true, ariaLabel: `判定基準${code}（該当時は１）`, highlightWhen: hl, top, left: +(col.left + CODE_W).toFixed(2), width: FLAG_W, height, align: 'center' });
      out.push({
        kind: 'label',
        text: col.texts[row]!,
        fontSize: 6.5,
        highlightWhen: hl,
        top,
        left: +(col.left + CODE_W + FLAG_W).toFixed(2),
        width: +(col.width - CODE_W - FLAG_W).toFixed(2),
        height,
      });
    });
  });
  return out;
}

/**
 * 「２．少数株式所有者の評価方式の判定」を省略するか。
 * 本欄は「同族株主等」に該当する納税義務者のうち議決権割合（㋥）が５％未満の者にのみ適用され、
 * 該当しないことが確定した場合（非同族、または同族株主等かつ５％以上）は記載を省略する（様式の記載要領）。
 * 判定材料が未入力（isDozoku/indivRatio が null）の間は省略扱いにしない。
 */
function isShosuOmitted(judge: ReturnType<typeof calcShareholderJudgment>): boolean {
  return judge.isDozoku === false
    || (judge.isDozoku === true && judge.indivRatio !== null && judge.indivRatio >= 5);
}

/**
 * グリッドセルを生成（罫線座標はPNGからの機械抽出）。
 * 「２．少数株式所有者の評価方式の判定」のハイライトは第1表の1の判定結果（judge）をクロージャで注入する。
 */
function buildCells(judge: ReturnType<typeof calcShareholderJudgment>): GridCell[] {
  const omitted = isShosuOmitted(judge);
  return [
    { kind: 'cell', semanticRole: 'group', groupBorder: false, ariaLabel: '少数株式所有者の評価方式の判定', top: 14.7, left: 9.11, width: 81.42, height: 18.89 },
    { kind: 'cell', semanticRole: 'group', groupBorder: false, ariaLabel: '会社の規模（Lの割合）の判定', top: 33.82, left: 9.11, width: 81.42, height: 52.33 },
    { kind: 'cell', semanticRole: 'group', groupBorder: false, ariaLabel: '増減資の状況その他評価上の参考事項', top: 86.38, left: 9.11, width: 81.42, height: 8.15 },
    // ── 会社名 ──
    { kind: 'label', text: '会　社　名', top: 11.28, left: 56.45, width: 11.36, height: 2.54 },
    { field: 'company', kind: 'input', top: 11.28, left: 67.81, width: 22.72, height: 2.54, align: 'left' },
    // ── 2. 少数株式所有者の評価方式の判定 ──
    { kind: 'label', text: '２．少数株式所有者の評価方式の判定\n※　「判定要素」欄の㋭から㋣及び「判定」欄については、当てはまる項目の空欄に「１」を記入してください。', semanticRole: 'columnheader', ariaLabel: '少数株式所有者の評価方式の判定', top: 14.7, left: 9.11, width: 81.42, height: 2.76, align: 'left', fontSize: 8.5 },
    { kind: 'label', text: '判定要素', top: 17.46, left: 9.11, width: 1.89, height: 13.54, align: 'center' },
    { kind: 'label', text: '氏　　名', top: 17.46, left: 11, width: 30.3, height: 2.71 },
    { kind: 'cell', codeLabel: 'E01', top: 17.46, left: 41.3, width: 1.89, height: 2.71 },
    { field: 'j_name', kind: 'input', readOnly: omitted, top: 17.46, left: 43.19, width: 47.34, height: 2.71, align: 'left' },
    // ㋭役員（役職コードから自動判定・クリックで手動上書き。コード枠には該当時「１」を自動表示）
    // ※本欄が適用される場合（同族株主等かつ㋥5%未満）のみ自動表示・クリック選択を有効化
    { kind: 'label', text: '㋭　役　員', top: 20.17, left: 11, width: 30.3, height: 2.71, align: 'left' },
    { kind: 'cell', codeLabel: 'G01', top: 20.17, left: 41.3, width: 1.89, height: 2.71 },
    { field: 'j1_yakuin_yes', kind: 'input', readOnly: true, ariaLabel: '役員である（該当時は１）', highlightWhen: () => judge.shosuApplies && judge.officer === true, top: 20.17, left: 43.19, width: 1.89, height: 2.71, align: 'center' },
    { kind: 'label', text: 'である　（原則的評価方式等）', selectValue: omitted ? undefined : { field: 'j_yakuin', value: 'yes' }, highlightWhen: () => judge.shosuApplies && judge.officer === true, top: 20.17, left: 45.08, width: 20.83, height: 2.71 },
    { kind: 'cell', codeLabel: 'G02', top: 20.17, left: 65.91, width: 1.9, height: 2.71 },
    { field: 'j1_yakuin_no', kind: 'input', readOnly: true, ariaLabel: '役員でない（該当時は１）', highlightWhen: () => judge.shosuApplies && judge.officer === false, top: 20.17, left: 67.81, width: 1.89, height: 2.71, align: 'center' },
    { kind: 'label', text: 'でない　（次の㋬へ）', selectValue: omitted ? undefined : { field: 'j_yakuin', value: 'no' }, highlightWhen: () => judge.shosuApplies && judge.officer === false, top: 20.17, left: 69.7, width: 20.83, height: 2.71 },
    // ㋬納税義務者が中心的な同族株主
    { kind: 'label', text: '㋬　納税義務者が中心的な同族株主', top: 22.88, left: 11, width: 30.3, height: 2.7, align: 'left' },
    { kind: 'cell', codeLabel: 'G03', top: 22.88, left: 41.3, width: 1.89, height: 2.7 },
    { field: 'j1_cs_yes', kind: 'input', readOnly: true, ariaLabel: '中心的な同族株主である（該当時は１）', highlightWhen: (g) => judge.chushinSelfActive && g('j_chushin_self') === 'yes', top: 22.88, left: 43.19, width: 1.89, height: 2.7, align: 'center' },
    { kind: 'label', text: 'である　（原則的評価方式等）', selectValue: judge.chushinSelfActive ? { field: 'j_chushin_self', value: 'yes' } : undefined, highlightWhen: (g) => judge.chushinSelfActive && g('j_chushin_self') === 'yes', top: 22.88, left: 45.08, width: 20.83, height: 2.7 },
    { kind: 'cell', codeLabel: 'G04', top: 22.88, left: 65.91, width: 1.9, height: 2.7 },
    { field: 'j1_cs_no', kind: 'input', readOnly: true, ariaLabel: '中心的な同族株主でない（該当時は１）', highlightWhen: (g) => judge.chushinSelfActive && g('j_chushin_self') === 'no', top: 22.88, left: 67.81, width: 1.89, height: 2.7, align: 'center' },
    { kind: 'label', text: 'でない　（次の㋣へ）', selectValue: judge.chushinSelfActive ? { field: 'j_chushin_self', value: 'no' } : undefined, highlightWhen: (g) => judge.chushinSelfActive && g('j_chushin_self') === 'no', top: 22.88, left: 69.7, width: 20.83, height: 2.7 },
    // ㋣納税義務者以外に中心的な同族株主（又は株主）
    { kind: 'label', text: '㋣　納税義務者以外に中心的な同族株主（又は株主）', fontSize: 7, top: 25.58, left: 11, width: 30.3, height: 2.71, align: 'left' },
    { kind: 'cell', codeLabel: 'G05', top: 25.58, left: 41.3, width: 1.89, height: 2.71 },
    { field: 'j1_co_no', kind: 'input', readOnly: true, ariaLabel: '中心的な同族株主がいない（該当時は１）', highlightWhen: (g) => judge.chushinOtherActive && g('j_chushin_other') === 'no', top: 25.58, left: 43.19, width: 1.89, height: 2.71, align: 'center' },
    { kind: 'label', text: 'がいない（原則的評価方式等）', selectValue: judge.chushinOtherActive ? { field: 'j_chushin_other', value: 'no' } : undefined, highlightWhen: (g) => judge.chushinOtherActive && g('j_chushin_other') === 'no', top: 25.58, left: 45.08, width: 20.83, height: 2.71 },
    { kind: 'cell', codeLabel: 'G06', top: 25.58, left: 65.91, width: 1.9, height: 2.71 },
    { field: 'j1_co_yes', kind: 'input', readOnly: true, ariaLabel: '中心的な同族株主がいる（該当時は１）', highlightWhen: (g) => judge.chushinOtherActive && g('j_chushin_other') === 'yes', top: 25.58, left: 67.81, width: 1.89, height: 2.71, align: 'center' },
    { kind: 'label', text: 'がいる　（配当還元方式）', selectValue: judge.chushinOtherActive ? { field: 'j_chushin_other', value: 'yes' } : undefined, highlightWhen: (g) => judge.chushinOtherActive && g('j_chushin_other') === 'yes', top: 25.58, left: 69.7, width: 20.83, height: 2.71 },
    // 中心的な同族株主の氏名
    { kind: 'label', text: '中心的な同族株主（又は株主）がいる場合は、\nその同族株主（又は株主）の氏名', fontSize: 7, top: 28.29, left: 11, width: 32.19, height: 2.71 },
    { field: 'j_chushin_name', kind: 'input', readOnly: omitted, top: 28.29, left: 43.19, width: 47.34, height: 2.71, align: 'left' },
    // 判定
    { kind: 'label', text: '判　　　定', top: 31, left: 9.11, width: 32.19, height: 2.59 },
    { kind: 'cell', codeLabel: 'G07', top: 31, left: 41.3, width: 1.89, height: 2.59 },
    { field: 'j1_res_gensoku', kind: 'input', readOnly: true, ariaLabel: '判定：原則的評価方式等（該当時は１）', highlightWhen: () => judge.shosuResult === 'gensoku', top: 31, left: 43.19, width: 1.89, height: 2.59, align: 'center' },
    { kind: 'label', text: '原則的評価方式等', highlightWhen: () => judge.shosuResult === 'gensoku', top: 31, left: 45.08, width: 20.83, height: 2.59 },
    { kind: 'cell', codeLabel: 'G08', top: 31, left: 65.91, width: 1.9, height: 2.59 },
    { field: 'j1_res_haito', kind: 'input', readOnly: true, ariaLabel: '判定：配当還元方式（該当時は１）', highlightWhen: () => judge.shosuResult === 'haito', top: 31, left: 67.81, width: 1.89, height: 2.59, align: 'center' },
    { kind: 'label', text: '配当還元方式', highlightWhen: () => judge.shosuResult === 'haito', top: 31, left: 69.7, width: 20.83, height: 2.59 },
    // ── 3. 会社の規模（Ｌの割合）の判定 ──
    { kind: 'label', text: '３．会社の規模（Ｌの割合）の判定\n※　「判定基準」及び「判定」欄については、当てはまる項目の空欄に「１」を記入してください。', semanticRole: 'columnheader', ariaLabel: '会社の規模（Lの割合）の判定', top: 33.82, left: 9.11, width: 81.42, height: 2.68, align: 'left', fontSize: 8.5 },
    { kind: 'label', text: '判定要素', top: 36.5, left: 9.11, width: 1.89, height: 12.47, align: 'center' },
    { kind: 'label', text: '項　　　目', top: 36.5, left: 11, width: 15.15, height: 1.65 },
    { kind: 'label', text: '金　額　（　千　円　）', top: 36.5, left: 26.15, width: 20.83, height: 1.65 },
    { kind: 'label', text: '項　　　　　目', top: 36.5, left: 46.98, width: 24.62, height: 1.65 },
    { kind: 'label', text: '人　　　　数', top: 36.5, left: 71.6, width: 18.93, height: 1.65 },
    { kind: 'label', text: '直前期末の総資産価額\n（帳簿価額）', fontSize: 7, top: 38.15, left: 11, width: 15.15, height: 5.41 },
    { kind: 'cell', codeLabel: 'G09', top: 38.15, left: 26.15, width: 1.89, height: 5.41 },
    { field: 'f22', kind: 'input', ariaLabel: '直前期末の総資産価額', commaInteger: true, noLeadingZero: true, top: 38.15, left: 28.04, width: 18.94, height: 5.41 },
    { kind: 'label', text: '直前期末以前１年間\nの取引金額', fontSize: 7, top: 43.56, left: 11, width: 15.15, height: 5.41 },
    { kind: 'cell', codeLabel: 'G12', top: 43.56, left: 26.15, width: 1.89, height: 5.41 },
    { field: 'f24', kind: 'input', ariaLabel: '直前期末以前１年間の取引金額', commaInteger: true, noLeadingZero: true, top: 43.56, left: 28.04, width: 18.94, height: 5.41 },
    { kind: 'label', text: '㋠　継続勤務従業員数', fontSize: 7, top: 38.15, left: 46.98, width: 24.62, height: 2.7, align: 'left' },
    { kind: 'cell', codeLabel: 'G10', top: 38.15, left: 71.6, width: 1.89, height: 2.7 },
    { field: 'emp_regular', kind: 'input', ariaLabel: '継続勤務従業員数', top: 38.15, left: 73.49, width: 15.15, height: 2.7 },
    { kind: 'label', text: '人', top: 38.15, left: 88.64, width: 1.89, height: 2.7 },
    { kind: 'label', text: '㋷　継続勤務従業員以外の従業員の\n労働時間の合計時間数', fontSize: 6.5, top: 40.85, left: 46.98, width: 24.62, height: 2.71, align: 'left' },
    { kind: 'cell', codeLabel: 'G11', top: 40.85, left: 71.6, width: 1.89, height: 2.71 },
    { field: 'emp_hours', kind: 'input', ariaLabel: '継続勤務従業員以外の労働時間の合計時間数', commaInteger: true, top: 40.85, left: 73.49, width: 15.15, height: 2.71 },
    { kind: 'label', text: '時間', top: 40.85, left: 88.64, width: 1.89, height: 2.71, fontSize: 6.5 },
    { kind: 'label', text: '㋦　（㋷／1,800時間）', fontSize: 7, top: 43.56, left: 46.98, width: 24.62, height: 2.71, align: 'left' },
    { kind: 'cell', codeLabel: 'C01', top: 43.56, left: 71.6, width: 1.89, height: 2.71 },
    { field: 'emp_nu', kind: 'input', readOnly: true, ariaLabel: '労働時間換算の従業員数（自動計算）', top: 43.56, left: 73.49, width: 15.15, height: 2.71 },
    { kind: 'label', text: '人', top: 43.56, left: 88.64, width: 1.89, height: 2.71 },
    { kind: 'label', text: '㋸　直前期末以前１年間における\n従業員数（㋠＋㋦）', fontSize: 6.5, top: 46.27, left: 46.98, width: 24.62, height: 2.7, align: 'left' },
    { kind: 'cell', codeLabel: 'C02', top: 46.27, left: 71.6, width: 1.89, height: 2.7 },
    { field: 'f28', kind: 'input', readOnly: true, ariaLabel: '直前期末以前１年間における従業員数（自動計算）', top: 46.27, left: 73.49, width: 15.15, height: 2.7 },
    { kind: 'label', text: '人', top: 46.27, left: 88.64, width: 1.89, height: 2.7 },
    // ── 判定基準 ──
    { kind: 'label', text: '判　定　基　準', top: 48.97, left: 9.11, width: 1.89, height: 31.63, align: 'center' },
    { kind: 'label', text: '㋾　直前期末以前１年間における\n従業員数に応ずる区分', fontSize: 7, top: 48.97, left: 11, width: 35.98, height: 5.42 },
    { kind: 'cell', codeLabel: 'G13', top: 48.97, left: 46.98, width: 1.89, height: 2.71 },
    { field: 'w_emp70', kind: 'input', readOnly: true, ariaLabel: '㋸70人以上で大会社（該当時は１）', highlightWhen: emp70HL, top: 48.97, left: 48.87, width: 1.9, height: 2.71, align: 'center' },
    { kind: 'label', text: '㋸の人数が70人以上の会社は、大会社（㋻及び㋕は不要）', highlightWhen: emp70HL, top: 48.97, left: 50.77, width: 39.76, height: 2.71, align: 'left' },
    { kind: 'cell', codeLabel: 'G14', top: 51.68, left: 46.98, width: 1.89, height: 2.71 },
    { field: 'w_empU70', kind: 'input', readOnly: true, ariaLabel: '㋸70人未満は㋻㋕で判定（該当時は１）', highlightWhen: empU70HL, top: 51.68, left: 48.87, width: 1.9, height: 2.71, align: 'center' },
    { kind: 'label', text: '㋸の人数が70人未満の会社は、㋻及び㋕により判定', highlightWhen: empU70HL, top: 51.68, left: 50.77, width: 39.76, height: 2.71, align: 'left' },
    { kind: 'label', text: '㋻　直前期末の「総資産価額（帳簿価額）」及び直前期末以前\n１年間における「従業員数」に応ずる区分', fontSize: 6.5, top: 54.39, left: 11, width: 39.77, height: 2.62 },
    { kind: 'label', text: '㋕　直前期末以前１年間の「取引金額」に応ずる区分', fontSize: 6.5, top: 54.39, left: 50.77, width: 32.19, height: 2.62 },
    { kind: 'label', text: '総 資 産 価 額 （ 帳 簿 価 額 ）', top: 57.01, left: 11, width: 32.19, height: 1.62 },
    { kind: 'label', text: '従 業 員 数', top: 57.01, left: 43.19, width: 7.58, height: 4.59 },
    { kind: 'label', text: '取　　引　　金　　額', top: 57.01, left: 50.77, width: 32.19, height: 1.62 },
    { kind: 'label', text: '卸　売　業', top: 58.63, left: 11, width: 9.47, height: 2.97 },
    { kind: 'label', text: '小売・サービス業', top: 58.63, left: 20.47, width: 11.36, height: 2.97 },
    { kind: 'label', text: '卸売業、小売・\nサービス業以外', fontSize: 6.5, top: 58.63, left: 31.83, width: 11.36, height: 2.97 },
    { kind: 'label', text: '卸　売　業', top: 58.63, left: 50.77, width: 11.36, height: 2.97 },
    { kind: 'label', text: '小売・サービス業', top: 58.63, left: 62.13, width: 11.36, height: 2.97 },
    { kind: 'label', text: '卸売業、小売・\nサービス業以外', fontSize: 6.5, top: 58.63, left: 73.49, width: 9.47, height: 2.97 },
    { kind: 'label', text: '会社規模とＬの\n割合（中会社）\nの区分', fontSize: 6.5, top: 54.39, left: 82.96, width: 7.57, height: 7.21 },
    // マトリクス本体（データ駆動）
    ...matrixCells(),
    // 会社規模とＬの割合の列
    { kind: 'label', text: '大　会　社', highlightWhen: matrixResHL(4), top: 61.6, left: 82.96, width: 7.57, height: 3.27 },
    { kind: 'label', text: '0.90', highlightWhen: matrixResHL(3), top: 64.87, left: 82.96, width: 5.68, height: 3.28 },
    { kind: 'label', text: '0.75', highlightWhen: matrixResHL(2), top: 68.15, left: 82.96, width: 5.68, height: 3.27 },
    { kind: 'label', text: '0.60', highlightWhen: matrixResHL(1), top: 71.42, left: 82.96, width: 5.68, height: 3.28 },
    { kind: 'label', text: '中会社', top: 64.87, left: 88.64, width: 1.89, height: 9.83, align: 'center', forceVertical: true },
    { kind: 'label', text: '小　会　社', highlightWhen: matrixResHL(0), top: 74.7, left: 82.96, width: 7.57, height: 3.28 },
    // 脚注
    { kind: 'label', text: '・　「会社規模とＬの割合（中会社）の区分」欄は、㋻欄の区分（「総資産価額（帳簿価額）」と「従業員数」とのいずれか下位の区分）と㋕欄（取引金額）の区分とのいずれか上位の区分により判定します。', fontSize: 7, top: 77.98, left: 11, width: 79.53, height: 2.62, align: 'left' },
    // ── 判定 ──
    { kind: 'label', text: '判定', forceVertical: true, top: 80.6, left: 9.11, width: 1.89, height: 5.55, align: 'center' },
    { kind: 'cell', codeLabel: 'G50', top: 80.6, left: 11, width: 1.89, height: 5.55 },
    { field: 'k_res4', kind: 'input', readOnly: true, ariaLabel: '判定：大会社（該当時は１）', highlightWhen: resHL(4), top: 80.6, left: 12.89, width: 1.9, height: 5.55, align: 'center' },
    { kind: 'label', text: '大　会　社', highlightWhen: resHL(4), top: 80.6, left: 14.79, width: 9.46, height: 5.55 },
    { kind: 'label', text: '中　　会　　社', top: 80.6, left: 24.25, width: 28.41, height: 1.48 },
    { kind: 'label', text: 'Ｌ　の　割　合', top: 82.08, left: 24.25, width: 28.41, height: 1.48 },
    { kind: 'cell', codeLabel: 'G51', top: 83.56, left: 24.25, width: 1.9, height: 2.59 },
    { field: 'k_res3', kind: 'input', readOnly: true, ariaLabel: '判定：Ｌの割合0.90（該当時は１）', highlightWhen: resHL(3), top: 83.56, left: 26.15, width: 1.89, height: 2.59, align: 'center' },
    { kind: 'label', text: '0.90', highlightWhen: resHL(3), top: 83.56, left: 28.04, width: 5.68, height: 2.59 },
    { kind: 'cell', codeLabel: 'G52', top: 83.56, left: 33.72, width: 1.9, height: 2.59 },
    { field: 'k_res2', kind: 'input', readOnly: true, ariaLabel: '判定：Ｌの割合0.75（該当時は１）', highlightWhen: resHL(2), top: 83.56, left: 35.62, width: 1.89, height: 2.59, align: 'center' },
    { kind: 'label', text: '0.75', highlightWhen: resHL(2), top: 83.56, left: 37.51, width: 5.68, height: 2.59 },
    { kind: 'cell', codeLabel: 'G53', top: 83.56, left: 43.19, width: 1.89, height: 2.59 },
    { field: 'k_res1', kind: 'input', readOnly: true, ariaLabel: '判定：Ｌの割合0.60（該当時は１）', highlightWhen: resHL(1), top: 83.56, left: 45.08, width: 1.9, height: 2.59, align: 'center' },
    { kind: 'label', text: '0.60', highlightWhen: resHL(1), top: 83.56, left: 46.98, width: 5.68, height: 2.59 },
    { kind: 'cell', codeLabel: 'G54', top: 80.6, left: 52.66, width: 1.89, height: 5.55 },
    { field: 'k_res0', kind: 'input', readOnly: true, ariaLabel: '判定：小会社（該当時は１）', highlightWhen: resHL(0), top: 80.6, left: 54.55, width: 1.9, height: 5.55, align: 'center' },
    { kind: 'label', text: '小　会　社', highlightWhen: resHL(0), top: 80.6, left: 56.45, width: 9.46, height: 5.55 },
    { kind: 'cell', diagonal: 'bltr', top: 80.6, left: 65.91, width: 24.62, height: 5.55 },
    // ── 4. 増（減）資の状況その他評価上の参考事項 ──
    { kind: 'label', text: '４．増（減）資の状況その他評価上の参考事項', semanticRole: 'columnheader', ariaLabel: '増減資の状況その他評価上の参考事項', top: 86.38, left: 9.11, width: 81.42, height: 1.51, align: 'left' },
    { kind: 'cell', codeLabel: 'E02', top: 87.89, left: 9.11, width: 1.89, height: 6.64 },
    { field: 'f8', kind: 'input', ariaLabel: '増減資の状況その他評価上の参考事項', top: 87.89, left: 11, width: 79.53, height: 6.64, align: 'left' },
  ];
}

/** 第1表の2（CSSグリッド方式・令和8年4月1日以降用） */
export function Table1_2Grid({ getField, updateField, onJump }: TableProps) {
  const raw = (f: string) => getField(T, f);
  const employee = calcEmployees(raw);
  // 少数株式所有者の判定（第1表の1の株主判定・役職コードと本表のj_*から算出）
  const judge = calcShareholderJudgment(getField);
  const size = calc(raw);
  // 様式の「１」記入枠: 該当時に「１」を自動表示
  const mark = (cond: boolean) => (cond ? '1' : '');
  const g = (f: string) => {
    // 判定基準マトリクス（G15〜G49）の「１」記入枠: 該当セルに「１」を自動表示
    const matrixFlag = /^m_(G\d+)$/.exec(f);
    if (matrixFlag) {
      const cond = MATRIX_HL[matrixFlag[1]!];
      return mark(cond !== undefined && cond(raw));
    }
    switch (f) {
      case 'emp_nu': return formatEmployee(employee.nu);
      case 'f28': return formatEmployee(employee.total);
      case 'j1_yakuin_yes': return mark(judge.shosuApplies && judge.officer === true);
      case 'j1_yakuin_no': return mark(judge.shosuApplies && judge.officer === false);
      case 'j1_cs_yes': return mark(judge.chushinSelfActive && raw('j_chushin_self') === 'yes');
      case 'j1_cs_no': return mark(judge.chushinSelfActive && raw('j_chushin_self') === 'no');
      case 'j1_co_no': return mark(judge.chushinOtherActive && raw('j_chushin_other') === 'no');
      case 'j1_co_yes': return mark(judge.chushinOtherActive && raw('j_chushin_other') === 'yes');
      case 'j1_res_gensoku': return mark(judge.shosuResult === 'gensoku');
      case 'j1_res_haito': return mark(judge.shosuResult === 'haito');
      case 'w_emp70': return mark(size.emp !== null && size.emp >= 70);
      case 'w_empU70': return mark(size.emp !== null && size.emp < 70);
      case 'k_res4': return mark(size.result === 4);
      case 'k_res3': return mark(size.result === 3);
      case 'k_res2': return mark(size.result === 2);
      case 'k_res1': return mark(size.result === 1);
      case 'k_res0': return mark(size.result === 0);
      default: return raw(f);
    }
  };
  const u = (f: string, v: string) => updateField(T, f, v);
  const toolbar = (
    <label className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, whiteSpace: 'nowrap' }}>
      業種区分：
      <select id="table1_2-gyoshu-toolbar" name="table1_2.gyoshu" value={g('gyoshu')} onChange={(e) => u('gyoshu', e.target.value)} style={{ fontSize: 11, padding: '1px 2px' }}>
        <option value="">選択してください</option>
        <option value="卸売業">卸売業</option>
        <option value="小売・サービス業">小売・サービス業</option>
        <option value="その他">卸売業、小売・サービス業以外</option>
      </select>
    </label>
  );
  const { mainCells, headerExtra, aspectRatio } = extractCompanyFloatHeader(buildCells(judge), g, u, T, onJump);
  // 「2.」欄が省略となる場合は画面上にその旨を重ね表示（印刷には出さない。様式どおり空欄のまま）
  // 座標はグリッド基準（セル外接範囲 top14.7〜94.53 / left9.11〜90.53 を0〜100%に正規化）:
  // 判定要素帯 top17.46〜33.59 → top(17.46-14.7)/79.83=3.46%, height16.13/79.83=20.2%
  const shosuOverlay = isShosuOmitted(judge) ? (
    <div className="no-print" style={{ position: 'absolute', top: '3.46%', left: 0, width: '100%', height: '20.2%', background: 'rgba(130,130,130,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 5 }}>
      <span style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid #999', color: '#555', fontSize: 10, padding: '3px 12px', textAlign: 'center' }}>
        納税義務者が「同族株主等」に該当し議決権割合（㋥）が５％未満の場合のみ記載します<br />（該当しないため省略）
      </span>
    </div>
  ) : null;
  return <GridForm cells={mainCells} g={g} u={u} formId={T} width="100%" aspectRatio={aspectRatio} title="第１表の２　評価上の株主の判定及び会社規模の判定の明細書（続）" formCode="NTA0VNA180010010" headerExtra={headerExtra} toolbar={toolbar} overlay={shosuOverlay} enterLoop={ENTER_LOOP} />;
}
