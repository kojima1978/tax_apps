// 摘要からカテゴリーを決める（Django 版 analyzer/lib/llm_classifier.py と services/classification.py）。
//
// 取込時と「自動分類」ボタン（classifyByRules）の順番:
//   1. キーワードが摘要に含まれるか（案件固有 → 共通。それぞれキーワード数の少ないカテゴリーから）
//   2. 贈与: 「振込」などを含み、出金が閾値以上
//   3. あいまい一致（案件固有 → 共通）
//   4. 「その他」のキーワード
// 「ルール適用」ボタン（matchWithPriority）は 1 だけを、書いた順に、贈与の閾値も見ずに当てる。
// 2つの経路で結果が違うのは Django 版のとおり（計画書 §3 #8 で「そのまま」と決めた）。

import {
  GIFT_CATEGORY,
  OTHER_CATEGORY,
  UNCATEGORIZED,
  normalizePatterns,
  type FuzzyConfig,
  type Patterns,
} from './categories.js';
import { extractOne, partialRatio, tokenSetRatio } from './fuzz.js';

export type ClassifierSettings = {
  globalPatterns: Patterns;
  casePatterns?: Patterns | null;
  giftThreshold: number;
  fuzzy: FuzzyConfig;
};

export type Classification = { category: string; score: number };

// 1〜3 の対象から外すカテゴリー（贈与は閾値付きの 2 で、その他は 4 で別に見る）
const RULE_EXCLUDED = new Set([OTHER_CATEGORY, UNCATEGORIZED, GIFT_CATEGORY]);
// あいまい一致で、この点数以上が出たら残りを見ない
const EARLY_EXIT_SCORE = 95;
// 候補の表示は閾値を下げる（ただし下限あり）
const SUGGESTION_THRESHOLD_OFFSET = 10;
const SUGGESTION_THRESHOLD_MIN = 70;

// キーワード数の昇順（同数なら書いた順）。除外カテゴリーと空のカテゴリーは入れない。
function categoriesByKeywordCount(patterns: Map<string, string[]>): string[] {
  return [...patterns]
    .filter(([cat, kws]) => !RULE_EXCLUDED.has(cat) && kws.length > 0)
    .sort((a, b) => a[1].length - b[1].length)
    .map(([cat]) => cat);
}

const mergedKeywords = (category: string, ...patterns: Map<string, string[]>[]): string[] =>
  patterns.flatMap((p) => p.get(category) ?? []);

const scorerOf = (fuzzy: FuzzyConfig) => (fuzzy.useTokenSetRatio ? tokenSetRatio : partialRatio);

function substringMatch(patterns: Map<string, string[]>, textLower: string): string | null {
  for (const category of categoriesByKeywordCount(patterns)) {
    if (patterns.get(category)!.some((kw) => textLower.includes(kw.toLowerCase()))) return category;
  }
  return null;
}

function fuzzyMatch(
  text: string,
  casePatterns: Map<string, string[]>,
  globalPatterns: Map<string, string[]>,
  fuzzy: FuzzyConfig,
): Classification | null {
  const scorer = scorerOf(fuzzy);
  let best: Classification | null = null;

  // true なら打ち切り
  const evaluate = (patterns: Map<string, string[]>): boolean => {
    for (const category of categoriesByKeywordCount(patterns)) {
      const hit = extractOne(text, patterns.get(category)!, scorer, fuzzy.threshold);
      if (hit && hit.score > (best?.score ?? 0)) {
        best = { category, score: hit.score };
        if (hit.score >= EARLY_EXIT_SCORE) return true;
      }
    }
    return false;
  };

  if (evaluate(casePatterns)) return best;

  // 共通パターンは、案件固有の同じカテゴリーに無いキーワードだけ
  const globalOnly = new Map<string, string[]>();
  for (const [category, keywords] of globalPatterns) {
    if (RULE_EXCLUDED.has(category)) continue;
    const caseKws = new Set(casePatterns.get(category) ?? []);
    const unique = keywords.filter((kw) => !caseKws.has(kw));
    if (unique.length > 0) globalOnly.set(category, unique);
  }
  evaluate(globalOnly);
  return best;
}

export function classifyByRules(text: string, amountOut: number, settings: ClassifierSettings): Classification {
  if (!text) return { category: UNCATEGORIZED, score: 0 };
  const casePatterns = normalizePatterns(settings.casePatterns);
  const globalPatterns = normalizePatterns(settings.globalPatterns);
  const textLower = text.toLowerCase();
  const contains = (kw: string) => textLower.includes(kw.toLowerCase());

  const bySubstring = substringMatch(casePatterns, textLower) ?? substringMatch(globalPatterns, textLower);
  if (bySubstring) return { category: bySubstring, score: 100 };

  // 閾値未満の振込はここでは決めず、あいまい一致へ進む
  if (mergedKeywords(GIFT_CATEGORY, casePatterns, globalPatterns).some(contains) && amountOut >= settings.giftThreshold) {
    return { category: GIFT_CATEGORY, score: 100 };
  }

  if (settings.fuzzy.enabled) {
    const hit = fuzzyMatch(text, casePatterns, globalPatterns, settings.fuzzy);
    if (hit) return hit;
  }

  if (mergedKeywords(OTHER_CATEGORY, casePatterns, globalPatterns).some(contains)) {
    return { category: OTHER_CATEGORY, score: 100 };
  }
  return { category: UNCATEGORIZED, score: 0 };
}

// 候補として出す点数の下限の既定値（設定の閾値から下げる。下限あり）
export const suggestionCutoff = (fuzzy: Pick<FuzzyConfig, 'threshold'>) =>
  Math.max(fuzzy.threshold - SUGGESTION_THRESHOLD_OFFSET, SUGGESTION_THRESHOLD_MIN);

// 分類画面の候補（点数の高い順に topN 件）。カテゴリーごとに案件固有・共通の高い方を取り、
// 同点なら案件固有を先に出す。贈与もここでは候補に入る（閾値は見ない）。
// cutoff はこの点数未満を候補にしない（省略時は設定の閾値から決める ── suggestionCutoff）
export function fuzzySuggestions(
  text: string,
  settings: Pick<ClassifierSettings, 'globalPatterns' | 'casePatterns' | 'fuzzy'>,
  topN = 3,
  cutoff = suggestionCutoff(settings.fuzzy),
): Classification[] {
  if (!text || !settings.fuzzy.enabled) return [];
  const threshold = cutoff;
  const scorer = scorerOf(settings.fuzzy);
  const scores = new Map<string, { score: number; priority: number }>();

  const evaluate = (patterns: Map<string, string[]>, priority: number) => {
    for (const [category, keywords] of patterns) {
      if (category === OTHER_CATEGORY || category === UNCATEGORIZED || keywords.length === 0) continue;
      const hit = extractOne(text, keywords, scorer, threshold);
      if (!hit) continue;
      const prev = scores.get(category);
      if (!prev || hit.score > prev.score) scores.set(category, { score: hit.score, priority });
    }
  };
  evaluate(normalizePatterns(settings.casePatterns), 1);
  evaluate(normalizePatterns(settings.globalPatterns), 0);

  return [...scores]
    .sort(([, a], [, b]) => b.score - a.score || b.priority - a.priority)
    .slice(0, topN)
    .map(([category, { score }]) => ({ category, score }));
}

// 取込時の分類。摘要の無い行は未分類。
//
// Django 版は同じ摘要の結果を使い回していて、使い回しのキーに出金額が入っていない。
// 贈与は出金額で決まるので、同じ「振込 ヤマダ」でも最初の行が閾値以上なら後の少額の行まで
// 贈与に、最初の行が少額なら後の高額の行まで贈与にならない。正解の記録もこの形なのでそろえてある。
// （点数は取込時には保存されない ── Django 版の commit_import が渡していないため）
export function classifyTransactions(
  rows: readonly { description: string | null; amountOut: number }[],
  settings: ClassifierSettings,
): Classification[] {
  const cache = new Map<string, Classification>();
  return rows.map((r) => {
    if (!r.description) return { category: UNCATEGORIZED, score: 0 };
    let hit = cache.get(r.description);
    if (!hit) {
      hit = classifyByRules(r.description, r.amountOut || 0, settings);
      cache.set(r.description, hit);
    }
    return hit;
  });
}

export type MatchType = 'exact' | 'partial' | 'case';
export type PatternMatch = { category: string; keyword: string; matchType: MatchType };

// 書いた順に見て最初に当たったキーワード（摘要と同じなら exact、含まれれば partial）。
export function matchPattern(description: string, patterns: Patterns): PatternMatch | null {
  if (!description) return null;
  const lower = description.toLowerCase();
  for (const [category, keywords] of Object.entries(patterns)) {
    for (const keyword of keywords) {
      const kw = keyword.toLowerCase();
      if (kw === lower) return { category, keyword, matchType: 'exact' };
      if (lower.includes(kw)) return { category, keyword, matchType: 'partial' };
    }
  }
  return null;
}

// 案件固有を先に。案件固有で当たったものは matchType が 'case'。
export function matchWithPriority(
  description: string,
  casePatterns: Patterns | null | undefined,
  globalPatterns: Patterns,
): PatternMatch | null {
  const byCase = casePatterns ? matchPattern(description, casePatterns) : null;
  if (byCase) return { ...byCase, matchType: 'case' };
  return matchPattern(description, globalPatterns);
}

// 「ルール適用」のプレビューに出す信頼度
export function matchScore(matchType: MatchType, keyword: string, description: string): number {
  if (matchType === 'exact') return 100;
  if (matchType === 'case') return 95;
  const len = Array.from(description).length;
  const ratio = len ? Array.from(keyword).length / len : 0;
  return Math.min(95, Math.max(70, Math.trunc(70 + ratio * 25)));
}

export type ClassifiableTransaction = {
  id: number;
  description: string | null;
  amountOut: number;
  category: string;
  isFlagged: boolean;
};

export type ClassificationUpdate = { id: number; category: string; classificationScore?: number };

// 未分類（要確認の印が付いていない）取引にだけ分類を当てる。
//   useFuzzy: 「自動分類」。classifyByRules の結果が minScore 以上なら点数ごと更新する。
//             点数は整数の列へ入るので切り捨てる（比べるのは切り捨てる前の値）。
//   それ以外: 「ルール適用」。カテゴリーだけ更新する。案件固有のパターンは
//             古いカテゴリー名のまま当てる（Django 版はここだけ寄せていなかった）。
export function classifyUnclassified(
  transactions: readonly ClassifiableTransaction[],
  settings: ClassifierSettings,
  { useFuzzy, minScore = 0 }: { useFuzzy: boolean; minScore?: number },
): ClassificationUpdate[] {
  const targets = transactions.filter((t) => t.category === UNCATEGORIZED && !t.isFlagged && t.description);
  const updates: ClassificationUpdate[] = [];
  if (useFuzzy) {
    for (const t of targets) {
      const { category, score } = classifyByRules(t.description!, t.amountOut || 0, settings);
      if (category !== UNCATEGORIZED && score >= minScore) {
        updates.push({ id: t.id, category, classificationScore: Math.trunc(score) });
      }
    }
  } else {
    const globalPatterns = Object.fromEntries(normalizePatterns(settings.globalPatterns));
    for (const t of targets) {
      const hit = matchWithPriority(t.description!, settings.casePatterns, globalPatterns);
      if (hit) updates.push({ id: t.id, category: hit.category });
    }
  }
  return updates;
}

// 未分類（要確認の印が付いていない）取引それぞれの第1候補のうち、点数が minScore 以上のもの。
// 分類候補タブの一覧（fuzzySuggestions）と同じ計算なので、「95%以上を一括適用」で当たるのは
// 画面に出ている候補そのもの（画面は新しい100件までだが、こちらは全件）。同じ摘要は1回だけ計算する。
export function suggestionUpdates(
  transactions: readonly ClassifiableTransaction[],
  settings: Pick<ClassifierSettings, 'globalPatterns' | 'casePatterns' | 'fuzzy'>,
  minScore: number,
): ClassificationUpdate[] {
  const cache = new Map<string, Classification | null>();
  const updates: ClassificationUpdate[] = [];
  for (const t of transactions) {
    if (t.category !== UNCATEGORIZED || t.isFlagged || !t.description) continue;
    let top = cache.get(t.description);
    if (top === undefined) {
      top = fuzzySuggestions(t.description, settings, 1, minScore)[0] ?? null;
      cache.set(t.description, top);
    }
    if (top) updates.push({ id: t.id, category: top.category, classificationScore: Math.trunc(top.score) });
  }
  return updates;
}
