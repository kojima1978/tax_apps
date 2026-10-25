import type { MatterMaster, Purpose } from '@/constants/powerOfAttorneyMatters';
import { selectedOperatorHeaders } from '@/shared/staff-directory/operator';

const API_BASE = '/inheritance-tax-docs/api/poa-matters';

export type MatterMasterResponse = MatterMaster & { version: number; updatedAt: string };

/** 409（ほかの画面で変わった）を見分けるための失敗 */
export class MatterMasterError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const readJson = async <T>(response: Response, fallback: string): Promise<T> => {
  const body = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new MatterMasterError(body.error ?? fallback, response.status);
  return body;
};

const toMaster = ({ version, updatedAt, matters, presets }: MatterMasterResponse): MatterMasterResponse =>
  ({ version, updatedAt, matters, presets });

export async function fetchMatterMaster(): Promise<MatterMasterResponse> {
  const response = await fetch(API_BASE);
  return toMaster(await readJson<MatterMasterResponse>(response, '委任事項を読み込めませんでした'));
}

export async function saveMatterMaster(master: MatterMaster, version: number): Promise<MatterMasterResponse & { unchanged: boolean }> {
  const response = await fetch(API_BASE, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...selectedOperatorHeaders() },
    body: JSON.stringify({ version, matters: master.matters, presets: master.presets }),
  });
  const body = await readJson<MatterMasterResponse & { unchanged: boolean }>(response, '委任事項を保存できませんでした');
  return { ...toMaster(body), unchanged: body.unchanged };
}

/** 文面を定型文として足す。ids は texts と同じ並びで、もう登録済みの文面はその事項の id */
export async function registerMatters(
  purpose: Purpose,
  texts: string[],
  afterId?: string,
): Promise<{ master: MatterMasterResponse; ids: string[]; created: number }> {
  const response = await fetch(`${API_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...selectedOperatorHeaders() },
    body: JSON.stringify({ purpose, texts, afterId }),
  });
  const body = await readJson<MatterMasterResponse & { ids: string[]; created: number }>(response, '定型文に登録できませんでした');
  return { master: toMaster(body), ids: body.ids, created: body.created };
}
