import { NextResponse } from "next/server";
import { BackupError, exportAll, exportHousehold } from "@/lib/backup";
import { exportFileName } from "@/lib/export-filename";
import { householdBackupFileName } from "@/lib/format";

export async function GET(request: Request) {
  const value = new URL(request.url).searchParams.get("householdId");
  const householdId = value === null ? undefined : Number(value);
  if (householdId !== undefined && !Number.isInteger(householdId)) {
    return NextResponse.json({ error: "顧客IDが正しくありません。" }, { status: 400 });
  }

  try {
    const backup = householdId === undefined ? await exportAll() : await exportHousehold(householdId);
    const fileName = backup.kind === "full"
      ? exportFileName("全体バックアップ", "json")
      : householdBackupFileName(backup.household.clientCode, backup.household.name);

    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        // 名前に顧客名が入るので ASCII では収まらない。`filename*` で UTF-8 のまま渡す。
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof BackupError) return NextResponse.json({ error: error.message }, { status: 404 });
    throw error;
  }
}
