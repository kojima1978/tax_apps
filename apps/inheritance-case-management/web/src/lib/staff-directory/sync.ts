import { prisma } from '@/lib/prisma';
import {
  planAssignees,
  planDepartments,
  type DirectoryDepartment,
  type DirectoryLink,
  type DirectoryStaff,
  type SyncOp,
} from './plan';

// 部署・担当者は社員台帳（staff-directory）が正で、案件管理の表はその写し。
// 一覧を読む API が呼ばれたときに、前回から5分以上たっていれば台帳から写し直す。
// 台帳が止まっていても案件管理は写しのまま動く（失敗は記録して次の機会に再試行）。

const DIRECTORY_URL = process.env.STAFF_DIRECTORY_URL ?? 'http://staff-directory:3031/staff-directory/api';
const INTERVAL_MS = 5 * 60 * 1000;
// 一覧の表示を待たせる上限。台帳が落ちているときに画面が固まらないよう短くする
const TIMEOUT_MS = 3000;

export interface StaffDirectorySyncResult {
  ok: boolean;
  at: string;
  error?: string;
  created: number;
  updated: number;
  /** 台帳に居ない（台帳ID の無い）担当者。台帳側で `npm run import:itcm` を流し直すと結び付く */
  unlinkedAssignees: { id: number; name: string }[];
}

let lastAttemptAt = 0;
let lastResult: StaffDirectorySyncResult | null = null;
let inflight: Promise<StaffDirectorySyncResult> | null = null;

async function fetchJson<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${DIRECTORY_URL}${path}`, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: 'no-store' });
  } catch (e) {
    // fetch の素のメッセージ（"fetch failed" / "aborted due to timeout"）は画面にそのまま出るので言い直す
    const timedOut = e instanceof Error && e.name === 'TimeoutError';
    throw new Error(timedOut ? `社員台帳が ${TIMEOUT_MS / 1000} 秒以内に応答しませんでした` : '社員台帳に接続できませんでした');
  }
  if (!res.ok) throw new Error(`社員台帳が ${res.status} を返しました（${path}）`);
  return (await res.json()) as T;
}

type Delegate<T> = {
  create: (args: { data: T }) => Promise<{ id: number }>;
  update: (args: { where: { id: number }; data: Partial<T> }) => Promise<unknown>;
};

async function applyOps<T>(delegate: Delegate<T>, ops: SyncOp<T>[]): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;
  for (const op of ops) {
    if (op.kind === 'create') {
      await delegate.create({ data: op.data });
      created++;
    } else {
      await delegate.update({ where: { id: op.id }, data: op.data });
      updated++;
    }
  }
  return { created, updated };
}

async function runSync(): Promise<StaffDirectorySyncResult> {
  const at = new Date().toISOString();
  try {
    const [departments, staff, links] = await Promise.all([
      fetchJson<DirectoryDepartment[]>('/departments'),
      fetchJson<DirectoryStaff[]>('/staff?status=all'),
      fetchJson<DirectoryLink[]>('/links?app=itcm'),
    ]);

    // 全部写すか、何も写さないか。途中で落ちて部署だけ新しい、を残さない
    return await prisma.$transaction(async (tx) => {
      const localDepartments = await tx.department.findMany();
      const d = await applyOps(tx.department as unknown as Delegate<unknown>, planDepartments(departments, links, localDepartments));

      const deptMap = new Map<number, number>();
      for (const row of await tx.department.findMany({ where: { staffDirectoryId: { not: null } } })) {
        deptMap.set(row.staffDirectoryId!, row.id);
      }
      const localAssignees = await tx.assignee.findMany();
      const a = await applyOps(tx.assignee as unknown as Delegate<unknown>, planAssignees(staff, links, localAssignees, deptMap));

      const unlinkedAssignees = await tx.assignee.findMany({
        where: { staffDirectoryId: null },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });
      return { ok: true, at, created: d.created + a.created, updated: d.updated + a.updated, unlinkedAssignees };
    });
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error('[staff-directory-sync]', error);
    return { ok: false, at, error, created: 0, updated: 0, unlinkedAssignees: lastResult?.unlinkedAssignees ?? [] };
  }
}

/** 台帳から写し直す。force でなければ前回の試行から5分以内は何もしない。例外は投げない */
export async function syncStaffDirectory(options: { force?: boolean } = {}): Promise<StaffDirectorySyncResult | null> {
  if (inflight) return inflight;
  if (!options.force && Date.now() - lastAttemptAt < INTERVAL_MS) return lastResult;
  // 失敗した回も試行として数える ── 台帳が落ちている間、一覧のたびに待たされないように
  lastAttemptAt = Date.now();
  inflight = runSync().then((result) => {
    lastResult = result;
    return result;
  });
  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

export function getLastStaffDirectorySync(): StaffDirectorySyncResult | null {
  return lastResult;
}
