/**
 * 復代理人（社員）の住所・生年月日。一覧（/staff）には入っていないので、選んだ1人分だけ
 * 社員台帳の /staff/:id/personal から読む。画面の外へは持ち出さず、保存もしない。
 */
import { parseBirthDate } from './wareki';

export type SubAgentDetails = { address: string; birthDate: string };

const TIMEOUT_MS = 3000;

/** 台帳の応答を委任状に刷る形へ。生年月日は YYYY-MM-DD → 和暦（郵便番号は他の住所欄に揃えて刷らない） */
export function parseStaffPersonal(body: unknown): SubAgentDetails | null {
  if (typeof body !== 'object' || body === null) return null;
  const value = body as Record<string, unknown>;
  const text = (field: unknown) => (typeof field === 'string' ? field.trim() : '');
  const birth = parseBirthDate(text(value.birthDate));
  return { address: text(value.address), birthDate: birth.ok ? birth.text : '' };
}

export async function fetchSubAgentDetails(staffId: number): Promise<SubAgentDetails | null> {
  try {
    const res = await fetch(`/staff-directory/api/staff/${staffId}/personal`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return res.ok ? parseStaffPersonal(await res.json()) : null;
  } catch {
    return null;
  }
}
