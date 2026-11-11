import { prisma } from '@/lib/prisma';
import {
  planAssignees,
  planDepartments,
  type DirectoryDepartment,
  type DirectoryLink,
  type DirectoryStaff,
  type SyncOp,
} from './plan';
import { RUN_HISTORY_LIMIT, prunableRunIds, summarizeRuns, type SyncStatus, type SyncTrigger } from './run-log';

// 部署・担当者は社員台帳（staff-directory）が正で、案件管理の表はその写し。写し直すのは3つのとき:
//   - 台帳が保存のたびに POST で知らせてきたとき（trigger: directory）
//   - 一覧を読む API が呼ばれ、前回の試行から5分以上たっていたとき（知らせが届かなかったときの保険）
//   - 画面の「今すぐ読み直す」
// 結果は StaffDirectorySyncRun に残す（再起動しても前回の結果が見える）。
// 台帳が止まっていても案件管理は写しのまま動く（失敗は記録して次の機会に再試行）。

const DIRECTORY_URL = process.env.STAFF_DIRECTORY_URL ?? 'http://staff-directory:3031/staff-directory/api';
const INTERVAL_MS = 5 * 60 * 1000;
// 一覧の表示を待たせる上限。台帳が落ちているときに画面が固まらないよう短くする
const TIMEOUT_MS = 3000;

/** 台帳に居ない（台帳ID の無い）担当者。台帳側で `npm run import:itcm` を流し直すと結び付く */
export type UnlinkedAssignee = { id: number; name: string };

/** 状況の API が返す形。unlinked は社員台帳の連携の画面が読む名前に合わせて unlinkedAssignees で返す */
export type StaffDirectorySyncResult = Omit<SyncStatus<UnlinkedAssignee>, 'unlinked'> & { unlinkedAssignees: UnlinkedAssignee[] };

type RunOutcome = { ok: true; created: number; updated: number; unlinked: UnlinkedAssignee[] } | { ok: false; error: string };

// 写しは1本ずつ順に走らせる。保存の知らせ・手動は前の回が終わってから改めて読む
// （前の回が保存より前の台帳を読んでいたかもしれないので相乗りしない）。interval だけは走っている回に相乗りする
let tail: Promise<unknown> = Promise.resolve();
let inflight: Promise<StaffDirectorySyncResult | null> | null = null;
// 起動してから一度も写していなければ、interval でも5分を待たずに写す
// （止まっている間に台帳からの知らせを取りこぼしているかもしれないので）
let ranSinceStart = false;

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

async function runSync(): Promise<RunOutcome> {
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
      return { ok: true as const, created: d.created + a.created, updated: d.updated + a.updated, unlinked: unlinkedAssignees };
    });
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error('[staff-directory-sync]', error);
    return { ok: false, error };
  }
}

async function recordRun(trigger: SyncTrigger, outcome: RunOutcome): Promise<void> {
  await prisma.staffDirectorySyncRun.create({
    data: outcome.ok
      ? { trigger, ok: true, created: outcome.created, updated: outcome.updated, unlinked: outcome.unlinked }
      : { trigger, ok: false, error: outcome.error },
  });
  const [ids, lastOk] = await Promise.all([
    prisma.staffDirectorySyncRun.findMany({ select: { id: true }, orderBy: { id: 'desc' } }),
    prisma.staffDirectorySyncRun.findFirst({ where: { ok: true }, select: { id: true }, orderBy: { id: 'desc' } }),
  ]);
  const prunable = prunableRunIds(ids.map((r) => r.id), lastOk?.id ?? null);
  if (prunable.length > 0) await prisma.staffDirectorySyncRun.deleteMany({ where: { id: { in: prunable } } });
}

/** 写しの状況を DB から読む（写しは走らせない）。まだ一度も写していなければ null */
export async function getStaffDirectorySyncStatus(): Promise<StaffDirectorySyncResult | null> {
  const [recent, lastOk] = await Promise.all([
    prisma.staffDirectorySyncRun.findMany({ orderBy: { id: 'desc' }, take: RUN_HISTORY_LIMIT }),
    prisma.staffDirectorySyncRun.findFirst({ where: { ok: true }, orderBy: { id: 'desc' } }),
  ]);
  const status = summarizeRuns<UnlinkedAssignee>(recent, lastOk);
  if (!status) return null;
  const { unlinked, ...rest } = status;
  return { ...rest, unlinkedAssignees: unlinked };
}

/**
 * 台帳から写し直す。interval のときは前回の試行から5分以内なら何もしない（null を返す。起動後の最初の1回は除く）。
 * 失敗した回も試行として数える ── 台帳が落ちている間、一覧のたびに待たされないように。例外は投げない
 */
export async function syncStaffDirectory(trigger: SyncTrigger): Promise<StaffDirectorySyncResult | null> {
  if (trigger === 'interval' && inflight) return inflight;
  const run = tail.then(async () => {
    if (trigger === 'interval') {
      const last = await prisma.staffDirectorySyncRun.findFirst({ select: { at: true }, orderBy: { id: 'desc' } });
      if (ranSinceStart && last && Date.now() - last.at.getTime() < INTERVAL_MS) return null;
    }
    ranSinceStart = true;
    await recordRun(trigger, await runSync());
    return getStaffDirectorySyncStatus();
  });
  tail = run.catch(() => undefined);
  inflight = run;
  try {
    return await run;
  } catch (e) {
    // 記録の書き込みに失敗しても一覧は写しのまま返す
    console.error('[staff-directory-sync]', e instanceof Error ? e.message : e);
    return null;
  } finally {
    if (inflight === run) inflight = null;
  }
}
