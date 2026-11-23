import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { writeActivityLog } from "@/lib/activity-log";
import { adoptedPropertyLocationDetails, propertyLocationDraft } from "@/lib/municipality";
import { type AssetDetails, type Position, categoryLabels, propertyTypeLabels, propertyTypeOf, realEstateCategories } from "@/lib/portfolio-view";
import { prisma } from "@/lib/prisma";
import type { PropertyLocationAdoptResult, PropertyLocationCandidate } from "@/lib/properties";
import { storedPropertyLocation } from "@/lib/property-location";

/**
 * 所在をまとめて分ける。構造（市区町村・地番など）を持たず原文だけがある不動産の明細に、
 * 原文から分けた案を所在の欄だけ書き込む。
 *
 * まとめて入力の保存（/api/positions/bulk）は評価額・原通貨額を計算し直すので使わない ──
 * 円未満切り捨ての規則で古い明細の評価額が1円動くことがあり、所在を整えるだけの操作で金額を変えないため。
 * 対象は全年度（過年度の明細も開けば同じ案が出るので、まとめて片付けられるようにする）。
 */

const propertyWhere: Prisma.PositionWhereInput = { side: "ASSET", category: { in: [...realEstateCategories] } };

type DetailsObject = Record<string, unknown>;
const detailsObject = (value: Prisma.JsonValue | null): DetailsObject =>
  value && typeof value === "object" && !Array.isArray(value) ? value as DetailsObject : {};

const collator = new Intl.Collator("ja", { numeric: true });

export async function GET() {
  const positions = await prisma.position.findMany({
    where: propertyWhere,
    select: {
      id: true, name: true, category: true, valuationFormula: true, assetDetails: true,
      snapshot: { select: { id: true, isCurrent: true, fiscalYear: true, household: { select: { id: true, clientCode: true, name: true, nameKana: true } } } },
    },
    orderBy: [{ snapshot: { fiscalYear: "desc" } }, { sortOrder: "asc" }, { id: "asc" }],
  });
  const rows: Array<{ row: PropertyLocationCandidate; sortKey: string }> = [];
  for (const position of positions) {
    const details = detailsObject(position.assetDetails);
    const draft = propertyLocationDraft(details);
    if (!draft) continue;
    const { snapshot } = position;
    const propertyType = propertyTypeOf({ category: position.category, valuationFormula: position.valuationFormula as Position["valuationFormula"], assetDetails: details as AssetDetails }) ?? "LAND";
    rows.push({ sortKey: snapshot.household.nameKana || snapshot.household.name, row: {
      householdId: snapshot.household.id,
      snapshotId: snapshot.id,
      isCurrent: snapshot.isCurrent,
      clientCode: snapshot.household.clientCode,
      clientName: snapshot.household.name,
      fiscalYear: snapshot.fiscalYear,
      positionId: position.id,
      categoryLabel: categoryLabels[position.category] ?? position.category,
      propertyTypeLabel: propertyTypeLabels[propertyType],
      name: position.name,
      location: draft.location,
      problems: draft.problems,
    } });
  }
  // 顧客はカナ順（不動産一覧の既定と同じ）。同じ顧客の中は年度の新しい順・明細の並び順のまま（安定ソート）
  rows.sort((left, right) => collator.compare(left.sortKey, right.sortKey));
  return NextResponse.json({ rows: rows.map(({ row }) => row) });
}

const adoptSchema = z.object({
  // 画面で見比べた原文。保存までの間に原文が直されていたら、その行は保存しない
  items: z.array(z.object({ positionId: z.number().int().positive(), source: z.string() }).strict()).min(1).max(1000),
}).strict();

export async function POST(request: Request) {
  const parsed = adoptSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "保存する明細を選んでください。" }, { status: 400 });
  const expectedSource = new Map(parsed.data.items.map((item) => [item.positionId, item.source]));

  const result = await prisma.$transaction(async (tx) => {
    const positions = await tx.position.findMany({
      where: { id: { in: [...expectedSource.keys()] }, ...propertyWhere },
      select: { id: true, snapshotId: true, assetDetails: true, snapshot: { select: { household: { select: { id: true, name: true, clientCode: true } } } } },
    });
    const found = new Map(positions.map((position) => [position.id, position]));
    const outcome: PropertyLocationAdoptResult = { updated: [], skipped: [] };
    const touchedSnapshots = new Set<number>();
    const updatedByHousehold = new Map<number, { household: { id: number; name: string; clientCode: string }; ids: number[] }>();

    for (const [positionId, source] of expectedSource) {
      const position = found.get(positionId);
      if (!position) { outcome.skipped.push({ positionId, reason: "不動産の明細が見つかりません。" }); continue; }
      const details = detailsObject(position.assetDetails);
      const draft = propertyLocationDraft(details);
      if (!draft) { outcome.skipped.push({ positionId, reason: "すでに所在を分けてあります。" }); continue; }
      if (storedPropertyLocation(details).source !== source.trim()) { outcome.skipped.push({ positionId, reason: "原文が変わっています。開き直して確かめてください。" }); continue; }
      if (draft.problems.length > 0) { outcome.skipped.push({ positionId, reason: draft.problems[0] }); continue; }

      await tx.position.update({ where: { id: position.id }, data: { assetDetails: adoptedPropertyLocationDetails(details, draft.location) as Prisma.InputJsonObject } });
      outcome.updated.push(position.id);
      touchedSnapshots.add(position.snapshotId);
      const household = position.snapshot.household;
      const entry = updatedByHousehold.get(household.id) ?? { household, ids: [] };
      entry.ids.push(position.id);
      updatedByHousehold.set(household.id, entry);
    }

    for (const snapshotId of touchedSnapshots) await tx.snapshot.update({ where: { id: snapshotId }, data: { updatedAt: new Date() } });
    for (const { household, ids } of updatedByHousehold.values()) {
      await writeActivityLog(tx, {
        householdId: household.id, householdName: household.name, clientCode: household.clientCode,
        action: "UPDATE", entityType: "POSITION", entityId: ids.length === 1 ? ids[0] : null,
        summary: `不動産${ids.length}件の所在を原文から分けて保存`,
        details: { positionIds: ids },
      });
    }
    return outcome;
  }, { timeout: 60_000 });

  return NextResponse.json(result);
}
