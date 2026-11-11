import { prisma } from "@/lib/prisma";
import { planStaff, type DirectoryStaff } from "./plan";
import { RUN_HISTORY_LIMIT, prunableRunIds, summarizeRuns, type SyncStatus, type SyncTrigger } from "./run-log";

// 担当者は社員台帳（staff-directory）が正で、この表はその写し。写し直すのは次のとき:
//   - 台帳が保存のたびに POST で知らせてきたとき（trigger: directory）
//   - 担当者の一覧を読む API が呼ばれ、前回の試行から5分以上たっていたとき（知らせが届かなかったときの保険）
//   - 画面の「今すぐ読み直す」・バックアップの復元の直前（manual）
// 結果は StaffDirectorySyncRun に残す（再起動しても前回の結果が見える）。
// 台帳が止まっていても写しのまま動く（失敗は記録して次の機会に再試行）。

const DIRECTORY_URL = process.env.STAFF_DIRECTORY_URL ?? "http://staff-directory:3031/staff-directory/api";
const INTERVAL_MS = 5 * 60 * 1000;
// 一覧の表示を待たせる上限。台帳が落ちているときに画面が固まらないよう短くする
const TIMEOUT_MS = 3000;

/** 台帳に居ない（台帳ID の無い）担当者。候補から外れ、担当していた顧客の表示だけ残る */
export type UnlinkedStaff = { id: number; staffCode: string; name: string };

/** 状況の API が返す形。unlinked は社員台帳の連携の画面が読む名前に合わせて unlinkedStaff で返す */
export type StaffDirectorySyncResult = Omit<SyncStatus<UnlinkedStaff>, "unlinked"> & { unlinkedStaff: UnlinkedStaff[] };

type RunOutcome = { ok: true; created: number; updated: number; unlinked: UnlinkedStaff[] } | { ok: false; error: string };

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
    res = await fetch(`${DIRECTORY_URL}${path}`, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  } catch (error) {
    // fetch の素のメッセージ（"fetch failed" / "aborted due to timeout"）は画面にそのまま出るので言い直す
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    throw new Error(timedOut ? `社員台帳が ${TIMEOUT_MS / 1000} 秒以内に応答しませんでした` : "社員台帳に接続できませんでした");
  }
  if (!res.ok) throw new Error(`社員台帳が ${res.status} を返しました（${path}）`);
  return (await res.json()) as T;
}

async function runSync(): Promise<RunOutcome> {
  try {
    const directory = await fetchJson<DirectoryStaff[]>("/staff?status=all");

    // 全部写すか、何も写さないか
    return await prisma.$transaction(async (tx) => {
      const { ops, conflicts } = planStaff(directory, await tx.staff.findMany());
      if (conflicts.length > 0) throw new Error(`担当者コードが重なるため写せません: ${conflicts.join(" / ")}`);

      // 社員番号の入れ替え（AさんとBさんの番号を交換など）で一意制約に当たらないよう、
      // コードの変わる行はいったん仮のコードへ退避してから本来の値を書く
      const updates = ops.filter((op) => op.kind === "update");
      for (const op of updates) {
        if (op.data.staffCode !== undefined) await tx.staff.update({ where: { id: op.id }, data: { staffCode: `~sync-${op.id}` } });
      }
      let created = 0;
      for (const op of updates) await tx.staff.update({ where: { id: op.id }, data: op.data });
      for (const op of ops) {
        if (op.kind !== "create") continue;
        await tx.staff.create({ data: op.data });
        created++;
      }

      const unlinkedStaff = await tx.staff.findMany({
        where: { staffDirectoryId: null },
        select: { id: true, staffCode: true, name: true },
        orderBy: [{ name: "asc" }, { staffCode: "asc" }],
      });
      return { ok: true as const, created, updated: updates.length, unlinked: unlinkedStaff };
    }, { timeout: 30_000 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[staff-directory-sync]", message);
    return { ok: false, error: message };
  }
}

async function recordRun(trigger: SyncTrigger, outcome: RunOutcome): Promise<void> {
  await prisma.staffDirectorySyncRun.create({
    data: outcome.ok
      ? { trigger, ok: true, created: outcome.created, updated: outcome.updated, unlinked: outcome.unlinked }
      : { trigger, ok: false, error: outcome.error },
  });
  const [ids, lastOk] = await Promise.all([
    prisma.staffDirectorySyncRun.findMany({ select: { id: true }, orderBy: { id: "desc" } }),
    prisma.staffDirectorySyncRun.findFirst({ where: { ok: true }, select: { id: true }, orderBy: { id: "desc" } }),
  ]);
  const prunable = prunableRunIds(ids.map((row) => row.id), lastOk?.id ?? null);
  if (prunable.length > 0) await prisma.staffDirectorySyncRun.deleteMany({ where: { id: { in: prunable } } });
}

/** 写しの状況を DB から読む（写しは走らせない）。まだ一度も写していなければ null */
export async function getStaffDirectorySyncStatus(): Promise<StaffDirectorySyncResult | null> {
  const [recent, lastOk] = await Promise.all([
    prisma.staffDirectorySyncRun.findMany({ orderBy: { id: "desc" }, take: RUN_HISTORY_LIMIT }),
    prisma.staffDirectorySyncRun.findFirst({ where: { ok: true }, orderBy: { id: "desc" } }),
  ]);
  const status = summarizeRuns<UnlinkedStaff>(recent, lastOk);
  if (!status) return null;
  const { unlinked, ...rest } = status;
  return { ...rest, unlinkedStaff: unlinked };
}

/**
 * 台帳から写し直す。interval のときは前回の試行から5分以内なら何もしない（null を返す。起動後の最初の1回は除く）。
 * 失敗した回も試行として数える ── 台帳が落ちている間、一覧のたびに待たされないように。例外は投げない
 */
export async function syncStaffDirectory(trigger: SyncTrigger): Promise<StaffDirectorySyncResult | null> {
  if (trigger === "interval" && inflight) return inflight;
  const run = tail.then(async () => {
    if (trigger === "interval") {
      const last = await prisma.staffDirectorySyncRun.findFirst({ select: { at: true }, orderBy: { id: "desc" } });
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
  } catch (error) {
    // 記録の書き込みに失敗しても一覧は写しのまま返す
    console.error("[staff-directory-sync]", error instanceof Error ? error.message : error);
    return null;
  } finally {
    if (inflight === run) inflight = null;
  }
}
