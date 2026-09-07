/**
 * 来期の見通し（比準要素数1の会社・比準要素数0の会社への該当リスク）。
 *
 * 第4表の判定要素は毎期1年ずつ繰り上がる。来期の⑵（直前々期末を基準にしたⒷ2・Ⓒ2・Ⓓ2）は、
 * 今期の⑴（Ⓑ・Ⓒ・Ⓓ）とまったく同じ値になる。したがって
 *  ・今期の⑴でゼロが2つ以上（医療法人は1つ以上）→ 来期の⑵側の条件は成立が確定
 *  ・今期の⑴でゼロがそれ未満              → 来期に比準要素数1の会社となることはあり得ない
 * と言い切れる。比準要素数0の会社（第2表の4⑵）は⑴だけで決まるため繰り上がりは無関係。
 *
 * ここでいう「来期」は、次の決算を経過した後の課税時期を指す。
 * 影響額は現在の入力値をそのまま使った試算で、修正欄・資本金等の額の変動は織り込まない。
 */
import { calcTable2 } from '@/components/tables/table2/Table2Grid';
import { calcTable3 } from '@/components/tables/table3/Table3Grid';
import { calcTable6 } from '@/components/tables/table6/calcTable6';
import { RESULT_NAMES } from '@/lib/clientSummary';
import type { TableProps } from '@/types/form';

export type ElementKey = 'B' | 'C' | 'D';

export type ElementForecast = {
  key: ElementKey;
  label: string;
  /** 医療法人（持分あり）の配当要素のように判定から外れる要素 */
  excluded: boolean;
  /** 今期の⑴の値（1株50円当たり・円） */
  current: number | null;
  isZeroNow: boolean | null;
  /** 今期の基となる金額（千円）。Ⓑ=年配当金額、Ⓒ=年利益金額、Ⓓ=資本金等＋利益積立金 */
  baseNow: number | null;
  /** 来期にこの要素をゼロにしないために必要な金額（千円） */
  required: number | null;
  requiredNote: string;
};

export type ForecastScenario = {
  key: 'hijun1' | 'hijun0';
  label: string;
  /** 来期の⑴でゼロになる要素の数がこの数のとき該当する */
  zerosNeeded: number;
  possible: boolean;
  impossibleReason: string | null;
  resultIfHit: number;
  resultLabel: string;
  price: number | null;
  diff: number | null;
  diffRate: number | null;
  /** 現在の判定と同じ区分になるため株価の算定方法が変わらない */
  noEffect: boolean;
};

export type NextYearForecast = {
  known: boolean;
  medical: boolean;
  zerosNow: number | null;
  /** 来期に比準要素数1の会社となるのに必要なゼロの数 */
  zerosNeededFor1: number;
  zeroLabels: string[];
  /** 来期の⑵（＝今期の⑴）の条件が既に成立しているか */
  carryOverMet: boolean | null;
  currentResult: number;
  currentResultLabel: string;
  currentPrice: number | null;
  elements: ElementForecast[];
  scenarios: ForecastScenario[];
};

const B_LABEL = 'Ⓑ 年配当金額';
const C_LABEL = 'Ⓒ 年利益金額';
const D_LABEL = 'Ⓓ 純資産価額（帳簿価額）';

/** 必要額は千円未満を切り上げる（下回るとゼロ判定になるため） */
const ceilThousand = (v: number) => Math.max(0, Math.ceil(v - 1e-9));
const fmt = (v: number) => v.toLocaleString('ja-JP');

export function calcNextYearForecast(getField: TableProps['getField']): NextYearForecast {
  const t2 = calcTable2(getField);
  const t3 = calcTable3(getField);
  const t6 = calcTable6(getField);
  const t4 = t2.t4;
  const medical = getField('table1_1', 'medical') === '1';
  const cap5 = t4.cap5;                       // ⑤ 1株50円当たりの発行済株式数
  const hasCap = cap5 !== null && cap5 > 0;

  // 今期の⑴。来期にはこれがそのまま⑵へ繰り上がる
  const set1 = medical ? [t4.c1, t4.d1] : [t4.b1, t4.c1, t4.d1];
  const zerosNow = set1.every((v) => v !== null) ? set1.filter((v) => v === 0).length : null;
  const zerosForHijun1 = medical ? 1 : 2;
  const zerosForHijun0 = medical ? 2 : 3;
  const carryOverMet = zerosNow === null ? null : zerosNow >= zerosForHijun1;
  const known = zerosNow !== null && hasCap;

  // ── 来期にゼロを避けるために必要な金額（千円） ──
  // per50(kc) = kc×1000÷⑤。Ⓑは10銭未満切捨てで0.1未満がゼロ、Ⓒ・Ⓓは円未満切捨てで1未満がゼロ。
  const oneYen = hasCap ? (cap5 as number) / 1000 : null;      // Ⓒ・Ⓓの下限（千円）
  const tenSen = hasCap ? (cap5 as number) / 10000 : null;     // Ⓑの2年平均の下限（千円）

  // Ⓑ: 来期の⑨は（来期の年配当金額＋今期の年配当金額）÷2
  const reqB = tenSen !== null && t4.i1 !== null ? ceilThousand(tenSen * 2 - t4.i1) : null;
  const noteB = reqB === null
    ? '第4表の年配当金額と⑤（1株50円当たりの発行済株式数）を入力すると必要額を算出します。'
    : reqB === 0
      ? `今期の年配当金額（${fmt(t4.i1 as number)}千円）だけで2年平均が基準を満たすため、来期が無配でもⒷがゼロになることはありません。`
      : `来期の年配当金額が ${fmt(reqB)}千円以上であれば、来期のⒷはゼロになりません（今期は ${fmt(t4.i1 as number)}千円。直前期・直前々期の2年平均で判定します）。`;

  // Ⓒ: 単年と2年平均のどちらを採るかで必要額が変わる（第4表の選択欄）
  const cMode = getField('table4', 'c1_mode');
  const reqCSingle = oneYen !== null ? ceilThousand(oneYen) : null;
  const reqCAvg = oneYen !== null && t4.p1 !== null ? ceilThousand(oneYen * 2 - t4.p1) : null;
  const reqC = cMode === 'single'
    ? reqCSingle
    : cMode === 'avg'
      ? reqCAvg
      : reqCSingle !== null && reqCAvg !== null ? Math.max(reqCSingle, reqCAvg) : null;
  // 2年平均側は今期の利益で下駄を履くため、必要額が0（来期が無利益でもゼロにならない）になることがある
  const noteC = reqC === null
    ? '第4表の利益金額と⑤（1株50円当たりの発行済株式数）を入力すると必要額を算出します。'
    : reqC === 0
      ? `今期の年利益金額（${fmt(t4.p1 as number)}千円）だけで2年平均が基準を満たすため、来期が無利益でもⒸがゼロになることはありません。`
      : cMode === 'single'
        ? `来期の年利益金額が ${fmt(reqC)}千円以上であれば、来期のⒸはゼロになりません（第4表で「直前期の利益金額」を採用中）。`
        : cMode === 'avg'
          ? `来期の年利益金額が ${fmt(reqC)}千円以上であれば、来期のⒸはゼロになりません（第4表で「2年平均」を採用中。今期の ${fmt(t4.p1 as number)}千円との平均で判定します）。`
          : `来期の年利益金額が ${fmt(reqC)}千円以上であれば、来期のⒸはゼロになりません（第4表は低い方の自動選択のため、単年 ${fmt(reqCSingle as number)}千円・2年平均 ${fmt(reqCAvg as number)}千円の両方を満たす必要があります）。${reqCAvg === 0
            ? '第4表の選択欄で「2年平均」を指定すれば、来期が無利益でもⒸはゼロになりません。'
            : `第4表の選択欄で有利な方を指定すれば ${fmt(Math.min(reqCSingle as number, reqCAvg as number))}千円で足ります。`}`;

  // Ⓓ: 来期末の資本金等の額＋利益積立金額（単年で判定するため繰り上がりの影響を受けない）
  const reqD = oneYen !== null ? ceilThousand(oneYen) : null;
  const noteD = reqD === null
    ? '第4表の資本金等の額・利益積立金額を入力すると必要額を算出します。'
    : `来期末の「資本金等の額＋利益積立金額」が ${fmt(reqD)}千円以上であれば、来期のⒹはゼロになりません（今期は ${t4.t1 === null ? '未入力' : `${fmt(t4.t1)}千円`}）。`;

  const elements: ElementForecast[] = [
    {
      key: 'B',
      label: B_LABEL,
      excluded: medical,
      current: medical ? null : t4.b1,
      isZeroNow: medical || t4.b1 === null ? null : t4.b1 === 0,
      baseNow: medical ? null : t4.i1,
      required: medical ? null : reqB,
      requiredNote: medical
        ? '医療法人（持分あり）は剰余金の配当ができないため、配当要素を除いた2要素で判定します。'
        : noteB,
    },
    {
      key: 'C',
      label: C_LABEL,
      excluded: false,
      current: t4.c1,
      isZeroNow: t4.c1 === null ? null : t4.c1 === 0,
      baseNow: t4.p1,
      required: reqC,
      requiredNote: noteC,
    },
    {
      key: 'D',
      label: D_LABEL,
      excluded: false,
      current: t4.d1,
      isZeroNow: t4.d1 === null ? null : t4.d1 === 0,
      baseNow: t4.t1,
      required: reqD,
      requiredNote: noteD,
    },
  ];
  const zeroLabels = elements.filter((e) => e.isZeroNow === true).map((e) => e.label);

  // ── 影響額（いずれも修正前の価額どうしで比較する） ──
  const priceOf = (result: number): number | null => {
    if (result === 0) return t3.base;
    const byResult: Record<number, number | null> = { 1: t6.p4, 2: t6.p5, 3: t6.p6, 4: t6.p7, 5: t6.p8 };
    return byResult[result] ?? null;
  };
  const currentPrice = priceOf(t2.result);
  const unknownReason = '第4表の判定要素（Ⓑ・Ⓒ・Ⓓ）と⑤が確定していないため、来期の見通しを算定できません。';

  const scenario = (
    key: ForecastScenario['key'],
    label: string,
    zerosNeeded: number,
    resultIfHit: number,
    possible: boolean,
    impossibleReason: string | null,
  ): ForecastScenario => {
    const price = priceOf(resultIfHit);
    const diff = price !== null && currentPrice !== null ? price - currentPrice : null;
    return {
      key,
      label,
      zerosNeeded,
      possible,
      impossibleReason,
      resultIfHit,
      resultLabel: RESULT_NAMES[resultIfHit] ?? '判定未完了',
      price,
      diff,
      diffRate: diff !== null && currentPrice !== null && currentPrice > 0
        ? Math.round((diff / currentPrice) * 1000) / 10
        : null,
      noEffect: resultIfHit === t2.result,
    };
  };

  const scenarios: ForecastScenario[] = [
    scenario(
      'hijun1',
      '来期に比準要素数1の会社となる場合',
      zerosForHijun1,
      // 比準要素数1は第2表で最も弱い判定（1番）。既に他の区分に該当していればそちらが優先される
      t2.result === 0 ? 1 : t2.result,
      known && carryOverMet === true,
      !known
        ? unknownReason
        : carryOverMet === false
          ? `今期の⑴でゼロは${zerosNow}個です。来期の⑵は今期の⑴がそのまま繰り上がるため、来期に比準要素数1の会社となることはありません。`
          : null,
    ),
    scenario(
      'hijun0',
      '来期に比準要素数0の会社となる場合',
      zerosForHijun0,
      // 比準要素数0は第2表の4⑵（開業後3年未満の会社等）。株式等保有特定・土地保有特定より優先される
      t2.result >= 5 ? t2.result : 4,
      known,
      known ? null : unknownReason,
    ),
  ];

  return {
    known,
    medical,
    zerosNow,
    zerosNeededFor1: zerosForHijun1,
    zeroLabels,
    carryOverMet,
    currentResult: t2.result,
    currentResultLabel: RESULT_NAMES[t2.result] ?? '判定未完了',
    currentPrice,
    elements,
    scenarios,
  };
}
