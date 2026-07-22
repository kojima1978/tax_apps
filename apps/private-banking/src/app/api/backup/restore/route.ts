import { NextResponse } from "next/server";
import { BackupError, fullBackupSchema, restoreAll } from "@/lib/backup";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = fullBackupSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path.join(".");
    return NextResponse.json(
      { error: `バックアップファイルの形式が正しくありません。${path ? `（${path}）` : ""}` },
      { status: 400 },
    );
  }

  try {
    const counts = await restoreAll(parsed.data);
    return NextResponse.json({ ok: true, counts });
  } catch (error) {
    if (error instanceof BackupError) return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
