// 月次の入出金表と分析画面の集計（Django 版 analyzer/services/analysis.py と
// services/transaction.py の get_classification_preview）。
//
// DB を引かずに、案件の取引（口座の項目を平らに付けたもの）を受け取って計算する。
// 並び順は PostgreSQL に合わせる: 昇順は null が最後、降順は null が最初。
// 文字列の並びは文字コード順（Django 版は DB の照合順序に任せていた。日本語の銀行名どうしの
// 並びが違いうるのは段階6の突き合わせで確かめる）。

import { detectTransfers, type AnalysisSettings } from './analyze.js';
import {
  STANDARD_CATEGORIES,
  UNCATEGORIZED,
  normalizePatterns,
  sortCategories,
  type Patterns,
} from './categories.js';
import {
  fuzzySuggestions,
  matchScore,
  matchWithPriority,
  type ClassifierSettings,
  type MatchType,
} from './classify.js';
import { matchesAllKeywords, splitKeywords } from './text.js';

export type AnalysisTx = {
  id: number;
  accountId: number | null;
  date: string | null; // 'YYYY-MM-DD'
  description: string | null;
  amountOut: number;
  amountIn: number;
  category: string;
  isFlagged: boolean;
  // 口座の項目（Django 版の with_account_info）
  bankName: string | null;
  branchName: string | null;
  accountNumber: string | null;
};

export type AnalysisAccount = {
  id: number;
  accountNumber: string;
  holder: string | null;
  bankName: string | null;
  branchName: string | null;
  accountType: string | null;
};

// ---------------------------------------------------------------------------
// 並び
// ---------------------------------------------------------------------------

type Key = string | number | null | undefined;

// 昇順・null は最後
function compareAsc(a: Key, b: Key): number {
  const an = a === null || a === undefined;
  const bn = b === null || b === undefined;
  if (an || bn) return an === bn ? 0 : an ? 1 : -1;
  return a! < b! ? -1 : a! > b! ? 1 : 0;
}

const byKeys =
  <T>(...keys: ((t: T) => Key)[]) =>
  (a: T, b: T): number => {
    for (const k of keys) {
      const c = compareAsc(k(a), k(b));
      if (c) return c;
    }
    return 0;
  };

// 新しい順（-date, -id）。降順は昇順の裏返しなので null の日付が先頭に来る。
const newestFirst = <T extends Pick<AnalysisTx, 'date' | 'id'>>(a: T, b: T) =>
  byKeys<T>((t) => t.date, (t) => t.id)(b, a);

export type SortField = 'date' | 'amountOut' | 'amountIn';
export type SortOrder = { field: SortField; direction: 'asc' | 'desc' };

const SORT_FIELDS: Record<string, SortField> = { date: 'date', amount_out: 'amountOut', amount_in: 'amountIn' };

// 画面の並び替えの指定（'date_asc' / 'amount_out_desc' など）。読めなければ日付の昇順。
export function parseSort(param: string | null | undefined): SortOrder {
  const s = param || 'date_asc';
  const cut = s.lastIndexOf('_');
  const field = SORT_FIELDS[s.slice(0, cut)];
  const direction = s.slice(cut + 1);
  if (cut > 0 && field && (direction === 'asc' || direction === 'desc')) return { field, direction };
  return { field: 'date', direction: 'asc' };
}

// 指定の項目 → id の順。降順は両方とも降順（Django 版の order_by('-amount_out', '-id')）。
export function sortTransactions<T extends AnalysisTx>(txs: readonly T[], order: SortOrder): T[] {
  const asc = byKeys<T>((t) => t[order.field], (t) => t.id);
  return [...txs].sort(order.direction === 'asc' ? asc : (a, b) => asc(b, a));
}

// ---------------------------------------------------------------------------
// 月次の入出金表
// ---------------------------------------------------------------------------

export type MonthlyCashflow = { month: string; totalOut: number; totalIn: number };

// 月ごとの出金・入金の合計。相続開始日のある案件は、その月から後を入れない。
export function monthlyCashflow(txs: readonly AnalysisTx[], referenceDate: string | null): MonthlyCashflow[] {
  const cutoff = referenceDate ? `${referenceDate.slice(0, 7)}-01` : null;
  const months = new Map<string, MonthlyCashflow>();
  for (const t of txs) {
    if (!t.date || (cutoff && t.date >= cutoff)) continue;
    const month = `${t.date.slice(0, 7)}-01`;
    const m = months.get(month) ?? { month, totalOut: 0, totalIn: 0 };
    months.set(month, m);
    m.totalOut += t.amountOut;
    m.totalIn += t.amountIn;
  }
  return [...months.values()].sort(byKeys((m) => m.month));
}

// ---------------------------------------------------------------------------
// 絞り込み
// ---------------------------------------------------------------------------

export type TransactionFilter = {
  bank?: readonly string[];
  account?: readonly string[];
  category?: readonly string[];
  categoryMode?: 'include' | 'exclude';
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
  amountType?: 'out' | 'in' | 'both';
  // 画面の入力欄のまま（'10,000' など）。読めなければ条件なし
  amountMin?: string;
  amountMax?: string;
  sort?: string;
  // 資金移動の一覧だけに効く
  transferCategory?: readonly string[];
  transferCategoryMode?: 'include' | 'exclude';
};

const FULLWIDTH_DIGIT = /[０-９]/g;

// 金額の入力欄（カンマ区切り可）。Python の int() と同じく前後の空白・符号・数字の間の _ を許す。
export function parseAmountInput(value: string | null | undefined): number | null {
  if (!value) return null;
  const s = value
    .replace(/,/g, '')
    .replace(FULLWIDTH_DIGIT, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .trim();
  return /^[+-]?\d+(_\d+)*$/.test(s) ? Number(s.replace(/_/g, '')) : null;
}

function matchesAmount(t: AnalysisTx, type: TransactionFilter['amountType'], min: number | null, max: number | null): boolean {
  if (type === 'out') {
    return t.amountOut > 0 && (min === null || t.amountOut >= min) && (max === null || t.amountOut <= max);
  }
  if (type === 'in') {
    return t.amountIn > 0 && (min === null || t.amountIn >= min) && (max === null || t.amountIn <= max);
  }
  // 両方: どちらかが範囲に入っていればよい。上限だけのときは 0 円の側を数えない
  if (min !== null && max !== null) {
    return (t.amountOut >= min && t.amountOut <= max) || (t.amountIn >= min && t.amountIn <= max);
  }
  if (min !== null) return t.amountOut >= min || t.amountIn >= min;
  if (max !== null) return (t.amountOut > 0 && t.amountOut <= max) || (t.amountIn > 0 && t.amountIn <= max);
  return true;
}

// 取引一覧の絞り込み（並びは変えない）
export function filterTransactions<T extends AnalysisTx>(txs: readonly T[], f: TransactionFilter): T[] {
  const keywords = splitKeywords(f.keyword ?? '');
  const min = parseAmountInput(f.amountMin);
  const max = parseAmountInput(f.amountMax);
  const type = f.amountType === 'out' || f.amountType === 'in' ? f.amountType : 'both';
  return txs.filter((t) => {
    if (f.bank?.length && !(t.bankName !== null && f.bank.includes(t.bankName))) return false;
    if (f.account?.length && !(t.accountNumber !== null && f.account.includes(t.accountNumber))) return false;
    if (f.category?.length && f.category.includes(t.category) !== (f.categoryMode !== 'exclude')) return false;
    if (keywords.length && !matchesAllKeywords(t.description, keywords)) return false;
    if (f.dateFrom && !(t.date !== null && t.date >= f.dateFrom)) return false;
    if (f.dateTo && !(t.date !== null && t.date <= f.dateTo)) return false;
    return matchesAmount(t, type, min, max);
  });
}

// ---------------------------------------------------------------------------
// 口座の一覧
// ---------------------------------------------------------------------------

export type AccountSummary = Omit<AnalysisAccount, 'id'> & { count: number; lastDate: string | null };

// 口座ごとの取引件数と最後の取引日（取引の無い口座も出す）。銀行名 → 支店名 → 口座番号の順。
export function accountSummary(accounts: readonly AnalysisAccount[], txs: readonly AnalysisTx[]): AccountSummary[] {
  const stats = new Map<number, { count: number; lastDate: string | null }>();
  for (const t of txs) {
    if (t.accountId === null) continue;
    const s = stats.get(t.accountId) ?? { count: 0, lastDate: null };
    stats.set(t.accountId, s);
    s.count += 1;
    if (t.date && (s.lastDate === null || t.date > s.lastDate)) s.lastDate = t.date;
  }
  return [...accounts]
    .sort(byKeys((a) => a.bankName, (a) => a.branchName, (a) => a.accountNumber))
    .map(({ id, ...a }) => ({ ...a, count: 0, lastDate: null, ...stats.get(id) }));
}

// ---------------------------------------------------------------------------
// 資金移動の一覧
// ---------------------------------------------------------------------------

export type TransferEndpoint = {
  id: number;
  date: string;
  bankName: string | null;
  branchName: string | null;
  accountNumber: string | null;
  amount: number;
  description: string | null;
  category: string;
};

export type TransferPair = { source: TransferEndpoint; destination: TransferEndpoint };

const endpoint = (t: AnalysisTx, amount: number): TransferEndpoint => ({
  id: t.id,
  date: t.date!,
  bankName: t.bankName,
  branchName: t.branchName,
  accountNumber: t.accountNumber,
  amount,
  description: t.description,
  category: t.category,
});

// 出金ごとに相手の入金を並べる。保存してある印ではなく、表示のたびに案件の全取引で判定し直す
// （Django 版のとおり。取込のたびに付けた印は外れないので、保存値とは食い違いうる）。
//
// 相手の入金は判定で実際に組んだもの。Django 版は「印の付いた入金のうち、transfer_to の口座で、
// 金額が許容誤差以内の最初のもの」を並べていたので、同じ口座へ同じ額を何度も移していると
// 2回目以降の出金にも1回目の入金が並んでいた（実データで74組中60組が3日より離れた入金を指していた）。
// 意図して直した違い（計画書 段階4の結果）。
export function transferPairs(
  txs: readonly AnalysisTx[],
  settings: Pick<AnalysisSettings, 'transferTolerance' | 'transferDaysWindow' | 'transferDateMode'>,
  f: Pick<TransactionFilter, 'transferCategory' | 'transferCategoryMode' | 'keyword' | 'sort'> = {},
): TransferPair[] {
  const dated = txs.filter((t) => t.date !== null).sort(byKeys((t) => t.date, (t) => t.id));
  const matches = new Map(
    detectTransfers(
      dated.map((t) => ({ id: t.id, accountNumber: t.accountNumber ?? '', date: t.date!, amountOut: t.amountOut, amountIn: t.amountIn })),
      settings,
    ).map((m) => [m.id, m.partnerId]),
  );
  const byId = new Map(dated.map((t) => [t.id, t]));

  let pairs: TransferPair[] = dated
    .filter((t) => matches.has(t.id) && t.amountOut > 0)
    .map((out) => {
      const dest = byId.get(matches.get(out.id)!)!;
      return { source: endpoint(out, out.amountOut), destination: endpoint(dest, dest.amountIn) };
    });

  const cats = f.transferCategory ?? [];
  if (cats.length) {
    const has = (p: TransferPair) => cats.includes(p.source.category) || cats.includes(p.destination.category);
    pairs = pairs.filter((p) => (f.transferCategoryMode === 'exclude' ? !has(p) : has(p)));
  }

  const keywords = splitKeywords(f.keyword ?? '');
  if (keywords.length) {
    const hit = (e: TransferEndpoint, kw: string) => matchesAllKeywords(e.description, [kw]);
    pairs = pairs.filter((p) => keywords.every((kw) => hit(p.source, kw) || hit(p.destination, kw)));
  }

  // 並び替えは出金側の値で（金額の2項目はどちらも出金額）。同じ値どうしは元の順のまま
  if (f.sort) {
    const { field, direction } = parseSort(f.sort);
    const key = (p: TransferPair) => (field === 'date' ? p.source.date : p.source.amount);
    const asc = byKeys(key);
    pairs = [...pairs].sort(direction === 'asc' ? asc : (a, b) => asc(b, a));
  }
  return pairs;
}

// ---------------------------------------------------------------------------
// 重複の疑い（データクレンジング）
// ---------------------------------------------------------------------------

// 日付・出金・入金・摘要・口座番号がすべて同じ取引を、その項目の順に並べる。
// 見分けやすいように、組ごとに 0 / 1 を交互に振る。
export function duplicateTransactions<T extends AnalysisTx>(txs: readonly T[]): (T & { dupGroupIdx: 0 | 1 })[] {
  const keyOf = (t: T) => JSON.stringify([t.date, t.amountOut, t.amountIn, t.description, t.accountNumber]);
  const counts = new Map<string, number>();
  for (const t of txs) counts.set(keyOf(t), (counts.get(keyOf(t)) ?? 0) + 1);
  const dups = txs
    .filter((t) => counts.get(keyOf(t))! > 1)
    .sort(byKeys((t) => t.date, (t) => t.amountOut, (t) => t.amountIn, (t) => t.description, (t) => t.accountNumber));
  const group = new Map<string, 0 | 1>();
  for (const t of dups) if (!group.has(keyOf(t))) group.set(keyOf(t), (group.size % 2) as 0 | 1);
  return dups.map((t) => ({ ...t, dupGroupIdx: group.get(keyOf(t))! }));
}

// ---------------------------------------------------------------------------
// 分類の候補
// ---------------------------------------------------------------------------

export type AiSuggestion = {
  txId: number;
  date: string | null;
  description: string;
  amountOut: number;
  amountIn: number;
  suggestedCategory: string;
  score: number;
  alternativeSuggestions: { category: string; score: number }[];
};

export type AiGroup = {
  description: string;
  suggestedCategory: string;
  score: number;
  alternativeSuggestions: { category: string; score: number }[];
  txIds: number[];
  totalOut: number;
  totalIn: number;
  count: number;
  sampleDate: string | null;
};

const AI_SUGGESTION_LIMIT = 100;

const classifierPatterns = (s: Pick<ClassifierSettings, 'globalPatterns' | 'casePatterns'>) => ({
  globalPatterns: Object.fromEntries(normalizePatterns(s.globalPatterns)) as Patterns,
  casePatterns: Object.fromEntries(normalizePatterns(s.casePatterns)) as Patterns,
});

// 未分類（要確認の印なし）の新しい方から100件に、あいまい一致の候補を3つまで付ける。
// 同じ摘要・同じ候補は1組にまとめ、件数の多い順 → 点数の高い順。
export function aiSuggestions(
  txs: readonly AnalysisTx[],
  classifier: Pick<ClassifierSettings, 'globalPatterns' | 'casePatterns' | 'fuzzy'>,
  cutoff?: number,
) {
  const unclassified = txs.filter((t) => t.category === UNCATEGORIZED && !t.isFlagged);
  const suggestions: AiSuggestion[] = [];
  for (const t of [...unclassified].sort(newestFirst).slice(0, AI_SUGGESTION_LIMIT)) {
    if (!t.description) continue;
    const [main, ...alternatives] = fuzzySuggestions(t.description, classifier, 3, cutoff);
    if (!main) continue;
    suggestions.push({
      txId: t.id,
      date: t.date,
      description: t.description,
      amountOut: t.amountOut,
      amountIn: t.amountIn,
      suggestedCategory: main.category,
      score: main.score,
      alternativeSuggestions: alternatives,
    });
  }

  const grouped = new Map<string, AiGroup>();
  for (const s of suggestions) {
    const key = JSON.stringify([s.description, s.suggestedCategory]);
    const g = grouped.get(key) ?? {
      description: s.description,
      suggestedCategory: s.suggestedCategory,
      score: s.score,
      alternativeSuggestions: s.alternativeSuggestions,
      txIds: [],
      totalOut: 0,
      totalIn: 0,
      count: 0,
      sampleDate: s.date,
    };
    grouped.set(key, g);
    g.txIds.push(s.txId);
    g.totalOut += s.amountOut;
    g.totalIn += s.amountIn;
    g.count += 1;
    g.score = Math.max(g.score, s.score);
  }

  return {
    aiSuggestions: suggestions,
    aiGroups: [...grouped.values()].sort((a, b) => b.count - a.count || b.score - a.score),
    suggestionsCount: suggestions.length,
    unclassifiedCount: unclassified.length,
    fuzzyThreshold: classifier.fuzzy.threshold,
  };
}

export type ClassificationPreviewItem = {
  txId: number;
  date: string | null;
  description: string;
  amountOut: number;
  amountIn: number;
  currentCategory: string;
  proposedCategory: string;
  matchedKeyword: string;
  matchType: MatchType;
  score: number;
};

// 「ルール適用」の前に見せる一覧（未分類・要確認の印なし・新しい順）。
// 案件固有のパターンも古いカテゴリー名を寄せてから当てる（Django 版はここだけ寄せていた）。
export function classificationPreview(
  txs: readonly AnalysisTx[],
  classifier: Pick<ClassifierSettings, 'globalPatterns' | 'casePatterns'>,
): ClassificationPreviewItem[] {
  const { globalPatterns, casePatterns } = classifierPatterns(classifier);
  const out: ClassificationPreviewItem[] = [];
  for (const t of txs.filter((x) => x.category === UNCATEGORIZED && !x.isFlagged).sort(newestFirst)) {
    if (!t.description) continue;
    const hit = matchWithPriority(t.description, casePatterns, globalPatterns);
    if (!hit) continue;
    out.push({
      txId: t.id,
      date: t.date,
      description: t.description,
      amountOut: t.amountOut,
      amountIn: t.amountIn,
      currentCategory: t.category,
      proposedCategory: hit.category,
      matchedKeyword: hit.keyword,
      matchType: hit.matchType,
      score: matchScore(hit.matchType, hit.keyword, t.description),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// 未分類の摘要ごとのまとめ
// ---------------------------------------------------------------------------

export const NO_DESCRIPTION = '（摘要なし）';

export type UnclassifiedGroup = {
  description: string;
  count: number;
  totalOut: number;
  totalIn: number;
  txIds: number[];
  firstTxId: number;
  samples: { date: string | null; bankName: string; amountOut: number; amountIn: number }[];
};

// 未分類の取引を摘要でまとめ、件数の多い順に（同数は受け取った順）。見本は各組の最初の3件。
// 要確認の印が付いた取引も入る（Django 版のとおり）。
export function unclassifiedGroups(txs: readonly AnalysisTx[], keyword = '') {
  const keywords = splitKeywords(keyword);
  const map = new Map<string, UnclassifiedGroup>();
  for (const t of txs) {
    if (t.category !== UNCATEGORIZED) continue;
    if (keywords.length && !matchesAllKeywords(t.description, keywords)) continue;
    const description = t.description || NO_DESCRIPTION;
    const g = map.get(description) ?? {
      description, count: 0, totalOut: 0, totalIn: 0, txIds: [], firstTxId: t.id, samples: [],
    };
    map.set(description, g);
    g.count += 1;
    g.totalOut += t.amountOut;
    g.totalIn += t.amountIn;
    g.txIds.push(t.id);
    if (g.samples.length < 3) {
      g.samples.push({ date: t.date, bankName: t.bankName ?? '', amountOut: t.amountOut, amountIn: t.amountIn });
    }
  }
  const groups = [...map.values()].sort((a, b) => b.count - a.count);
  return {
    groups,
    txTotal: groups.reduce((n, g) => n + g.count, 0),
    maxGroupCount: groups[0]?.count ?? 1,
  };
}

// 各組の摘要に、あいまい一致の候補を1つ
export function groupSuggestions(
  groups: readonly Pick<UnclassifiedGroup, 'description'>[],
  classifier: Pick<ClassifierSettings, 'globalPatterns' | 'casePatterns' | 'fuzzy'>,
): Record<string, { category: string; score: number }> {
  const out: Record<string, { category: string; score: number }> = {};
  for (const g of groups) {
    const [top] = fuzzySuggestions(g.description, classifier, 1);
    if (top) out[g.description] = top;
  }
  return out;
}

// ---------------------------------------------------------------------------
// 絞り込みの選択肢
// ---------------------------------------------------------------------------

const uniqueSorted = (values: (string | null)[]) => [...new Set(values.filter((v): v is string => !!v))].sort(byKeys((v) => v));

export function filterOptions(
  txs: readonly AnalysisTx[],
  classifier: Pick<ClassifierSettings, 'globalPatterns' | 'casePatterns'>,
) {
  const bankToAccounts: Record<string, string[]> = {};
  for (const t of txs) {
    if (!t.bankName || !t.accountNumber) continue;
    const list = (bankToAccounts[t.bankName] ??= []);
    if (!list.includes(t.accountNumber)) list.push(t.accountNumber);
  }
  for (const list of Object.values(bankToAccounts)) list.sort(byKeys((v) => v));

  return {
    banks: uniqueSorted(txs.map((t) => t.bankName)),
    branches: uniqueSorted(txs.map((t) => t.branchName)),
    accounts: uniqueSorted(txs.map((t) => t.accountNumber)),
    categories: sortCategories([
      ...txs.map((t) => t.category),
      ...STANDARD_CATEGORIES,
      ...normalizePatterns(classifier.globalPatterns).keys(),
      ...normalizePatterns(classifier.casePatterns).keys(),
    ]),
    bankToAccounts,
  };
}

// ---------------------------------------------------------------------------
// 分析画面ひとまとめ（Django 版の get_analysis_data）
// ---------------------------------------------------------------------------

export function analysisData<T extends AnalysisTx>(
  input: {
    transactions: readonly T[];
    accounts: readonly AnalysisAccount[];
    classifier: Pick<ClassifierSettings, 'globalPatterns' | 'casePatterns' | 'fuzzy'>;
    analysis: Pick<AnalysisSettings, 'transferTolerance' | 'transferDaysWindow' | 'transferDateMode'>;
  },
  filter: TransactionFilter = {},
) {
  if (input.transactions.length === 0) return { noData: true as const };
  const ordered = sortTransactions(input.transactions, parseSort(filter.sort));
  return {
    noData: false as const,
    accountSummary: accountSummary(input.accounts, ordered),
    transferPairs: transferPairs(ordered, input.analysis, filter),
    allTxs: filterTransactions(ordered, filter),
    duplicateTxs: duplicateTransactions(ordered),
    flaggedTxs: ordered.filter((t) => t.isFlagged),
    ...filterOptions(ordered, input.classifier),
    ...aiSuggestions(ordered, input.classifier),
  };
}
