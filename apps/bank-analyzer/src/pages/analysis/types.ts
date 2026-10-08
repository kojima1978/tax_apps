// GET /cases/:id/dashboard の応答（server/services/dashboard.ts の getDashboard）。
// サーバーの関数から型を引くと Prisma の型まで画面側の型検査に入るので、形はここに書き写す。
// 集計の型（DB に依存しない lib/aggregate.ts）はそのまま使う

import type { AccountSummary, AiGroup, AiSuggestion, TransferEndpoint, UnclassifiedGroup } from '../../../server/lib/aggregate';

export const TABS = ['overview', 'all', 'unclassified', 'ai', 'transfers', 'cleanup', 'flagged'] as const;
export type Tab = (typeof TABS)[number];

export type Page<T> = { items: T[]; total: number; page: number; pageCount: number; perPage: number };

// 一覧の1行（services/dashboard.ts の row）
export type TxRow = {
  id: number;
  date: string | null;
  description: string;
  amountOut: number;
  amountIn: number;
  balance: number | null;
  category: string;
  memo: string;
  bankName: string;
  branchName: string;
  accountType: string;
  accountNumber: string;
  isFlagged: boolean;
  isTransfer: boolean;
};

export type DeletionBackup = { id: number; startId: number; endId: number; transactionCount: number; createdAt: string };

export type ClassificationChangeSummary = {
  changeGroup: string;
  count: number;
  oldCategory: string;
  newCategory: string;
  createdAt: string;
  description: string | null;
  source: string;
};

export type FilterOptions = {
  banks: string[];
  branches: string[];
  accounts: string[];
  categories: string[];
  bankToAccounts: Record<string, string[]>;
};

type Common = {
  case: { id: number; name: string; referenceDate: string | null };
  activeTab: Tab;
  latestDeletionBackup: DeletionBackup | null;
};

export type OverviewData = {
  accountSummary: AccountSummary[];
  chartCategories: { labels: string[]; counts: number[]; totals: number[] };
  chartMonthly: { months: string[]; monthKeys: string[]; out: number[]; in: number[]; inheritanceStartMonth: string };
  totalOut: number;
  totalIn: number;
  netFlow: number;
  incomingTxCount: number;
  outgoingTxCount: number;
  earliestTransactionDate: string | null;
  latestTransactionDate: string | null;
};

export type PatternItem = { category: string; keywords: string[] };

export type TabData = {
  overview: OverviewData;
  all: { allTxs: Page<TxRow> };
  unclassified: {
    unclassifiedTxs: Page<TxRow>;
    unclassifiedGroups: Page<UnclassifiedGroup>;
    unclassifiedGroupCount: number;
    unclassifiedTxTotal: number;
    maxGroupCount: number;
    groupSuggestions: Record<string, { category: string; score: number }>;
    highConfidenceGroups: AiGroup[];
    highConfidenceTxCount: number;
  };
  ai: {
    aiSuggestions: AiSuggestion[];
    aiGroups: AiGroup[];
    highConfidenceGroups: AiGroup[];
    highConfidenceTxCount: number;
    fuzzyThreshold: number;
    suggestionCutoff: number;
    defaultCutoff: number;
    // 下限より下の候補の点数（高い順。新しい100件の中）
    hiddenScores: number[];
    bulkCounts: Record<string, number>;
    targetCount: number;
    globalPatterns: PatternItem[];
    casePatterns: PatternItem[];
  };
  transfers: {
    transferPairs: { source: TransferEndpoint; destination: TransferEndpoint; amountDiff: number }[];
    transferSummary: { totalAmount: number; pairCount: number; unclassifiedCount: number };
  };
  cleanup: { duplicateTxs: (TxRow & { dupGroupIdx: 0 | 1 })[] };
  flagged: { flaggedTxs: TxRow[] };
};

export type DashboardSummary = Common & {
  noData: false;
  totalTxCount: number;
  classifiedCount: number;
  classifiedPct: number;
  unclassifiedCount: number;
  flaggedCount: number;
  suggestionsCount: number;
  latestClassificationChange: ClassificationChangeSummary | null;
  options: FilterOptions;
};

export type Dashboard = (Common & { noData: true }) | (DashboardSummary & Partial<TabData[Tab]>);
