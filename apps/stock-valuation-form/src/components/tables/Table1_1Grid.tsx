import { GridForm, type GridCell } from '@/components/ui/GridForm';
import type { TableProps } from '@/types/form';

const T = 'table1_1' as const;

// ── 株主テーブルの繰り返し行を自動生成 ──
const SH_ROWS = 10;          // 株主行数（実フォームに合わせて調整可）
const SH_TOP = 33.96;        // 1行目の上端%
const SH_SELF = 76.37;       // 自己株式行の上端（データ行はここまで）
const SH_PITCH = (SH_SELF - SH_TOP) / SH_ROWS;

// ── 計算の根拠（参考リンク） ──
const REFERENCES = [
  { label: '評価通達188（同族株主以外の株主等が取得した株式）', url: 'https://www.nta.go.jp/law/tsutatsu/kihon/sisan/hyoka_new/08/04.htm#a-188' },
  { label: '評価通達188-2（同族株主以外の株主等が取得した株式の評価）', url: 'https://www.nta.go.jp/law/tsutatsu/kihon/sisan/hyoka_new/08/04.htm#a-188_2' },
];

// ── 会社における役職名（セレクト候補）＋役員該当の判定 ──
// 評価通達188(2)の「役員」＝法人税法施行令71①一・二・四（社長・代表取締役・副社長・専務・常務・
// 代表執行役・指名委員会等の執行役・監査等委員である取締役・会計参与・監査役・監事）。
// 監査役設置会社の「平取締役」や相談役・顧問・執行役員（使用人）は、この「役員」に該当しない点に注意。
const OFFICER_ROLES: string[] = [
  '',
  '代表取締役',
  '社長・会長・副社長',
  '専務・常務',
  '執行役・代表執行役',
  '監査等委員である取締役',
  '会計参与',
  '監査役・監事',
  'みなし役員',
  '取締役（平）',
  '相談役・顧問',
  '執行役員（使用人）',
  '使用人・一般株主',
];
// 上記のうち「役員」に該当するもの
const OFFICER_YAKUIN = new Set<string>([
  '代表取締役', '社長・会長・副社長', '専務・常務', '執行役・代表執行役',
  '監査等委員である取締役', '会計参与', '監査役・監事', 'みなし役員',
]);
/** 役職名から役員該当を判定（''=未選択→null）。㊁役員は納税義務者の役職名(sh_1_3)で自動判定する */
const isOfficerRole = (role: string): boolean | null => (role === '' ? null : OFFICER_YAKUIN.has(role));
/** 表内で手動選択した判定を優先し、未選択時は納税義務者の役職名から導出する */
const effectiveOfficer = (g: (f: string) => string): boolean | null => {
  const manual = g('j_yakuin');
  if (manual === 'yes') return true;
  if (manual === 'no') return false;
  return isOfficerRole(g('sh_1_3'));
};

// ── 判定マトリクスの自動ハイライト（⑤と⑥に基づく） ──
// ⑥列の区分: 50%超 / 30%以上50%以下 / 30%未満 → 各列での⑤の閾値は 50 / 30 / 15
const col6Threshold = (r6: number): 50 | 30 | 15 | null => (r6 > 50 ? 50 : r6 >= 30 ? 30 : r6 >= 0 ? 15 : null);
const r5r6 = (g: (f: string) => string): { r5: number; r6: number; valid: boolean } => {
  const s5 = g('⑤'), s6 = g('⑥');
  const r5 = Number(s5), r6 = Number(s6);
  return { r5, r6, valid: s5 !== '' && s6 !== '' && !isNaN(r5) && !isNaN(r6) };
};
// 同族株主等の各列（閾値）：その列が選択されていて、かつ⑤≥閾値
const dozokuMatch = (th: 50 | 30 | 15) => (g: (f: string) => string) => {
  const { r5, r6, valid } = r5r6(g);
  return valid && col6Threshold(r6) === th && r5 >= th;
};
// 同族株主等以外の各列：その列が選択されていて、かつ⑤<閾値
const nonDozokuMatch = (th: 50 | 30 | 15) => (g: (f: string) => string) => {
  const { r5, r6, valid } = r5r6(g);
  return valid && col6Threshold(r6) === th && r5 < th;
};
// 最終判定（行全体）
const isDozokuJudge = (g: (f: string) => string) => {
  const { r5, r6, valid } = r5r6(g);
  const th = col6Threshold(r6);
  return valid && th !== null && r5 >= th;
};
const isNonDozokuJudge = (g: (f: string) => string) => {
  const { r5, r6, valid } = r5r6(g);
  const th = col6Threshold(r6);
  return valid && th !== null && r5 < th;
};
// ── 2.少数株式所有者の評価方式の判定（通達188(2)(4)）のハイライト用 ──
const shosuState = (g: (f: string) => string): { applies: boolean; result: 'gensoku' | 'haito' | null } => {
  const isDozoku = isDozokuJudge(g);
  const indiv = g('sh_1_6'); // 納税義務者(1行目)の議決権割合㋩
  const indivR = Number(indiv);
  const applies = isDozoku && indiv !== '' && !isNaN(indivR) && indivR < 5;
  const officer = effectiveOfficer(g); // ㊁役員（手動選択優先・なければ役職名から導出）
  let result: 'gensoku' | 'haito' | null = null;
  if (applies) {
    if (officer === true) result = 'gensoku';                  // 役員である→原則
    else if (officer === false) {                              // 役員でない→㋭へ
      if (g('j_chushin_self') === 'yes') result = 'gensoku';   // 本人が中心的同族株主→原則
      else if (g('j_chushin_self') === 'no') {                 // でない→㋬へ
        if (g('j_chushin_other') === 'yes') result = 'haito';  // 他に中心的同族株主がいる→配当還元
        else if (g('j_chushin_other') === 'no') result = 'gensoku';
      }
    }
  }
  return { applies, result };
};
const shosuGensoku = (g: (f: string) => string) => shosuState(g).result === 'gensoku';
const shosuHaito = (g: (f: string) => string) => shosuState(g).result === 'haito';

/** 第1表の1の株主判定（⑤⑥と同族株主等の判定。第3表の適用方式などから参照） */
export function calcShareholderJudgment(getField: TableProps['getField']) {
  const gf = (f: string) => getField('table1_1', f);
  const n = (s: string) => Number(s.replace(/,/g, '')) || 0;
  let votes = 0;
  for (let r = 1; r <= SH_ROWS; r++) votes += n(gf(`sh_${r}_5`));
  const denom = n(gf('④'));
  const pct = (v: number, has: boolean): number | null => {
    if (!has || denom <= 0) return null;
    const rawPct = (v / denom) * 100;
    if (rawPct > 50 && rawPct < 51) return 51; // 50%超51%未満は切り上げて51
    return Math.floor(rawPct);
  };
  const ratio5 = pct(votes, votes > 0);
  const ratio6 = pct(n(gf('③')), gf('③') !== '');
  const th = ratio6 === null ? null : ratio6 > 50 ? 50 : ratio6 >= 30 ? 30 : 15;
  const isDozoku = ratio5 !== null && th !== null ? ratio5 >= th : null; // 1.株主及び評価方式の判定（議決権割合）

  // 2.少数株式所有者の評価方式の判定（通達188(2)(4)）
  // 同族株主等に該当する納税義務者(1行目)のうち、個人の議決権割合(㋩)が5%未満の者に適用
  const indivRatio = pct(n(gf('sh_1_5')), gf('sh_1_5') !== '');
  const shosuApplies = isDozoku === true && indivRatio !== null && indivRatio < 5;
  const officer = effectiveOfficer(gf); // ㊁役員: 手動選択(j_yakuin)優先・なければ役職名(sh_1_3)から導出
  const chushinSelf = gf('j_chushin_self');    // ㋭納税義務者が中心的な同族株主: yes→原則 / no→次へ
  const chushinOther = gf('j_chushin_other');  // ㋬他に中心的な同族株主(株主): yes(がいる)→配当還元 / no(がいない)→原則
  let shosuResult: 'gensoku' | 'haito' | null = null;
  if (shosuApplies) {
    if (officer === true) shosuResult = 'gensoku';
    else if (officer === false) {
      if (chushinSelf === 'yes') shosuResult = 'gensoku';
      else if (chushinSelf === 'no') {
        if (chushinOther === 'yes') shosuResult = 'haito';
        else if (chushinOther === 'no') shosuResult = 'gensoku';
      }
    }
  }

  // 最終判定（原則的評価方式等=true / 配当還元方式=false）。区分2が適用される場合はその結果を優先。
  let isDozokuFinal: boolean | null;
  if (isDozoku === null) isDozokuFinal = null;
  else if (isDozoku === false) isDozokuFinal = false;
  else if (!shosuApplies) isDozokuFinal = true; // 同族株主等かつ5%以上→原則
  else isDozokuFinal = shosuResult === 'gensoku' ? true : shosuResult === 'haito' ? false : null;

  return { ratio5, ratio6, isDozoku, indivRatio, shosuApplies, officer, shosuResult, isDozokuFinal };
}

type Col = { left: number; width: number };
const SH_COLS: Col[] = [
  { left: 10.14, width: 11.05 }, // 氏名又は名称
  { left: 20.92, width: 4.91 },  // 続柄
  { left: 25.69, width: 7.91 },  // 会社における役職名
  { left: 33.4, width: 9.07 },   // ㋑株式数
  { left: 42.19, width: 8.66 },  // ㋺議決権数
  { left: 50.66, width: 8.7 },   // ㋩議決権割合
];

function shareholderRows(): GridCell[] {
  const out: GridCell[] = [];
  for (let r = 0; r < SH_ROWS; r++) {
    const top = +(SH_TOP + r * SH_PITCH).toFixed(2);
    const height = +SH_PITCH.toFixed(2);
    SH_COLS.forEach((c, ci) => {
      if (r === 0 && ci === 1) {
        // 1行目の続柄欄は「納税義務者」固定
        out.push({ kind: 'label', text: '納税\n義務者', top, left: c.left, width: c.width, height, fontSize: 8 });
      } else if (ci === 2) {
        // 会社における役職名＝セレクト（役員該当の判定に連動）
        out.push({ field: `sh_${r + 1}_${ci + 1}`, kind: 'input', options: OFFICER_ROLES, top, left: c.left, width: c.width, height, align: 'left' });
      } else {
        const topRightLabel = r === 0 ? ['株', '個', '％'][ci - 3] : undefined;
        out.push({ field: `sh_${r + 1}_${ci + 1}`, kind: 'input', topRightLabel, commaInteger: ci === 3 || ci === 4, readOnly: ci === 5, top, left: c.left, width: c.width, height, align: ci <= 2 ? 'left' : 'right' });
      }
    });
  }
  return out;
}

/** 第1表の1のグリッドセル（ピッカーで測定・確定したもの／ピッカー出力をそのまま保存） */
const CELLS: GridCell[] = [
  // ── 外枠・区分 ──
  { kind: 'cell', text: '', top: 8.61, left: 8.37, width: 85.24, height: 83.28 },
  { kind: 'cell', text: '', top: 8.61, left: 8.23, width: 85.24, height: 18.22 },
  { kind: 'cell', text: '', top: 26.83, left: 8.23, width: 51.28, height: 65.06 },
  { kind: 'cell', text: '', top: 26.73, left: 59.24, width: 34.23, height: 19.28 },
  { kind: 'cell', text: '', top: 45.81, left: 58.97, width: 34.64, height: 8.1 },
  { kind: 'cell', text: '', top: 53.72, left: 59.1, width: 34.51, height: 28.14 },
  { kind: 'cell', diagonal: 'bltr', top: 81.57, left: 59.24, width: 34.37, height: 10.41 },
  // ── 会社情報ヘッダー（左） ──
  { kind: 'label', text: '会 社 名', top: 8.61, left: 8.23, width: 13.09, height: 5.2 },
  { kind: 'label', text: '代 表 者 氏 名', top: 13.72, left: 8.23, width: 12.96, height: 3.47 },
  { kind: 'label', text: '課 税 時 期', top: 16.9, left: 8.1, width: 13.09, height: 5.2, fontSize: 9 },
  { kind: 'label', text: '直 前 期', top: 21.81, left: 8.1, width: 13.23, height: 5.11, fontSize: 9 },
  { field: 'f12', kind: 'input', top: 8.61, left: 21.05, width: 29.87, height: 5.2, align: 'left' },
  { field: 'f13', kind: 'input', top: 13.72, left: 20.92, width: 29.87, height: 3.47, align: 'left' },
  { field: 'f14', kind: 'input', date: true, top: 17.09, left: 21.05, width: 29.87, height: 5.01 },
  { field: 'f15', kind: 'input', dateRange: true, top: 22.01, left: 20.92, width: 29.87, height: 4.92 },
  // ── 会社情報ヘッダー（右：本店所在地・事業内容） ──
  { kind: 'label', text: '本店の所在地', top: 8.61, left: 50.65, width: 8.86, height: 5.2 },
  { kind: 'label', text: '事　業\n内　容', top: 13.81, left: 50.65, width: 8.86, height: 13.01 },
  { field: 'f18', kind: 'input', top: 8.42, left: 59.51, width: 34.1, height: 5.49, align: 'left' },
  { kind: 'label', text: '取扱品目及び製造、卸売、\n小売等の区分', top: 13.72, left: 59.24, width: 18.28, height: 3.47 },
  { kind: 'label', text: '業 種 目番号', top: 13.81, left: 77.38, width: 7.64, height: 3.28 },
  { kind: 'label', text: '取引金額の\n構成比', top: 13.72, left: 84.88, width: 8.59, height: 3.28 },
  { field: 'f22', kind: 'input', top: 17.09, left: 59.24, width: 18.28, height: 2.6, align: 'left' },
  { field: 'f23', kind: 'input', integerDigits: 3, top: 17, left: 77.24, width: 7.77, height: 2.6 },
  { field: 'f24', kind: 'input', rightLabel: '％', top: 17, left: 84.74, width: 8.73, height: 2.6 },
  { field: 'f25', kind: 'input', top: 19.6, left: 59.38, width: 18.14, height: 2.41, align: 'left' },
  { field: 'f26', kind: 'input', integerDigits: 3, top: 19.5, left: 77.38, width: 7.64, height: 2.51 },
  { field: 'f27', kind: 'input', rightLabel: '％', top: 19.4, left: 84.74, width: 8.86, height: 2.7 },
  { field: 'f28', kind: 'input', top: 22.01, left: 59.38, width: 18.14, height: 2.51, align: 'left' },
  { field: 'f29', kind: 'input', integerDigits: 3, top: 21.91, left: 77.24, width: 7.77, height: 2.6 },
  { field: 'f30', kind: 'input', rightLabel: '％', top: 21.91, left: 85.02, width: 8.59, height: 2.51 },
  { field: 'f31', kind: 'input', top: 24.42, left: 59.24, width: 18.28, height: 2.41, align: 'left' },
  { field: 'f32', kind: 'input', integerDigits: 3, top: 24.42, left: 77.38, width: 7.64, height: 2.41 },
  { field: 'f33', kind: 'input', rightLabel: '％', top: 24.32, left: 84.88, width: 8.46, height: 2.6 },
  // ── 1. 株主及び評価方式の判定（株主テーブル） ──
  { kind: 'label', text: '１．株主及び評価方式の判定', top: 26.63, left: 8.1, width: 51.42, height: 4.05, align: 'left', fontSize: 10 },
  { kind: 'label', text: '判定要素（課税時期現在の株式等の所在状況）', top: 30.49, left: 8.1, width: 2.45, height: 61.4, align: 'center' },
  { kind: 'label', text: '氏名又は名称', top: 30.39, left: 10.14, width: 11.05, height: 3.76 },
  { kind: 'label', text: '続 柄', top: 30.49, left: 20.92, width: 4.91, height: 3.76 },
  { kind: 'label', text: '会社における 役 職 名', top: 30.39, left: 25.69, width: 7.91, height: 3.86 },
  { kind: 'label', text: '㋑株 式 数\n（株式の種類）', top: 30.39, left: 33.33, width: 9, height: 3.86 },
  { kind: 'label', text: '㋺議 決 権 数', top: 30.39, left: 42.19, width: 8.73, height: 3.86 },
  { kind: 'label', text: '㋩議決権割合\n( ㋺ /④)', top: 30.39, left: 50.78, width: 8.73, height: 3.76 },
  // 株主データ行（自動生成・1行目続柄=納税義務者）
  ...shareholderRows(),
  // 自己株式行
  { kind: 'label', text: '自己株式', top: 76.37, left: 10.28, width: 10.77, height: 3.47 },
  { kind: 'cell', diagonal: 'bltr', top: 76.46, left: 20.92, width: 5.18, height: 3.37 },
  { kind: 'cell', diagonal: 'bltr', top: 76.56, left: 25.83, width: 7.91, height: 3.28 },
  { field: 'f63', kind: 'input', commaInteger: true, top: 76.37, left: 33.46, width: 8.86, height: 3.47 },
  { kind: 'cell', diagonal: 'bltr', top: 76.46, left: 42.06, width: 8.86, height: 3.37 },
  { kind: 'cell', diagonal: 'bltr', top: 76.46, left: 50.65, width: 8.73, height: 3.28 },
  // 合計行（②⑤ / ③⑥ / ①④）
  { kind: 'label', text: '納税義務者の属する同族関係者グループの議決権の合計数', top: 79.64, left: 10.42, width: 23.32, height: 4.24 },
  { kind: 'cell', diagonal: 'bltr', top: 79.64, left: 33.33, width: 9, height: 4.24 },
  { field: '②', kind: 'input', commaInteger: true, readOnly: true, cornerLabel: '②', top: 79.64, left: 42.19, width: 8.59, height: 4.14 },
  { field: '⑤', kind: 'input', readOnly: true, cornerLabel: '⑤', topRightLabel: '（②/④）', top: 79.64, left: 50.65, width: 8.86, height: 4.24 },
  { kind: 'label', text: '筆頭株主グループの議決権の合計数', top: 83.79, left: 10.28, width: 23.32, height: 4.05 },
  { kind: 'cell', diagonal: 'bltr', top: 83.69, left: 33.33, width: 8.86, height: 4.05 },
  { field: '③', kind: 'input', commaInteger: true, cornerLabel: '③', top: 83.69, left: 42.19, width: 8.73, height: 4.14 },
  { field: '⑥', kind: 'input', readOnly: true, cornerLabel: '⑥', topRightLabel: '（③/④）', top: 83.69, left: 50.51, width: 8.86, height: 4.14 },
  { kind: 'label', text: '評価会社の発行済株式又は議決権の総数', top: 87.64, left: 10.28, width: 23.32, height: 4.14 },
  { field: '①', kind: 'input', commaInteger: true, cornerLabel: '①', top: 87.64, left: 33.33, width: 9.14, height: 4.14 },
  { field: '④', kind: 'input', commaInteger: true, cornerLabel: '④', top: 87.74, left: 42.19, width: 8.59, height: 4.05 },
  { kind: 'label', text: '100', top: 87.64, left: 50.65, width: 8.59, height: 4.14 },
  // ── 判定基準・判定マトリクス（右上） ──
  { kind: 'label', text: '判定基準', top: 26.83, left: 59.38, width: 1.77, height: 19.08, align: 'center' },
  { kind: 'label', text: '納税義務者の属する同族関係者グループの議決権割合\n（⑤の割合）を基として、区分します。', top: 26.92, left: 60.88, width: 32.87, height: 3.66, align: 'left', fontSize: 7.5 },
  { kind: 'label', text: '区分', top: 30.49, left: 60.88, width: 1.5, height: 7.81, align: 'center' },
  { kind: 'label', text: '筆頭株主グループの議決権割合（⑥の割合）', top: 30.49, left: 62.38, width: 22.78, height: 3.76 },
  { kind: 'label', text: '５０％超の\n場合', highlightWhen: (g) => g('⑥') !== '' && Number(g('⑥')) > 50, top: 33.96, left: 62.38, width: 7.77, height: 4.24 },
  { kind: 'label', text: '３０%以上５０%以 下 の 場 合', highlightWhen: (g) => g('⑥') !== '' && Number(g('⑥')) >= 30 && Number(g('⑥')) <= 50, top: 33.96, left: 69.88, width: 7.64, height: 4.24 },
  { kind: 'label', text: '３０％未満の場 合', highlightWhen: (g) => g('⑥') !== '' && Number(g('⑥')) < 30, top: 33.96, left: 77.38, width: 7.77, height: 4.24 },
  { kind: 'label', text: '株主の区分', top: 30.39, left: 84.88, width: 8.59, height: 7.81 },
  { kind: 'label', text: '⑤の割合', top: 38.01, left: 60.88, width: 1.64, height: 8, align: 'center' },
  // 同族株主等の行：列ごとに「⑥の区分」かつ「⑤≥列の閾値」のときハイライト
  { kind: 'label', text: '５０％超', highlightWhen: dozokuMatch(50), top: 38.1, left: 62.38, width: 7.64, height: 4.05 },
  { kind: 'label', text: '３０％以上', highlightWhen: dozokuMatch(30), top: 38.01, left: 69.88, width: 7.64, height: 4.05 },
  { kind: 'label', text: '１５％以上', highlightWhen: dozokuMatch(15), top: 37.91, left: 77.38, width: 7.64, height: 4.24 },
  { kind: 'label', text: ' 同族株主等', highlightWhen: isDozokuJudge, top: 38.01, left: 84.88, width: 8.59, height: 4.05 },
  // 同族株主等以外の行：⑤<列の閾値のときハイライト
  { kind: 'label', text: '５０％未満', highlightWhen: nonDozokuMatch(50), top: 41.86, left: 62.38, width: 7.77, height: 4.14 },
  { kind: 'label', text: '３０％未満', highlightWhen: nonDozokuMatch(30), top: 41.96, left: 69.88, width: 7.64, height: 4.05 },
  { kind: 'label', text: '１５％未満', highlightWhen: nonDozokuMatch(15), top: 42.06, left: 77.24, width: 7.77, height: 3.86 },
  { kind: 'label', text: '同族株主等\n以外の株主', highlightWhen: isNonDozokuJudge, top: 41.96, left: 84.88, width: 8.59, height: 4.05 },
  { kind: 'label', text: '判定', top: 45.91, left: 59.38, width: 1.64, height: 7.9, align: 'center' },
  { kind: 'label', text: '同族株主等\n(原則的評価方式等)', highlightWhen: isDozokuJudge, top: 45.81, left: 60.88, width: 16.64, height: 4.24 },
  { kind: 'label', text: '同族株主等以外の株主\n（配当還元方式）', highlightWhen: isNonDozokuJudge, top: 45.81, left: 77.38, width: 16.09, height: 4.24 },
  { kind: 'label', text: '｢同族株主等に該当する納税義務者のうち、議決権割合( ㋩ の割合）が５％未満の者の評価方式は、「２．少数株式所有者の評価方式の判定」欄により判定します。', top: 49.77, left: 60.74, width: 32.87, height: 4.24, align: 'left' },
  // ── 2. 少数株式所有者の評価方式の判定（右下） ──
  { kind: 'label', text: '２．少数株式所有者の評価方式の判定', top: 53.72, left: 59.38, width: 34.23, height: 4.14, align: 'left', fontSize: 10 },
  { kind: 'label', text: '判定要素', top: 57.77, left: 59.24, width: 1.91, height: 20.43, align: 'center' },
  { kind: 'label', text: '項 目', top: 57.57, left: 60.74, width: 9.41, height: 4.14 },
  { kind: 'label', text: '判 定 内 容', top: 57.77, left: 70.01, width: 23.46, height: 3.95 },
  { kind: 'label', text: '氏 名', top: 61.52, left: 60.88, width: 9.14, height: 3.95 },
  { field: 'f6', kind: 'input', top: 61.52, left: 69.74, width: 23.87, height: 4.05 },
  { kind: 'label', text: '㊁役 員', top: 65.28, left: 60.88, width: 9.27, height: 4.05 },
  // セル内クリックで「である／でない」を選択（j_yakuin）。未選択時は役職名(sh_1_3)から自動判定を表示
  { kind: 'label', text: 'である（原則的評価方式等）', selectValue: { field: 'j_yakuin', value: 'yes' }, highlightWhen: (g) => effectiveOfficer(g) === true, top: 65.28, left: 69.88, width: 11.8, height: 3.95 },
  { kind: 'label', text: 'でない（次の㋭へ）', selectValue: { field: 'j_yakuin', value: 'no' }, highlightWhen: (g) => effectiveOfficer(g) === false, top: 65.28, left: 81.68, width: 11.79, height: 3.95 },
  { kind: 'label', text: '㋭納税義務者が\n中心的な同族株主', top: 69.33, left: 61.01, width: 9, height: 3.28 },
  // セル内クリックで「である／でない」を選択（j_chushin_self）
  { kind: 'label', text: 'である（原則的評価方式等）', selectValue: { field: 'j_chushin_self', value: 'yes' }, highlightWhen: (g) => g('j_chushin_self') === 'yes', top: 69.04, left: 69.88, width: 11.8, height: 3.76 },
  { kind: 'label', text: 'でない（次の㋬へ）', selectValue: { field: 'j_chushin_self', value: 'no' }, highlightWhen: (g) => g('j_chushin_self') === 'no', top: 69.04, left: 81.68, width: 11.79, height: 3.76 },
  { kind: 'label', text: '㋬納税義務者以外に中心的な同族株主（又は株主）', top: 72.42, left: 60.88, width: 9.27, height: 5.78 },
  // セル内クリックで「がいる／がいない」を選択（j_chushin_other）
  { kind: 'label', text: 'がいる（配当還元方式）', selectValue: { field: 'j_chushin_other', value: 'yes' }, highlightWhen: (g) => g('j_chushin_other') === 'yes', top: 72.51, left: 69.88, width: 11.8, height: 5.78 },
  { kind: 'label', text: 'がいない（原則的評価方式等）', selectValue: { field: 'j_chushin_other', value: 'no' }, highlightWhen: (g) => g('j_chushin_other') === 'no', top: 72.51, left: 81.68, width: 11.79, height: 5.78 },
  { kind: 'label', text: '判 定', top: 78.2, left: 59.38, width: 10.64, height: 3.57 },
  { kind: 'label', text: '原則的評価方式等', highlightWhen: shosuGensoku, top: 78.01, left: 70.01, width: 11.73, height: 3.86 },
  { kind: 'label', text: '配当還元方式', highlightWhen: shosuHaito, top: 78.01, left: 81.74, width: 11.73, height: 3.86 },
];

/** 第1表の1（CSSグリッド方式・完成版） */
export function Table1_1Grid({ getField, updateField }: TableProps) {
  const sumShareholderVotes = () => {
    let total = 0;
    for (let row = 1; row <= SH_ROWS; row++) {
      total += Number(getField(T, `sh_${row}_5`).replace(/,/g, '')) || 0;
    }
    return total > 0 ? String(total) : '';
  };

  const percentage = (numeratorField: string, denominatorField: string, roundUpOver50 = false) => {
    const numeratorRaw = numeratorField === '②' ? sumShareholderVotes() : getField(T, numeratorField);
    const denominator = Number(getField(T, denominatorField).replace(/,/g, ''));
    if (numeratorRaw === '' || denominator <= 0) return '';
    const raw = (Number(numeratorRaw.replace(/,/g, '')) / denominator) * 100;
    if (roundUpOver50 && raw > 50 && raw < 51) return '51';
    return String(Math.floor(raw));
  };

  const g = (f: string) => {
    const ratioMatch = /^sh_(\d+)_6$/.exec(f);
    if (ratioMatch) return percentage(`sh_${ratioMatch[1]}_5`, '④');
    if (f === '②') return sumShareholderVotes();
    if (f === '⑤') return percentage('②', '④', true);
    if (f === '⑥') return percentage('③', '④', true);
    return getField(T, f);
  };
  const u = (f: string, v: string) => updateField(T, f, v);

  // 2.少数株式所有者の評価方式の判定（役員・中心的同族株主の入力＋最終判定の表示）
  const judge = calcShareholderJudgment(getField);
  const officerText = judge.officer === null ? '役職名未選択' : judge.officer ? '役員に該当' : '役員に非該当';
  const finalText = judge.isDozokuFinal === null ? '判定不能（要素未入力）' : judge.isDozokuFinal ? '原則的評価方式等' : '配当還元方式';
  const toolbar = (
    <span className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, whiteSpace: 'nowrap', flexWrap: 'wrap' }}>
      <span style={{ fontWeight: 700 }}>2.少数株式判定</span>
      <span style={{ opacity: judge.shosuApplies ? 1 : 0.5 }}>㊁役員：<b>{officerText}</b>（役職名と連動・㊁㋭㋬は表内で選択）</span>
      {!judge.shosuApplies && <span style={{ color: '#777' }}>※区分2は同族株主等かつ納税義務者の議決権割合5%未満のとき適用</span>}
      <span style={{ fontWeight: 700, color: judge.isDozokuFinal === false ? '#b45309' : '#2e7d32' }}>最終判定：{finalText}</span>
    </span>
  );
  return <GridForm cells={CELLS} g={g} u={u} formId={T} width="100%" title="第１表の１　評価上の株主の判定及び会社規模の判定の明細書" toolbar={toolbar} references={REFERENCES} />;
}
