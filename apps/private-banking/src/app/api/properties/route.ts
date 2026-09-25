import { NextResponse } from "next/server";
import { toPositionView } from "@/lib/portfolio";
import { realEstateCategories } from "@/lib/portfolio-view";
import { prisma } from "@/lib/prisma";
import { propertyRows } from "@/lib/properties";

/**
 * 全顧客の不動産一覧。対象は各顧客の現在年度（isCurrent）のB/Sにある不動産の科目だけ。
 * 過去年度まで混ぜると同じ物件が年度ぶん並んでしまうため、一覧は「今の持ち物」に絞る。
 */
export async function GET() {
  const positions = await prisma.position.findMany({
    where: { side: "ASSET", category: { in: [...realEstateCategories] }, snapshot: { isCurrent: true } },
    include: {
      snapshot: {
        select: {
          fiscalYear: true,
          asOfDate: true,
          household: { select: { id: true, clientCode: true, name: true, nameKana: true, assignedStaff: true } },
        },
      },
    },
    orderBy: [{ snapshot: { household: { name: "asc" } } }, { sortOrder: "asc" }, { id: "asc" }],
  });

  return NextResponse.json(propertyRows(positions.map(({ snapshot, ...position }) => ({
    position: toPositionView(position),
    owner: {
      householdId: snapshot.household.id,
      clientCode: snapshot.household.clientCode,
      clientName: snapshot.household.name,
      clientNameKana: snapshot.household.nameKana,
      assignedStaff: snapshot.household.assignedStaff,
      fiscalYear: snapshot.fiscalYear,
      asOfDate: snapshot.asOfDate.toISOString().slice(0, 10),
    },
  }))));
}
