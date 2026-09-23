import { calcTable3 } from '@/components/tables/table3/Table3Grid';
import { table3Hints } from '@/components/tables/table3/formulaHints';
import { calcTable4 } from '@/components/tables/table4/calcTable4';
import { table4_1Hints, table4_2Hints } from '@/components/tables/table4/formulaHints';
import { calcTable5Detail } from '@/components/tables/table5/Table5Grid';
import { table5Hints } from '@/components/tables/table5/formulaHints';
import { eraDate } from '@/lib/clientSummary';
import { hv, hyen, rv } from '@/lib/formulaHint';
import { RETIREMENT_LIABILITY_NAME, calcRetirementSimulation, nonRecurringAfterRetirement, withRetirement } from '@/lib/retirementSimulation';
import { filterBases, readSummaryOptions } from '@/lib/summaryOptions';
import { BASIS_LABELS, withProfit, withPurpose, type ValuationBasisKey } from '@/lib/valuationReport';
import type { TableProps } from '@/types/form';
import { stripAmountFormatting } from '@/lib/numberFormat';

// ══ 試算の計算過程（別紙） ══
// サマリーの「利益0」「想定利益」「退職金」の金額を、作業者が様式の欄番号で追えるように並べる。
// 試算の getField はサマリーと同じもの（withProfit／withRetirement）を使い、
// 計算過程の文言は帳票の算式ツールチップ（tableNHints）をそのまま流用する。
// こうしておけば、別紙の金額・言い回しがサマリーや帳票とずれることがない。

type Getter = TableProps['getField'];

export type WorksheetRow = {
  /** 様式の欄番号と名称 */
  label: string;
  current: string;
  trial: string;
  /** 試算側の計算過程（改行区切り） */
  process: string;
  /** 現在と試算で値が違う */
  changed: boolean;
};

export type WorksheetSection = {
  title: string;
  note: string | null;
  rows: WorksheetRow[];
};

export type WorksheetScenarioKey = 'zero-profit' | 'assumed-profit' | 'retirement';

export type WorksheetScenario = {
  /** 画面の key 用（退職金は評価ベースごとに分かれる） */
  id: string;
  key: WorksheetScenarioKey;
  title: string;
  basis: ValuationBasisKey;
  basisLabel: string;
  description: string;
  /** 計算しなかった理由。null なら sections に計算過程が入る */
  skipped: string | null;
  sections: WorksheetSection[];
  /** 原則的評価方式による価額（現在） */
  currentPrice: number | null;
  /** 原則的評価方式による価額（試算）。サマリーの試算額と一致する */
  trialPrice: number | null;
};

export type CalculationWorksheet = {
  companyName: string;
  valuationDate: string;
  scenarios: WorksheetScenario[];
};

const numberOf = (value: string): number | null => {
  const normalized = stripAmountFormatting(value);
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

type Unit = '千円' | '円' | '円銭' | '割合' | '株';

const show = (value: number | null, unit: Unit, empty = '－'): string => {
  if (value === null) return empty;
  if (unit === '円銭') return hyen(value);
  if (unit === '割合') return value.toFixed(2);
  return `${hv(value, unit === '千円' ? 1 : 0)}${unit}`;
};

/** 現在・試算の両側で計算した各表 */
function sideOf(get: Getter) {
  return { get, t4: calcTable4(get), t5: calcTable5Detail(get), t3: calcTable3(get) };
}
type Side = ReturnType<typeof sideOf>;

type RowSpec = {
  label: string;
  unit: Unit;
  value: (side: Side) => number | null;
  process: string;
  /** 両側とも値がないときは行ごと省く（配当修正・割当修正など、使っていない欄） */
  optional?: boolean;
};

function rowsOf(specs: readonly RowSpec[], current: Side, trial: Side): WorksheetRow[] {
  return specs
    .filter((spec) => !spec.optional || spec.value(current) !== null || spec.value(trial) !== null)
    .map((spec) => {
      const before = spec.value(current);
      const after = spec.value(trial);
      return {
        label: spec.label,
        current: show(before, spec.unit),
        trial: show(after, spec.unit),
        process: spec.process,
        changed: before !== after,
      };
    });
}

const isMedical = (get: Getter) => get('table1_1', 'medical') === '1';

// ── 1. 差し替えた入力 ──

type InputSpec = { field: string; label: string; process: string };

/** 第4表の直前期の欄（千円）。現在は入力値、試算は差し替え後の値 */
function inputRows(specs: readonly InputSpec[], current: Getter, trial: Getter): WorksheetRow[] {
  return specs.map(({ field, label, process }) => {
    const before = numberOf(current('table4', field));
    const after = numberOf(trial('table4', field));
    return {
      label,
      current: show(before, '千円', '未入力'),
      trial: show(after, '千円', '未入力'),
      process,
      changed: (before ?? 0) !== (after ?? 0),
    };
  });
}

const PROFIT_ADJUST_FIELDS = [
  { field: 'e19', label: '⑫ 非経常的な利益金額' },
  { field: 'e20', label: '⑬ 受取配当等の益金不算入額' },
  { field: 'e21', label: '⑭ 左の所得税額' },
  { field: 'e22', label: '⑮ 損金算入した繰越欠損金の控除額' },
] as const;

/** 利益0・想定利益：直前期の⑪を金額そのものに、⑫〜⑮を0に置き換える（valuationReport の withProfit） */
function profitInputSection(amount: number, current: Getter, trial: Getter): WorksheetSection {
  return {
    title: '1. 差し替えた入力（第４表の１ 直前期）',
    note: '直前々期以前の実績と第５表・会社規模は現在のままです。',
    rows: inputRows([
      { field: 'e18', label: '⑪ 法人税の課税所得金額', process: `直前期の年利益金額を ${hv(amount)}千円 とするため、⑪を ${hv(amount)}千円 に置き換え` },
      ...PROFIT_ADJUST_FIELDS.map(({ field, label }) => ({
        field,
        label,
        process: `⑯＝⑪－⑫＋⑬－⑭＋⑮ が ⑪ の ${hv(amount)}千円 と一致するよう 0千円 に置き換え`,
      })),
    ], current, trial),
  };
}

/** 退職金：⑪ −退職金＋解約益、⑫ ＋解約益−退職金（負数は0）、⑱ −退職金＋解約益、第5表へ未払退職金（retirementSimulation の withRetirement） */
function retirementInputSection(pay: number, gain: number, current: Getter): WorksheetSection {
  const now = (field: string) => numberOf(current('table4', field));
  const income = now('e18');
  const nonRecurring = now('e19') ?? 0;
  const netNonRecurring = nonRecurring + gain - pay;
  const retained = now('n53');
  const plusMinus = (base: number | null) => base === null ? null : base - pay + gain;
  // 空欄は様式どおり0として計算に使うので、変わったかどうかも0とみなして比べる
  const row = (label: string, before: number | null, after: number | null, process: string, empty = '未入力'): WorksheetRow => ({
    label, current: show(before, '千円', empty), trial: show(after, '千円', empty), process, changed: (before ?? 0) !== (after ?? 0),
  });
  return {
    title: '1. 差し替えた入力',
    note: '支払原資・資産構成・会社規模は現在のままです。保険の解約は資産の置き換えなので第５表では動かしません（保険は解約返戻金相当額で評価済み）。',
    rows: [
      row('第４表の１ ⑪ 法人税の課税所得金額（直前期）', income, plusMinus(income),
        `${hv(income)} － 退職金 ${hv(pay)} ＋ 解約益 ${hv(gain)} ＝ ${rv(plusMinus(income))}千円`
        + '\n退職金は損金、保険の解約益は益金として直前期に計上'),
      row('第４表の１ ⑫ 非経常的な利益金額（直前期）', now('e19'), nonRecurringAfterRetirement(nonRecurring, pay, gain),
        `${hv(nonRecurring)} ＋ 解約益 ${hv(gain)} － 退職金 ${hv(pay)} ＝ ${hv(netNonRecurring)}千円`
        + (netNonRecurring < 0 ? '（負数のため0千円）' : '')
        + '\n保険差益は非経常的な利益、退職金は非経常的な損失として相殺（評価通達183(2)）'
        + '\n⑫は非経常的な損失を控除した純額で、負数になるときは0（明細書の記載方法）'),
      row('第４表の１ ⑱ 利益積立金額（直前期）', retained, plusMinus(retained),
        `${hv(retained)} － 退職金 ${hv(pay)} ＋ 解約益 ${hv(gain)} ＝ ${rv(plusMinus(retained))}千円`),
      row(`第５表 負債「${RETIREMENT_LIABILITY_NAME}」`, null, pay,
        `未払退職金として、相続税評価額・帳簿価額とも ${hv(pay)}千円 を負債の部に追加`, '－'),
    ],
  };
}

// ── 2〜5. 様式ごとの再計算 ──

function table4_1Section(current: Side, trial: Side): WorksheetSection {
  const medical = isMedical(trial.get);
  const hints = table4_1Hints(trial.t4, (f) => trial.get('table4', f), medical);
  return {
    title: '2. 第４表の１ 比準要素等の金額',
    note: null,
    rows: rowsOf([
      { label: '㊁ 直前期の差引利益金額（⑯）', unit: '千円', value: (s) => s.t4.p1, process: hints['㊁']! },
      { label: '㋭ 直前々期の差引利益金額（⑯）', unit: '千円', value: (s) => s.t4.p2, process: hints['㋭']! },
      { label: 'Ⓒ 1株（50円）当たりの年利益金額', unit: '円', value: (s) => s.t4.Cv, process: hints.C! },
      { label: '㋣ 直前期末の純資産価額（⑲）', unit: '千円', value: (s) => s.t4.t1, process: hints['㋣']! },
      { label: 'Ⓓ 1株（50円）当たりの純資産価額', unit: '円', value: (s) => s.t4.Dv, process: hints.D1! },
      { label: 'Ⓑ 1株（50円）当たりの年配当金額', unit: '円銭', value: (s) => s.t4.Bv, process: hints.B1! },
    ], current, trial),
  };
}

function table4_2Section(current: Side, trial: Side): WorksheetSection {
  const medical = isMedical(trial.get);
  const hints = table4_2Hints(trial.t4, (f) => trial.get('table4', f), medical, trial.get('table1_1', 'f14_m'));
  const usesSecond = !medical && (current.t4.A2 !== null || trial.t4.A2 !== null);
  const block = (
    fp: 'r1' | 'r2', position: string,
    keys: { e: 'e1' | 'e2'; ratio: '㉑' | '㉔'; price: '㉒' | '㉕' },
    ratio: (s: Side) => number | null, price: (s: Side) => number | null,
  ): RowSpec[] => [
    ...(medical ? [] : [{ label: `Ⓑ÷B 配当の比準割合（${position}）`, unit: '割合' as const, value: (s: Side) => s.t4[`${keys.e}B`], process: hints[`${fp}eB`]! }]),
    { label: `Ⓒ÷C 利益の比準割合（${position}）`, unit: '割合', value: (s) => s.t4[`${keys.e}C`], process: hints[`${fp}eC`]! },
    { label: `Ⓓ÷D 純資産の比準割合（${position}）`, unit: '割合', value: (s) => s.t4[`${keys.e}D`], process: hints[`${fp}eD`]! },
    { label: `${keys.ratio} 比準割合（${position}）`, unit: '割合', value: ratio, process: hints[keys.ratio]! },
    { label: `${keys.price} 1株（50円）当たりの比準価額（${position}）`, unit: '円銭', value: price, process: hints[keys.price]! },
  ];
  return {
    title: '3. 第４表の２ 類似業種比準価額',
    note: null,
    rows: rowsOf([
      ...block('r1', usesSecond ? '上段' : '類似業種', { e: 'e1', ratio: '㉑', price: '㉒' }, (s) => s.t4.r21, (s) => s.t4.p22),
      ...(usesSecond ? block('r2', '下段', { e: 'e2', ratio: '㉔', price: '㉕' }, (s) => s.t4.r24, (s) => s.t4.p25) : []),
      { label: '㉖ 1株当たりの比準価額', unit: '円', value: (s) => s.t4.v26, process: hints['㉖']! },
      { label: '㉘ 比準価額（配当金額の修正後）', unit: '円', value: (s) => s.t4.v27, process: hints['㉘']!, optional: true },
      { label: '㉜ 比準価額（割当株式の修正後）', unit: '円', value: (s) => s.t4.v28, process: hints['㉜']!, optional: true },
    ], current, trial),
  };
}

const TABLE5_ROWS: readonly { key: string; label: string; unit: Unit; value: (s: Side) => number | null; retirementOnly?: boolean; optional?: boolean }[] = [
  { key: '③', label: '③ 負債の合計（相続税評価額）', unit: '千円', value: (s) => s.t5.liabilityEval, retirementOnly: true },
  { key: '④', label: '④ 負債の合計（帳簿価額）', unit: '千円', value: (s) => s.t5.liabilityBook, retirementOnly: true },
  { key: '⑤', label: '⑤ 相続税評価額による純資産価額', unit: '千円', value: (s) => s.t5.netEval },
  { key: '⑥', label: '⑥ 帳簿価額による純資産価額', unit: '千円', value: (s) => s.t5.netBook, retirementOnly: true },
  { key: '⑦', label: '⑦ 評価差額に相当する金額', unit: '千円', value: (s) => s.t5.evaluationDifference, retirementOnly: true },
  { key: '⑧', label: '⑧ 評価差額に対する法人税額等相当額', unit: '千円', value: (s) => s.t5.corporateTaxEquivalent },
  { key: '⑨', label: '⑨ 課税時期現在の純資産価額', unit: '千円', value: (s) => s.t5.currentNet },
  { key: '⑩', label: '⑩ 課税時期現在の発行済株式数', unit: '株', value: (s) => s.t5.currentShares, retirementOnly: true },
  { key: '⑪', label: '⑪ 1株当たりの純資産価額', unit: '円', value: (s) => s.t5.netPerShare },
  { key: '⑫', label: '⑫ 同族株主等の議決権割合が50％以下の場合', unit: '円', value: (s) => s.t5.netPerShare80, optional: true },
];

function table5Section(current: Side, trial: Side, recalculated: boolean): WorksheetSection {
  const hints = table5Hints(trial.t5);
  return {
    title: '4. 第５表 1株当たりの純資産価額',
    note: recalculated ? null : '年利益金額の置き換えは第５表に影響しないため、現在と同額です。',
    rows: rowsOf(
      TABLE5_ROWS
        .filter((spec) => recalculated || !spec.retirementOnly)
        .map((spec) => ({ ...spec, process: recalculated ? hints[spec.key]! : '現在と同額' })),
      current, trial,
    ),
  };
}

/** 会社規模に応じて使う算式（④大会社／⑤中会社／⑥小会社） */
function sizeSpec(trial: Side, hints: Record<string, string>): RowSpec {
  const { size } = trial.t3;
  if (size === 4) return { label: '④ 大会社の株式の価額', unit: '円', value: (s) => s.t3.v4, process: hints['④']! };
  if (size === 0) return { label: '⑥ 小会社の株式の価額', unit: '円', value: (s) => s.t3.v6, process: hints['⑥']! };
  if (size !== null) return { label: '⑤ 中会社の株式の価額', unit: '円', value: (s) => s.t3.v5, process: `${hints['⑤']}\n${hints['L割合']}` };
  return { label: '④⑤⑥ 株式の価額', unit: '円', value: (s) => s.t3.base, process: '第１表の２の会社規模が未判定のため、使う算式が決まりません' };
}

function priceDifference(current: number | null, trial: number | null): string {
  if (current === null || trial === null) return '現在または試算の価額が算定できていないため、差額を計算できません';
  const diff = trial - current;
  return `試算 ${rv(trial)}円 － 現在 ${rv(current)}円 ＝ ${diff > 0 ? '＋' : diff < 0 ? '－' : ''}${hv(Math.abs(diff))}円`
    + (diff === 0 ? '（現在と同額）' : `（現在より${diff > 0 ? '高い' : '低い'}）`);
}

function table3Section(current: Side, trial: Side): WorksheetSection {
  const hints = table3Hints(trial.t3, (f) => trial.get('table3', f), trial.get);
  return {
    title: '5. 第３表 原則的評価方式による価額',
    note: null,
    rows: rowsOf([
      { label: '① 類似業種比準価額', unit: '円', value: (s) => s.t3.v1, process: `${hints['①']}\n＝ ${rv(trial.t3.v1)}円` },
      { label: '② 1株当たりの純資産価額', unit: '円', value: (s) => s.t3.v2, process: `第５表の⑪ ${rv(trial.t3.v2)}円` },
      { label: '③ 同上の80％相当額', unit: '円', value: (s) => s.t3.v3, process: `第５表の⑫ ${rv(trial.t3.v3)}円`, optional: true },
      sizeSpec(trial, hints),
      { label: '⑧ 株式の価額（配当金額の修正後）', unit: '円', value: (s) => s.t3.v8, process: hints['⑧']!, optional: true },
      { label: '⑫ 株式の価額（割当株式の修正後）', unit: '円', value: (s) => s.t3.v12, process: hints['⑫']!, optional: true },
      {
        label: '原則的評価方式による価額', unit: '円', value: (s) => s.t3.gensoku,
        process: priceDifference(current.t3.gensoku, trial.t3.gensoku),
      },
    ], current, trial),
  };
}

// ── 試算ごとの組み立て ──

type ScenarioHead = Pick<WorksheetScenario, 'key' | 'title' | 'basis' | 'description'>;

function skippedScenario(head: ScenarioHead, reason: string): WorksheetScenario {
  return {
    ...head, id: `${head.key}-${head.basis}`, basisLabel: BASIS_LABELS[head.basis].label,
    skipped: reason, sections: [], currentPrice: null, trialPrice: null,
  };
}

function computedScenario(head: ScenarioHead, currentGet: Getter, trialGet: Getter, inputs: WorksheetSection): WorksheetScenario {
  const current = sideOf(currentGet);
  const trial = sideOf(trialGet);
  return {
    ...head, id: `${head.key}-${head.basis}`, basisLabel: BASIS_LABELS[head.basis].label,
    skipped: null,
    sections: [
      inputs,
      table4_1Section(current, trial),
      table4_2Section(current, trial),
      table5Section(current, trial, head.key === 'retirement'),
      table3Section(current, trial),
    ],
    currentPrice: current.t3.gensoku,
    trialPrice: trial.t3.gensoku,
  };
}

/** 利益0・想定利益・退職金の計算過程。出す試算は入力の有無で決め、サマリーの表示の切替には連動させない */
export function buildCalculationWorksheet(getField: Getter): CalculationWorksheet {
  const options = readSummaryOptions(getField);
  // 利益0・想定利益はサマリーでも相続税評価額ベースの試算なので、それに合わせる
  const inheritance = withPurpose(getField, 'inheritance');
  const scenarios: WorksheetScenario[] = [];

  scenarios.push(computedScenario(
    {
      key: 'zero-profit', title: '利益0の場合', basis: 'inheritance',
      description: '第４表の１の直前期の年利益金額を0として、類似業種比準価額と原則的評価方式による価額を再計算します。',
    },
    inheritance, withProfit(inheritance, 0), profitInputSection(0, inheritance, withProfit(inheritance, 0)),
  ));

  const assumedHead: ScenarioHead = {
    key: 'assumed-profit', title: '想定利益の場合', basis: 'inheritance',
    description: options.assumedProfit === null
      ? '第４表の１の直前期の年利益金額を想定利益に置き換えて再計算します。'
      : `第４表の１の直前期の年利益金額を想定利益 ${hv(options.assumedProfit)}千円 として、類似業種比準価額と原則的評価方式による価額を再計算します。`,
  };
  if (options.assumedProfit === null) {
    scenarios.push(skippedScenario(assumedHead, 'サマリーの想定利益が未入力のため省略'));
  } else {
    const assumed = withProfit(inheritance, options.assumedProfit);
    scenarios.push(computedScenario(assumedHead, inheritance, assumed, profitInputSection(options.assumedProfit, inheritance, assumed)));
  }

  const simulation = calcRetirementSimulation(getField);
  const pay = simulation.amount ?? 0;
  const gain = simulation.proceeds ?? 0;
  const retirementHead = (basis: ValuationBasisKey): ScenarioHead => ({
    key: 'retirement', title: '退職金を支給した場合', basis,
    description: `直前期に退職金 ${hv(pay)}千円 を支給して損金に算入${gain > 0 ? `し、保険の解約益 ${hv(gain)}千円 を益金に計上` : ''}した場合の価額を再計算します。`,
  });
  const retired = simulation.bases.length > 0 ? withRetirement(getField, pay, gain) : null;
  if (!retired) {
    const reason = simulation.error
      ? `入力に不備があるため省略（${simulation.error}）`
      : 'サマリーの退職金の試算（退職金額・保険の解約益）が未入力のため省略';
    scenarios.push(skippedScenario(retirementHead('inheritance'), reason));
  } else {
    // 退職金はサマリーで評価ベースを選べるので、その絞り込みに合わせる
    for (const { key } of filterBases(simulation.bases, options.basis)) {
      const inputs = retirementInputSection(pay, gain, getField);
      scenarios.push(computedScenario(retirementHead(key), withPurpose(getField, key), withPurpose(retired, key), inputs));
    }
  }

  return {
    companyName: getField('table1_1', 'f12') || '会社名未入力',
    valuationDate: eraDate(getField),
    scenarios,
  };
}
