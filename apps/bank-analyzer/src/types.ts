// 画面で使う API の応答の形（server/services の戻り値に合わせる）

// 担当者。staffId は社員台帳の ID、name は選んだ時点の写し
export type CaseAssignee = { staffId: number; name: string };

export type CaseSummary = {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  referenceDate: string | null;
  assignee: CaseAssignee | null;
  transactionCount: number;
  unclassifiedCount: number;
  accountCount: number;
};

// GET /cases/:id（server/services/cases.ts の getCase）
export type CaseDetail = {
  id: number;
  name: string;
  referenceDate: string | null;
  assignee: CaseAssignee | null;
  accounts: { bankName: string; branchName: string; accountType: string; accountNumber: string }[];
};
