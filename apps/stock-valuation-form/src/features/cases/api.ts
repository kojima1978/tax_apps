// 案件（会社1社ぶんの入力データ）の保存API。サーバ側は server/routes/cases.ts。

import type { FormData } from '@/types/form';

const API_BASE = `${import.meta.env.BASE_URL}api`;

export interface CaseSummary {
  id: number;
  companyName: string;
  taxPeriod: string;
  /** ゴミ箱に入れた日時。入っていなければ null。 */
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CaseDetail extends CaseSummary {
  data: FormData;
}

export interface CaseInput {
  companyName: string;
  taxPeriod: string;
  data: FormData;
}

async function unwrap<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `サーバがHTTP ${response.status}を返しました`);
  }
  return (await response.json()) as T;
}

function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  return fetch(`${API_BASE}${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).then(unwrap<T>);
}

export async function fetchCases(includeArchived = false): Promise<CaseSummary[]> {
  const body = await request<{ cases: CaseSummary[] }>(
    'GET',
    `/cases${includeArchived ? '?includeArchived=1' : ''}`,
  );
  return body.cases;
}

export async function fetchCase(id: number): Promise<CaseDetail> {
  return (await request<{ case: CaseDetail }>('GET', `/cases/${id}`)).case;
}

export async function createCase(input: CaseInput): Promise<CaseSummary> {
  return (await request<{ case: CaseSummary }>('POST', '/cases', input)).case;
}

export async function updateCase(id: number, input: CaseInput): Promise<CaseSummary> {
  return (await request<{ case: CaseSummary }>('PUT', `/cases/${id}`, input)).case;
}

export async function duplicateCase(id: number): Promise<CaseSummary> {
  return (await request<{ case: CaseSummary }>('POST', `/cases/${id}/duplicate`)).case;
}

export async function restoreCase(id: number): Promise<CaseSummary> {
  return (await request<{ case: CaseSummary }>('POST', `/cases/${id}/restore`)).case;
}

/** ゴミ箱へ入れる（既定の削除）。実体は残るので復元できる。 */
export async function archiveCase(id: number): Promise<CaseSummary> {
  return (await request<{ case: CaseSummary }>('DELETE', `/cases/${id}`)).case;
}

/** 完全に削除する。取り消せないので、呼ぶ前に必ず確認を取ること。 */
export async function purgeCase(id: number): Promise<void> {
  await request<{ purged: boolean }>('DELETE', `/cases/${id}?purge=1`);
}
