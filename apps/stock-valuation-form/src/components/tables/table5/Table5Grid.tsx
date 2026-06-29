import { GridForm, type GridCell } from '@/components/ui/GridForm';
import type { TableId, TableProps } from '@/types/form';

const T = 'table5' as const;

// ── 資産の部・負債の部の繰り返し入力行（空行）を自動生成 ──
const ROWS = 15;            // データ行数（実フォームに合わせて調整可）
const ROW_TOP = 18.06;      // データ1行目の上端%
const TOTAL_TOP = 64.42;    // 合計行の上端%
const PITCH = (TOTAL_TOP - ROW_TOP) / ROWS;
const CORPORATE_TAX_RATE = 0.37; // 評価差額に対する法人税額等相当額の割合（様式⑧: ⑦×37％）
const COMPUTED_FIELDS = new Set([
  '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫',
  'イ', 'ロ', 'ハ',
]);

const parseNum = (value: string) => Number(value.replace(/,/g, '')) || 0;

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

function dataRows(prefix: string, cols: Col[]): GridCell[] {
  const out: GridCell[] = [];
  for (let r = 0; r < ROWS; r++) {
    const top = +(ROW_TOP + r * PITCH).toFixed(2);
    cols.forEach((c, ci) => {
      out.push({
        field: `${prefix}_${r + 1}_${ci + 1}`,
        kind: 'input',
        options: prefix === 'a' && ci === 3 ? ['', '株式等', '土地等'] : undefined,
        commaInteger: ci === 1 || ci === 2,
        topRightLabel: r === 0 && (ci === 1 || ci === 2) ? '千円' : undefined,
        top, left: c.left, width: c.width, height: +PITCH.toFixed(2),
        align: ci === 0 ? 'left' : 'right',
      });
    });
  }
  return out;
}

/** 第5表のグリッドセル（ピッカー測定＋空行の自動生成） */
const CELLS: GridCell[] = [
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
  ...dataRows('a', ASSET_COLS),
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
  ...dataRows('l', LIAB_COLS),
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
  { field: '⑩', kind: 'input', jumpTo: { tab: 'table1_1', field: '①', hint: 'クリックで入力元（第１表の１・①発行済株式の総数）へ移動します。自己株式数は第１表の１の自己株式欄で入力します' }, cornerLabel: '⑩', top: 83.98, left: 76.7, width: 16.78, height: 3.57 },
  { kind: 'label', text: '課税時期現在の1株当たりの純資産価額\n（相続税評価額）（⑨÷⑩）', top: 87.26, left: 51.06, width: 25.64, height: 3.66, align: 'left' },
  { field: '⑪', kind: 'input', cornerLabel: '⑪', top: 87.36, left: 76.56, width: 16.78, height: 3.57 },
  { kind: 'label', text: '同族株主等の議決権割合（第１表の１の⑤の割合）が\n50％以下の場合（⑪×80％）', top: 90.83, left: 51.06, width: 25.91, height: 3.28, align: 'left' },
  { field: '⑫', kind: 'input', cornerLabel: '⑫', top: 90.83, left: 76.7, width: 16.64, height: 3.37 },
];

const CALCULATED_CELLS = CELLS.map((cell) => (
  cell.field && COMPUTED_FIELDS.has(cell.field)
    ? { ...cell, readOnly: true, commaInteger: true }
    : cell
));

/** 第5表の自動計算（第3表の②③などからも参照する） */
export function calcTable5(getField: TableProps['getField']) {
  let assetEval = 0;
  let assetBook = 0;
  let stockEval = 0;
  let stockBook = 0;
  let landEval = 0;
  let liabilityEval = 0;
  let liabilityBook = 0;
  let hasAssetInput = false;
  let hasLiabilityInput = false;

  for (let row = 1; row <= ROWS; row++) {
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
    getField('table1_1', '①') || getField('table1_1', 'total_shares_sum'),
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
  const totalVotes = parseNum(getField('table1_1', '④'));
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

/** 第5表（CSSグリッド方式・完成版） */
export function Table5Grid({ getField, updateField, onJump }: TableProps) {
  const calculated = calcTable5(getField);

  const g = (f: string) => {
    if (COMPUTED_FIELDS.has(f)) {
      const value = calculated[f];
      return value === null || value === undefined ? '' : String(value);
    }
    return getField(T, f);
  };
  const u = (f: string, v: string) => updateField(T, f, v);
  return <GridForm cells={CALCULATED_CELLS} g={g} u={u} formId={T} width="100%" title="第５表　１株当たりの純資産価額（相続税評価額）の計算明細書" onJump={onJump && ((t) => onJump({ tab: t.tab as TableId, field: t.field }))} />;
}
