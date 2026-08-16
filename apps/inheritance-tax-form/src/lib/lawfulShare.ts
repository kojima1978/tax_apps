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

/** 順位の区分 */
type Rank = 'spouse' | 'child' | 'parent' | 'grandparent' | 'sibling' | 'unknown';

/** 血族の順位（配偶者と、判別できない続柄を除いたもの） */
type Blood = Exclude<Rank, 'spouse' | 'unknown'>;

/** 続柄コード → 区分。ここに無いコードは 'unknown'（自動計算しない） */
function rankOf(code: string): Rank {
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

function reduce({ num, den }: Share): Share {
  let a = num;
  let b = den;
  while (b !== 0) [a, b] = [b, a % b];
  return a === 0 ? { num, den } : { num: num / a, den: den / a };
}

/**
 * 法定相続分を続柄から求める。並びは渡した順のまま。
 *
 * @param relations 法定相続人の続柄コード（第2表④に載せる人の分だけ）
 * @returns 決められないときは undefined（空欄のままにする）
 */
export function autoLawfulShares(relations: readonly string[]): Share[] | undefined {
  if (relations.length === 0) return undefined;
  const ranks = relations.map(rankOf);
  if (ranks.includes('unknown')) return undefined;

  const spouses = ranks.filter((rank) => rank === 'spouse').length;
  if (spouses > 1) return undefined; // 配偶者が2人（続柄の付け間違い）

  // 血族は最先順位の1区分だけが相続人になる。混ざっていたら自動では決められない
  // （父母と祖父母のように、本来は片方しか相続人にならない組み合わせも含む）
  const bloods = [...new Set(ranks.filter(
    (rank): rank is Blood => rank !== 'spouse' && rank !== 'unknown', // 'unknown' は上で返している
  ))];
  if (bloods.length > 1) return undefined;

  const blood = bloods[0];
  if (blood === undefined) {
    // 配偶者だけ
    return spouses === 1 ? [{ num: 1, den: 1 }] : undefined;
  }

  const count = ranks.filter((rank) => rank === blood).length;
  const spouse = spouses === 1 ? SPOUSE_SHARE[blood] : undefined;
  // 血族の総取り分（配偶者が居なければ全部）
  const bloodTotal: Share = spouse === undefined
    ? { num: 1, den: 1 }
    : { num: spouse.den - spouse.num, den: spouse.den };
  const each = reduce({ num: bloodTotal.num, den: bloodTotal.den * count });

  return ranks.map((rank) => (rank === 'spouse' ? reduce(spouse!) : each));
}
