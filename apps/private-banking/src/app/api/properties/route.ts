import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { toPositionView } from "@/lib/portfolio";
import { realEstateCategories } from "@/lib/portfolio-view";
import { prisma } from "@/lib/prisma";
import { propertyRows } from "@/lib/properties";

/** 対象年度。指定なし・不正値は既定の「各顧客の現在年度」に戻す。 */
const propertyYear = (request: Request) => {
  const value = new URL(request.url).searchParams.get("year") ?? "current";
  if (value === "current" || value === "all") return value;
  return /^\d{4}$/.test(value) ? Number(value) : "current";
};

/** 全顧客の不動産一覧。現在年度、特定年度、全年度を同じAPIで切り替える。 */
export async function GET(request: Request) {
  const year = propertyYear(request);
  const snapshotWhere = year === "current" ? { isCurrent: true } : year === "all" ? {} : { fiscalYear: year };
  const propertyWhere: Prisma.PositionWhereInput = { side: "ASSET", category: { in: [...realEstateCategories] } };
  const [positions, snapshots] = await Promise.all([
    prisma.position.findMany({
      where: { ...propertyWhere, snapshot: snapshotWhere },
      include: {
        snapshot: {
          select: {
            id: true,
            isCurrent: true,
            fiscalYear: true,
            asOfDate: true,
            household: { select: { id: true, clientCode: true, name: true, nameKana: true, staff: { select: { name: true } } } },
          },
        },
      },
      orderBy: [{ snapshot: { household: { name: "asc" } } }, { sortOrder: "asc" }, { id: "asc" }],
    }),
    prisma.snapshot.findMany({
      where: { positions: { some: propertyWhere } },
      distinct: ["fiscalYear"],
      select: { fiscalYear: true },
      orderBy: { fiscalYear: "desc" },
    }),
  ]);

  const rows = propertyRows(positions.map(({ snapshot, ...position }) => ({
    position: toPositionView(position),
    owner: {
      householdId: snapshot.household.id,
      snapshotId: snapshot.id,
      isCurrent: snapshot.isCurrent,
      clientCode: snapshot.household.clientCode,
      clientName: snapshot.household.name,
      clientNameKana: snapshot.household.nameKana,
      assignedStaff: snapshot.household.staff?.name ?? "",
      fiscalYear: snapshot.fiscalYear,
      asOfDate: snapshot.asOfDate.toISOString().slice(0, 10),
    },
  })));
  return NextResponse.json({ rows, fiscalYears: snapshots.map((snapshot) => snapshot.fiscalYear) });
}
