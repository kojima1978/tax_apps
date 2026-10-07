// API の呼び出し口。パスは vite.config.ts の base から来る（'/bank-analyzer-next/'）。
const API_BASE = `${import.meta.env.BASE_URL}api`;

export type CaseSummary = {
  id: number;
  name: string;
  createdAt: string;
  referenceDate: string | null;
  transactionCount: number;
};

export async function fetchCases(): Promise<CaseSummary[]> {
  const res = await fetch(`${API_BASE}/cases`);
  if (!res.ok) throw new Error(`案件一覧を読めませんでした（${res.status}）`);
  return (await res.json()) as CaseSummary[];
}
