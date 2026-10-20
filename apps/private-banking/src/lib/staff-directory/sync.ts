import { prisma } from "@/lib/prisma";
import { planStaff, type DirectoryStaff } from "./plan";

// 担当者は社員台帳（staff-directory）が正で、この表はその写し。
// 担当者の一覧を読む API が呼ばれたときに、前回から5分以上たっていれば台帳から写し直す。
// 台帳が止まっていても写しのまま動く（失敗は記録して次の機会に再試行）。

const DIRECTORY_URL = process.env.STAFF_DIRECTORY_URL ?? "http://staff-directory:3031/staff-directory/api";
const INTERVAL_MS = 5 * 60 * 1000;
// 一覧の表示を待たせる上限。台帳が落ちているときに画面が固まらないよう短くする
const TIMEOUT_MS = 3000;

export interface StaffDirectorySyncResult {
  ok: boolean;
  at: string;
  error?: string;
  created: number;
  updated: number;
  /** 台帳に居ない（台帳ID の無い）担当者。候補から外れ、担当していた顧客の表示だけ残る */
  unlinkedStaff: { id: number; staffCode: string; name: string }[];
}

let lastAttemptAt = 0;
let lastResult: StaffDirectorySyncResult | null = null;
let inflight: Promise<StaffDirectorySyncResult> | null = null;

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

async function runSync(): Promise<StaffDirectorySyncResult> {
  const at = new Date().toISOString();
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
      return { ok: true, at, created, updated: updates.length, unlinkedStaff };
    }, { timeout: 30_000 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[staff-directory-sync]", message);
    return { ok: false, at, error: message, created: 0, updated: 0, unlinkedStaff: lastResult?.unlinkedStaff ?? [] };
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
