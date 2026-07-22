import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { BackupError, householdBackupSchema, importHousehold } from "@/lib/backup";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = householdBackupSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path.join(".");
    return NextResponse.json(
      { error: `顧客データファイルの形式が正しくありません。${path ? `（${path}）` : ""}` },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json({ ok: true, ...await importHousehold(parsed.data) }, { status: 201 });
  } catch (error) {
    if (error instanceof BackupError) return NextResponse.json({ error: error.message }, { status: 400 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "同じ顧客コードの登録と競合しました。時間をおいて再度お試しください。" }, { status: 409 });
    }
    throw error;
  }
}
