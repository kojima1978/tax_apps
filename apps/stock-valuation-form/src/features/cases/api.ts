// 案件（会社1社ぶんの入力データ）の保存API。サーバ側は server/routes/cases.ts。

import type { FormData } from '@/types/form';

const API_BASE = `${import.meta.env.BASE_URL}api`;

export interface CaseSummary {
  id: number;
  companyName: string;
  taxPeriod: string;
  /**
   * 同じ会社の年分をまとめる印（サーバが振る）。翌年度更新・複製で引き継ぐ。
   * 振られていない案件は null で、そのときは会社名で名寄せする（caseGroups）。
   */
  companyKey: string | null;
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

/**
 * 上書きが弾かれた（読んだときから別の端末が更新していた）。
 * 呼び出し側が「もう一度送る」ではなく「読み直す」へ倒せるよう、他の失敗と型で分ける。
 */
export class CaseConflictError extends Error {
  constructor(message: string, readonly current: CaseSummary | null) {
    super(message);
    this.name = 'CaseConflictError';
  }
}

async function unwrap<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: string; case?: CaseSummary }
      | null;
    const message = body?.error ?? `サーバがHTTP ${response.status}を返しました`;
    if (response.status === 409) throw new CaseConflictError(message, body?.case ?? null);
    throw new Error(message);
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

/**
 * 新しい案件を作る。`relatedTo` にいまの案件のIDを渡すと、その案件と同じ会社として作られる
 * （翌年度更新。会社キーはサーバが揃えるので、こちらは関係の元を指すだけ）。
 */
export async function createCase(input: CaseInput, relatedTo?: number): Promise<CaseSummary> {
  const query = relatedTo === undefined ? '' : `?relatedTo=${relatedTo}`;
  return (await request<{ case: CaseSummary }>('POST', `/cases${query}`, input)).case;
}

/**
 * 上書き。`expectedUpdatedAt` は最後に見た updatedAt で、サーバ側が動いていれば
 * CaseConflictError になる（null なら突き合わせ無し）。
 */
export async function updateCase(
  id: number,
  input: CaseInput,
  expectedUpdatedAt: string | null,
): Promise<CaseSummary> {
  const body = { ...input, expectedUpdatedAt };
  return (await request<{ case: CaseSummary }>('PUT', `/cases/${id}`, body)).case;
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
