import { NextResponse } from "next/server";
import { getPortfolio } from "@/lib/portfolio";

export async function GET() {
  return NextResponse.json(await getPortfolio());
}
