import { NextResponse } from "next/server";
import { getPortfolio } from "@/lib/portfolio";

export async function GET(request: Request) {
  const value = new URL(request.url).searchParams.get("householdId");
  const householdId = value === null ? undefined : Number(value);
  if (householdId !== undefined && !Number.isInteger(householdId)) {
    return NextResponse.json({ error: "顧客IDが正しくありません。" }, { status: 400 });
  }
  try {
    return NextResponse.json(await getPortfolio(householdId));
  } catch (error) {
    if (error instanceof Error && error.message === "HOUSEHOLD_NOT_FOUND") {
      return NextResponse.json({ error: "顧客が見つかりません。" }, { status: 404 });
    }
    throw error;
  }
}
