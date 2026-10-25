import { selectedOperatorHeaders } from '@/shared/staff-directory/operator';
import type { PoaPrincipal } from './principalApi';

const API_BASE = '/inheritance-tax-docs/api/poa-deceased';

/** 被相続人DBに入れる中身。生年月日はサーバが和暦に直して返す */
export type DeceasedDraft = {
  name: string;
  nameKana: string;
  birthDate: string;
  memo: string;
};

export type PoaDeceased = DeceasedDraft & {
  id: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  /** つながっている相続人（委任者DBの人。ゴミ箱の中の人は入らない） */
  heirs: PoaPrincipal[];
};

export const EMPTY_DECEASED_DRAFT: DeceasedDraft = { name: '', nameKana: '', birthDate: '', memo: '' };

/** 409（ほかの画面で変わった）を見分けるための失敗。current はサーバにある今の内容 */
export class DeceasedApiError extends Error {
  readonly status: number;
  readonly current?: PoaDeceased;

  constructor(message: string, status: number, current?: PoaDeceased) {
    super(message);
    this.status = status;
    this.current = current;
  }
}

const readJson = async <T>(response: Response, fallback: string): Promise<T> => {
  const body = await response.json().catch(() => ({})) as T & { error?: string; current?: PoaDeceased };
  if (!response.ok) throw new DeceasedApiError(body.error ?? fallback, response.status, body.current);
  return body;
};

const sendJson = (path: string, method: string, body?: unknown) =>
  fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...selectedOperatorHeaders() },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

export async function fetchDeceasedList(options: { query?: string; deleted?: boolean } = {}): Promise<PoaDeceased[]> {
  const params = new URLSearchParams();
  if (options.query?.trim()) params.set('q', options.query.trim());
  if (options.deleted) params.set('deleted', '1');
  const search = params.toString();
  const response = await fetch(`${API_BASE}${search ? `?${search}` : ''}`);
  return readJson<PoaDeceased[]>(response, '被相続人DBを読み込めませんでした');
}

export async function fetchDeceased(id: number): Promise<PoaDeceased> {
  return readJson<PoaDeceased>(await fetch(`${API_BASE}/${id}`), '被相続人DBから読み込めませんでした');
}

export async function createDeceased(draft: DeceasedDraft): Promise<PoaDeceased> {
  return readJson<PoaDeceased>(await sendJson('', 'POST', draft), '被相続人DBに登録できませんでした');
}

export async function updateDeceased(id: number, draft: DeceasedDraft, version: number): Promise<PoaDeceased & { unchanged: boolean }> {
  return readJson<PoaDeceased & { unchanged: boolean }>(
    await sendJson(`/${id}`, 'PUT', { ...draft, version }),
    '被相続人DBを更新できませんでした',
  );
}

export async function deleteDeceased(id: number): Promise<void> {
  await readJson(await sendJson(`/${id}`, 'DELETE'), '削除できませんでした');
}

export async function restoreDeceased(id: number): Promise<PoaDeceased> {
  return readJson<PoaDeceased>(await sendJson(`/${id}/restore`, 'POST'), '戻せませんでした');
}

/** 相続人をつなぐ（つながり済みの人は何もしない） */
export async function linkHeirs(id: number, principalIds: number[]): Promise<PoaDeceased> {
  return readJson<PoaDeceased>(await sendJson(`/${id}/heirs`, 'POST', { principalIds }), '相続人をつなげませんでした');
}

/** つながりを外すだけ（委任者DBの人そのものは消さない） */
export async function unlinkHeir(id: number, principalId: number): Promise<PoaDeceased> {
  return readJson<PoaDeceased>(await sendJson(`/${id}/heirs/${principalId}`, 'DELETE'), 'つながりを外せませんでした');
}

export const deceasedDraftOf = ({ name, nameKana, birthDate, memo }: DeceasedDraft): DeceasedDraft =>
  ({ name, nameKana, birthDate, memo });
