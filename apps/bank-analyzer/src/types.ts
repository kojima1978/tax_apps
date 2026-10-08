// 画面で使う API の応答の形（server/services の戻り値に合わせる）

export type CaseSummary = {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  referenceDate: string | null;
  transactionCount: number;
  unclassifiedCount: number;
  accountCount: number;
};

// GET /cases/:id（server/services/cases.ts の getCase）
export type CaseDetail = {
  id: number;
  name: string;
  referenceDate: string | null;
  accounts: { bankName: string; branchName: string; accountType: string; accountNumber: string }[];
};
