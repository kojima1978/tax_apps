/**
 * 法定相続人と第2表（相続税の総額の計算書）。
 *
 * 民法上の相続分は `lawfulShare` が出し、ここは様式の欄との橋渡しをする。
 * 第1表のⒷ・⑦・法定相続人の数は第2表からの転記欄。手入力させず totals（'t.' スコープ）に置き、
 * 両様式の同じキーを参照させることで転記のずれが起きないようにしている。
 */

import { RATE_BRACKETS } from '../../forms/table2';
import {
  type Member, SUBSTITUTE_CHILD, SUBSTITUTE_SIBLING, type Share, adoptionCounted, autoLawfulShares, civilShares,
} from '../lawfulShare';
import { type Values, num, str } from './values';

/**
 * 相続人（相続の放棄をした人を除く）の項番（1始まり＝第11表の項番）。
 *
 * 相続税法12条1項6号・7号の非課税は「相続人の取得した」ものだけが対象なので、
 * 受遺者など相続人以外を除くために使う。相続人かどうかは、その人に「法定相続人」の印
 * （`isLawful`）が付いているかで判定し、放棄した人は相続人ではないので除く。
 *
 * 養子の数の制限（相法15条2項）はここでは効かせない。制限は非課税限度額を出すための
 * 「法定相続人の数」に掛かるものであって、制限で数から外れた養子も相続人ではあるため、
 * その人が受け取った保険金・退職手当金は非課税の対象になる。
 */
export function heirNosOfLawfulHeirs(heirs: readonly Values[]): Set<number> {
  const out = new Set<number>();
  heirs.forEach((heir, index) => {
    if (heir.isLawful === '1' && heir.renounced !== '1') out.add(index + 1);
  });
  return out;
}

/**
 * 相続税の速算表で税額（円）を求める。
 * @param thousand 法定相続分に応ずる取得金額（千円単位）
 */
export function rateTax(thousand: number): number {
  if (thousand <= 0) return 0;
  const bracket = RATE_BRACKETS.find((b) => thousand <= b.limit)!;
  return Math.max(0, Math.floor(thousand * 1000 * bracket.rate) - bracket.deduction * 1000);
}

/** 第2表の計算結果 */
interface Table2 {
  /** 法定相続人ごとの⑥⑦⑨⑩ */
  lawful: Values[];
  /** ㋺㋩㋥㋬・Ⓐ・⑧・⑪ と、第1表へ転記するⒷ・⑦ */
  totals: Values;
}

/** ⑤の分子・分母を約分しながら正確に合算し、入力済みの場合だけ合計1かを返す。 */
function lawfulShareIsOne(lawful: Values[]): boolean | undefined {
  let sumNumerator = 0n;
  let sumDenominator = 1n;
  let hasInput = false;

  for (const row of lawful) {
    const numeratorText = (row.num ?? '').trim();
    const denominatorText = (row.den ?? '').trim();
    if (numeratorText === '' && denominatorText === '') continue;
    hasInput = true;
    if (!/^\d+$/.test(numeratorText) || !/^\d+$/.test(denominatorText)) return false;

    const numerator = BigInt(numeratorText);
    const denominator = BigInt(denominatorText);
    if (denominator === 0n) return false;
    sumNumerator = sumNumerator * denominator + numerator * sumDenominator;
    sumDenominator *= denominator;

    let a = sumNumerator;
    let b = sumDenominator;
    while (b !== 0n) [a, b] = [b, a % b];
    if (a !== 0n) {
      sumNumerator /= a;
      sumDenominator /= a;
    }
  }

  return hasInput ? sumNumerator === sumDenominator : undefined;
}

/**
 * 第2表④の一覧を「財産を取得した人」から作る。
 *
 * ④は人の一覧なので、誰を載せるかは人に付ける印（`isLawful`）で決め、行の側では持たない。
 * 並びは登録順。氏名・続柄・放棄は第1表の最新値をそのまま指す。
 *
 * ⑤法定相続分は続柄と人数から自動で入れ、手入力（`lawNum`/`lawDen`）があればそちらを優先する
 * （消せば自動に戻る＝付表の価額と同じ扱い）。自動で決められない組み合わせは空欄のままにする。
 */
export interface LawfulMember {
  /** 何人目か（0始まり） */
  index: number;
  heir: Values;
  /** 法定相続人の数に算入されるか（相法15条2項の養子の数の制限） */
  counted: boolean;
}

/** 人物の欄から `lawfulShare` が見る事実を取り出す */
const memberOf = (heir: Values): Member => ({
  relation: heir.relation ?? '',
  renounced: heir.renounced === '1',
  realChild: heir.realChild === '1',
  substitute: heir.substitute === SUBSTITUTE_CHILD || heir.substitute === SUBSTITUTE_SIBLING
    ? heir.substitute : '',
  substituteFor: heir.substituteFor ?? '',
  halfBlood: heir.halfBlood === '1',
});

/**
 * 「法定相続人」の印が付いた人と、養子の数の制限（相法15条2項）の判定。
 * 制限で外れた養子も戻す（画面でそのことを知らせるため）。
 */
export function lawfulMembers(heirs: readonly Values[]): LawfulMember[] {
  const picked = heirs.flatMap((heir, index) => (heir.isLawful === '1' ? [{ heir, index }] : []));
  const counted = adoptionCounted(picked.map(({ heir }) => memberOf(heir)));
  return picked.map(({ heir, index }, i) => ({ index, heir, counted: counted[i] === true }));
}

/**
 * 表示する分数を決める。手入力があればそちらを使い、消せば自動候補に戻る（付表の価額と同じ扱い）。
 *
 * @param auto 自動候補。`undefined` は自動では決められない（手で入れてもらう）、
 *   `null` は自動で決めた結果「相続分なし」（放棄した人）
 * @returns `num` `den` と、自動候補が出せるか（`autoable`）・手入力で上書きしているか（`override`）
 */
function pickShare(auto: Share | null | undefined, manualNum: string, manualDen: string): Values {
  const manual = manualNum !== '' || manualDen !== '';
  const determined = auto !== undefined;
  if (manual || !determined) {
    return {
      num: manualNum,
      den: manualDen,
      autoable: determined ? '1' : '',
      override: manual && determined ? '1' : '',
    };
  }
  return {
    num: auto === null ? '' : str(auto.num),
    den: auto === null ? '' : str(auto.den),
    autoable: '1',
    override: '',
  };
}

export function deriveLawful(heirs: readonly Values[]): Values[] {
  const members = lawfulMembers(heirs).filter((member) => member.counted);
  const autos = autoLawfulShares(members.map(({ heir }) => memberOf(heir)));
  return members.map(({ heir, index }, i) => ({
    source: str(index),
    name: heir.name ?? '',
    rel: heir.relation ?? '',
    renounced: heir.renounced ?? '',
    ...pickShare(autos?.[i], (heir.lawNum ?? '').trim(), (heir.lawDen ?? '').trim()),
  }));
}

/**
 * 民法上の相続分。未分割の財産の按分（相法55条）にだけ使い、様式には印刷しない。
 *
 * 自動候補を出せるのは「法定相続人」の印が付いた人の分だけだが、行は全員分作る。
 * ある順位の血族が全員放棄すると相続人は次順位へ移り、その人は第2表④に載らない（＝印が無い）ので、
 * そういう場合でも手入力だけで相続分を持てるようにしておく。
 *
 * @param lawful 税法上の法定相続分（`deriveLawful`）。民法上の相続分が自動でも手入力でも
 *   決まらない人の按分に使う。放棄も養子の数の制限も無ければ両者は同じ値なので、
 *   続柄を入れずに第2表④の分数だけ手で入れた入力でも従来どおり按分できる
 */
export function deriveCivil(heirs: readonly Values[], lawful: readonly Values[]): Values[] {
  const lawByIndex = new Map(lawful.map((row) => [Number(row.source), row]));
  const picked = lawfulMembers(heirs);
  const autos = civilShares(picked.map(({ heir }) => memberOf(heir)));
  const autoByIndex = new Map<number, Share | null>();
  if (autos !== undefined) {
    picked.forEach(({ index }, i) => autoByIndex.set(index, autos[i] ?? null));
  }
  return heirs.map((heir, index) => {
    const row: Values = {
      source: str(index),
      name: heir.name ?? '',
      ...pickShare(
        autoByIndex.has(index) ? autoByIndex.get(index)! : undefined,
        (heir.civilNum ?? '').trim(),
        (heir.civilDen ?? '').trim(),
      ),
    };
    // 自動候補も手入力も無い（＝相続分が空のまま）人だけ、税法上の法定相続分で代える。
    // 放棄した人は自動で「相続分なし」と決まっている（autoable が立つ）ので代えない
    if (row.autoable === '1' || row.num !== '' || row.den !== '') return row;
    const law = lawByIndex.get(index);
    return law === undefined ? row : { ...row, num: law.num ?? '', den: law.den ?? '' };
  });
}

/**
 * 第2表（相続税の総額の計算書）。
 * @param lawful `deriveLawful` が作った法定相続人の一覧（載せる人はここで決まっている）
 * @param totalAThousand ㋑ 課税価格の合計額（＝第1表Ⓐ・千円単位）
 */
export function computeTable2(lawful: Values[], totalAThousand: number): Table2 {
  const named = lawful.length;
  const totals: Values = {};
  // 第3表は未対応。保存済みの旧入力値も計算へ混ぜず、㋭は空欄・読み取り専用にする。
  totals.k2 = '';
  const shareIsOne = lawfulShareIsOne(lawful);
  totals.lawShareInvalid = shareIsOne === false ? '1' : '';
  totals.lawShareTotalDisplay = shareIsOne === false ? '1\n※合計が1ではありません' : '1';

  // ㋺ 法定相続人の数 ／ ㋩ 遺産に係る基礎控除額（3,000万円＋600万円×法定相続人の数・万円単位）
  const deduction = named > 0 ? 3000 + 600 * named : 0;
  totals.heirCount = named > 0 ? str(named) : '';
  totals.k4 = named > 0 ? str(deduction) : '';
  // Ⓑ（第1表）は百万円単位で記入する欄なので㋩（万円）を100で割る
  totals.tB = named > 0 ? str(deduction / 100) : '';

  // ㋥（㋑−㋩）／ ㋬（㋭−㋩）。基礎控除以下なら課税遺産は生じないので0とする。
  const gross3 = 0;
  const net = Math.max(0, totalAThousand - deduction * 10);
  const net3 = Math.max(0, gross3 - deduction * 10);
  totals.k5 = totalAThousand > 0 || named > 0 ? str(net) : '';
  totals.k6 = gross3 > 0 ? str(net3) : '';

  let sum7 = 0;
  let sum10 = 0;
  const rows = lawful.map((l): Values => {
    const den = num(l.den);
    const share = den > 0 ? num(l.num) / den : 0;
    const active = share > 0;
    // ⑥⑨ 法定相続分に応ずる取得金額（1,000円未満切捨て） → ⑦⑩ 速算表による税額
    const v6 = active ? Math.floor(net * share) : 0;
    const v7 = active ? rateTax(v6) : 0;
    const farm = active && gross3 > 0;
    const v9 = farm ? Math.floor(net3 * share) : 0;
    const v10 = farm ? rateTax(v9) : 0;
    sum7 += v7;
    sum10 += v10;
    return {
      ...l,
      v6: active ? str(v6) : '',
      v7: active ? str(v7) : '',
      v9: farm ? str(v9) : '',
      v10: farm ? str(v10) : '',
    };
  });

  // ⑧⑪ 相続税の総額（100円未満切捨て）— 様式の「00」に合わせ百円単位で保持
  totals.t7 = sum7 > 0 ? str(Math.floor(sum7 / 100)) : '';
  totals.t11 = sum10 > 0 ? str(Math.floor(sum10 / 100)) : '';

  return { lawful: rows, totals };
}
