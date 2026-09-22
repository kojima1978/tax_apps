/**
 * 税額の加算・控除に関わる様式。
 * 第4表、第4表の2、第5表、第6表、第7表、第8の8表。
 */

import { ERA_BASE_YEAR } from '../../data/codes';
import { DISABILITY_GENERAL, DISABILITY_SPECIAL } from '../../forms/person';
import { TABLE4_PERSONS, TABLE4_RATE } from '../../forms/table4';
import { TABLE42_BLOCKS, TABLE42_CREDIT_ROWS, TABLE42_PERSONS } from '../../forms/table42';
import { TABLE5_FLOOR } from '../../forms/table5';
import {
  TABLE6_COLS, TABLE6_DISABLED_AGE, TABLE6_DISABLED_RATE, TABLE6_MINOR_AGE, TABLE6_MINOR_RATE, TABLE6_SPECIAL_RATE,
} from '../../forms/table6';
import { TABLE7_ROWS, TABLE7_SPAN } from '../../forms/table7';
import { TABLE88_CREDIT_ROWS, TABLE88_DEFERRAL_ROWS, TABLE88_PERSONS } from '../../forms/table88';
import { type Values, filled, num, str, yen } from './values';

const ERA_START_YEARS: Record<string, number> = {
  '1': 1868,
  '2': 1912,
  '3': 1926,
  '4': 1989,
  '5': 2019,
};

/** 相続開始日当日の満年齢。日付が不足・不正な場合は空欄にする。 */
export function ageAtInheritanceStart(common: Values, heir: Values): number | undefined {
  const startEra = ERA_START_YEARS[common.startEra ?? ''];
  const birthEra = ERA_START_YEARS[heir.birthEra ?? ''];
  const startY = num(common.startY);
  const startM = num(common.startM);
  const startD = num(common.startD);
  const birthY = num(heir.birthY);
  const birthM = num(heir.birthM);
  const birthD = num(heir.birthD);
  if (startEra === undefined || birthEra === undefined
    || startY < 1 || birthY < 1 || startM < 1 || startD < 1 || birthM < 1 || birthD < 1) return undefined;

  const startYear = startEra + startY - 1;
  const birthYear = birthEra + birthY - 1;
  const validDate = (year: number, month: number, day: number): boolean => {
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  };
  if (!validDate(startYear, startM, startD) || !validDate(birthYear, birthM, birthD)) return undefined;

  let age = startYear - birthYear;
  if (startM < birthM || (startM === birthM && startD < birthD)) age -= 1;
  return age >= 0 ? age : undefined;
}

/**
 * 配偶者の相続人番号（0起点。いなければ −1）。続柄コード「01」＝配偶者で判定する。
 * 第5表は配偶者1人分の様式なので、複数いる場合は先に入力された方を配偶者として扱う。
 */
export function spouseIndex(heirs: Values[]): number {
  return heirs.findIndex((h) => h.relation === '01');
}

/** 第5表 各セクションの転記元（上段＝第1表、下段＝第3表） */
interface Table5Source {
  /** キーの接頭辞（'t5s1' / 't5s2'） */
  p: string;
  /** Ⓐ 課税価格の合計額（円） */
  totalA: number;
  /** ⑦ 相続税の総額（円） */
  tax: number;
  /** 法定相続分の分子・分母 */
  numerator: number;
  denominator: number;
  /** 限度額の1つ目（上段は⑨又は⑩、下段は⑩のみ） */
  useV10Only: boolean;
}

/**
 * 第5表（配偶者に対する相続税額の軽減額の計算書）。
 *
 * 上段・下段は転記元（第1表／第3表）が違うだけで算式は同じなので、
 * `Table5Source` を差し替えて同じ計算を2回まわす。
 * ①②③⑤は配偶者の第11表2・第1表からの転記なので、上段・下段で同じ値になる。
 */
export function computeTable5(
  common: Values,
  spouseValues: Values | undefined,
  spouseLawful: Values | undefined,
  totalA: number,
  total7: number,
): Values {
  const out: Values = {};
  if (spouseValues === undefined) return out;
  const lawfulNumerator = num(spouseLawful?.num);
  const lawfulDenominator = num(spouseLawful?.den);
  out.t5num = spouseLawful === undefined ? '' : str(lawfulNumerator);
  out.t5den = spouseLawful === undefined ? '' : str(lawfulDenominator);
  const sources: Table5Source[] = [
    { p: 't5s1', totalA, tax: total7, numerator: lawfulNumerator, denominator: lawfulDenominator, useV10Only: false },
    { p: 't5s2', totalA: yen(common, 't5a3'), tax: yen(common, 't5v17'), numerator: num(common.t5num2), denominator: num(common.t5den2), useV10Only: true },
  ];
  // ①③は第11表2の配偶者の①②、②⑤は第1表の配偶者の③⑤（どちらの段も同じ）
  const v1 = num(spouseValues.t11v1);
  const v2 = num(spouseValues.v3);
  const v3 = num(spouseValues.t11v2);
  const v4 = Math.max(0, v2 - v3);
  // ⑥ 配偶者の税額軽減額を計算する場合の課税価格（⑤より小さいときは⑤・1,000円未満切捨て）
  const v6yen = Math.floor(Math.max(v1 - v4 + num(spouseValues.v5), num(spouseValues.v5)) / 1000) * 1000;
  // 第1表の配偶者の⑨（⑩の記入があれば⑩）と⑫
  const g2 = num(spouseValues.v12);

  for (const s of sources) {
    const show = (n: number, present: boolean) => (present ? str(n) : '');
    const hasA = s.totalA > 0;
    out[`${s.p}v1`] = show(v1, v1 !== 0);
    out[`${s.p}v2`] = show(v2, v2 !== 0);
    out[`${s.p}v3`] = show(v3, v3 !== 0);
    out[`${s.p}v4`] = show(v4, v2 !== 0 || v3 !== 0);
    out[`${s.p}v5`] = show(num(spouseValues.v5), num(spouseValues.v5) !== 0);
    out[`${s.p}v6`] = show(v6yen / 1000, v6yen !== 0);

    // 課税価格の合計額 × 配偶者の法定相続分（円未満切捨て）。16,000万円に満たないときは16,000万円
    const mul = hasA && s.denominator > 0 ? Math.floor((s.totalA * s.numerator) / s.denominator) : 0;
    out[`${s.p}mul`] = show(mul, mul !== 0);
    const i = Math.max(mul, TABLE5_FLOOR);
    out[`${s.p}i`] = show(i, hasA);

    // ⑧ ㋑の金額と⑥の金額のうち少ない方 ／ ⑩ ⑦×⑧÷⑨（円未満切捨て）
    const v8 = Math.min(i, v6yen);
    out[`${s.p}v8`] = show(v8, hasA && v6yen !== 0);
    const v10 = hasA ? Math.floor((s.tax * v8) / s.totalA) : 0;
    out[`${s.p}v10`] = show(v10, hasA && s.tax > 0 && v6yen !== 0);

    // 限度額 ㋺ ＝ （⑨又は⑩）−⑫、軽減額 ㋩ ＝ ⑩と㋺のうち少ない方
    const g1 = s.useV10Only || filled(spouseValues, 'v10') ? num(spouseValues.v10) : num(spouseValues.v9);
    out[`${s.p}g1`] = show(g1, g1 !== 0);
    out[`${s.p}g2`] = show(g2, g2 !== 0);
    const ro = Math.max(0, g1 - g2);
    out[`${s.p}ro`] = show(ro, g1 !== 0);
    out[`${s.p}ha`] = show(Math.min(v10, ro), g1 !== 0 && v10 !== 0);
  }
  return out;
}

/** 第6表③⑤の元になる第1表の相続税額 ＝ （⑨＋⑪−⑫−⑬）又は（⑩＋⑪−⑫−⑬）（円） */
function table1Balance(h: Values | undefined): number {
  if (h === undefined) return 0;
  const base = filled(h, 'v10') ? num(h.v10) : num(h.v9);
  return Math.max(0, base + num(h.v11) - num(h.v12) - num(h.v13));
}

/** 第6表の計算結果 */
interface Table6 {
  /** ②③④⑤と各計（共通欄に持つ自動計算値） */
  totals: Values;
  /** 第8の8表1① 未成年者控除額（第11表の項番 → 円） */
  minor: Map<number, number>;
  /** 第8の8表1② 障害者控除額（同上） */
  disabled: Map<number, number>;
}

/**
 * 第6表（未成年者控除額・障害者控除額の計算書）。
 *
 * 上段（未成年者）と下段（障害者）は、控除額の算式（18歳×10万円／85歳×10万円・20万円）と
 * ③⑤が第8の8表1の①を引くかどうかが違うだけなので、`section` を諸元違いで2回まわす。
 *
 * ③⑤の「第8の8表1の①」は未成年者控除額そのもので、その値は第6表1の min(②,③)
 * （扶養義務者なら⑥の配分額）なのでこの表の中だけで確定する。
 * 上段を先に計算して項番ごとに控えておき（`credits.m`）、下段でそれを差し引く。
 * 同じ作りで採った障害者分（`credits.d`）と併せて、第8の8表1の①②へ渡す。
 *
 * ①年齢は第1表・第1表（続）の年齢から転記し、⑥は扶養義務者間で協議して配分する額なので手入力。
 * それ以外（②③④⑤と各計）は自動計算。
 */
export function computeTable6(common: Values, heirs: Values[]): Table6 {
  const out: Values = {};
  /** 各人が実際に受けた控除額（第11表の項番 → 円）。'm'＝未成年者、'd'＝障害者 */
  const credits = { m: new Map<number, number>(), d: new Map<number, number>() };
  /** 障害者の段だけ、その人の未成年者控除額を差し引いた後の相続税額にする */
  const balance = (minor: boolean, no: number): number => Math.max(
    0, table1Balance(no > 0 ? heirs[no - 1] : undefined) - (minor ? 0 : credits.m.get(no) ?? 0),
  );

  const section = (
    k: 'm' | 'd', minor: boolean, limit: number, rate: (i: number) => number,
    /** 選んだ人がその列の区分に合っているか（合わないときだけ注意を出す） */
    mismatched: (person: Values | undefined, i: number) => boolean,
  ): void => {
    const add = (no: number, amount: number): void => {
      if (no > 0 && amount > 0) credits[k].set(no, (credits[k].get(no) ?? 0) + amount);
    };
    const sums = { v2: 0, v3: 0, v4: 0, v5: 0, v6: 0 };
    // 合計が0でも、列に0が出ているなら計にも0を出す（列が空欄のときだけ計も空欄にする）
    const has = { v2: false, v3: false, v4: false, v5: false, v6: false };
    const allocations: { p: string; v5: number; v6: number }[] = [];
    for (let i = 0; i < TABLE6_COLS; i += 1) {
      const p = `t6${k}${i}`;
      const no = num(common[`${p}no`]);
      const person = no > 0 ? heirs[no - 1] : undefined;
      const age = person?.age ?? '';
      out[`${p}age`] = age;
      out[`${p}noError`] = mismatched(person, i) ? '1' : '';
      const hasAge = age !== '';
      // ② 控除額（万円単位で保持）。基準年齢に達している人は0
      const man = hasAge ? Math.max(0, rate(i) * (limit - num(age))) : 0;
      const v3 = balance(minor, no);
      // ④ 控除しきれない金額（②−③）。②③が揃っていなければ空欄のまま
      const both = hasAge && no > 0;
      const v4 = Math.max(0, man * 10000 - v3);
      out[`${p}v2`] = hasAge ? str(man) : '';
      out[`${p}v3`] = no > 0 ? str(v3) : '';
      out[`${p}v4`] = both ? str(v4) : '';
      sums.v2 += man;
      sums.v3 += no > 0 ? v3 : 0;
      sums.v4 += both ? v4 : 0;
      has.v2 ||= hasAge;
      has.v3 ||= no > 0;
      has.v4 ||= both;
      // その人自身が控除を受けた分は第8の8表1の①②になる
      if (both) add(no, Math.min(man * 10000, v3));

      // 扶養義務者: ⑤は第1表からの転記、⑥はⒶを協議で配分した額（手入力）
      const fp = `t6${k}f${i}`;
      const fno = num(common[`${fp}no`]);
      const v5 = balance(minor, fno);
      out[`${fp}v5`] = fno > 0 ? str(v5) : '';
      sums.v5 += fno > 0 ? v5 : 0;
      has.v5 ||= fno > 0;
      const v6 = num(common[`${fp}v6`]);
      allocations.push({ p: fp, v5, v6 });
      sums.v6 += v6;
      has.v6 ||= filled(common, `${fp}v6`);
      add(fno, v6);
    }
    const show = (n: number, present: boolean): string => (present ? str(n) : '');
    out[`t6${k}T2`] = show(sums.v2, has.v2);
    out[`t6${k}T3`] = show(sums.v3, has.v3);
    out[`t6${k}A`] = show(sums.v4, has.v4);
    out[`t6${k}fT5`] = show(sums.v5, has.v5);
    out[`t6${k}fT6`] = show(sums.v6, has.v6);
    for (const allocation of allocations) {
      out[`${allocation.p}v6Error`] = allocation.v5 > allocation.v6 && sums.v4 > sums.v6 ? '1' : '';
    }
  };

  // 未成年者の段は年齢だけで判定できる（年齢が出ていないときは何も言わない）
  section('m', true, TABLE6_MINOR_AGE, () => TABLE6_MINOR_RATE, (person) => {
    const age = person?.age ?? '';
    return age !== '' && num(age) >= TABLE6_MINOR_AGE;
  });
  // 障害者の段は3列目だけ特別障害者（20万円）。区分が未登録のうちは判定しない
  section(
    'd', false, TABLE6_DISABLED_AGE, (i) => (i === TABLE6_COLS - 1 ? TABLE6_SPECIAL_RATE : TABLE6_DISABLED_RATE),
    (person, i) => {
      const kind = person?.disability ?? '';
      if (kind === '') return false;
      return kind !== (i === TABLE6_COLS - 1 ? DISABILITY_SPECIAL : DISABILITY_GENERAL);
    },
  );
  return { totals: out, minor: credits.m, disabled: credits.d };
}

interface YMD { y: number; m: number; d: number }

/** 元号・年・月・日の欄から西暦の日付を組み立てる。1つでも欠けていれば undefined */
function eraDate(values: Values, p: string): YMD | undefined {
  const base = ERA_BASE_YEAR[(values[`${p}Era`] ?? '').trim()];
  const y = num(values[`${p}Y`]);
  const m = num(values[`${p}M`]);
  const d = num(values[`${p}D`]);
  if (base === undefined || y <= 0 || m <= 0 || d <= 0) return undefined;
  return { y: base + y - 1, m, d };
}

/** 満年数（1年未満切捨て） */
function fullYears(from: YMD, to: YMD): number {
  const before = to.m < from.m || (to.m === from.m && to.d < from.d);
  return to.y - from.y - (before ? 1 : 0);
}

/** 第7表の計算結果 */
interface Table7 {
  /** ③④⑦Ⓐ⑫⑬（共通欄に持つ自動計算値） */
  totals: Values;
  /** 第8の8表1③ 相次相続控除額（第11表の項番 → 円） */
  credit: Map<number, number>;
}

/**
 * 第7表（相次相続控除額の計算書）。
 *
 * 1 の総額Ⓐ ＝ ⑥の相続税額 × ⑧/⑦（1を超えるときは1）× ④の年数/10。
 * 2 の各人の控除額 ＝ Ⓐ × その人の純資産価額の割合。
 *
 * (1)一般の場合 は第1表の④（＝各人の純資産価額）をそのまま使えるが、
 * (2)農業相続人がいる場合 の元になる第3表は未実装なので⑮だけ手入力とし、
 * Ⓒはその合計をとる。⑰⑱の算式は(1)と同じ。
 *
 * ①前の相続の年月日と⑤⑥は前の相続の申告書を見て入力する欄なので手入力。
 * ②は第1表の相続開始年月日からの転記で、③は①②の差（1年未満切捨て）。
 * @param totalNet 第1表④の合計（＝⑧＝Ⓑ）
 */
export function computeTable7(common: Values, heirs: Values[], totalNet: number): Table7 {
  const out: Values = {};
  /** 第8の8表1③ 相次相続控除額（第11表の項番 → 円） */
  const credit = new Map<number, number>();
  const prev = eraDate(common, 't7p');
  const now = eraDate(common, 'start');
  const span = prev === undefined || now === undefined ? undefined : Math.max(0, fullYears(prev, now));
  out.t7v3 = span === undefined ? '' : str(span);
  out.t7v4 = span === undefined ? '' : str(Math.max(0, TABLE7_SPAN - span));

  // ⑦（⑤−⑥）。赤字のときは0
  const v6 = num(common.t7v6);
  const hasAmount = filled(common, 't7v5') || filled(common, 't7v6');
  const v7 = Math.max(0, num(common.t7v5) - v6);
  out.t7v7 = hasAmount ? str(v7) : '';

  // Ⓐ 相次相続控除額の総額（円未満切捨て）。⑦が0でも⑧があれば割合は1とする
  const ratio = v7 > 0 ? Math.min(totalNet / v7, 1) : (totalNet > 0 ? 1 : 0);
  const a = Math.floor((v6 * ratio * num(out.t7v4)) / TABLE7_SPAN);
  const hasA = hasAmount && span !== undefined;
  out.t7A = hasA ? str(a) : '';

  /** 1段分（(1)(2) 共通）。⑫⑰の割合は第1表⑧と同じ小数2桁 */
  const rows = (k: string, value: (i: number) => string, total: number): void => {
    for (let i = 0; i < TABLE7_ROWS; i += 1) {
      const p = `t7${k}${i}`;
      const no = num(common[`${p}no`]);
      const share = no > 0 && total > 0 ? (num(value(i)) / total).toFixed(2) : '';
      const v13 = share !== '' && hasA ? Math.floor(a * num(share)) : undefined;
      out[`${p}v12`] = share;
      out[`${p}v13`] = v13 === undefined ? '' : str(v13);
      // 第8の8表1③（⑬又は⑱）。(1)と(2)は択一なので、両方に書いてあれば後の(2)を採る
      if (v13 !== undefined && v13 > 0) credit.set(no, v13);
    }
  };

  // (1) 一般の場合: ⑩は第1表の各人の④、Ⓑは第1表④の合計
  for (let i = 0; i < TABLE7_ROWS; i += 1) {
    const no = num(common[`t7a${i}no`]);
    const h = no > 0 ? heirs[no - 1] : undefined;
    out[`t7a${i}v10`] = h === undefined ? '' : str(num(h.v4));
  }
  rows('a', (i) => out[`t7a${i}v10`] ?? '', totalNet);

  // (2) 農業相続人がいる場合: 第3表が未実装なので⑮は手入力、Ⓒはその合計
  let sum15 = 0;
  let has15 = false;
  for (let i = 0; i < TABLE7_ROWS; i += 1) {
    sum15 += num(common[`t7b${i}v15`]);
    has15 ||= filled(common, `t7b${i}v15`);
  }
  out.t7C = has15 ? str(sum15) : '';
  rows('b', (i) => common[`t7b${i}v15`] ?? '', sum15);

  return { totals: out, credit };
}

/** 第4表の計算結果 */
interface Table4 {
  /** ①③④⑥（共通欄に持つ自動計算値） */
  totals: Values;
  /** 第1表⑪へ転記する⑥（相続人の番号は0起点） */
  v11: Map<number, string>;
}

/**
 * 第4表（相続税額の加算金額の計算書）。
 *
 * ⑥ ＝ ①×0.2。ただし④又は⑤があるときは（①−④−⑤）×0.2。
 * ① は第1表⑨（⑩に記入があれば⑩）、③ は第1表①＋②＋⑤、④ は ①×②÷③（円未満切捨て）。
 *
 * ② は「一親等の血族であった期間内の相続時精算課税適用財産」で第1表からは出せないので手入力。
 * ⑤ の第4表の付表は実装対象の様式に含まれないのでこちらも手入力。
 *
 * 氏名は第6表・第7表と同じ選択式（項番→氏名）で、選ばれた人の第1表を参照する。
 * @param heirs 2周目まで確定した第1表（⑨と①②⑤が入っている）
 */
export function computeTable4(common: Values, heirs: Values[], pages: number): Table4 {
  const out: Values = {};
  const v11 = new Map<number, string>();
  const show = (n: number, present: boolean): string => (present ? str(n) : '');

  for (let i = 0; i < pages * TABLE4_PERSONS; i += 1) {
    const p = `t4${i}`;
    const no = num(common[`${p}no`]);
    const h = no > 0 ? heirs[no - 1] : undefined;
    if (h === undefined) {
      for (const key of ['v1', 'v3', 'v4', 'v6']) out[`${p}${key}`] = '';
      continue;
    }
    // ① 各人の税額控除前の相続税額（第1表⑨。⑩に記入があればそちら）
    const v1 = filled(h, 'v10') ? num(h.v10) : num(h.v9);
    const hasV1 = filled(h, 'v9') || filled(h, 'v10');
    // ③ 相続税の課税価格に算入された財産の価額（第1表①＋②＋⑤）
    const v3 = num(h.v1) + num(h.v2) + num(h.v5);
    const hasV3 = filled(h, 'v1') || filled(h, 'v2') || filled(h, 'v5');
    // ④ 加算の対象とならない相続税額（①×②÷③）（円未満切捨て）
    const hasV4 = filled(common, `${p}v2`) && v3 > 0;
    const v4 = hasV4 ? Math.floor((v1 * num(common[`${p}v2`])) / v3) : 0;
    const v5 = num(common[`${p}v5`]);
    // ⑥ 相続税額の加算金額。④又は⑤があるときは①からその分を差し引いてから2割にする
    const cut = hasV4 || filled(common, `${p}v5`);
    const v6 = Math.floor(Math.max(0, cut ? v1 - v4 - v5 : v1) * TABLE4_RATE);

    out[`${p}v1`] = show(v1, hasV1);
    out[`${p}v3`] = show(v3, hasV3);
    out[`${p}v4`] = show(v4, hasV4);
    out[`${p}v6`] = show(v6, hasV1);
    if (hasV1) v11.set(no - 1, str(v6));
  }
  return { totals: out, v11 };
}

/** 第4表の2の計算結果 */
interface Table42 {
  /** ④⑧㉕（共通欄に持つ自動計算値） */
  totals: Values;
  /** 第1表⑫へ転記する㉕（相続人の番号は0起点） */
  v12: Map<number, string>;
}

/**
 * 第4表の2（暦年課税分の贈与税額控除額の計算書）。
 *
 * 年分ごとに ④＝③×②÷①（特例贈与財産分）と ⑧＝⑦×⑥÷⑤（一般贈与財産分）を求め（円未満切捨て）、
 * ㉕＝④＋⑧＋⑫＋⑯＋⑳＋㉔ をその人の贈与税額控除額とする。
 * ①〜③・⑤〜⑦は贈与税の申告書を書き写す欄なので、この様式は自分の入力だけで完結する。
 * そのため第4表と違って第1表を1周する前に確定でき、第5表㋺（配偶者の⑫を引く）にも間に合う。
 */
export function computeTable42(common: Values, pages: number): Table42 {
  const out: Values = {};
  const v12 = new Map<number, string>();

  const eraStarts = [
    { code: '1', year: 1868 },
    { code: '2', year: 1912 },
    { code: '3', year: 1926 },
    { code: '4', year: 1989 },
    { code: '5', year: 2019 },
  ] as const;
  const startEra = eraStarts.find((era) => era.code === common.startEra);
  const startYear = num(common.startY);
  const startGregorianYear = startEra !== undefined && startYear > 0
    ? startEra.year + startYear - 1
    : undefined;

  for (let page = 0; page < pages; page += 1) {
    for (let b = 0; b < TABLE42_BLOCKS; b += 1) {
      const prefix = `t42y${page}b${b}`;
      const targetYear = startGregorianYear === undefined ? undefined : startGregorianYear - b - 1;
      const era = targetYear === undefined
        ? undefined
        : [...eraStarts].reverse().find((candidate) => candidate.year <= targetYear);
      out[`${prefix}Era`] = era?.code ?? '';
      out[`${prefix}Y`] = era === undefined || targetYear === undefined
        ? ''
        : String(targetYear - era.year + 1).padStart(2, '0');
    }
  }

  for (let i = 0; i < pages * TABLE42_PERSONS; i += 1) {
    const p = `t42${i}`;
    let sum = 0;
    let any = false;
    for (let b = 0; b < TABLE42_BLOCKS; b += 1) {
      for (const [dst, tax, base, total] of TABLE42_CREDIT_ROWS) {
        const key = `${p}b${b}r`;
        const den = num(common[`${key}${total}`]);
        // 分母（①又は⑤）が無いと按分できない。分子側が空欄のままなら控除額も空欄にする
        const has = den > 0 && (filled(common, `${key}${tax}`) || filled(common, `${key}${base}`));
        const v = has ? Math.floor((num(common[`${key}${tax}`]) * num(common[`${key}${base}`])) / den) : 0;
        out[`${key}${dst}`] = has ? str(v) : '';
        sum += v;
        any ||= has;
      }
    }
    out[`${p}v25`] = any ? str(sum) : '';
    const no = num(common[`${p}no`]);
    if (no > 0) v12.set(no - 1, any ? str(sum) : '');
  }
  return { totals: out, v12 };
}

/** 第8の8表の計算結果 */
interface Table88 {
  /** 1の①②③⑤・2の⑧（共通欄に持つ自動計算値） */
  totals: Values;
  /** 第1表⑭へ転記する1⑤（相続人の番号は0起点） */
  v14: Map<number, string>;
  /** 第1表⑳へ転記する2⑧（同上。様式が百円単位なので100で割った値） */
  v20: Map<number, string>;
}

/**
 * 第8の8表（税額控除額及び納税猶予税額の内訳書）。
 *
 * 1・2とも「合計＝その上の各行の和」だけの表で、2人分／枚。
 * 1の①②は第6表、③は第7表からの転記なので自動計算にするが、その様式を使っていなければ手入力に戻す。
 * ④（第8表）と2の①〜⑦（第8表2・第8の2表〜第8の6表）は転記元が実装対象の様式に無いので常に手入力。
 *
 * @param t6 第6表の控除額（①②の転記元）
 * @param t7 第7表の控除額（③の転記元）
 * @param useT6 第6表を使っているか（使っていなければ①②も手入力）
 * @param useT7 第7表を使っているか（同じく③）
 */
export function computeTable88(
  common: Values, pages: number, t6: Table6, t7: Table7, useT6: boolean, useT7: boolean,
): Table88 {
  const out: Values = {};
  const v14 = new Map<number, string>();
  const v20 = new Map<number, string>();

  /** 1の①②③（転記になる行）の値。undefined を返した行は手入力 */
  const creditAuto = (i: number, no: number): number | undefined => {
    const source = [useT6 && t6.minor, useT6 && t6.disabled, useT7 && t7.credit][i];
    return source === undefined || source === false ? undefined : source.get(no) ?? 0;
  };

  /**
   * 1人分の段を集計する。合計は転記・手入力のどちらかに記入があるときだけ出す。
   * @returns 氏名を選んでいて合計が出るときだけ、その項番と合計
   */
  const person = (
    k: string, count: number, page: number, cell: number, auto: (i: number, no: number) => number | undefined,
  ): { no: number; total: number } | undefined => {
    const p = `t88${k}p${page}c${cell}`;
    const no = num(common[`${p}no`]);
    let total = 0;
    let any = false;
    for (let i = 0; i < count; i += 1) {
      const key = `${p}v${i + 1}`;
      const t = auto(i, no);
      if (t === undefined) {
        total += num(common[key]);
        any ||= filled(common, key);
        continue;
      }
      // 転記の行は、名前を選び直したときに古い値が残らないよう毎回上書きする
      out[key] = t > 0 ? str(t) : '';
      total += t;
      any ||= t > 0;
    }
    out[`${p}v${count + 1}`] = any ? str(total) : '';
    return any && no > 0 ? { no, total } : undefined;
  };

  for (let page = 0; page < pages; page += 1) {
    for (let cell = 0; cell < TABLE88_PERSONS; cell += 1) {
      const credit = person('a', TABLE88_CREDIT_ROWS, page, cell, creditAuto);
      if (credit !== undefined) v14.set(credit.no - 1, str(credit.total));
      const deferral = person('b', TABLE88_DEFERRAL_ROWS, page, cell, () => undefined);
      // ⑳は様式に「00」が印字されている百円単位の欄
      if (deferral !== undefined) v20.set(deferral.no - 1, str(Math.floor(deferral.total / 100)));
    }
  }

  return { totals: out, v14, v20 };
}
