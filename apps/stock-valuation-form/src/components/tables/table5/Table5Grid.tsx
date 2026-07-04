import { GridForm, type GridCell } from '@/components/ui/GridForm';
import type { TableId, TableProps } from '@/types/form';

const T = 'table5' as const;

// ── 資産の部・負債の部の繰り返し入力行（空行）を自動生成 ──
const ROWS_PER_PAGE = 15;   // 1ページあたりのデータ行数（用紙レイアウト固定）
const ROW_TOP = 18.06;      // データ1行目の上端%
const TOTAL_TOP = 64.42;    // 合計行の上端%
const PITCH = (TOTAL_TOP - ROW_TOP) / ROWS_PER_PAGE;
const DRAG_W = 2.2;         // 行頭のドラッグハンドル幅%
const CORPORATE_TAX_RATE = 0.37; // 評価差額に対する法人税額等相当額の割合（様式⑧: ⑦×37％）
const COMPUTED_FIELDS = new Set([
  '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫',
  'イ', 'ロ', 'ハ',
]);

const parseNum = (value: string) => Number(value.replace(/,/g, '')) || 0;
const pageCountOf = (getField: TableProps['getField']) => Math.max(1, Number(getField(T, '_pages')) || 1);

function isExcludedLiability(name: string) {
  return /引当金|準備金/.test(name.trim());
}

type Col = { left: number; width: number };
const ASSET_COLS: Col[] = [
  { left: 8.51, width: 14.73 },  // 科目
  { left: 22.96, width: 11.87 }, // 相続税評価額
  { left: 34.56, width: 12.14 }, // 帳簿価額
  { left: 46.28, width: 4.91 },  // 備考
];
const LIAB_COLS: Col[] = [
  { left: 50.92, width: 14.32 }, // 科目
  { left: 64.97, width: 11.87 }, // 相続税評価額
  { left: 76.56, width: 12 },    // 帳簿価額
  { left: 88.43, width: 4.91 },  // 備考
];

/**
 * データ入力行（科目/相続税評価額/帳簿価額/備考）を 15 行ぶん生成。
 * startRow=このページの先頭行番号（1, 16, 31, …）。行頭にドラッグハンドルを付与。
 */
function dataRows(prefix: 'a' | 'l', cols: Col[], startRow: number, showUnit: boolean): GridCell[] {
  const out: GridCell[] = [];
  const height = +PITCH.toFixed(2);
  for (let i = 0; i < ROWS_PER_PAGE; i++) {
    const row = startRow + i;
    const rowId = `${prefix}:${row}`;
    const isSelected = (g: (field: string) => string) => g('_sel') === rowId;
    const top = +(ROW_TOP + i * PITCH).toFixed(2);
    // 行頭ハンドル：クリックで行選択（挿入・削除・上下移動の対象）
    out.push({
      kind: 'label', text: '⠿',
      ariaLabel: `${prefix === 'a' ? '資産' : '負債'}${row}行を選択`,
      selectValue: { field: '_sel', value: rowId },
      highlightWhen: isSelected,
      top, left: cols[0]!.left, width: DRAG_W, height, fontSize: 9, bold: true, noWrap: true,
    });
    cols.forEach((c, ci) => {
      const first = ci === 0;
      const isAmount = ci === 1 || ci === 2; // 相続税評価額 / 帳簿価額
      out.push({
        field: `${prefix}_${row}_${ci + 1}`,
        kind: 'input',
        options: prefix === 'a' && ci === 3 ? ['', '株式等', '土地等'] : undefined,
        commaInteger: isAmount,
        topRightLabel: showUnit && i === 0 && isAmount ? '千円' : undefined,
        contextMenu: isAmount ? [
          { label: '相続税評価額 → 帳簿価額にコピー', copyFrom: `${prefix}_${row}_2`, copyTo: `${prefix}_${row}_3` },
          { label: '帳簿価額 → 相続税評価額にコピー', copyFrom: `${prefix}_${row}_3`, copyTo: `${prefix}_${row}_2` },
        ] : undefined,
        highlightWhen: isSelected,
        top,
        left: first ? +(c.left + DRAG_W).toFixed(2) : c.left,
        width: first ? +(c.width - DRAG_W).toFixed(2) : c.width,
        height,
        align: ci === 0 ? 'left' : 'right',
      });
    });
  }
  return out;
}

/** ページ共通のグリッドセル（pageIndex で明細行のスライスを切替）。本表・続紙とも同一レイアウト */
function pageCells(pageIndex: number): GridCell[] {
  const startRow = pageIndex * ROWS_PER_PAGE + 1;
  return [
  // ── 外枠・3区分 ──
  { kind: 'cell', top: 8.9, left: 8.64, width: 84.56, height: 85.3 },
  { kind: 'cell', top: 8.9, left: 8.51, width: 84.69, height: 68.63 },
  { kind: 'cell', top: 77.33, left: 8.51, width: 42.69, height: 16.77 },
  { kind: 'cell', top: 77.14, left: 50.92, width: 42.55, height: 17.06 },
  // ── 1. 資産及び負債の金額（タイトル帯） ──
  { kind: 'label', text: '１．資産及び負債の金額（課税時期現在）', top: 8.9, left: 8.64, width: 84.56, height: 3.37, align: 'left' },
  // ── 資産の部 ──
  { kind: 'label', text: '資 産 の 部', top: 12.08, left: 8.51, width: 42.69, height: 3.18 },
  { kind: 'label', text: '科 目', top: 15.16, left: 8.37, width: 14.87, height: 3.28 },
  { kind: 'label', text: '相続税評価額', top: 14.97, left: 22.96, width: 11.87, height: 3.47 },
  { kind: 'label', text: '帳 簿 価 額', top: 14.97, left: 34.56, width: 12.14, height: 3.37 },
  { kind: 'label', text: '備 考', top: 14.97, left: 46.28, width: 4.91, height: 3.28 },
  { kind: 'cell', top: 11.98, left: 8.51, width: 42.82, height: 65.44 },
  ...dataRows('a', ASSET_COLS, startRow, true),
  // ── 資産 合計・㋑㋩㋥ ──
  { kind: 'label', text: '合 計', top: 64.42, left: 8.51, width: 14.73, height: 3.47 },
  { field: '①', kind: 'input', cornerLabel: '①', top: 64.42, left: 22.96, width: 11.87, height: 3.47 },
  { field: '②', kind: 'input', cornerLabel: '②', top: 64.42, left: 34.56, width: 12.14, height: 3.37 },
  { field: 'a_total_bikou', kind: 'input', top: 64.32, left: 46.28, width: 4.91, height: 3.47 },
  { kind: 'label', text: '株式等の価額の合計額', top: 67.79, left: 8.51, width: 14.59, height: 3.37 },
  { field: 'イ', kind: 'input', cornerLabel: 'イ', top: 67.69, left: 22.96, width: 12, height: 3.47 },
  { field: 'ロ', kind: 'input', cornerLabel: 'ロ', top: 67.6, left: 34.56, width: 12, height: 3.47 },
  { field: 'a_kabu_bikou', kind: 'input', top: 67.6, left: 46.28, width: 4.91, height: 3.57 },
  { kind: 'label', text: '土地等の価額の合計額', top: 71.07, left: 8.51, width: 14.87, height: 3.28 },
  { field: 'ハ', kind: 'input', cornerLabel: 'ハ', top: 70.97, left: 22.96, width: 12, height: 3.37 },
  { kind: 'cell', diagonal: 'tlbr', top: 70.68, left: 34.69, width: 11.87, height: 3.57 },
  { field: 'a_tochi_bikou', kind: 'input', top: 70.87, left: 46.42, width: 4.91, height: 3.47 },
  { kind: 'label', text: '現物出資等受入れ資産の\n価額の合計額', top: 74.25, left: 8.64, width: 14.46, height: 3.28 },
  { field: 'ニ', kind: 'input', cornerLabel: 'ニ', top: 74.15, left: 22.96, width: 11.87, height: 3.28 },
  { field: 'ホ', kind: 'input', cornerLabel: 'ホ', top: 74.05, left: 34.69, width: 11.87, height: 3.37 },
  { field: 'a_genbutsu_bikou', kind: 'input', top: 74.15, left: 46.42, width: 4.77, height: 3.37 },
  // ── 負債の部 ──
  { kind: 'cell', top: 11.98, left: 50.92, width: 42.28, height: 55.9 },
  { kind: 'label', text: '負 債 の 部', top: 12.08, left: 50.92, width: 42.28, height: 3.28 },
  { kind: 'label', text: '科 目', top: 14.97, left: 51.06, width: 14.18, height: 3.47 },
  { kind: 'label', text: '相続税評価額', top: 15.07, left: 64.97, width: 12, height: 3.28 },
  { kind: 'label', text: '帳 簿 価 額', top: 15.16, left: 76.56, width: 12.14, height: 3.18 },
  { kind: 'label', text: '備 考', top: 15.16, left: 88.43, width: 4.91, height: 3.18 },
  ...dataRows('l', LIAB_COLS, startRow, true),
  // ── 負債 合計 ──
  { kind: 'label', text: '合 計', top: 64.42, left: 51.06, width: 14.32, height: 3.28 },
  { field: '③', kind: 'input', cornerLabel: '③', top: 64.42, left: 65.24, width: 11.73, height: 3.37 },
  { field: '④', kind: 'input', cornerLabel: '④', top: 64.51, left: 76.7, width: 11.87, height: 3.47 },
  { field: 'l_total_bikou', kind: 'input', top: 64.32, left: 88.43, width: 4.77, height: 3.47 },
  // 負債側・合計下の未使用領域（資産側の株式等/土地等/現物出資に対応）に黒斜線
  { kind: 'cell', diagonal: 'bltr', top: 67.79, left: 50.92, width: 42.28, height: 9.35 },
  // ── 2. 評価差額に対する法人税額等相当額の計算 ──
  { kind: 'label', text: '２．評価差額に対する法人税額等相当額の計算', top: 77.52, left: 8.64, width: 42.69, height: 3.37, align: 'left' },
  { kind: 'label', text: '相続税評価額による純資産価額\n（①－③）', top: 80.8, left: 8.37, width: 26.73, height: 3.47, align: 'left' },
  { field: '⑤', kind: 'input', cornerLabel: '⑤', top: 80.8, left: 34.69, width: 16.5, height: 3.37 },
  { kind: 'label', text: '帳簿価額による純資産価額\n【{②＋(ニ－ホ)－④}、マイナスの場合は０】', top: 83.98, left: 8.37, width: 26.59, height: 3.57, align: 'left' },
  { field: '⑥', kind: 'input', cornerLabel: '⑥', top: 84.08, left: 34.69, width: 16.5, height: 3.47 },
  { kind: 'label', text: '評価差額に相当する金額\n（⑤－⑥、マイナスの場合は０）', top: 87.36, left: 8.51, width: 26.46, height: 3.47, align: 'left' },
  { field: '⑦', kind: 'input', cornerLabel: '⑦', top: 87.26, left: 34.56, width: 16.64, height: 3.66 },
  { kind: 'label', text: '評価差額に対する法人税額等相当額\n（⑦×37％）', top: 90.63, left: 8.51, width: 26.46, height: 3.57, align: 'left' },
  { field: '⑧', kind: 'input', cornerLabel: '⑧', top: 90.63, left: 34.56, width: 16.64, height: 3.57 },
  // ── 3. 1株当たりの純資産価額の計算 ──
  { kind: 'label', text: '３．１株当たりの純資産価額の計算', top: 77.33, left: 50.78, width: 42.55, height: 3.57, align: 'left' },
  { kind: 'label', text: '課税時期現在の純資産価額\n（相続税評価額）（⑤－⑧）', top: 80.71, left: 51.06, width: 25.78, height: 3.57, align: 'left' },
  { field: '⑨', kind: 'input', cornerLabel: '⑨', top: 80.8, left: 76.56, width: 16.78, height: 3.47 },
  { kind: 'label', text: '課税時期現在の発行済株式数\n{(第１表の１の①)－自己株式数}', top: 84.08, left: 51.19, width: 25.64, height: 3.47, align: 'left' },
  { field: '⑩', kind: 'input', jumpTo: { tab: 'table1_1', field: '⑤', hint: 'クリックで入力元（第１表の１・⑤発行済株式数）へ移動します。自己株式数は第１表の１の自己株式欄で入力します' }, cornerLabel: '⑩', top: 83.98, left: 76.7, width: 16.78, height: 3.57 },
  { kind: 'label', text: '課税時期現在の1株当たりの純資産価額\n（相続税評価額）（⑨÷⑩）', top: 87.26, left: 51.06, width: 25.64, height: 3.66, align: 'left' },
  { field: '⑪', kind: 'input', cornerLabel: '⑪', top: 87.36, left: 76.56, width: 16.78, height: 3.57 },
  { kind: 'label', text: '同族株主等の議決権割合（第１表の１の⑤の割合）が\n50％以下の場合（⑪×80％）', top: 90.83, left: 51.06, width: 25.91, height: 3.28, align: 'left' },
  { field: '⑫', kind: 'input', cornerLabel: '⑫', top: 90.83, left: 76.7, width: 16.64, height: 3.37 },
  ];
}

// 合計以下（明細行より下）の入力フィールド。続紙では空白＆編集不可にする。
const BELOW_TOTAL_FIELDS = new Set([
  '①', '②', 'a_total_bikou', 'イ', 'ロ', 'a_kabu_bikou', 'ハ', 'a_tochi_bikou',
  'ニ', 'ホ', 'a_genbutsu_bikou', '③', '④', 'l_total_bikou',
  '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫',
]);

// 本表（1ページ目）：計算値欄を読み取り専用に
const mainPageCells: GridCell[] = pageCells(0).map((cell) => (
  cell.field && COMPUTED_FIELDS.has(cell.field)
    ? { ...cell, readOnly: true, commaInteger: true }
    : cell
));

// 続紙（2ページ目以降）：レイアウトは本表と同一。明細行は編集可、合計以下は空白＆編集不可（ジャンプも無効）。
function continuationPageCells(pageIndex: number): GridCell[] {
  return pageCells(pageIndex).map((cell) => (
    cell.field && BELOW_TOTAL_FIELDS.has(cell.field)
      ? { ...cell, readOnly: true, jumpTo: undefined }
      : cell
  ));
}

/** 第5表の自動計算（第3表の②③などからも参照する） */
export function calcTable5(getField: TableProps['getField']) {
  const totalRows = pageCountOf(getField) * ROWS_PER_PAGE;
  let assetEval = 0;
  let assetBook = 0;
  let stockEval = 0;
  let stockBook = 0;
  let landEval = 0;
  let liabilityEval = 0;
  let liabilityBook = 0;
  let hasAssetInput = false;
  let hasLiabilityInput = false;

  for (let row = 1; row <= totalRows; row++) {
    const assetName = getField(T, `a_${row}_1`);
    const assetEvalRaw = getField(T, `a_${row}_2`);
    const assetBookRaw = getField(T, `a_${row}_3`);
    const assetNote = getField(T, `a_${row}_4`);
    const rowAssetEval = parseNum(assetEvalRaw);
    const rowAssetBook = parseNum(assetBookRaw);
    hasAssetInput ||= Boolean(assetName || assetEvalRaw || assetBookRaw || assetNote);
    assetEval += rowAssetEval;
    assetBook += rowAssetBook;
    // 備考欄で選択された区分だけを、イ・ロ・ハへ集計する。
    if (assetNote === '株式等') {
      stockEval += rowAssetEval;
      stockBook += rowAssetBook;
    }
    if (assetNote === '土地等') landEval += rowAssetEval;

    const liabilityName = getField(T, `l_${row}_1`);
    const liabilityEvalRaw = getField(T, `l_${row}_2`);
    const liabilityBookRaw = getField(T, `l_${row}_3`);
    const liabilityNote = getField(T, `l_${row}_4`);
    hasLiabilityInput ||= Boolean(liabilityName || liabilityEvalRaw || liabilityBookRaw || liabilityNote);
    // 評価通達186により、引当金及び準備金は純資産価額計算上の負債に含めない。
    if (!isExcludedLiability(liabilityName)) {
      liabilityEval += parseNum(liabilityEvalRaw);
      liabilityBook += parseNum(liabilityBookRaw);
    }
  }

  const hasCalculationInput = hasAssetInput || hasLiabilityInput;
  const inKindEval = parseNum(getField(T, 'ニ'));
  const inKindBook = parseNum(getField(T, 'ホ'));
  const inKindRatio = assetEval > 0 ? (inKindEval / assetEval) * 100 : 0;
  // 評価通達186-2注3により、現物出資等受入れ資産が総資産の20％以下なら差額を加算しない。
  const applicableInKindDifference = inKindRatio > 20 ? inKindEval - inKindBook : 0;
  const netEval = Math.max(0, assetEval - liabilityEval);
  const netBook = Math.max(0, assetBook + applicableInKindDifference - liabilityBook);
  const evaluationDifference = Math.max(0, netEval - netBook);
  const corporateTaxEquivalent = Math.floor(evaluationDifference * CORPORATE_TAX_RATE);
  const currentNet = netEval - corporateTaxEquivalent;

  const issuedShares = parseNum(
    getField('table1_1', '⑤') || getField('table1_1', 'total_shares_sum'),
  );
  const treasuryShares = parseNum(
    getField('table1_1', 'f63') || getField('table1_1', 'treasury_shares'),
  );
  const currentShares = Math.max(0, issuedShares - treasuryShares);
  const netPerShare = currentShares > 0
    ? Math.floor((currentNet * 1000) / currentShares)
    : null;

  let groupVotes = 0;
  for (let row = 1; row <= 10; row++) {
    groupVotes += parseNum(getField('table1_1', `sh_${row}_5`));
  }
  const totalVotes = parseNum(getField('table1_1', '⑥'));
  const votingRatio = totalVotes > 0 ? (groupVotes / totalVotes) * 100 : null;
  const netPerShare80 = votingRatio !== null && votingRatio <= 50 && netPerShare !== null
    ? Math.floor(netPerShare * 0.8)
    : null;

  const calculated: Record<string, number | null> = {
    '①': hasAssetInput ? assetEval : null,
    '②': hasAssetInput ? assetBook : null,
    'イ': hasAssetInput ? stockEval : null,
    'ロ': hasAssetInput ? stockBook : null,
    'ハ': hasAssetInput ? landEval : null,
    '③': hasLiabilityInput ? liabilityEval : null,
    '④': hasLiabilityInput ? liabilityBook : null,
    '⑤': hasCalculationInput ? netEval : null,
    '⑥': hasCalculationInput ? netBook : null,
    '⑦': hasCalculationInput ? evaluationDifference : null,
    '⑧': hasCalculationInput ? corporateTaxEquivalent : null,
    '⑨': hasCalculationInput ? currentNet : null,
    '⑩': currentShares > 0 ? currentShares : null,
    '⑪': netPerShare,
    '⑫': netPerShare80,
  };
  return calculated;
}

/** 第5表（CSSグリッド方式・続紙対応・行の選択／上下移動／挿入／削除） */
export function Table5Grid({ getField, updateField, onJump }: TableProps) {
  const pageCount = pageCountOf(getField);
  const totalRows = pageCount * ROWS_PER_PAGE;
  const calculated = calcTable5(getField);

  const g = (f: string) => {
    if (COMPUTED_FIELDS.has(f)) {
      const value = calculated[f];
      return value === null || value === undefined ? '' : String(value);
    }
    return getField(T, f);
  };
  const u = (f: string, v: string) => updateField(T, f, v);
  // 続紙では合計以下のフィールドを空表示にする
  const gBlank = (f: string) => (BELOW_TOTAL_FIELDS.has(f) ? '' : g(f));
  const jump = onJump && ((t: { tab: string; field: string }) => onJump({ tab: t.tab as TableId, field: t.field }));

  // リスト1件分（4列）の値を読み出すヘルパー
  const readRows = (prefix: 'a' | 'l', count: number) =>
    Array.from({ length: count }, (_, i) => [1, 2, 3, 4].map((c) => getField(T, `${prefix}_${i + 1}_${c}`)));
  const writeRows = (prefix: 'a' | 'l', rows: string[][]) =>
    rows.forEach((vals, i) => [1, 2, 3, 4].forEach((c, ci) => updateField(T, `${prefix}_${i + 1}_${c}`, vals[ci] ?? '')));

  const addPage = () => u('_pages', String(pageCount + 1));
  const removePage = () => {
    if (pageCount <= 1) return;
    const start = (pageCount - 1) * ROWS_PER_PAGE + 1;
    let hasData = false;
    for (let row = start; row <= pageCount * ROWS_PER_PAGE && !hasData; row++) {
      for (const p of ['a', 'l'] as const) {
        for (let c = 1; c <= 4; c++) if (getField(T, `${p}_${row}_${c}`).trim() !== '') hasData = true;
      }
    }
    if (hasData && !window.confirm('最終ページの明細を削除します。よろしいですか？')) return;
    for (let row = start; row <= pageCount * ROWS_PER_PAGE; row++) {
      for (const p of ['a', 'l'] as const) for (let c = 1; c <= 4; c++) updateField(T, `${p}_${row}_${c}`, '');
    }
    u('_pages', String(pageCount - 1));
  };

  // pos の位置に空行を挿入し以降を1行下へ。末尾が埋まっている場合は自動で1ページ追加。
  const insertRow = (prefix: 'a' | 'l', pos: number) => {
    let total = totalRows;
    let rows = readRows(prefix, total);
    if (rows[total - 1]?.some((v) => v.trim() !== '')) {
      u('_pages', String(pageCount + 1));
      total += ROWS_PER_PAGE;
      rows = rows.concat(Array.from({ length: ROWS_PER_PAGE }, () => ['', '', '', '']));
    }
    rows.splice(pos - 1, 0, ['', '', '', '']);
    writeRows(prefix, rows.slice(0, total));
    u('_sel', `${prefix}:${pos}`);
  };

  // pos の行を削除し以降を1行上へ。最終ページが資産・負債とも空になれば自動で1ページ削減。
  const deleteRow = (prefix: 'a' | 'l', pos: number) => {
    const total = totalRows;
    const rows = readRows(prefix, total);
    // データのある行は確認してから削除（空行は確認なし）
    if (rows[pos - 1]?.some((v) => v.trim() !== '') && !window.confirm(`${prefix === 'a' ? '資産' : '負債'}${pos}行目を削除します。よろしいですか？`)) return;
    rows.splice(pos - 1, 1);
    rows.push(['', '', '', '']);
    writeRows(prefix, rows);
    if (pageCount > 1) {
      const other = prefix === 'a' ? 'l' : 'a';
      const startIdx = (pageCount - 1) * ROWS_PER_PAGE;
      let empty = true;
      for (let i = startIdx; i < total && empty; i++) {
        if (rows[i]?.some((v) => v.trim() !== '')) empty = false;
        for (let c = 1; c <= 4 && empty; c++) if (getField(T, `${other}_${i + 1}_${c}`).trim() !== '') empty = false;
      }
      if (empty) u('_pages', String(pageCount - 1));
    }
    u('_sel', '');
  };

  // 選択行を1つ上/下のリスト位置と入れ替え（ページ跨ぎも可）
  const moveRow = (prefix: 'a' | 'l', from: number, to: number) => {
    if (to < 1 || to > totalRows) return;
    const rows = readRows(prefix, totalRows);
    const a = rows[from - 1];
    const b = rows[to - 1];
    if (!a || !b) return;
    rows[from - 1] = b;
    rows[to - 1] = a;
    writeRows(prefix, rows);
    u('_sel', `${prefix}:${to}`);
  };

  const sel = getField(T, '_sel');
  const [selP, selRStr] = sel.split(':');
  const selR = Number(selRStr);
  const selValid = (selP === 'a' || selP === 'l') && Number.isInteger(selR) && selR >= 1 && selR <= totalRows;
  const selList = selP === 'a' ? 'a' : 'l';

  const btnStyle = { fontSize: 11, padding: '1px 8px', cursor: 'pointer', border: '1px solid #888', borderRadius: 4, background: '#fff' } as const;
  // 帯オーバーレイ用の小さめボタン（枠線は様式の罫線と同じ 0.5px）
  const opBtnStyle = { fontSize: 9, padding: '0 3px', cursor: 'pointer', border: '0.5px solid #000', borderRadius: 0, background: '#fff', lineHeight: 1.3, boxSizing: 'border-box' } as const;
  // ページ追加/削除はタイトルバーに表示
  const pageToolbar = (
    <span className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, whiteSpace: 'nowrap' }}>
      <span>明細 {pageCount}ページ（{totalRows}行）</span>
      <button type="button" onClick={addPage} style={btnStyle}>＋ページ追加</button>
      {pageCount > 1 && <button type="button" onClick={removePage} style={btnStyle}>－最終ページ削除</button>}
    </span>
  );
  // 行操作は「１．資産及び負債の金額」の帯の上に重ねて表示
  const rowOpsOverlay = (
    <div className="no-print" style={{ position: 'absolute', top: 0, right: '0.6%', height: '3.95%', display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, whiteSpace: 'nowrap', background: 'transparent', padding: '0 3px' }}>
      {selValid ? (
        <>
          <b>選択: {selList === 'a' ? '資産' : '負債'}{selR}行目</b>
          <button type="button" onClick={() => moveRow(selList, selR, selR - 1)} disabled={selR <= 1} style={opBtnStyle}>↑上に移動</button>
          <button type="button" onClick={() => moveRow(selList, selR, selR + 1)} disabled={selR >= totalRows} style={opBtnStyle}>↓下に移動</button>
          <button type="button" onClick={() => insertRow(selList, selR)} style={opBtnStyle}>＋上に挿入</button>
          <button type="button" onClick={() => insertRow(selList, selR + 1)} style={opBtnStyle}>＋下に挿入</button>
          <button type="button" onClick={() => deleteRow(selList, selR)} style={{ ...opBtnStyle, color: '#b91c1c', borderColor: '#b91c1c' }}>×削除</button>
          <button type="button" onClick={() => u('_sel', '')} style={opBtnStyle}>〇確定</button>
        </>
      ) : (
        <span style={{ color: '#888' }}>行頭の ⠿ をクリックで行を選択 → 上下移動／挿入／削除</span>
      )}
    </div>
  );

  return (
    <>
      {Array.from({ length: pageCount }).map((_, p) => (
        <div className="gov-page" key={p} style={p < pageCount - 1 ? { marginBottom: '8mm' } : undefined}>
          {p === 0 ? (
            <GridForm
              cells={mainPageCells}
              g={g}
              u={u}
              formId={T}
              width="100%"
              title="第５表　１株当たりの純資産価額（相続税評価額）の計算明細書"
              toolbar={pageToolbar}
              overlay={rowOpsOverlay}
              onJump={jump}
            />
          ) : (
            <GridForm
              cells={continuationPageCells(p)}
              g={gBlank}
              u={u}
              formId={T}
              width="100%"
              title={`第５表（続）　１株当たりの純資産価額（相続税評価額）の計算明細書（${p + 1}／${pageCount}ページ）`}
              overlay={rowOpsOverlay}
            />
          )}
        </div>
      ))}
    </>
  );
}
