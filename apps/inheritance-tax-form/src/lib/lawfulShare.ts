/**
 * 法定相続分（第2表⑤）の自動計算。
 *
 * 第2表④は「相続の放棄がなかったものとした場合」の一覧なので、放棄は考えない。
 * 続柄コード（第1表の人物欄）から順位を割り出し、民法900条の割合を配る。
 *
 * **決められない組み合わせは計算しない**（空を返す）。孫は代襲相続かどうかで
 * 1人分を分け合うかが変わり、兄弟姉妹は半血かどうかで割合が変わり、「その他」は
 * 続柄そのものが分からない。誤った分数を先に入れてしまうと、利用者が気付かないまま
 * 総額まで狂うため、迷うくらいなら空欄のままにして手で入れてもらう。
 */

/** 代襲相続人の区分。誰の代わりに相続するかで順位が決まる（''は代襲ではない） */
export type Substitute = '' | 'child' | 'sibling';

export const SUBSTITUTE_CHILD: Substitute = 'child';
export const SUBSTITUTE_SIBLING: Substitute = 'sibling';

/** 法定相続人1人分。続柄だけでは決まらない事実を添える。 */
export interface Member {
  /** 続柄コード（第1表の人物欄） */
  relation: string;
  /** 相続の放棄をした */
  renounced: boolean;
  /**
   * 実子とみなされる養子（相法15条3項）。特別養子・配偶者の連れ子・代襲相続人の3つ。
   * 続柄が「90 養子」のときだけ意味を持つ。
   */
  realChild: boolean;
  /** 代襲相続人の区分（孫は子の代襲、甥姪は兄弟姉妹の代襲） */
  substitute: Substitute;
  /** 被代襲者の氏名。同じ人を代襲する人どうしで、その1人分を分け合う */
  substituteFor: string;
  /** 半血の兄弟姉妹（民法900条4号但書）。全血の半分を取る */
  halfBlood: boolean;
}

/** 順位の区分 */
type Rank = 'spouse' | 'child' | 'parent' | 'grandparent' | 'sibling' | 'unknown';

/** 血族の順位（配偶者と、判別できない続柄を除いたもの） */
type Blood = Exclude<Rank, 'spouse' | 'unknown'>;

/**
 * その人の区分。代襲相続人は被代襲者の順位を継ぐので、続柄コードより先に見る
 * （孫は「30 孫」、甥姪は続柄コードが無く「99 その他」になるため、コードからは決められない）。
 */
function rankOf(member: Member): Rank {
  if (member.substitute === SUBSTITUTE_CHILD) return 'child';
  if (member.substitute === SUBSTITUTE_SIBLING) return 'sibling';
  return rankOfCode(member.relation);
}

/** 続柄コード → 区分。ここに無いコードは 'unknown'（自動計算しない） */
function rankOfCode(code: string): Rank {
  if (code === '01') return 'spouse';
  if (code === '90') return 'child'; // 養子
  if (code === '41' || code === '42') return 'parent';
  if (code === '51' || code === '52') return 'grandparent';
  const value = Number(code);
  if (!Number.isInteger(value)) return 'unknown';
  if (value >= 10 && value <= 29) return 'child'; // 子・長男〜九女
  if (value >= 61 && value <= 64) return 'sibling'; // 兄・弟・姉・妹
  return 'unknown'; // 30 孫（代襲）・99 その他
}

/** 続柄コードのうち「90 養子」。他の続柄にも当てはまる人はこちらを選ぶ決まりになっている。 */
const ADOPTED = '90';

/** 数の制限を受ける養子か（実子とみなされる養子は受けない） */
const isLimitedAdoption = (member: Member): boolean => (
  member.relation === ADOPTED && !member.realChild
);

/**
 * 養子の数の制限（相法15条2項）。法定相続人の数に算入できる養子は、
 * 被相続人に実子がある場合は1人、実子がない場合は2人まで。
 *
 * 実子とみなされる養子（同条3項）は制限を受けないうえ、実子として扱うので
 * 「実子がある場合」の判定にも数える。どの養子を残すかは法律では決まっていないので、
 * ここでは登録順の先頭から残す（画面で並べ替えれば変えられる）。
 *
 * @returns 各人が数に算入されるか（`members` と同じ並び）
 */
export function adoptionCounted(members: readonly Member[]): boolean[] {
  const hasRealChild = members.some(
    (member) => rankOf(member) === 'child' && !isLimitedAdoption(member),
  );
  const limit = hasRealChild ? 1 : 2;
  let used = 0;
  return members.map((member) => {
    if (!isLimitedAdoption(member)) return true;
    used += 1;
    return used <= limit;
  });
}

export interface Share {
  num: number;
  den: number;
}

/** 配偶者の取り分（相手の順位ごと）。血族が居なければ配偶者が全部。 */
const SPOUSE_SHARE: Record<Blood, Share> = {
  child: { num: 1, den: 2 },
  parent: { num: 2, den: 3 },
  grandparent: { num: 2, den: 3 },
  sibling: { num: 3, den: 4 },
};

function gcd(a: number, b: number): number {
  let x = a;
  let y = b;
  while (y !== 0) [x, y] = [y, x % y];
  return x;
}

function reduce({ num, den }: Share): Share {
  const a = gcd(num, den);
  return a === 0 ? { num, den } : { num: num / a, den: den / a };
}

/** 並びの中に出てくる血族の順位（配偶者と、判別できない続柄を除く） */
function bloodRanks(members: readonly Member[]): Blood[] {
  return [...new Set(members.map(rankOf).filter(
    (rank): rank is Blood => rank !== 'spouse' && rank !== 'unknown',
  ))];
}

/**
 * 代襲相続人を被代襲者ごとにまとめる。1人分の相続分をその人たちで分け合うため。
 *
 * @returns 各人と同じ並びで「一緒に1人分を分け合う人の添字」。
 *   代襲相続人が2人以上いるのに被代襲者の氏名が空だと、別々の人を代襲したのか
 *   同じ人を代襲したのかが分からないので undefined（自動では決めない）
 */
function substituteGroups(members: readonly Member[]): number[][] | undefined {
  const substitutes = members.filter((member) => member.substitute !== '');
  if (substitutes.length > 1 && substitutes.some((member) => member.substituteFor.trim() === '')) {
    return undefined;
  }
  const byKey = new Map<string, number[]>();
  members.forEach((member, index) => {
    if (member.substitute === '') return;
    const key = `${member.substitute}\n${member.substituteFor.trim()}`;
    byKey.set(key, [...(byKey.get(key) ?? []), index]);
  });
  return members.map((member, index) => (
    member.substitute === '' ? [index] : byKey.get(`${member.substitute}\n${member.substituteFor.trim()}`)!
  ));
}

/**
 * 法定相続分を求める。並びは渡した順のまま。
 *
 * @param members 法定相続人（第2表④に載せる人の分だけ）
 * @returns 決められないときは undefined（空欄のままにする）
 */
export function autoLawfulShares(members: readonly Member[]): Share[] | undefined {
  if (members.length === 0) return undefined;
  const ranks = members.map(rankOf);
  if (ranks.includes('unknown')) return undefined;

  const spouses = ranks.filter((rank) => rank === 'spouse').length;
  if (spouses > 1) return undefined; // 配偶者が2人（続柄の付け間違い）

  // 血族は最先順位の1区分だけが相続人になる。混ざっていたら自動では決められない
  // （父母と祖父母のように、本来は片方しか相続人にならない組み合わせも含む）
  const bloods = bloodRanks(members);
  if (bloods.length > 1) return undefined;

  const blood = bloods[0];
  if (blood === undefined) {
    // 配偶者だけ
    return spouses === 1 ? [{ num: 1, den: 1 }] : undefined;
  }

  const groups = substituteGroups(members);
  if (groups === undefined) return undefined;

  const spouse = spouses === 1 ? SPOUSE_SHARE[blood] : undefined;
  // 血族の総取り分（配偶者が居なければ全部）
  const bloodTotal: Share = spouse === undefined
    ? { num: 1, den: 1 }
    : { num: spouse.den - spouse.num, den: spouse.den };

  /**
   * 血族1人分の重み。通常は1で、半血の兄弟姉妹は1/2（民法900条4号但書）。
   * 代襲相続人は、被代襲者の1人分を一緒に代襲した人数で割る。
   */
  const weightOf = (index: number): Share => {
    const group = groups[index]!;
    const half = blood === 'sibling' && group.some((i) => members[i]!.halfBlood);
    return { num: 1, den: (half ? 2 : 1) * group.length };
  };

  // 重みを通分して整数にし、その比で血族の総取り分を分ける
  const bloodIndexes = ranks.flatMap((rank, index) => (rank === 'spouse' ? [] : [index]));
  const weights = new Map(bloodIndexes.map((index) => [index, weightOf(index)]));
  const common = bloodIndexes.reduce((lcm, index) => {
    const den = weights.get(index)!.den;
    return (lcm * den) / gcd(lcm, den);
  }, 1);
  const scaled = new Map(bloodIndexes.map((index) => {
    const weight = weights.get(index)!;
    return [index, (weight.num * common) / weight.den];
  }));
  const total = [...scaled.values()].reduce((sum, weight) => sum + weight, 0);

  return ranks.map((rank, index) => (rank === 'spouse'
    ? reduce(spouse!)
    : reduce({ num: bloodTotal.num * scaled.get(index)!, den: bloodTotal.den * total })));
}

/**
 * 民法上の相続分。未分割の財産を各人に按分するのに使う（相法55条）。
 *
 * 第2表④⑤の法定相続分（税法上）との違いは2つ。**放棄を反映する**（放棄した人は
 * 相続人ではないので相続分を持たない）ことと、**養子の数の制限を受けない**こと。
 * 制限の対象になった養子も民法上は相続人なので、呼ぶ側は制限前の一覧を渡す。
 *
 * @returns 各人の相続分（`members` と同じ並び）。放棄した人は null。
 *   決められないときは全体で undefined（空欄のままにして手で入れてもらう）
 */
export function civilShares(members: readonly Member[]): (Share | null)[] | undefined {
  const alive = members.filter((member) => !member.renounced);
  if (alive.length === members.length) return autoLawfulShares(members);

  // ある順位の血族が全員放棄すると相続人は次順位へ移るが、次順位の人は第2表④には載らない。
  // 「もともと居ない」のか「居るが未登録」なのかがここからは分からないので自動では決めない
  const before = bloodRanks(members);
  const after = bloodRanks(alive);
  if (before.length > 0 && after.length === 0) return undefined;

  const shares = autoLawfulShares(alive);
  if (shares === undefined) return undefined;
  let next = 0;
  return members.map((member) => {
    if (member.renounced) return null;
    const share = shares[next] ?? null;
    next += 1;
    return share;
  });
}
