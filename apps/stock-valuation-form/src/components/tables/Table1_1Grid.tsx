import { useCallback } from 'react';
import { GridForm, type GridCell } from '@/components/ui/GridForm';
import { companyFloatBox } from './companyFloatHeader';
import type { TableProps } from '@/types/form';

const T = 'table1_1' as const;

// ══ 令和8年4月1日以降用の様式 ══
// ・株主は1人あたり2行（上段: 氏名/役職名/㋑株式数/㋺未分割株式数、下段: 続柄/株式の種類/㋩議決権数/㋥議決権割合）
// ・円数字の割当が変更: ①同族G議決権数(自動) ②=①/⑥ ③筆頭G議決権数 ④=③/⑥ ⑤発行済株式数 ⑥議決権の総数
//   （旧様式の ①発行済株式→⑤、④議決権総数→⑥。判定の分母は⑥）
// ・「２．少数株式所有者の評価方式の判定」は第１表の２へ移動（j_* フィールドは table1_2 に保存）
// ・様式の識別コード（E01/G04等）は様式どおり独立した小セル（kind:'cell'+codeLabel）で再現。
//   コード選択は記入枠のプルダウン（compactSelectedOption=閉時はコードのみ表示）、
//   判定基準・判定の「１」記入枠は該当時に「１」を自動表示（JUDGE_FLAGS、保存しない導出値）
// ・続柄コード(sh_r_2k)/役職コード(sh_r_3k)＝コード欄のプルダウンで「コード：名称」を選択（記載要領⑵⑶の対応表）
//   → 続柄(sh_r_2)/役職名(sh_r_3)欄は標準名称の自動表示で入力不可。「その他」（続柄18/役職16）のときのみ
//   具体名を手入力可（readOnlyWhen）。旧データ（名称のみ保存）からもコードを導出する後方互換つき。
//   コード選び直し時は名称の手入力をクリア。株式種類コード（記載要領⑷）＝sh_r_9 に 1/2 を選択（普通株式のみは省略可）

// ── 株主テーブルの繰り返し行 ──
const SH_ROWS = 5;  // 本表の株主数（1人=2行）
const CONT_SH = 13; // 続紙1ページあたりの株主数（令和8年様式 第1表の1続）
const MAX_SH_PAGES = 1; // 続紙は1枚まで（＝株主 最大18名）
/** 続紙ページ数（_shpages。0=本表のみ） */
const shPageCountOf = (getField: TableProps['getField']) => Math.max(0, Number(getField('table1_1', '_shpages')) || 0);
/** 総株主数（本表5＋続紙13×ページ） */
const totalShOf = (getField: TableProps['getField']) => SH_ROWS + CONT_SH * shPageCountOf(getField);
// 罫線検出による行上端%（ヘッダー2行の後、データ10行＋自己株式行）
const ROW_TOPS = [40.88, 43.48, 46.07, 48.66, 51.25, 53.85, 56.44, 59.03, 61.62, 64.22, 66.81] as const;
const SH_REORDER_FIELDS = ['1', '2', '2k', '3', '3k', '4', '5', '7', '8', '9'] as const;
const SH_DRAG_HANDLE_WIDTH = 2.4;

// ── 列座標（%・様式の罫線位置） ──
const X = {
  name: 12.25, nameEnd: 34.0,           // 氏名又は名称（上段。左端1.81%はE番号セル）
  eCode: 12.25, eCodeEnd: 14.06,        // E番号（氏名）／G番号（続柄コード）の印字セル
  relBox: 14.06, relBoxEnd: 17.69,      // 続柄コードの記入枠（＝コード選択）
  relECode: 17.69, relECodeEnd: 19.5,   // E番号（続柄）の印字セル
  rel: 19.5, relEnd: 34.0,              // 続柄（下段）
  gCode: 34.0, gCodeEnd: 35.82,         // G番号（役職コード／株式種類コード）の印字セル
  codeBox: 35.82, codeBoxEnd: 39.44,    // 役職コード／株式種類コードの記入枠（＝コード選択）
  roleECode: 39.44, roleECodeEnd: 41.26,// E番号（役職名／株式の種類）の印字セル
  role: 41.26, roleEnd: 59.39,          // 会社における役職名（上段）／株式の種類（下段）
  numCode1: 59.39, numCode1End: 61.2,   // G番号（㋑株式数／㋩議決権数）の印字セル
  num1: 61.2, num1End: 73.89,           // ㋑株式数／㋩議決権数
  numCode2: 73.89, numCode2End: 75.71,  // G番号（㋺未分割／㋥割合）の印字セル
  num2: 75.71, num2End: 88.48,          // ㋺未分割株式数／㋥議決権割合
} as const;

// ── 役職コード（記載要領⑶の次表・令和8年4月1日以降用） ──
// コード欄のプルダウンで「コード：役職名」を選択→役職名欄にその名称を自動表示（手入力で上書き可）。
// 複数該当時は小さい方の番号を採る定め（例: 代表取締役社長→1）のため、選択肢はコード昇順。
// コード16（その他）は具体的な役職名を役職名欄に記載する。
const ROLE_LIST = [
  { code: 1, name: '社長' },
  { code: 2, name: '理事長' },
  { code: 3, name: '代表取締役' },
  { code: 4, name: '代表執行役' },
  { code: 5, name: '代表理事' },
  { code: 6, name: '清算人' },
  { code: 7, name: '副社長' },
  { code: 8, name: '専務' },
  { code: 9, name: '専務理事' },
  { code: 10, name: '常務' },
  { code: 11, name: '常務理事' },
  { code: 12, name: '副社長・専務・常務に準ずる役員' },
  { code: 13, name: '取締役（指名委員会等・監査等委員）' },
  { code: 14, name: '会計参与' },
  { code: 15, name: '監査役並びに監事' },
  { code: 16, name: 'その他' },
] as const;
const ROLE_CODE_OPTIONS = ['', ...ROLE_LIST.map((r) => ({ value: String(r.code), label: `${r.code}：${r.name}` }))];
const roleNameOf = (code: string): string => ROLE_LIST.find((r) => String(r.code) === code)?.name ?? '';
// 旧選択肢（名称保存）→コードの後方互換対応表
const LEGACY_ROLE_CODES: Record<string, number> = {
  '社長': 1, '理事長': 2, '代表取締役': 3, '代表執行役': 4, '代表理事': 5, '清算人': 6,
  '副社長': 7, '専務': 8, '専務理事': 9, '常務': 10, '常務理事': 11,
  '副社長・専務・常務に準ずる職制上の地位を有する役員': 12, '副社長・専務・常務に準ずる役員': 12,
  '取締役（指名委員会等設置会社・監査等委員）': 13, '取締役（指名委員会等・監査等委員）': 13, '監査等委員である取締役': 13,
  '会計参与': 14, '監査役並びに監事': 15, '監査役・監事': 15,
  '取締役（平）': 16, '相談役・顧問': 16, '執行役員（使用人）': 16, '使用人・一般株主': 16, 'その他': 16,
};
/** 保存済みコード優先・なければ旧名称から導出した役職コード（''=不明） */
const effectiveRoleCode = (storedCode: string, storedName: string): string =>
  storedCode || (LEGACY_ROLE_CODES[storedName] !== undefined ? String(LEGACY_ROLE_CODES[storedName]) : '');
/**
 * 役職名から役員該当を判定（''=未選択→null）。
 * 役職コード1〜15＝通達188(2)の「役員」（法人税法施行令71①一・二・四）、16（その他）＝非該当。
 */
export const isOfficerRole = (role: string): boolean | null => {
  const code = effectiveRoleCode('', role);
  return code === '' ? null : Number(code) <= 15;
};

// ── 続柄コード（記載要領⑵の次表・令和8年4月1日以降用） ──
// コード欄のプルダウンで「コード：続柄」を選択→続柄欄にその続柄を自動表示（手入力で上書き可）。
// コード18（その他）は具体的な続柄を続柄欄に記載する。
const ZOKUGARA_LIST = [
  { code: 1, name: '配偶者' },
  { code: 2, name: '子' },
  { code: 3, name: '父' },
  { code: 4, name: '母' },
  { code: 5, name: '兄' },
  { code: 6, name: '弟' },
  { code: 7, name: '姉' },
  { code: 8, name: '妹' },
  { code: 9, name: '祖父' },
  { code: 10, name: '祖母' },
  { code: 11, name: '曾祖父' },
  { code: 12, name: '曾祖母' },
  { code: 13, name: '孫' },
  { code: 14, name: '曾孫' },
  { code: 15, name: '配偶者の父' },
  { code: 16, name: '配偶者の母' },
  { code: 17, name: '法人' },
  { code: 18, name: 'その他' },
] as const;
const ZOKUGARA_CODE_OPTIONS = ['', ...ZOKUGARA_LIST.map((z) => ({ value: String(z.code), label: `${z.code}：${z.name}` }))];
const zokugaraNameOf = (code: string): string => ZOKUGARA_LIST.find((z) => String(z.code) === code)?.name ?? '';
// 旧選択肢（名称保存）→コードの後方互換対応表
const LEGACY_ZOKUGARA_CODES: Record<string, number> = {
  '配偶者': 1, '子': 2, '父': 3, '母': 4, '兄': 5, '弟': 6, '姉': 7, '妹': 8, '祖父': 9, '祖母': 10,
  '曾祖父': 11, '曾祖母': 12, '孫': 13, '曾孫': 14, '配偶者の父': 15, '配偶者の母': 16, '法人': 17,
  '甥': 18, '姪': 18, '叔父': 18, '叔母': 18, 'いとこ': 18, 'その他': 18,
};
/** 保存済みコード優先・なければ旧名称から導出した続柄コード（''=不明） */
const effectiveZokugaraCode = (storedCode: string, storedName: string): string =>
  storedCode || (LEGACY_ZOKUGARA_CODES[storedName] !== undefined ? String(LEGACY_ZOKUGARA_CODES[storedName]) : '');

// ── 株式種類コード（記載要領⑷: 1=普通株式 / 2=普通株式以外。普通株式のみの会社は省略可） ──
const STOCK_TYPE_OPTIONS = ['', { value: '1', label: '1：普通株式' }, { value: '2', label: '2：普通株式以外' }];

// ── 判定マトリクスの自動ハイライト（②と④に基づく） ──
// ④列の区分: 50%超 / 30%以上50%以下 / 30%未満 → 各列での②の閾値は 50 / 30 / 15
const col4Threshold = (r4: number): 50 | 30 | 15 | null => (r4 > 50 ? 50 : r4 >= 30 ? 30 : r4 >= 0 ? 15 : null);
const r2r4 = (g: (f: string) => string): { r2: number; r4: number; valid: boolean } => {
  const s2 = g('②'), s4 = g('④');
  const r2 = Number(s2), r4 = Number(s4);
  return { r2, r4, valid: s2 !== '' && s4 !== '' && !isNaN(r2) && !isNaN(r4) };
};
// 同族株主等の各列（閾値）：その列が選択されていて、かつ②≥閾値
const dozokuMatch = (th: 50 | 30 | 15) => (g: (f: string) => string) => {
  const { r2, r4, valid } = r2r4(g);
  return valid && col4Threshold(r4) === th && r2 >= th;
};
// 同族株主等以外の各列：その列が選択されていて、かつ②<閾値
const nonDozokuMatch = (th: 50 | 30 | 15) => (g: (f: string) => string) => {
  const { r2, r4, valid } = r2r4(g);
  return valid && col4Threshold(r4) === th && r2 < th;
};
// 最終判定（行全体）
const isDozokuJudge = (g: (f: string) => string) => {
  const { r2, r4, valid } = r2r4(g);
  const th = col4Threshold(r4);
  return valid && th !== null && r2 >= th;
};
const isNonDozokuJudge = (g: (f: string) => string) => {
  const { r2, r4, valid } = r2r4(g);
  const th = col4Threshold(r4);
  return valid && th !== null && r2 < th;
};

// 様式の「１」記入枠（判定基準G44〜G49・株主の区分・判定G50/G51）: 該当時に「１」を自動表示する条件
const JUDGE_FLAGS: Record<string, (g: (f: string) => string) => boolean> = {
  b_G44: dozokuMatch(50), b_G46: dozokuMatch(30), b_G48: dozokuMatch(15),
  b_G45: nonDozokuMatch(50), b_G47: nonDozokuMatch(30), b_G49: nonDozokuMatch(15),
  bs_dozoku: isDozokuJudge, bs_hidozoku: isNonDozokuJudge,
  js_gensoku: isDozokuJudge, js_haito: isNonDozokuJudge,
};

/**
 * 第1表の1の株主判定（②④と同族株主等の判定。第3表の適用方式などから参照）。
 * 戻り値のプロパティ名は旧様式からの互換のため据え置き:
 *   ratio5=②の割合（同族関係者グループ） / ratio6=④の割合（筆頭株主グループ）
 * 少数株式所有者の判定（区分2）は新様式では第1表の2にあり、j_* は table1_2 から読む。
 */
export function calcShareholderJudgment(getField: TableProps['getField']) {
  const gf = (f: string) => getField('table1_1', f);
  const g2 = (f: string) => getField('table1_2', f);
  const n = (s: string) => Number(s.replace(/,/g, '')) || 0;
  let votes = 0;
  const totalSh = totalShOf(getField); // 本表＋続紙の全株主
  for (let r = 1; r <= totalSh; r++) votes += n(gf(`sh_${r}_5`));
  const denom = n(gf('⑥')); // 議決権の総数
  const pct = (v: number, has: boolean): number | null => {
    if (!has || denom <= 0) return null;
    const rawPct = (v / denom) * 100;
    if (rawPct > 50 && rawPct < 51) return 51; // 50%超51%未満は切り上げて51
    return Math.floor(rawPct);
  };
  const ratio5 = pct(votes, votes > 0);                 // ②の割合
  const ratio6 = pct(n(gf('③')), gf('③') !== '');      // ④の割合
  const th = ratio6 === null ? null : ratio6 > 50 ? 50 : ratio6 >= 30 ? 30 : 15;
  const isDozoku = ratio5 !== null && th !== null ? ratio5 >= th : null; // 1.株主及び評価方式の判定（議決権割合）

  // 2.少数株式所有者の評価方式の判定（通達188(2)(4)）※新様式では第1表の2の「2.」欄
  // 同族株主等に該当する納税義務者(1行目)のうち、議決権割合(㋥)が5%未満の者に適用
  const indivRatio = pct(n(gf('sh_1_5')), gf('sh_1_5') !== '');
  const shosuApplies = isDozoku === true && indivRatio !== null && indivRatio < 5;
  // ㋩役員: 第1表の2の手動選択(j_yakuin)優先・なければ役職コード(sh_1_3k、旧名称データからも導出)で判定
  // 役職コード1〜15＝通達188(2)の「役員」、16（その他）＝非該当
  const manualOfficer = g2('j_yakuin');
  const roleCodeVal = effectiveRoleCode(gf('sh_1_3k'), gf('sh_1_3'));
  const officer = manualOfficer === 'yes' ? true : manualOfficer === 'no' ? false : roleCodeVal === '' ? null : Number(roleCodeVal) <= 15;
  const chushinSelf = g2('j_chushin_self');    // 納税義務者が中心的な同族株主: yes→原則 / no→次へ
  const chushinOther = g2('j_chushin_other');  // 他に中心的な同族株主(株主): yes(がいる)→配当還元 / no(がいない)→原則
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

// ── 和暦日付の4列プルダウン（元号｜年｜月｜日を様式の列に合わせて分割） ──
// 保存キーは従来の複合入力と同じ `${prefix}_g/_y/_m/_d`（元号未選択は令和扱い）
const numOptions = (n: number) => ['', ...Array.from({ length: n }, (_, i) => String(i + 1))];
const ERA_OPTS = ['令和', '平成'];
const YEAR_OPTS = numOptions(64);
const MONTH_OPTS = numOptions(12);
const DAY_OPTS = numOptions(31);
const DATE_COLS = [
  { suffix: '_g', left: 19.5, width: 5.44, options: ERA_OPTS },
  { suffix: '_y', left: 24.94, width: 5.44, options: YEAR_OPTS },
  { suffix: '_m', left: 30.38, width: 5.44, options: MONTH_OPTS },
  { suffix: '_d', left: 35.82, width: 5.44, options: DAY_OPTS },
] as const;

function dateSelectCells(prefix: string, top: number, height: number, code: string): GridCell[] {
  return [
    // N番号の印字セル（様式では元号列の左端）
    { kind: 'cell' as const, codeLabel: code, top, left: 17.69, width: 1.81, height },
    ...DATE_COLS.map((col) => ({
      field: `${prefix}${col.suffix}`,
      kind: 'input' as const,
      options: [...col.options],
      top,
      left: col.left,
      width: col.width,
      height,
    })),
  ];
}

// 株主行の様式識別コード（roleCode=役職コード欄、relCode=続柄コード欄、typeCode=株式種類コード欄）
const SH_CODES = [
  { name: 'E05', roleCode: 'G04', roleName: 'E06', shares: 'G06', undiv: 'G07', relCode: '', relName: '', typeCode: 'G05', typeName: 'E07', votes: 'G08', ratio: 'G09' },
  { name: 'E08', roleCode: 'G11', roleName: 'E10', shares: 'G13', undiv: 'G14', relCode: 'G10', relName: 'E09', typeCode: 'G12', typeName: 'E11', votes: 'G15', ratio: 'G16' },
  { name: 'E12', roleCode: 'G18', roleName: 'E14', shares: 'G20', undiv: 'G21', relCode: 'G17', relName: 'E13', typeCode: 'G19', typeName: 'E15', votes: 'G22', ratio: 'G23' },
  { name: 'E16', roleCode: 'G25', roleName: 'E18', shares: 'G27', undiv: 'G28', relCode: 'G24', relName: 'E17', typeCode: 'G26', typeName: 'E19', votes: 'G29', ratio: 'G30' },
  { name: 'E20', roleCode: 'G32', roleName: 'E22', shares: 'G34', undiv: 'G35', relCode: 'G31', relName: 'E21', typeCode: 'G33', typeName: 'E23', votes: 'G36', ratio: 'G37' },
] as const;

/** 株主データ行（1人=2行×5人）を自動生成 */
function shareholderRows(): GridCell[] {
  const out: GridCell[] = [];
  for (let r = 1; r <= SH_ROWS; r++) {
    const topA = ROW_TOPS[(r - 1) * 2]!;
    const topB = ROW_TOPS[(r - 1) * 2 + 1]!;
    const hA = +(topB - topA).toFixed(2);
    const hB = +(ROW_TOPS[(r - 1) * 2 + 2]! - topB).toFixed(2);
    const hasHandle = r > 1;
    const nameLeft = hasHandle ? +(X.eCodeEnd + SH_DRAG_HANDLE_WIDTH).toFixed(2) : X.eCodeEnd;
    const nameWidth = +(X.nameEnd - nameLeft).toFixed(2);
    const codes = SH_CODES[r - 1]!;
    // 上段: [E番号][氏名] [G番号][役職コード選択][E番号][役職名(自動表示)] [G番号][㋑株式数] [G番号][㋺未分割株式数]
    out.push({ kind: 'cell', codeLabel: codes.name, top: topA, left: X.eCode, width: +(X.eCodeEnd - X.eCode).toFixed(2), height: hA });
    out.push({ field: `sh_${r}_1`, kind: 'input', ariaLabel: `株主${r}の氏名又は名称`, top: topA, left: nameLeft, width: nameWidth, height: hA, align: 'left' });
    out.push({ kind: 'cell', codeLabel: codes.roleCode, top: topA, left: X.gCode, width: +(X.gCodeEnd - X.gCode).toFixed(2), height: hA });
    out.push({ field: `sh_${r}_3k`, kind: 'input', options: [...ROLE_CODE_OPTIONS], compactSelectedOption: true, ariaLabel: `株主${r}の役職コード`, top: topA, left: X.codeBox, width: +(X.codeBoxEnd - X.codeBox).toFixed(2), height: hA });
    out.push({ kind: 'cell', codeLabel: codes.roleName, top: topA, left: X.roleECode, width: +(X.roleECodeEnd - X.roleECode).toFixed(2), height: hA });
    out.push({ field: `sh_${r}_3`, kind: 'input', readOnlyWhen: (g) => g(`sh_${r}_3k`) !== '16', ariaLabel: `株主${r}の会社における役職名（役職コードから自動表示。16：その他のときのみ入力可）`, top: topA, left: X.role, width: +(X.roleEnd - X.role).toFixed(2), height: hA, align: 'left' });
    out.push({ kind: 'cell', codeLabel: codes.shares, top: topA, left: X.numCode1, width: +(X.numCode1End - X.numCode1).toFixed(2), height: hA });
    out.push({ field: `sh_${r}_4`, kind: 'input', commaInteger: true, top: topA, left: X.num1, width: +(X.num1End - X.num1).toFixed(2), height: hA, align: 'right' });
    out.push({ kind: 'cell', codeLabel: codes.undiv, top: topA, left: X.numCode2, width: +(X.numCode2End - X.numCode2).toFixed(2), height: hA });
    out.push({ field: `sh_${r}_7`, kind: 'input', commaInteger: true, top: topA, left: X.num2, width: +(X.num2End - X.num2).toFixed(2), height: hA, align: 'right' });
    // 下段: [G番号][続柄コード選択][E番号][続柄(自動表示)]（1行目=納税義務者固定） [G番号][株式種類コード選択][E番号][株式の種類] [G番号][㋩議決権数] [G番号][㋥割合(自動)]
    if (r === 1) {
      out.push({ kind: 'label', text: '納税義務者', top: topB, left: X.name, width: +(X.nameEnd - X.name).toFixed(2), height: hB });
    } else {
      out.push({ kind: 'cell', codeLabel: codes.relCode, top: topB, left: X.eCode, width: +(X.eCodeEnd - X.eCode).toFixed(2), height: hB });
      out.push({ field: `sh_${r}_2k`, kind: 'input', options: [...ZOKUGARA_CODE_OPTIONS], compactSelectedOption: true, ariaLabel: `株主${r}の続柄コード`, top: topB, left: X.relBox, width: +(X.relBoxEnd - X.relBox).toFixed(2), height: hB });
      out.push({ kind: 'cell', codeLabel: codes.relName, top: topB, left: X.relECode, width: +(X.relECodeEnd - X.relECode).toFixed(2), height: hB });
      out.push({ field: `sh_${r}_2`, kind: 'input', readOnlyWhen: (g) => g(`sh_${r}_2k`) !== '18', ariaLabel: `株主${r}の続柄（続柄コードから自動表示。18：その他のときのみ入力可）`, top: topB, left: X.rel, width: +(X.relEnd - X.rel).toFixed(2), height: hB, align: 'left' });
    }
    out.push({ kind: 'cell', codeLabel: codes.typeCode, top: topB, left: X.gCode, width: +(X.gCodeEnd - X.gCode).toFixed(2), height: hB });
    out.push({ field: `sh_${r}_9`, kind: 'input', options: [...STOCK_TYPE_OPTIONS], compactSelectedOption: true, ariaLabel: `株主${r}の株式種類コード（1=普通株式、2=普通株式以外）`, top: topB, left: X.codeBox, width: +(X.codeBoxEnd - X.codeBox).toFixed(2), height: hB });
    out.push({ kind: 'cell', codeLabel: codes.typeName, top: topB, left: X.roleECode, width: +(X.roleECodeEnd - X.roleECode).toFixed(2), height: hB });
    out.push({ field: `sh_${r}_8`, kind: 'input', ariaLabel: `株主${r}の株式の種類`, top: topB, left: X.role, width: +(X.roleEnd - X.role).toFixed(2), height: hB, align: 'left' });
    out.push({ kind: 'cell', codeLabel: codes.votes, top: topB, left: X.numCode1, width: +(X.numCode1End - X.numCode1).toFixed(2), height: hB });
    out.push({ field: `sh_${r}_5`, kind: 'input', commaInteger: true, top: topB, left: X.num1, width: +(X.num1End - X.num1).toFixed(2), height: hB, align: 'right' });
    out.push({ kind: 'cell', codeLabel: codes.ratio, top: topB, left: X.numCode2, width: +(X.numCode2End - X.numCode2).toFixed(2), height: hB });
    out.push({ field: `sh_${r}_6`, kind: 'input', readOnly: true, top: topB, left: X.num2, width: +(X.num2End - X.num2).toFixed(2), height: hB, align: 'right' });
    // ドラッグハンドル（2人目以降・氏名行のE番号セル右隣）
    if (hasHandle) {
      out.push({
        kind: 'label',
        text: '≡',
        ariaLabel: `株主${r}（2行分）をドラッグして並び替え`,
        dragId: String(r),
        top: topA,
        left: X.eCodeEnd,
        width: SH_DRAG_HANDLE_WIDTH,
        height: hA,
        fontSize: 12,
        bold: true,
        noWrap: true,
      });
    }
  }
  return out;
}

/** 第1表の1のグリッドセル（令和8年4月1日以降用・罫線座標はPNGからの機械抽出） */
// 本表（会社名〜判定）のアスペクト比。氏名欄(y13.68)を外に出し会社名(y19.43)を上端にした分、
// 縦スケールを従来と同一に保つよう調整: 297 × (99.34-19.43)/(99.34-13.68) = 277.07
const MAIN_ASPECT = '210 / 277.07';

const CELLS: GridCell[] = [
  { kind: 'cell', semanticRole: 'group', groupBorder: false, ariaLabel: '会社情報', top: 19.43, left: 10.48, width: 78, height: 12.93 },
  { kind: 'cell', semanticRole: 'group', groupBorder: false, ariaLabel: '株主及び評価方式の判定', top: 32.36, left: 10.48, width: 78, height: 52.43 },
  { kind: 'cell', semanticRole: 'group', groupBorder: false, ariaLabel: '判定基準', top: 84.79, left: 10.48, width: 78, height: 9.23 },
  { kind: 'cell', semanticRole: 'group', groupBorder: false, ariaLabel: '判定', top: 94.02, left: 10.48, width: 78, height: 5.32 },
  // ── 会社情報ヘッダー ──（氏名欄は本表の外＝headerExtra の浮遊枠に分離）
  { kind: 'label', text: '会　社　名', top: 19.43, left: 10.48, width: 7.21, height: 2.56 },
  { kind: 'cell', codeLabel: 'E01', top: 19.43, left: 17.69, width: 1.81, height: 2.56 },
  { field: 'f12', kind: 'input', top: 19.43, left: 19.5, width: 18.13, height: 2.56, align: 'left' },
  { kind: 'label', text: '本　店　の\n所　在　地', top: 19.43, left: 37.63, width: 7.25, height: 2.56, fontSize: 8 },
  { kind: 'cell', codeLabel: 'H04', top: 19.43, left: 44.88, width: 1.82, height: 2.56 },
  { field: 'f18', kind: 'input', top: 19.43, left: 46.7, width: 41.78, height: 2.56, align: 'left' },
  { kind: 'label', text: '代表者氏名', top: 21.99, left: 10.48, width: 7.21, height: 2.43 },
  { kind: 'cell', codeLabel: 'H07', top: 21.99, left: 17.69, width: 1.81, height: 2.43 },
  { field: 'f13', kind: 'input', top: 21.99, left: 19.5, width: 21.76, height: 2.43, align: 'left' },
  { kind: 'label', text: '課 税 時 期', top: 24.42, left: 10.48, width: 7.21, height: 3.33, fontSize: 9 },
  { kind: 'label', text: '元　号', top: 24.42, left: 17.69, width: 7.25, height: 0.99, fontSize: 7 },
  { kind: 'label', text: '年', top: 24.42, left: 24.94, width: 5.44, height: 0.99, fontSize: 7 },
  { kind: 'label', text: '月', top: 24.42, left: 30.38, width: 5.44, height: 0.99, fontSize: 7 },
  { kind: 'label', text: '日', top: 24.42, left: 35.82, width: 5.44, height: 0.99, fontSize: 7 },
  ...dateSelectCells('f14', 25.41, 2.34, 'N01'),
  { kind: 'label', text: '直\n前\n期', top: 27.75, left: 10.48, width: 3.58, height: 4.61, fontSize: 9 },
  { kind: 'label', text: '自', top: 27.75, left: 14.06, width: 3.63, height: 2.36 },
  ...dateSelectCells('f15_from', 27.75, 2.36, 'N02'),
  { kind: 'label', text: '至', top: 30.11, left: 14.06, width: 3.63, height: 2.25 },
  ...dateSelectCells('f15_to', 30.11, 2.25, 'N03'),
  { kind: 'label', text: '事　業\n内　容', top: 21.99, left: 41.26, width: 3.62, height: 10.37 },
  { kind: 'label', text: '取扱品目及び製造、卸売、\n小売等の区分', top: 21.99, left: 44.88, width: 21.76, height: 3.42 },
  { kind: 'label', text: '業　種　目\n番　　　号', top: 21.99, left: 66.64, width: 14.5, height: 3.42 },
  { kind: 'label', text: '取引金額の\n構成比', bottomLabel: '（％）', bottomLabelAlign: 'right', top: 21.99, left: 81.14, width: 7.34, height: 3.42, fontSize: 7.5 },
  { kind: 'cell', codeLabel: 'E02', top: 25.41, left: 44.88, width: 1.82, height: 2.34 },
  { field: 'f22', kind: 'input', top: 25.41, left: 46.7, width: 19.94, height: 2.34, align: 'left' },
  { kind: 'cell', codeLabel: 'G01', top: 25.41, left: 66.64, width: 1.81, height: 2.34 },
  { field: 'f23', kind: 'input', integerDigits: 4, top: 25.41, left: 68.45, width: 12.69, height: 2.34 },
  { kind: 'cell', codeLabel: 'C01', top: 25.41, left: 81.14, width: 1.82, height: 2.34 },
  { field: 'f24', kind: 'input', top: 25.41, left: 82.96, width: 5.52, height: 2.34 },
  { kind: 'cell', codeLabel: 'E03', top: 27.75, left: 44.88, width: 1.82, height: 2.36 },
  { field: 'f25', kind: 'input', top: 27.75, left: 46.7, width: 19.94, height: 2.36, align: 'left' },
  { kind: 'cell', codeLabel: 'G02', top: 27.75, left: 66.64, width: 1.81, height: 2.36 },
  { field: 'f26', kind: 'input', integerDigits: 4, top: 27.75, left: 68.45, width: 12.69, height: 2.36 },
  { kind: 'cell', codeLabel: 'C02', top: 27.75, left: 81.14, width: 1.82, height: 2.36 },
  { field: 'f27', kind: 'input', top: 27.75, left: 82.96, width: 5.52, height: 2.36 },
  { kind: 'cell', codeLabel: 'E04', top: 30.11, left: 44.88, width: 1.82, height: 2.25 },
  { field: 'f28', kind: 'input', top: 30.11, left: 46.7, width: 19.94, height: 2.25, align: 'left' },
  { kind: 'cell', codeLabel: 'G03', top: 30.11, left: 66.64, width: 1.81, height: 2.25 },
  { field: 'f29', kind: 'input', integerDigits: 4, top: 30.11, left: 68.45, width: 12.69, height: 2.25 },
  { kind: 'cell', codeLabel: 'C03', top: 30.11, left: 81.14, width: 1.82, height: 2.25 },
  { field: 'f30', kind: 'input', top: 30.11, left: 82.96, width: 5.52, height: 2.25 },
  // ── 1. 株主及び評価方式の判定 ──
  { kind: 'label', text: '１．株主及び評価方式の判定\n※　「判定基準」及び「判定」欄については、当てはまる項目の空欄に「１」を記入してください。', semanticRole: 'columnheader', ariaLabel: '株主及び評価方式の判定', top: 32.36, left: 10.48, width: 78, height: 3.42, align: 'left', fontSize: 8.5 },
  { kind: 'label', text: '判定要素（課税時期現在の株式等の所有状況）', top: 35.78, left: 10.48, width: 1.77, height: 49.01, align: 'center' },
  // 株主テーブル ヘッダー（上段/下段）
  { kind: 'label', text: '氏 名 又 は 名 称', top: 35.78, left: X.name, width: 21.75, height: 2.54 },
  { kind: 'label', text: '役　職\nコード', top: 35.78, left: X.gCode, width: 7.26, height: 2.54, fontSize: 7.5 },
  { kind: 'label', text: '会社における役職名', top: 35.78, left: X.role, width: 18.13, height: 2.54 },
  { kind: 'label', text: '㋑　株 式 数', bottomLabel: '（株）', bottomLabelAlign: 'right', top: 35.78, left: X.numCode1, width: 14.5, height: 2.54 },
  { kind: 'label', text: '㋺　未分割の株式の\n株 式 数', bottomLabel: '（株）', bottomLabelAlign: 'right', top: 35.78, left: X.numCode2, width: 14.59, height: 2.54, fontSize: 7.5 },
  { kind: 'label', text: '続　柄\nコード', top: 38.32, left: X.eCode, width: 7.25, height: 2.56, fontSize: 7.5 },
  { kind: 'label', text: '続　　　柄', top: 38.32, left: X.rel, width: 14.5, height: 2.56 },
  { kind: 'label', text: '株式種類\nコード', top: 38.32, left: X.gCode, width: 7.26, height: 2.56, fontSize: 7.5 },
  { kind: 'label', text: '株 式 の 種 類', top: 38.32, left: X.role, width: 18.13, height: 2.56 },
  { kind: 'label', text: '㋩　議 決 権 数', bottomLabel: '（個）', bottomLabelAlign: 'right', top: 38.32, left: X.numCode1, width: 14.5, height: 2.56 },
  { kind: 'label', text: '㋥　議決権割合\n（㋩/⑥）', bottomLabel: '（％）', bottomLabelAlign: 'right', top: 38.32, left: X.numCode2, width: 14.59, height: 2.56, fontSize: 7.5 },
  // 株主データ行（自動生成・1人=2行）
  ...shareholderRows(),
  // 自己株式行
  { kind: 'label', text: '自己株式の株式数', top: 66.81, left: X.name, width: 21.75, height: 2.59 },
  { kind: 'cell', diagonal: 'bltr', top: 66.81, left: X.gCode, width: 25.39, height: 2.59 },
  { kind: 'cell', codeLabel: 'G38', top: 66.81, left: X.numCode1, width: 1.81, height: 2.59 },
  { field: 'f63', kind: 'input', commaInteger: true, top: 66.81, left: X.num1, width: 12.69, height: 2.59 },
  { kind: 'cell', diagonal: 'bltr', top: 66.81, left: X.numCode2, width: 14.59, height: 2.59 },
  // 合計ブロック（①②/③④/⑤⑥）
  { kind: 'label', text: '納税義務者の属する同族関係者グループの議決権の合計数', top: 69.4, left: X.name, width: 47.14, height: 4.05 },
  { kind: 'label', text: '①　議 決 権 数', top: 69.4, left: X.numCode1, width: 14.5, height: 1.45, fontSize: 7.5 },
  { kind: 'cell', codeLabel: 'G39', top: 70.85, left: X.numCode1, width: 1.81, height: 2.6 },
  { field: '①', kind: 'input', commaInteger: true, readOnly: true, top: 70.85, left: X.num1, width: 12.69, height: 2.6 },
  { kind: 'label', text: '②　議決権割合（①/⑥）', top: 69.4, left: X.numCode2, width: 14.59, height: 1.45, fontSize: 7.5 },
  { kind: 'cell', codeLabel: 'G40', top: 70.85, left: X.numCode2, width: 1.82, height: 2.6 },
  { field: '②', kind: 'input', readOnly: true, top: 70.85, left: X.num2, width: 12.77, height: 2.6 },
  { kind: 'label', text: '筆頭株主グループの議決権の合計数', top: 73.45, left: X.name, width: 47.14, height: 4.07 },
  { kind: 'label', text: '③　議 決 権 数', top: 73.45, left: X.numCode1, width: 14.5, height: 1.48, fontSize: 7.5 },
  { kind: 'cell', codeLabel: 'G41', top: 74.93, left: X.numCode1, width: 1.81, height: 2.59 },
  { field: '③', kind: 'input', commaInteger: true, top: 74.93, left: X.num1, width: 12.69, height: 2.59 },
  { kind: 'label', text: '④　議決権割合（③/⑥）', top: 73.45, left: X.numCode2, width: 14.59, height: 1.48, fontSize: 7.5 },
  { kind: 'cell', codeLabel: 'G42', top: 74.93, left: X.numCode2, width: 1.82, height: 2.59 },
  { field: '④', kind: 'input', readOnly: true, top: 74.93, left: X.num2, width: 12.77, height: 2.59 },
  { kind: 'label', text: '評 価 会 社 の 発 行 済 株 式 又 は 議 決 権 の 総 数', top: 77.52, left: X.name, width: 47.14, height: 7.27 },
  { kind: 'label', text: '⑤　発行済株式数', top: 77.52, left: X.numCode1, width: 14.5, height: 1.03, fontSize: 7.5 },
  { kind: 'cell', codeLabel: 'G43', top: 78.55, left: X.numCode1, width: 1.81, height: 2.59 },
  { field: '⑤', kind: 'input', commaInteger: true, top: 78.55, left: X.num1, width: 12.69, height: 2.59 },
  { kind: 'cell', diagonal: 'bltr', top: 77.52, left: X.numCode2, width: 14.59, height: 3.62 },
  { kind: 'label', text: '⑥　議決権の総数', top: 81.14, left: X.numCode1, width: 14.5, height: 1.05, fontSize: 7.5 },
  { kind: 'cell', codeLabel: 'C04', top: 82.19, left: X.numCode1, width: 1.81, height: 2.6 },
  { field: '⑥', kind: 'input', commaInteger: true, top: 82.19, left: X.num1, width: 12.69, height: 2.6 },
  { kind: 'label', text: '議 決 権 割 合', top: 81.14, left: X.numCode2, width: 14.59, height: 1.05, fontSize: 7.5 },
  { kind: 'label', text: '100', top: 82.19, left: X.numCode2, width: 14.59, height: 2.6 },
  // ── 判定基準 ──
  { kind: 'label', text: '判定基準', semanticRole: 'columnheader', ariaLabel: '判定基準', top: 84.79, left: 10.48, width: 1.77, height: 9.23, align: 'center' },
  { kind: 'label', text: '納税義務者の属する同族関係者グループの議決権割合（②の割合）を基として、区分します。', top: 84.79, left: X.name, width: 76.23, height: 1.51, align: 'left', fontSize: 7.5 },
  { kind: 'label', text: '区\n分', top: 86.3, left: X.name, width: 5.44, height: 3.02 },
  { kind: 'label', text: '筆 頭 株 主 グ ル ー プ の 議 決 権 割 合（ ④ の 割 合 ）', top: 86.3, left: 17.69, width: 48.95, height: 1.51, fontSize: 7.5 },
  { kind: 'label', text: '50 ％ 超 の 場 合', highlightWhen: (g) => g('④') !== '' && Number(g('④')) > 50, top: 87.81, left: 17.69, width: 16.31, height: 1.51, fontSize: 7.5 },
  { kind: 'label', text: '30 ％以上 50 ％以下の場合', highlightWhen: (g) => g('④') !== '' && Number(g('④')) >= 30 && Number(g('④')) <= 50, top: 87.81, left: 34, width: 16.32, height: 1.51, fontSize: 7.5 },
  { kind: 'label', text: '30 ％ 未 満 の 場 合', highlightWhen: (g) => g('④') !== '' && Number(g('④')) < 30, top: 87.81, left: 50.32, width: 16.32, height: 1.51, fontSize: 7.5 },
  { kind: 'label', text: '株 主 の 区 分', top: 86.3, left: 66.64, width: 21.84, height: 3.02 },
  { kind: 'label', text: '②\nの\n割\n合', top: 89.32, left: X.name, width: 5.44, height: 4.7, fontSize: 8 },
  // 同族株主等の行：列ごとに「④の区分」かつ「②≥列の閾値」のときハイライト（該当時は記入枠に「１」を自動表示）
  { kind: 'cell', codeLabel: 'G44', top: 89.32, left: 17.69, width: 1.81, height: 2.33 },
  { field: 'b_G44', kind: 'input', readOnly: true, ariaLabel: '判定基準G44（該当時は１）', highlightWhen: dozokuMatch(50), top: 89.32, left: 19.5, width: 1.81, height: 2.33, align: 'center' },
  { kind: 'label', text: '50　％　超', highlightWhen: dozokuMatch(50), top: 89.32, left: 21.31, width: 12.69, height: 2.33 },
  { kind: 'cell', codeLabel: 'G46', top: 89.32, left: 34, width: 1.82, height: 2.33 },
  { field: 'b_G46', kind: 'input', readOnly: true, ariaLabel: '判定基準G46（該当時は１）', highlightWhen: dozokuMatch(30), top: 89.32, left: 35.82, width: 1.81, height: 2.33, align: 'center' },
  { kind: 'label', text: '30　％　以　上', highlightWhen: dozokuMatch(30), top: 89.32, left: 37.63, width: 12.69, height: 2.33 },
  { kind: 'cell', codeLabel: 'G48', top: 89.32, left: 50.32, width: 1.82, height: 2.33 },
  { field: 'b_G48', kind: 'input', readOnly: true, ariaLabel: '判定基準G48（該当時は１）', highlightWhen: dozokuMatch(15), top: 89.32, left: 52.14, width: 1.81, height: 2.33, align: 'center' },
  { kind: 'label', text: '15　％　以　上', highlightWhen: dozokuMatch(15), top: 89.32, left: 53.95, width: 12.69, height: 2.33 },
  { field: 'bs_dozoku', kind: 'input', readOnly: true, ariaLabel: '株主の区分：同族株主等（該当時は１）', highlightWhen: isDozokuJudge, top: 89.32, left: 66.64, width: 3.63, height: 2.33, align: 'center' },
  { kind: 'label', text: '同　族　株　主　等', highlightWhen: isDozokuJudge, top: 89.32, left: 70.27, width: 18.21, height: 2.33 },
  // 同族株主等以外の行：②<列の閾値のときハイライト
  { kind: 'cell', codeLabel: 'G45', top: 91.65, left: 17.69, width: 1.81, height: 2.37 },
  { field: 'b_G45', kind: 'input', readOnly: true, ariaLabel: '判定基準G45（該当時は１）', highlightWhen: nonDozokuMatch(50), top: 91.65, left: 19.5, width: 1.81, height: 2.37, align: 'center' },
  { kind: 'label', text: '50　％　未　満', highlightWhen: nonDozokuMatch(50), top: 91.65, left: 21.31, width: 12.69, height: 2.37 },
  { kind: 'cell', codeLabel: 'G47', top: 91.65, left: 34, width: 1.82, height: 2.37 },
  { field: 'b_G47', kind: 'input', readOnly: true, ariaLabel: '判定基準G47（該当時は１）', highlightWhen: nonDozokuMatch(30), top: 91.65, left: 35.82, width: 1.81, height: 2.37, align: 'center' },
  { kind: 'label', text: '30　％　未　満', highlightWhen: nonDozokuMatch(30), top: 91.65, left: 37.63, width: 12.69, height: 2.37 },
  { kind: 'cell', codeLabel: 'G49', top: 91.65, left: 50.32, width: 1.82, height: 2.37 },
  { field: 'b_G49', kind: 'input', readOnly: true, ariaLabel: '判定基準G49（該当時は１）', highlightWhen: nonDozokuMatch(15), top: 91.65, left: 52.14, width: 1.81, height: 2.37, align: 'center' },
  { kind: 'label', text: '15　％　未　満', highlightWhen: nonDozokuMatch(15), top: 91.65, left: 53.95, width: 12.69, height: 2.37 },
  { field: 'bs_hidozoku', kind: 'input', readOnly: true, ariaLabel: '株主の区分：同族株主等以外（該当時は１）', highlightWhen: isNonDozokuJudge, top: 91.65, left: 66.64, width: 3.63, height: 2.37, align: 'center' },
  { kind: 'label', text: '同族株主等以外の株主', highlightWhen: isNonDozokuJudge, top: 91.65, left: 70.27, width: 18.21, height: 2.37 },
  // ── 判定 ──
  { kind: 'label', text: '判定', semanticRole: 'columnheader', ariaLabel: '判定', top: 94.02, left: 10.48, width: 1.77, height: 5.32, align: 'center' },
  { kind: 'cell', codeLabel: 'G50', top: 94.02, left: X.name, width: 1.81, height: 2.36 },
  { field: 'js_gensoku', kind: 'input', readOnly: true, ariaLabel: '判定：同族株主等（該当時は１）', highlightWhen: isDozokuJudge, top: 94.02, left: 14.06, width: 1.81, height: 2.36, align: 'center' },
  { kind: 'label', text: '同　族　株　主　等\n（原則的評価方式等）', highlightWhen: isDozokuJudge, top: 94.02, left: 15.87, width: 21.76, height: 2.36 },
  { kind: 'cell', codeLabel: 'G51', top: 94.02, left: 37.63, width: 1.81, height: 2.36 },
  { field: 'js_haito', kind: 'input', readOnly: true, ariaLabel: '判定：同族株主等以外の株主（該当時は１）', highlightWhen: isNonDozokuJudge, top: 94.02, left: 39.44, width: 1.82, height: 2.36, align: 'center' },
  { kind: 'label', text: '同族株主等以外の株主\n（配 当 還 元 方 式）', highlightWhen: isNonDozokuJudge, top: 94.02, left: 41.26, width: 21.83, height: 2.36 },
  { kind: 'label', text: '「同族株主等」に該当する納税義務者のうち、議決権割合（㋥の割合）が５％未満の者の評価方式は、第１表の２「２．少数株式所有者の評価方式の判定」欄により判定します。', top: 96.38, left: X.name, width: 50.84, height: 2.96, align: 'left', fontSize: 7 },
];

// ══ 第1表の1続（株主の追加用紙 r08-02）＝13名分（1人2行）。列は本表とほぼ同じだが左マージンが少し違う。 ══
const CX = {
  eCode: 10.15, eCodeEnd: 12.09, relBox: 12.09, relBoxEnd: 15.95, relECode: 15.95, relECodeEnd: 17.89,
  rel: 17.89, relEnd: 33.36, name: 12.09, nameEnd: 33.36, gCode: 33.36, gCodeEnd: 35.29,
  codeBox: 35.29, codeBoxEnd: 39.16, roleECode: 39.16, roleECodeEnd: 41.1, role: 41.1, roleEnd: 60.44,
  numCode1: 60.44, numCode1End: 62.37, num1: 62.37, num1End: 75.91, numCode2: 75.91, numCode2End: 77.84,
  num2: 77.84, num2End: 91.38,
} as const;
const CONT_SH_TOP = 24.19;       // 続紙データ1行目の上端%（r08-02実測）
const CONT_SH_PITCH = 2.7635;    // 1行の高さ%（1人＝2行。(96.04-24.19)/26行）
const pad = (p: string, n: number) => `${p}${String(n).padStart(2, '0')}`;
/** 続紙 株主kの識別コード（記載要領の続紙コード体系）: E=(4k-3..4k)、G=(7k-6..7k） */
function contCodes(k: number) {
  const e = (k - 1) * 4, gg = (k - 1) * 7;
  return {
    name: pad('E', e + 1), relName: pad('E', e + 2), roleName: pad('E', e + 3), typeName: pad('E', e + 4),
    relCode: pad('G', gg + 1), roleCode: pad('G', gg + 2), typeCode: pad('G', gg + 3),
    shares: pad('G', gg + 4), undiv: pad('G', gg + 5), votes: pad('G', gg + 6), ratio: pad('G', gg + 7),
  };
}
/** 続紙の株主1人分（globalIdx=通しの株主番号、k=ページ内1〜13）のセル */
function contShareholder(globalIdx: number, k: number): GridCell[] {
  const topA = +(CONT_SH_TOP + (k - 1) * 2 * CONT_SH_PITCH).toFixed(2);
  const topB = +(topA + CONT_SH_PITCH).toFixed(2);
  const h = CONT_SH_PITCH;
  const c = contCodes(k);
  const w = (a: number, b: number) => +(b - a).toFixed(2);
  const r = globalIdx;
  return [
    // 上段
    { kind: 'cell', codeLabel: c.name, top: topA, left: CX.eCode, width: w(CX.eCode, CX.eCodeEnd), height: h },
    { field: `sh_${r}_1`, kind: 'input', ariaLabel: `株主${r}の氏名又は名称`, top: topA, left: CX.name, width: w(CX.name, CX.nameEnd), height: h, align: 'left' },
    { kind: 'cell', codeLabel: c.roleCode, top: topA, left: CX.gCode, width: w(CX.gCode, CX.gCodeEnd), height: h },
    { field: `sh_${r}_3k`, kind: 'input', options: [...ROLE_CODE_OPTIONS], compactSelectedOption: true, ariaLabel: `株主${r}の役職コード`, top: topA, left: CX.codeBox, width: w(CX.codeBox, CX.codeBoxEnd), height: h },
    { kind: 'cell', codeLabel: c.roleName, top: topA, left: CX.roleECode, width: w(CX.roleECode, CX.roleECodeEnd), height: h },
    { field: `sh_${r}_3`, kind: 'input', readOnlyWhen: (g) => g(`sh_${r}_3k`) !== '16', ariaLabel: `株主${r}の役職名`, top: topA, left: CX.role, width: w(CX.role, CX.roleEnd), height: h, align: 'left' },
    { kind: 'cell', codeLabel: c.shares, top: topA, left: CX.numCode1, width: w(CX.numCode1, CX.numCode1End), height: h },
    { field: `sh_${r}_4`, kind: 'input', commaInteger: true, top: topA, left: CX.num1, width: w(CX.num1, CX.num1End), height: h, align: 'right' },
    { kind: 'cell', codeLabel: c.undiv, top: topA, left: CX.numCode2, width: w(CX.numCode2, CX.numCode2End), height: h },
    { field: `sh_${r}_7`, kind: 'input', commaInteger: true, top: topA, left: CX.num2, width: w(CX.num2, CX.num2End), height: h, align: 'right' },
    // 下段
    { kind: 'cell', codeLabel: c.relCode, top: topB, left: CX.eCode, width: w(CX.eCode, CX.eCodeEnd), height: h },
    { field: `sh_${r}_2k`, kind: 'input', options: [...ZOKUGARA_CODE_OPTIONS], compactSelectedOption: true, ariaLabel: `株主${r}の続柄コード`, top: topB, left: CX.relBox, width: w(CX.relBox, CX.relBoxEnd), height: h },
    { kind: 'cell', codeLabel: c.relName, top: topB, left: CX.relECode, width: w(CX.relECode, CX.relECodeEnd), height: h },
    { field: `sh_${r}_2`, kind: 'input', readOnlyWhen: (g) => g(`sh_${r}_2k`) !== '18', ariaLabel: `株主${r}の続柄`, top: topB, left: CX.rel, width: w(CX.rel, CX.relEnd), height: h, align: 'left' },
    { kind: 'cell', codeLabel: c.typeCode, top: topB, left: CX.gCode, width: w(CX.gCode, CX.gCodeEnd), height: h },
    { field: `sh_${r}_9`, kind: 'input', options: [...STOCK_TYPE_OPTIONS], compactSelectedOption: true, ariaLabel: `株主${r}の株式種類コード`, top: topB, left: CX.codeBox, width: w(CX.codeBox, CX.codeBoxEnd), height: h },
    { kind: 'cell', codeLabel: c.typeName, top: topB, left: CX.roleECode, width: w(CX.roleECode, CX.roleECodeEnd), height: h },
    { field: `sh_${r}_8`, kind: 'input', ariaLabel: `株主${r}の株式の種類`, top: topB, left: CX.role, width: w(CX.role, CX.roleEnd), height: h, align: 'left' },
    { kind: 'cell', codeLabel: c.votes, top: topB, left: CX.numCode1, width: w(CX.numCode1, CX.numCode1End), height: h },
    { field: `sh_${r}_5`, kind: 'input', commaInteger: true, top: topB, left: CX.num1, width: w(CX.num1, CX.num1End), height: h, align: 'right' },
    { kind: 'cell', codeLabel: c.ratio, top: topB, left: CX.numCode2, width: w(CX.numCode2, CX.numCode2End), height: h },
    { field: `sh_${r}_6`, kind: 'input', readOnly: true, top: topB, left: CX.num2, width: w(CX.num2, CX.num2End), height: h, align: 'right' },
  ];
}
/** 続紙1ページ分（pageIndex=1始まり）：ヘッダー＋13株主 */
function continuationPageCells(pageIndex: number): GridCell[] {
  const firstGlobal = SH_ROWS + (pageIndex - 1) * CONT_SH + 1; // このページ先頭の通し株主番号
  // 座標は r08-02 の罫線実測値: 外枠 8.22-91.38 × 16.98-96.04、見出しバンド 16.98-19.00（枠内最上段）、
  // ヘッダー上段 19.00-21.60／下段 21.60-24.19、データ26行 24.19-96.04
  const out: GridCell[] = [
    { kind: 'cell', semanticRole: 'group', groupBorder: false, ariaLabel: '株主及び評価方式の判定（続）', top: 16.98, left: 8.22, width: 83.16, height: 79.06 },
    { kind: 'cell', text: '', top: 16.98, left: 8.22, width: 83.16, height: 79.06 },
    { kind: 'label', text: '１．株主及び評価方式の判定（続）', semanticRole: 'columnheader', ariaLabel: '株主及び評価方式の判定（続）', top: 16.98, left: 8.22, width: 83.16, height: 2.02, align: 'left', fontSize: 9, bold: true },
    { kind: 'label', text: '判定要素（課税時期現在の株式等の所有状況）', top: 19.0, left: 8.22, width: 1.93, height: 77.04, align: 'center' },
    // ヘッダー（上段/下段）
    { kind: 'label', text: '氏 名 又 は 名 称', semanticRole: 'columnheader', ariaLabel: '氏名又は名称', top: 19.0, left: CX.eCode, width: +(CX.nameEnd - CX.eCode).toFixed(2), height: 2.6 },
    { kind: 'label', text: '役　職\nコード', semanticRole: 'columnheader', ariaLabel: '役職コード', top: 19.0, left: CX.gCode, width: +(CX.codeBoxEnd - CX.gCode).toFixed(2), height: 2.6, fontSize: 7.5 },
    { kind: 'label', text: '会社における役職名', semanticRole: 'columnheader', ariaLabel: '会社における役職名', top: 19.0, left: CX.roleECode, width: +(CX.roleEnd - CX.roleECode).toFixed(2), height: 2.6 },
    { kind: 'label', text: '㋑　株 式 数', bottomLabel: '（株）', bottomLabelAlign: 'right', semanticRole: 'columnheader', ariaLabel: '株式数', top: 19.0, left: CX.numCode1, width: +(CX.num1End - CX.numCode1).toFixed(2), height: 2.6 },
    { kind: 'label', text: '㋺　未分割の株式の\n株 式 数', bottomLabel: '（株）', bottomLabelAlign: 'right', semanticRole: 'columnheader', ariaLabel: '未分割の株式数', top: 19.0, left: CX.numCode2, width: +(CX.num2End - CX.numCode2).toFixed(2), height: 2.6, fontSize: 7.5 },
    { kind: 'label', text: '続　柄\nコード', semanticRole: 'columnheader', ariaLabel: '続柄コード', top: 21.6, left: CX.eCode, width: +(CX.relBoxEnd - CX.eCode).toFixed(2), height: 2.59, fontSize: 7.5 },
    { kind: 'label', text: '続　　　柄', semanticRole: 'columnheader', ariaLabel: '続柄', top: 21.6, left: CX.relECode, width: +(CX.relEnd - CX.relECode).toFixed(2), height: 2.59 },
    { kind: 'label', text: '株式種類\nコード', semanticRole: 'columnheader', ariaLabel: '株式種類コード', top: 21.6, left: CX.gCode, width: +(CX.codeBoxEnd - CX.gCode).toFixed(2), height: 2.59, fontSize: 7.5 },
    { kind: 'label', text: '株 式 の 種 類', semanticRole: 'columnheader', ariaLabel: '株式の種類', top: 21.6, left: CX.roleECode, width: +(CX.roleEnd - CX.roleECode).toFixed(2), height: 2.59 },
    { kind: 'label', text: '㋩　議 決 権 数', bottomLabel: '（個）', bottomLabelAlign: 'right', semanticRole: 'columnheader', ariaLabel: '議決権数', top: 21.6, left: CX.numCode1, width: +(CX.num1End - CX.numCode1).toFixed(2), height: 2.59 },
    { kind: 'label', text: '㋥　議決権割合\n（㋩/⑥）', bottomLabel: '（％）', bottomLabelAlign: 'right', semanticRole: 'columnheader', ariaLabel: '議決権割合', top: 21.6, left: CX.numCode2, width: +(CX.num2End - CX.numCode2).toFixed(2), height: 2.59, fontSize: 7.5 },
  ];
  for (let k = 1; k <= CONT_SH; k++) out.push(...contShareholder(firstGlobal + k - 1, k));
  return out;
}

/** 第1表の1（CSSグリッド方式・令和8年4月1日以降用） */
export function Table1_1Grid({ getField, updateField, onJump }: TableProps) {
  const reorderShareholderRows = useCallback((activeId: string, overId: string) => {
    const fromRow = Number(activeId);
    const toRow = Number(overId);
    if (
      !Number.isInteger(fromRow) ||
      !Number.isInteger(toRow) ||
      fromRow < 2 ||
      toRow < 2 ||
      fromRow > SH_ROWS ||
      toRow > SH_ROWS ||
      fromRow === toRow
    ) {
      return;
    }

    const rows = Array.from({ length: SH_ROWS - 1 }, (_, index) => {
      const row = index + 2;
      return SH_REORDER_FIELDS.map((col) => getField(T, `sh_${row}_${col}`));
    });
    const [moved] = rows.splice(fromRow - 2, 1);
    if (!moved) return;
    rows.splice(toRow - 2, 0, moved);

    rows.forEach((values, index) => {
      const row = index + 2;
      SH_REORDER_FIELDS.forEach((col, colIndex) => {
        updateField(T, `sh_${row}_${col}`, values[colIndex] ?? '');
      });
    });
  }, [getField, updateField]);

  const shPageCount = shPageCountOf(getField);
  const totalSh = totalShOf(getField);
  const sumShareholderVotes = () => {
    let total = 0;
    for (let row = 1; row <= totalSh; row++) {
      total += Number(getField(T, `sh_${row}_5`).replace(/,/g, '')) || 0;
    }
    return total > 0 ? String(total) : '';
  };

  // 議決権割合＝分子÷⑥（議決権の総数）。50%超51%未満は51に切上げ、その他は切捨て
  const percentage = (numeratorField: string, roundUpOver50 = false) => {
    const numeratorRaw = numeratorField === '①' ? sumShareholderVotes() : getField(T, numeratorField);
    const denominator = Number(getField(T, '⑥').replace(/,/g, ''));
    if (numeratorRaw === '' || denominator <= 0) return '';
    const raw = (Number(numeratorRaw.replace(/,/g, '')) / denominator) * 100;
    if (roundUpOver50 && raw > 50 && raw < 51) return '51';
    return String(Math.floor(raw));
  };

  const g = (f: string): string => {
    // 「１」記入枠: 該当時に「１」を自動表示（判定基準・株主の区分・判定）
    const flag = JUDGE_FLAGS[f];
    if (flag) return flag(g) ? '1' : '';
    const ratioMatch = /^sh_(\d+)_6$/.exec(f);
    if (ratioMatch) return percentage(`sh_${ratioMatch[1]}_5`);
    // コード欄: 保存値優先・なければ旧名称データから導出（後方互換）
    const codeMatch = /^sh_(\d+)_(2|3)k$/.exec(f);
    if (codeMatch) {
      const stored = getField(T, f);
      const name = getField(T, `sh_${codeMatch[1]}_${codeMatch[2]}`);
      return codeMatch[2] === '2' ? effectiveZokugaraCode(stored, name) : effectiveRoleCode(stored, name);
    }
    // 続柄・役職名欄: 選択コードの標準名称を自動表示（入力不可）。
    // 「その他」（続柄18/役職16）のみ手入力値を表示。コード不明（旧自由入力）は保存値をそのまま表示
    const nameMatch = /^sh_(\d+)_(2|3)$/.exec(f);
    if (nameMatch) {
      const stored = getField(T, f);
      const kind = nameMatch[2];
      const code = kind === '2'
        ? effectiveZokugaraCode(getField(T, `sh_${nameMatch[1]}_2k`), stored)
        : effectiveRoleCode(getField(T, `sh_${nameMatch[1]}_3k`), stored);
      if (code === '') return stored;
      const standardName = kind === '2' ? zokugaraNameOf(code) : roleNameOf(code);
      const isOther = kind === '2' ? code === '18' : code === '16';
      return isOther ? (stored || standardName) : standardName;
    }
    if (f === '①') return sumShareholderVotes();
    if (f === '②') return percentage('①', true);
    if (f === '④') return percentage('③', true);
    return getField(T, f);
  };
  const u = (f: string, v: string) => {
    updateField(T, f, v);
    // コードを選び直したら名称欄の上書きをクリアし、標準名称の自動表示に戻す
    const codeMatch = /^sh_(\d+)_(2|3)k$/.exec(f);
    if (codeMatch) updateField(T, `sh_${codeMatch[1]}_${codeMatch[2]}`, '');
  };

  // 続紙の追加／削除（株主が5名を超える場合。続紙は1枚まで＝最大18名）
  const SH_FIELDS = ['1', '2', '2k', '3', '3k', '4', '5', '6', '7', '8', '9'] as const;
  const canAdd = shPageCount < MAX_SH_PAGES;
  const canRemove = shPageCount > 0;
  const addShPage = () => { if (canAdd) updateField(T, '_shpages', String(shPageCount + 1)); };
  const removeShPage = () => {
    if (!canRemove) return;
    const start = SH_ROWS + (shPageCount - 1) * CONT_SH + 1;
    let hasData = false;
    for (let r = start; r <= totalSh && !hasData; r++) {
      for (const c of SH_FIELDS) if (getField(T, `sh_${r}_${c}`).trim() !== '') hasData = true;
    }
    // 誤操作防止のため削除は常に確認する。入力済みのときはより強く警告。
    const message = hasData
      ? '続紙を削除します。\n入力済みの株主明細もすべて削除され、元に戻せません。\n本当に削除してよろしいですか？'
      : '続紙を削除します。よろしいですか？';
    if (!window.confirm(message)) return;
    for (let r = start; r <= totalSh; r++) for (const c of SH_FIELDS) updateField(T, `sh_${r}_${c}`, '');
    updateField(T, '_shpages', String(shPageCount - 1));
  };
  const btnStyle = (enabled: boolean) => ({
    fontSize: 11, lineHeight: 1.4, padding: '0 6px', border: '1px solid #888', borderRadius: 3,
    background: '#fff', cursor: enabled ? 'pointer' : 'not-allowed',
    color: enabled ? '#111' : '#aaa', borderColor: enabled ? '#888' : '#ddd',
  } as const);
  const toolbar = (
    <span className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, whiteSpace: 'nowrap' }}>
      <span>続紙</span>
      <button type="button" onClick={addShPage} disabled={!canAdd} title={canAdd ? '続紙を追加（株主13名分）' : '続紙は1枚までです'} style={btnStyle(canAdd)}>追加</button>
      <button type="button" onClick={removeShPage} disabled={!canRemove} title={canRemove ? '続紙を削除' : '続紙はありません'} style={btnStyle(canRemove)}>削除</button>
    </span>
  );

  // 氏名（被相続人又は受贈者）欄＝本表の外に浮く独立枠（実様式どおり右寄せ・左側は開放）。
  // 幅・高さは本表の座標系に合わせて算出（x50.28-88.48→右端揃え幅48.87%、縦横比は本表スケール準拠）。
  const shimeiBox = (
    <div style={{ display: 'flex', padding: '3mm 0 5mm', fontFamily: '"Noto Sans JP", sans-serif' }}>
      <div className="gf-float-box" style={{ marginLeft: 'auto', width: '48.87%', aspectRatio: '9.46 / 1', display: 'flex', border: '1.5px solid #000', boxSizing: 'border-box' }}>
        <div style={{ flex: '0 0 38%', borderRight: '1px solid #000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1.25, padding: '0 2px' }}>
          <span style={{ fontSize: 9, letterSpacing: '0.8em', paddingLeft: '0.8em' }}>氏名</span>
          <span style={{ fontSize: 7 }}>（被相続人又は受贈者）</span>
        </div>
        <input
          id={`${T}-decedent`}
          name={`${T}.decedent`}
          aria-label="被相続人又は受贈者の氏名"
          value={g('decedent')}
          onChange={(e) => u('decedent', e.target.value)}
          style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', padding: '0 6px', fontSize: 11, fontFamily: 'inherit' }}
        />
      </div>
    </div>
  );

  return (
    <>
      <div className="gov-page" style={shPageCount > 0 ? { marginBottom: '8mm' } : undefined}>
        <GridForm cells={CELLS} g={g} u={u} formId={T} width="100%" aspectRatio={MAIN_ASPECT} title="第１表の１　評価上の株主の判定及び会社規模の判定の明細書" formCode="NTA0VNA170010010" headerExtra={shimeiBox} toolbar={toolbar} onDragReorder={reorderShareholderRows} />
      </div>
      {Array.from({ length: shPageCount }).map((_, i) => (
        <div className="gov-page" key={i} style={i < shPageCount - 1 ? { marginBottom: '8mm' } : undefined}>
          <GridForm cells={continuationPageCells(i + 1)} g={g} u={u} formId={T} width="100%" title={`第１表の１（続）　評価上の株主の判定及び会社規模の判定の明細書（続紙${i + 1}）`} formCode="NTA0VNA170020010" headerExtra={companyFloatBox((f) => g(f === 'company' ? 'f12' : f), (f, v) => u(f === 'company' ? 'f12' : f, v), `${T}-cont${i + 1}`, { widthPct: 46.6, aspect: 8.9, labelFrac: 0.3, onJump })} />
        </div>
      ))}
    </>
  );
}
