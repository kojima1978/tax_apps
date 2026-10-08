// 分析画面のタブごとの中身（Django: views/dashboard.py の analysis_dashboard）。
// 計算は lib/aggregate.ts。ここは DB から読んで、開いているタブの分だけ組み立てる。
//
// Django 版との違い:
// - 分類別の集計で件数が同じ分類の並びは DB 任せだった。標準の分類順で揃える
// - 資金移動の組は Django 版では相手の入金が無いこともあった（destination が空）。
//   こちらは判定で実際に組んだものだけなので、金額差は常に出す

import type { PrismaClient } from '@prisma/client';
import {
  accountSummary,
  aiSuggestions,
  duplicateTransactions,
  filterOptions,
  filterTransactions,
  groupSuggestions,
  monthlyCashflow,
  parseSort,
  sortTransactions,
  transferPairs,
  unclassifiedGroups,
  type TransactionFilter,
} from '../lib/aggregate.js';
import { UNCATEGORIZED, sortCategories } from '../lib/categories.js';
import { warekiMonthShort } from '../lib/dates.js';
import { pyRound } from '../lib/pyRound.js';
import { matchesAllKeywords, splitKeywords } from '../lib/text.js';
import { toDateString, toId } from '../json.js';
import { latestSummary } from './classificationHistory.js';
import { loadRows, type ExportRow } from './exports.js';
import { latestDeletionBackup } from './rangeDelete.js';
import { getAppSettings, getCasePatterns, getClassifierSettings, getGlobalPatterns, patternList } from './settings.js';

export const DASHBOARD_TABS = ['overview', 'all', 'unclassified', 'ai', 'transfers', 'cleanup', 'flagged'] as const;
export type DashboardTab = (typeof DASHBOARD_TABS)[number];

export const PER_PAGE_OPTIONS = [25, 50, 100, 200] as const;
export const DEFAULT_PER_PAGE = 100;
const GROUP_PER_PAGE = 50;
const HIGH_CONFIDENCE = 95;

export type DashboardQuery = {
  tab: DashboardTab;
  filter: TransactionFilter;
  perPage: number;
  page: string | null;
  unclassifiedPage: string | null;
  groupPage: string | null;
};

// ---------------------------------------------------------------------------
// ページ送り（Django の Paginator: 数字でなければ1ページ目、範囲外なら最後のページ）
// ---------------------------------------------------------------------------

export type Page<T> = { items: T[]; total: number; page: number; pageCount: number; perPage: number };

export function paginate<T>(items: readonly T[], page: string | null, perPage: number): Page<T> {
  const pageCount = Math.max(1, Math.ceil(items.length / perPage));
  const n = page !== null && /^\d+$/.test(page.trim()) ? Number(page.trim()) : 1;
  const current = n < 1 ? pageCount : Math.min(n, pageCount);
  return {
    items: items.slice((current - 1) * perPage, current * perPage),
    total: items.length,
    page: current,
    pageCount,
    perPage,
  };
}

export function parsePerPage(value: string | null | undefined): number {
  const n = Number(value);
  return (PER_PAGE_OPTIONS as readonly number[]).includes(n) ? n : DEFAULT_PER_PAGE;
}

// ---------------------------------------------------------------------------
// 一覧の1行（画面の表に出す項目）
// ---------------------------------------------------------------------------

const row = (t: ExportRow) => ({
  id: t.id,
  date: t.date,
  description: t.description ?? '',
  amountOut: t.amountOut,
  amountIn: t.amountIn,
  balance: t.balance,
  category: t.category,
  memo: t.memo ?? '',
  bankName: t.bankName ?? '',
  branchName: t.branchName ?? '',
  accountType: t.accountType ?? '',
  accountNumber: t.accountNumber ?? '',
  isFlagged: t.isFlagged,
  isTransfer: t.isTransfer,
});

const byKeyword = <T extends ExportRow>(txs: readonly T[], keyword: string | undefined) => {
  const kws = splitKeywords(keyword ?? '');
  return kws.length ? txs.filter((t) => matchesAllKeywords(t.description, kws)) : [...txs];
};

// ---------------------------------------------------------------------------
// タブごと
// ---------------------------------------------------------------------------

async function overview(db: PrismaClient, caseId: bigint, txs: ExportRow[], referenceDate: string | null) {
  const accounts = await db.account.findMany({ where: { caseId } });
  const summary = accountSummary(
    accounts.map((a) => ({
      id: toId(a.id),
      accountNumber: a.accountNumber,
      holder: a.holder,
      bankName: a.bankName,
      branchName: a.branchName,
      accountType: a.accountType,
    })),
    txs,
  );

  const stats = new Map<string, { count: number; total: number }>();
  let unclassified = 0;
  let totalOut = 0;
  let totalIn = 0;
  let incoming = 0;
  let outgoing = 0;
  let earliest: string | null = null;
  let latest: string | null = null;
  for (const t of txs) {
    totalOut += t.amountOut;
    totalIn += t.amountIn;
    if (t.amountIn > 0) incoming++;
    if (t.amountOut > 0) outgoing++;
    if (t.date && (earliest === null || t.date < earliest)) earliest = t.date;
    if (t.date && (latest === null || t.date > latest)) latest = t.date;
    if (t.category === UNCATEGORIZED) {
      unclassified++;
      continue;
    }
    const s = stats.get(t.category) ?? { count: 0, total: 0 };
    stats.set(t.category, s);
    s.count++;
    s.total += t.amountOut + t.amountIn;
  }
  const order = sortCategories(stats.keys());
  const categories = [...order].sort((a, b) => stats.get(b)!.count - stats.get(a)!.count);
  const chartCategories = {
    labels: categories,
    counts: categories.map((c) => stats.get(c)!.count),
    totals: categories.map((c) => stats.get(c)!.total),
  };
  if (unclassified) {
    chartCategories.labels.push(UNCATEGORIZED);
    chartCategories.counts.push(unclassified);
    chartCategories.totals.push(0);
  }

  const monthly = monthlyCashflow(txs, referenceDate);
  return {
    accountSummary: summary,
    chartCategories,
    chartMonthly: {
      months: monthly.map((m) => warekiMonthShort(m.month)),
      monthKeys: monthly.map((m) => m.month.slice(0, 7)),
      out: monthly.map((m) => m.totalOut),
      in: monthly.map((m) => m.totalIn),
      // 最大取引月の判定から相続開始月以降を外すための目印（未設定なら空）
      inheritanceStartMonth: referenceDate ? referenceDate.slice(0, 7) : '',
    },
    totalOut,
    totalIn,
    netFlow: totalIn - totalOut,
    incomingTxCount: incoming,
    outgoingTxCount: outgoing,
    earliestTransactionDate: earliest,
    latestTransactionDate: latest,
  };
}

async function tabData(db: PrismaClient, caseId: bigint, q: DashboardQuery, txs: ExportRow[], referenceDate: string | null) {
  const ordered = sortTransactions(txs, parseSort(q.filter.sort));
  switch (q.tab) {
    case 'overview':
      return overview(db, caseId, txs, referenceDate);

    case 'all': {
      const page = paginate(filterTransactions(ordered, q.filter), q.page, q.perPage);
      return { allTxs: { ...page, items: page.items.map(row) } };
    }

    case 'unclassified': {
      const unclassified = ordered.filter((t) => t.category === UNCATEGORIZED);
      const page = paginate(byKeyword(unclassified, q.filter.keyword), q.unclassifiedPage, q.perPage);
      const grouped = unclassifiedGroups(unclassified, q.filter.keyword);
      const groupPage = paginate(grouped.groups, q.groupPage, GROUP_PER_PAGE);
      const classifier = await getClassifierSettings(db, caseId);
      return {
        unclassifiedTxs: { ...page, items: page.items.map(row) },
        unclassifiedGroups: groupPage,
        unclassifiedGroupCount: grouped.groups.length,
        unclassifiedTxTotal: grouped.txTotal,
        maxGroupCount: grouped.maxGroupCount,
        groupSuggestions: groupSuggestions(groupPage.items, classifier),
      };
    }

    case 'ai': {
      const [classifier, globalPatterns, casePatterns] = await Promise.all([
        getClassifierSettings(db, caseId),
        getGlobalPatterns(db),
        getCasePatterns(db, caseId),
      ]);
      const ai = aiSuggestions(ordered, classifier);
      const high = ai.aiGroups.filter((g) => g.score >= HIGH_CONFIDENCE);
      return {
        ...ai,
        highConfidenceGroups: high,
        highConfidenceTxCount: high.reduce((n, g) => n + g.count, 0),
        globalPatterns: patternList(globalPatterns),
        casePatterns: patternList(casePatterns),
      };
    }

    case 'transfers': {
      const settings = await getAppSettings(db);
      const pairs = transferPairs(ordered, settings, q.filter).map((p) => ({
        ...p,
        amountDiff: Math.abs(p.source.amount - p.destination.amount),
      }));
      return {
        transferPairs: pairs,
        transferSummary: {
          totalAmount: pairs.reduce((n, p) => n + p.source.amount, 0),
          pairCount: pairs.length,
          unclassifiedCount: pairs.filter((p) => p.source.category === UNCATEGORIZED || p.destination.category === UNCATEGORIZED).length,
        },
      };
    }

    case 'cleanup':
      return { duplicateTxs: duplicateTransactions(ordered).map((t) => ({ ...row(t), dupGroupIdx: t.dupGroupIdx })) };

    case 'flagged':
      return { flaggedTxs: byKeyword(ordered.filter((t) => t.isFlagged), q.filter.keyword).map(row) };
  }
}

export async function getDashboard(db: PrismaClient, caseId: bigint, q: DashboardQuery) {
  const [found, txs, deletionBackup, classificationChange] = await Promise.all([
    db.case.findUniqueOrThrow({ where: { id: caseId }, select: { name: true, referenceDate: true } }),
    loadRows(db, caseId),
    latestDeletionBackup(db, caseId),
    latestSummary(db, caseId),
  ]);
  const referenceDate = toDateString(found.referenceDate);
  const common = {
    case: { id: toId(caseId), name: found.name, referenceDate },
    activeTab: q.tab,
    latestDeletionBackup: deletionBackup,
  };
  if (txs.length === 0) return { ...common, noData: true as const };

  const unclassifiedCount = txs.filter((t) => t.category === UNCATEGORIZED).length;
  const classifiedCount = txs.length - unclassifiedCount;
  const classifier = await getClassifierSettings(db, caseId);
  return {
    ...common,
    noData: false as const,
    totalTxCount: txs.length,
    classifiedCount,
    classifiedPct: pyRound((classifiedCount / txs.length) * 100, 1),
    unclassifiedCount,
    flaggedCount: txs.filter((t) => t.isFlagged).length,
    latestClassificationChange: classificationChange,
    options: filterOptions(txs, classifier),
    ...(await tabData(db, caseId, q, txs, referenceDate)),
  };
}
