// 直前の取込の結果（依頼25）。確定の応答の summary を、このタブの sessionStorage に案件ごとに1つだけ置く。
// 履歴は持たない（DB にもバックアップにも載らない）。閉じたタブ・別の PC では見えない。
// 読めない・書けない（プライベートウィンドウなど）ときは「無い」として扱う

import type { ImportSummary } from '../../../server/lib/import/summary';

export type { ImportSummary };
export type LastImport = { summary: ImportSummary; message: string; at: string };

const key = (caseId: string | number) => `bank-analyzer:last-import:${caseId}`;

export function saveLastImport(caseId: string | number, value: LastImport): void {
  try {
    sessionStorage.setItem(key(caseId), JSON.stringify(value));
  } catch {
    // 置けなくても取込は済んでいる。結果の画面が「見当たりません」と出すだけ
  }
}

export function loadLastImport(caseId: string | number): LastImport | null {
  try {
    const raw = sessionStorage.getItem(key(caseId));
    if (!raw) return null;
    const v = JSON.parse(raw) as LastImport;
    return v && typeof v === 'object' && v.summary && Array.isArray(v.summary.accounts) ? v : null;
  } catch {
    return null;
  }
}

export function clearLastImport(caseId: string | number): void {
  try {
    sessionStorage.removeItem(key(caseId));
  } catch {
    // 消せなくても困らない
  }
}

// 取引一覧（?tab=all）へのリンク。今回の取込の ID の範囲に、条件を足す
export function txListLink(caseId: string | number, s: Pick<ImportSummary, 'idFrom' | 'idTo'>, extra: Record<string, string | readonly (string | number)[]> = {}): string {
  const q = new URLSearchParams({ tab: 'all' });
  if (s.idFrom !== null) q.set('id_from', String(s.idFrom));
  if (s.idTo !== null) q.set('id_to', String(s.idTo));
  for (const [k, v] of Object.entries(extra)) {
    if (typeof v === 'string') q.set(k, v);
    else for (const x of v) q.append(k, String(x));
  }
  return `/cases/${caseId}?${q}`;
}
