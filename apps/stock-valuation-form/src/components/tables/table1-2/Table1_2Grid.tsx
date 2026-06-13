import { GridForm, type GridCell } from '@/components/ui/GridForm';
import type { TableProps } from '@/types/form';

const T = 'table1_2' as const;

// ── 計算の根拠（参考リンク） ──
const REFERENCES = [
  { label: '評価通達178（取引相場のない株式の評価上の区分）', url: 'https://www.nta.go.jp/law/tsutatsu/kihon/sisan/hyoka_new/08/02.htm#a-178' },
];

const ENTER_LOOP = [
  '直前期末の総資産価額',
  '直前期末以前１年間の取引金額',
  '継続従業員数',
  '継続従業員以外の人数',
  '継続従業員以外の換算係数',
];

// ── 会社規模（Lの割合）の自動判定（評価通達178） ──
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

function calcEmployees(g: G) {
  const regular = parseNumber(g('emp_regular'));
  const other = parseNumber(g('emp_other'));
  const rate = parseNumber(g('emp_other_rate')) ?? 0.5;
  const regularResult = regular;
  const otherResult = other === null ? null : other * rate;
  const hasBreakdown = regular !== null || other !== null;
  const total = hasBreakdown
    ? (regularResult ?? 0) + (otherResult ?? 0)
    : parseNumber(g('f28'));
  return { regularResult, otherResult, rate, total };
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
  // チ = 総資産と従業員のいずれか下位、会社規模 = チとリ（取引金額）のいずれか上位。70人以上は大会社。
  const chi = assetRank !== null && empRank !== null ? Math.min(assetRank, empRank) : null;
  const result = emp !== null && emp >= 70 ? 4 : chi !== null && txRank !== null ? Math.max(chi, txRank) : null;
  return { gyo, emp, assetRank, txRank, empBand, result };
}

/** 会社規模の判定結果（第4表の斟酌率などで他表からも参照） */
export const calcCompanySize = calc;

const assetHL = (gyo: Gyo, r: number) => (g: G) => { const c = calc(g); return c.gyo === gyo && c.assetRank === r; };
const txHL = (gyo: Gyo, r: number) => (g: G) => { const c = calc(g); return c.gyo === gyo && c.txRank === r; };
const empHL = (band: Band) => (g: G) => calc(g).empBand === band;
const resHL = (r: number) => (g: G) => calc(g).result === r;
const emp70HL = (g: G) => { const e = calc(g).emp; return e !== null && e >= 70; };
const empU70HL = (g: G) => { const e = calc(g).emp; return e !== null && e < 70; };

/** 第1表の2のグリッドセル（ピッカーで測定・確定したもの／ピッカー出力をそのまま保存） */
const CELLS: GridCell[] = [
  // ── 外枠・区分 ──
  { kind: 'cell', text: '', top: 8.9, left: 9.05, width: 85.51, height: 82.99 },
  { kind: 'label', text: '３．会社の規模（Ｌの割合）の判定', top: 8.9, left: 8.92, width: 85.65, height: 2.7, align: 'left' },
  { kind: 'cell', text: '', top: 11.4, left: 8.92, width: 85.65, height: 17.93 },
  { kind: 'cell', text: '', top: 29.04, left: 8.92, width: 85.65, height: 39.52 },
  { kind: 'cell', text: '', top: 68.37, left: 8.92, width: 85.65, height: 7.71 },
  { kind: 'cell', text: '', top: 75.79, left: 8.92, width: 85.51, height: 16.1 },
  { kind: 'label', text: '４．増（減）資の状況その他評価上の参考事項', top: 75.79, left: 9.05, width: 85.38, height: 2.8, align: 'left' },
  { field: 'f8', kind: 'input', ariaLabel: '増減資の状況その他評価上の参考事項', top: 78.49, left: 8.92, width: 85.65, height: 13.4, align: 'left' },
  // ── 判定（大会社/中会社Lの割合/小会社） ──
  { kind: 'label', text: '判定', top: 68.27, left: 8.92, width: 2.73, height: 7.71, align: 'center' },
  { kind: 'label', text: '大会社', highlightWhen: resHL(4), top: 68.27, left: 11.37, width: 12.41, height: 7.61 },
  { kind: 'label', text: '中会社', top: 68.37, left: 23.51, width: 22.3, height: 2.8 },
  { kind: 'label', text: 'Lの割合', top: 70.87, left: 23.57, width: 22.3, height: 2.7 },
  { kind: 'label', text: '0.90', highlightWhen: resHL(3), top: 73.48, left: 23.51, width: 8.05, height: 2.51 },
  { kind: 'label', text: '0.75', highlightWhen: resHL(2), top: 73.38, left: 31.28, width: 7.5, height: 2.6 },
  { kind: 'label', text: '0.60', highlightWhen: resHL(1), top: 73.38, left: 38.51, width: 7.36, height: 2.6 },
  { kind: 'label', text: '小会社', highlightWhen: resHL(0), top: 68.37, left: 45.6, width: 15.27, height: 7.61 },
  { kind: 'cell', diagonal: 'bltr', top: 68.46, left: 60.6, width: 33.96, height: 7.61 },
  // ── 判定要素（総資産価額・取引金額・従業員数） ──
  { kind: 'label', text: '判定要素', top: 11.4, left: 8.92, width: 2.59, height: 17.83, align: 'center' },
  { kind: 'label', text: '項目', top: 11.4, left: 11.23, width: 14.18, height: 2.7 },
  { kind: 'label', text: '金額', top: 11.4, left: 25.28, width: 20.59, height: 2.7 },
  { kind: 'label', text: '直前期末の総資産価額\n(帳簿価額)', fontSize: 6.5, top: 13.91, left: 11.37, width: 14.05, height: 7.52 },
  { field: 'f22', kind: 'input', ariaLabel: '直前期末の総資産価額', commaInteger: true, noLeadingZero: true, topRightLabel: '千円', top: 13.81, left: 25.14, width: 20.73, height: 7.71 },
  { kind: 'label', text: '直前期末以前１年間\nの取引金額', fontSize: 6.5, top: 21.34, left: 11.23, width: 14.18, height: 7.9 },
  { field: 'f24', kind: 'input', ariaLabel: '直前期末以前１年間の取引金額', commaInteger: true, noLeadingZero: true, topRightLabel: '千円', top: 21.33, left: 25.28, width: 20.46, height: 7.81 },
  { kind: 'label', text: '項目', top: 11.4, left: 45.6, width: 15.14, height: 2.7 },
  { kind: 'label', text: '直前期末以前１年間\nにおける従業員数', fontSize: 6.5, top: 13.81, left: 45.74, width: 15, height: 15.42 },
  { kind: 'label', text: '人数（役員除く）', top: 11.31, left: 60.47, width: 34.1, height: 2.89 },
  { kind: 'input', employeeBreakdown: { regularField: 'emp_regular', regularResultField: 'emp_regular_result', otherField: 'emp_other', otherRateField: 'emp_other_rate', otherResultField: 'emp_other_result', totalField: 'f28' }, top: 13.81, left: 60.47, width: 33.96, height: 15.42 },
  // ── 判定基準（マトリクス） ──
  { kind: 'label', text: '判定基準', top: 29.14, left: 9.05, width: 2.45, height: 39.32, align: 'center' },
  { kind: 'label', text: '㋣直前期末以前１年間における従業員数に応ずる区分', top: 29.04, left: 11.23, width: 37.64, height: 5.01 },
  { kind: 'label', text: '70人以上の会社は、大会社(㋠及び㋷は不要）', highlightWhen: emp70HL, top: 29.04, left: 48.6, width: 45.82, height: 2.51, align: 'left' },
  { kind: 'label', text: '70人未満の会社は、㋠及び㋷により判定', highlightWhen: empU70HL, top: 31.36, left: 48.6, width: 45.96, height: 2.8, align: 'left' },
  { kind: 'label', text: '㋠直前期末の「総資産価額（帳簿価額）」及び\n直前期末以前１年間における「従業員数」に応ずる区分', top: 33.86, left: 11.23, width: 41.32, height: 3.95 },
  { kind: 'label', text: '㋷直前期末以前１年間の「取引金額」に応ずる区分', top: 33.96, left: 52.42, width: 29.87, height: 3.86 },
  { kind: 'label', text: '総 資 産 価 額 ( 帳 簿 価 額 ）', top: 37.62, left: 11.23, width: 29.87, height: 2.6 },
  { kind: 'label', text: '卸 売 業', top: 40.03, left: 11.37, width: 9.99, height: 5.2 },
  { kind: 'label', text: '小売・サービス業', top: 40.13, left: 21.05, width: 10.37, height: 5.11 },
  { kind: 'label', text: '卸売業、小売・\nサービス業以外', fontSize: 6.5, top: 40.03, left: 31.15, width: 9.96, height: 5.2 },
  { kind: 'label', text: '従 業 員 数', top: 37.62, left: 40.83, width: 11.73, height: 7.61 },
  { kind: 'label', text: '取　　　　引　　　　金　　　　額', top: 37.53, left: 52.28, width: 30, height: 2.7 },
  { kind: 'label', text: '卸 売 業', top: 40.03, left: 52.42, width: 9.82, height: 5.2 },
  { kind: 'label', text: '小売・サービス業', top: 40.03, left: 61.97, width: 9.96, height: 5.2 },
  { kind: 'label', text: '卸売業、小売・\nサービス業以外', fontSize: 6.5, top: 40.13, left: 71.79, width: 10.5, height: 5.01 },
  { kind: 'label', text: '会社規模と\nＬの割合（中会社）の区分', fontSize: 6.5, top: 33.96, left: 82.02, width: 12.41, height: 11.18 },
  // 大会社 行
  { kind: 'label', text: ' 20億円以上', highlightWhen: assetHL('卸売業', 4), top: 45.04, left: 11.23, width: 10.09, height: 2.51 },
  { kind: 'label', text: '15億円以上', highlightWhen: assetHL('小売・サービス業', 4), top: 44.95, left: 21.05, width: 10.37, height: 2.7 },
  { kind: 'label', text: '15億円以上', highlightWhen: assetHL('その他', 4), top: 45.04, left: 31.15, width: 9.96, height: 2.6 },
  { kind: 'label', text: ' 35　人　超', highlightWhen: empHL('over35'), top: 44.95, left: 40.83, width: 11.73, height: 2.7 },
  { kind: 'label', text: '30億円以上', highlightWhen: txHL('卸売業', 4), top: 45.04, left: 52.28, width: 9.96, height: 2.6 },
  { kind: 'label', text: '20億円以上', highlightWhen: txHL('小売・サービス業', 4), top: 44.95, left: 61.97, width: 9.96, height: 2.7 },
  { kind: 'label', text: '15億円以上', highlightWhen: txHL('その他', 4), top: 45.04, left: 71.79, width: 10.64, height: 2.6 },
  { kind: 'label', text: '大 会 社', highlightWhen: resHL(4), top: 45.04, left: 82.02, width: 12.41, height: 2.51 },
  // 中会社 0.90 行
  { kind: 'label', text: '４億円以上\n20億円未満', highlightWhen: assetHL('卸売業', 3), top: 47.55, left: 11.37, width: 9.96, height: 4.92 },
  { kind: 'label', text: '５億円以上\n15億円未満', highlightWhen: assetHL('小売・サービス業', 3), top: 47.45, left: 21.05, width: 10.23, height: 5.01 },
  { kind: 'label', text: '５億円以上\n15億円未満', highlightWhen: assetHL('その他', 3), top: 47.36, left: 31.15, width: 9.96, height: 5.2 },
  { kind: 'label', text: '35　人　超', highlightWhen: empHL('over35'), top: 47.45, left: 40.83, width: 11.73, height: 5.01 },
  { kind: 'label', text: '７億円以上\n30億円未満', highlightWhen: txHL('卸売業', 3), top: 47.45, left: 52.28, width: 9.96, height: 5.01 },
  { kind: 'label', text: '５億円以上\n20億円未満', highlightWhen: txHL('小売・サービス業', 3), top: 47.36, left: 61.97, width: 9.82, height: 5.11 },
  { kind: 'label', text: '４億円以上\n15億円未満', highlightWhen: txHL('その他', 3), top: 47.45, left: 71.65, width: 10.5, height: 5.01 },
  { kind: 'label', text: '0.90', highlightWhen: resHL(3), top: 47.45, left: 82.02, width: 9.96, height: 5.11 },
  // 中会社 0.75 行
  { kind: 'label', text: '２億円以上\n４億円未満', highlightWhen: assetHL('卸売業', 2), top: 52.37, left: 11.23, width: 10.09, height: 4.92 },
  { kind: 'label', text: '2億5,000万円以上\n５億円未満', fontSize: 6.5, highlightWhen: assetHL('小売・サービス業', 2), top: 52.37, left: 21.05, width: 10.23, height: 5.01 },
  { kind: 'label', text: '2億5,000万円以上\n５億円未満', fontSize: 6.5, highlightWhen: assetHL('その他', 2), top: 52.37, left: 31.15, width: 10.09, height: 5.01 },
  { kind: 'label', text: '20人超\n35人以下', highlightWhen: empHL('b075'), top: 52.37, left: 40.83, width: 11.73, height: 5.01 },
  { kind: 'label', text: '3億5,000万円以上\n７億円未満', fontSize: 6.5, highlightWhen: txHL('卸売業', 2), top: 52.37, left: 52.42, width: 9.82, height: 5.01 },
  { kind: 'label', text: '2億5,000万円以上\n５億円未満', fontSize: 6.5, highlightWhen: txHL('小売・サービス業', 2), top: 52.27, left: 61.97, width: 9.96, height: 5.2 },
  { kind: 'label', text: '２億円以上\n４億円未満', highlightWhen: txHL('その他', 2), top: 52.18, left: 71.65, width: 10.64, height: 5.2 },
  { kind: 'label', text: '0.75', highlightWhen: resHL(2), top: 52.37, left: 82.02, width: 9.96, height: 5.11 },
  { kind: 'label', text: '中会社', top: 47.36, left: 91.7, width: 2.86, height: 15.04, align: 'center' },
  // 中会社 0.60 行（様式の確定値で補完）
  { kind: 'label', text: '7,000万円以上\n2億円未満', fontSize: 6.5, highlightWhen: assetHL('卸売業', 1), top: 57.38, left: 11.23, width: 10.09, height: 4.92 },
  { kind: 'label', text: '4,000万円以上\n2億5,000万円未満', fontSize: 6.5, highlightWhen: assetHL('小売・サービス業', 1), top: 57.38, left: 21.05, width: 10.23, height: 4.92 },
  { kind: 'label', text: '5,000万円以上\n2億5,000万円未満', fontSize: 6.5, highlightWhen: assetHL('その他', 1), top: 57.38, left: 31.15, width: 10.09, height: 4.92 },
  { kind: 'label', text: '5人超\n20 人以下', highlightWhen: empHL('b060'), top: 57.38, left: 40.83, width: 11.73, height: 4.92 },
  { kind: 'label', text: '2億円以上\n3億5,000万円未満', fontSize: 6.5, highlightWhen: txHL('卸売業', 1), top: 57.38, left: 52.42, width: 9.82, height: 4.92 },
  { kind: 'label', text: '6,000万円以上\n2億5,000万円未満', fontSize: 6.5, highlightWhen: txHL('小売・サービス業', 1), top: 57.38, left: 61.97, width: 9.96, height: 4.92 },
  { kind: 'label', text: '8,000万円以上\n2億円未満', fontSize: 6.5, highlightWhen: txHL('その他', 1), top: 57.38, left: 71.65, width: 10.64, height: 4.92 },
  { kind: 'label', text: '0.60', highlightWhen: resHL(1), top: 57.38, left: 82.02, width: 9.96, height: 4.92 },
  // 小会社 行
  { kind: 'label', text: '7,000万円未満', highlightWhen: assetHL('卸売業', 0), top: 62.3, left: 11.23, width: 10.09, height: 2.6 },
  { kind: 'label', text: ' 4,000万円未満', highlightWhen: assetHL('小売・サービス業', 0), top: 62.2, left: 21.05, width: 10.37, height: 2.7 },
  { kind: 'label', text: ' 5,000万円未満', highlightWhen: assetHL('その他', 0), top: 62.2, left: 31.15, width: 9.96, height: 2.7 },
  { kind: 'label', text: '５ 人 以 下', highlightWhen: empHL('small'), top: 62.2, left: 40.83, width: 11.73, height: 2.7 },
  { kind: 'label', text: '２億円未満 ', highlightWhen: txHL('卸売業', 0), top: 62.3, left: 52.28, width: 9.82, height: 2.6 },
  { kind: 'label', text: '6,000万円未満', highlightWhen: txHL('小売・サービス業', 0), top: 62.3, left: 61.97, width: 9.82, height: 2.6 },
  { kind: 'label', text: ' 8,000万円未満', highlightWhen: txHL('その他', 0), top: 62.2, left: 71.65, width: 10.64, height: 2.7 },
  { kind: 'label', text: '小 会 社', highlightWhen: resHL(0), top: 62.3, left: 82.02, width: 12.41, height: 2.51 },
  // 脚注
  { kind: 'label', text: '・「会社規模とＬの割合（中会社）の区分」欄は、\n㋠欄の区分（「総資産価額（帳簿価額）」と「従業員数」とのいずれか下位の区分）と\n㋷欄（取引金額）の区分との\nいずれか上位の区分により判定します。', top: 64.8, left: 11.23, width: 83.19, height: 3.66, align: 'left' },
];

/** 第1表の2（CSSグリッド方式・完成版） */
export function Table1_2Grid({ getField, updateField }: TableProps) {
  const raw = (f: string) => getField(T, f);
  const employee = calcEmployees(raw);
  const g = (f: string) => {
    switch (f) {
      case 'emp_regular_result': return formatEmployee(employee.regularResult);
      case 'emp_other_result': return formatEmployee(employee.otherResult);
      case 'emp_other_rate': return raw(f) || '0.5';
      case 'f28': return formatEmployee(employee.total);
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
  return <GridForm cells={CELLS} g={g} u={u} formId={T} width="100%" title="第１表の２　評価上の株主の判定及び会社規模の判定の明細書（続）" toolbar={toolbar} references={REFERENCES} enterLoop={ENTER_LOOP} />;
}
