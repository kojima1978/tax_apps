import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// healthcheck 用。DB に繋がらないときは 503 を返す（以前は例外をそのまま投げて
// 本文の無い 500 になり、ログも Next のスタックトレースだけだった）
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("[health] DB に接続できません:", error);
    return NextResponse.json(
      { status: "degraded", error: "database unreachable" },
      { status: 503 },
    );
  }
}
