import { selectedOperatorHeaders } from '@/shared/staff-directory/operator';
import type { PrincipalInput } from './record';

const API_BASE = '/inheritance-tax-docs/api/poa-principals';

/**
 * 委任者DBに入れる中身。生年月日はサーバが和暦に直して返す。
 * deceasedName は被相続人DBができる前の手がかりの欄で、画面からは直さず受け取ったまま送り返す。
 */
export type PrincipalDraft = Pick<PrincipalInput, 'kind' | 'name' | 'address' | 'representative'> & {
  nameKana: string;
  birthDate: string;
  deceasedName: string;
  memo: string;
};

/** 被相続人DB・委任者DBの相手を指す名前だけの形 */
export type LinkedName = { id: number; name: string };

export type PoaPrincipal = PrincipalDraft & {
  id: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  /** つながっている被相続人（被相続人DB） */
  deceased: LinkedName[];
};

export const EMPTY_PRINCIPAL_DRAFT: PrincipalDraft = {
  kind: 'individual',
  name: '',
  nameKana: '',
  address: '',
  birthDate: '',
  representative: '',
  deceasedName: '',
  memo: '',
};

/** 409（ほかの画面で変わった）を見分けるための失敗。current はサーバにある今の内容 */
export class PrincipalApiError extends Error {
  readonly status: number;
  readonly current?: PoaPrincipal;

  constructor(message: string, status: number, current?: PoaPrincipal) {
    super(message);
    this.status = status;
    this.current = current;
  }
}

const readJson = async <T>(response: Response, fallback: string): Promise<T> => {
  const body = await response.json().catch(() => ({})) as T & { error?: string; current?: PoaPrincipal };
  if (!response.ok) throw new PrincipalApiError(body.error ?? fallback, response.status, body.current);
  return body;
};

const sendJson = (path: string, method: string, body?: unknown) =>
  fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...selectedOperatorHeaders() },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

export async function fetchPrincipals(options: { query?: string; deleted?: boolean } = {}): Promise<PoaPrincipal[]> {
  const params = new URLSearchParams();
  if (options.query?.trim()) params.set('q', options.query.trim());
  if (options.deleted) params.set('deleted', '1');
  const search = params.toString();
  const response = await fetch(`${API_BASE}${search ? `?${search}` : ''}`);
  return readJson<PoaPrincipal[]>(response, '委任者DBを読み込めませんでした');
}

export async function fetchPrincipal(id: number): Promise<PoaPrincipal> {
  return readJson<PoaPrincipal>(await fetch(`${API_BASE}/${id}`), '委任者DBから読み込めませんでした');
}

export async function createPrincipal(draft: PrincipalDraft): Promise<PoaPrincipal> {
  return readJson<PoaPrincipal>(await sendJson('', 'POST', draft), '委任者DBに登録できませんでした');
}

export async function updatePrincipal(id: number, draft: PrincipalDraft, version: number): Promise<PoaPrincipal & { unchanged: boolean }> {
  return readJson<PoaPrincipal & { unchanged: boolean }>(
    await sendJson(`/${id}`, 'PUT', { ...draft, version }),
    '委任者DBを更新できませんでした',
  );
}

export async function deletePrincipal(id: number): Promise<void> {
  await readJson(await sendJson(`/${id}`, 'DELETE'), '削除できませんでした');
}

export async function restorePrincipal(id: number): Promise<PoaPrincipal> {
  return readJson<PoaPrincipal>(await sendJson(`/${id}/restore`, 'POST'), '戻せませんでした');
}

export const draftOf = ({ kind, name, nameKana, address, birthDate, representative, deceasedName, memo }: PrincipalDraft): PrincipalDraft =>
  ({ kind, name, nameKana, address, birthDate, representative, deceasedName, memo });
