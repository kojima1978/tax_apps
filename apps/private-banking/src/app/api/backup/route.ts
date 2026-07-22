import { NextResponse } from "next/server";
import { BackupError, exportAll, exportHousehold } from "@/lib/backup";

/** ファイル名用のJST日時（YYYYMMDD-HHmm）。 */
function timestampJst() {
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString();
  return `${jst.slice(0, 4)}${jst.slice(5, 7)}${jst.slice(8, 10)}-${jst.slice(11, 13)}${jst.slice(14, 16)}`;
}

export async function GET(request: Request) {
  const value = new URL(request.url).searchParams.get("householdId");
  const householdId = value === null ? undefined : Number(value);
  if (householdId !== undefined && !Number.isInteger(householdId)) {
    return NextResponse.json({ error: "顧客IDが正しくありません。" }, { status: 400 });
  }

  try {
    const backup = householdId === undefined ? await exportAll() : await exportHousehold(householdId);
    const fileName = backup.kind === "full"
      ? `private-banking-backup-${timestampJst()}.json`
      : `private-banking-${backup.household.clientCode}-${timestampJst()}.json`;

    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof BackupError) return NextResponse.json({ error: error.message }, { status: 404 });
    throw error;
  }
}
