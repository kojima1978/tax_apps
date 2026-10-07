// あいまい一致の点数（Django 版が使っていた rapidfuzz 3.x の fuzz.partial_ratio /
// fuzz.token_set_ratio / process.extractOne）。
//
// 点数は分類の閾値（既定 90）と比べるうえ、候補の画面には小数のまま出ていたので、
// 浮動小数点の計算順まで C++ 実装（rapidfuzz/fuzz_impl.hpp）に合わせてある。
// 文字数は Python と同じくコードポイントで数える。前処理（小文字化・記号の除去）はしない
// ── Django 版も processor を渡していなかった。

const chars = (s: string): string[] => Array.from(s);

// 挿入・削除だけで s1 を s2 にする手数（= 長さの和 − 2 × 最長共通部分列）
function indelDistance(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return a.length + b.length;
  let prev = new Array<number>(b.length + 1).fill(0);
  let cur = new Array<number>(b.length + 1).fill(0);
  for (const ca of a) {
    for (let j = 1; j <= b.length; j++) {
      cur[j] = ca === b[j - 1] ? prev[j - 1]! + 1 : Math.max(prev[j]!, cur[j - 1]!);
    }
    [prev, cur] = [cur, prev];
  }
  return a.length + b.length - 2 * prev[b.length]!;
}

function ratioOf(a: string[], b: string[]): number {
  const lensum = a.length + b.length;
  const normDist = lensum ? indelDistance(a, b) / lensum : 0;
  return (1 - normDist) * 100;
}

export function ratio(s1: string, s2: string): number {
  return ratioOf(chars(s1), chars(s2));
}

// 短い方（needle）を長い方の中で滑らせたときの ratio の最大。
// rapidfuzz は needle が 65 文字以上だと別の探し方（一致ブロックから窓を選ぶ）に切り替えるが、
// 分類で比べるのはキーワードと摘要で、needle は短い方なのでその経路には入らない。
function partialRatioImpl(needle: string[], hay: string[]): number {
  const len1 = needle.length;
  const len2 = hay.length;
  const set = new Set(needle);
  let best = 0;
  const consider = (window: string[]): boolean => {
    const r = ratioOf(needle, window);
    if (r > best) best = r;
    return best === 100;
  };

  // 先頭から短い窓（最後の文字が needle に含まれるものだけ）
  for (let i = 1; i < len1; i++) {
    if (!set.has(hay[i - 1]!)) continue;
    if (consider(hay.slice(0, i))) return best;
  }
  // 途中の同じ長さの窓
  for (let i = 0; i < len2 - len1; i++) {
    if (!set.has(hay[i + len1 - 1]!)) continue;
    if (consider(hay.slice(i, i + len1))) return best;
  }
  // 末尾の窓（最初の文字が needle に含まれるものだけ）
  for (let i = len2 - len1; i < len2; i++) {
    if (!set.has(hay[i]!)) continue;
    if (consider(hay.slice(i))) return best;
  }
  return best;
}

export function partialRatio(s1: string, s2: string): number {
  let a = chars(s1);
  let b = chars(s2);
  if (a.length > b.length) [a, b] = [b, a];
  if (a.length === 0 || b.length === 0) return a.length === b.length ? 100 : 0;

  const res = partialRatioImpl(a, b);
  if (res !== 100 && a.length === b.length) return Math.max(res, partialRatioImpl(b, a));
  return res;
}

// Python の str.isspace() と同じ文字（rapidfuzz の単語分割もこれ）。全角スペースを含む。
const SPACE = /[\t\n\v\f\r\x1c-\x1f \x85\xa0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+/u;

// コードポイント順（C++ の std::sort と同じ。JS の既定の並びは UTF-16 単位なので使わない）
function compareCodePoints(a: string, b: string): number {
  const x = chars(a);
  const y = chars(b);
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    const d = x[i]!.codePointAt(0)! - y[i]!.codePointAt(0)!;
    if (d !== 0) return d;
  }
  return x.length - y.length;
}

const tokenSet = (s: string): string[] =>
  [...new Set(s.split(SPACE).filter((t) => t !== ''))].sort(compareCodePoints);

const joinedLength = (tokens: string[]): number =>
  tokens.length === 0 ? 0 : tokens.reduce((n, t) => n + chars(t).length, 0) + tokens.length - 1;

const normDistance = (dist: number, lensum: number): number =>
  lensum > 0 ? 100 - (100 * dist) / lensum : 100;

// 単語の集合で比べる。共通の単語を除いた残りどうしの ratio と、
// 「共通部分」対「共通部分 + 片方の残り」の ratio のうち最大。
export function tokenSetRatio(s1: string, s2: string): number {
  const a = tokenSet(s1);
  const b = tokenSet(s2);
  if (a.length === 0 || b.length === 0) return 0;

  const inB = new Set(b);
  const inA = new Set(a);
  const sect = a.filter((t) => inB.has(t));
  const diffAB = a.filter((t) => !inB.has(t));
  const diffBA = b.filter((t) => !inA.has(t));

  // 片方がもう片方に含まれる
  if (sect.length > 0 && (diffAB.length === 0 || diffBA.length === 0)) return 100;

  const abLen = joinedLength(diffAB);
  const baLen = joinedLength(diffBA);
  const sectLen = joinedLength(sect);
  const sep = sectLen !== 0 ? 1 : 0;
  const sectAbLen = sectLen + sep + abLen;
  const sectBaLen = sectLen + sep + baLen;

  const dist = indelDistance(chars(diffAB.join(' ')), chars(diffBA.join(' ')));
  const result = normDistance(dist, sectAbLen + sectBaLen);
  if (!sectLen) return result;

  return Math.max(
    result,
    normDistance(sep + abLen, sectLen + sectAbLen),
    normDistance(sep + baLen, sectLen + sectBaLen),
  );
}

export type Scorer = (s1: string, s2: string) => number;

// choices のうち点数が最大で cutoff 以上のもの（同点なら先に出てきた方）。
export function extractOne(
  query: string,
  choices: readonly string[],
  scorer: Scorer,
  cutoff: number,
): { choice: string; score: number; index: number } | null {
  let best: { choice: string; score: number; index: number } | null = null;
  for (let i = 0; i < choices.length; i++) {
    const score = scorer(query, choices[i]!);
    if (score >= cutoff && (best === null || score > best.score)) {
      best = { choice: choices[i]!, score, index: i };
      if (score === 100) break;
    }
  }
  return best;
}
