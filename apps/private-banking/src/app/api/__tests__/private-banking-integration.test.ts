import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GET as getClients } from "@/app/api/clients/route";
import { POST as bulkAssignStaff } from "@/app/api/clients/bulk-staff/route";
import { PATCH as savePositionAllocations } from "@/app/api/positions/allocations/route";
import { exportHousehold, householdBackupSchema, importHousehold } from "@/lib/backup";
import { prisma } from "@/lib/prisma";

const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === "1";
const clientCode = "INTEGRATION-TEST";
let householdId = 0;
let staffId = 0;

const jsonRequest = (url: string, method: string, body: unknown) => new Request(url, {
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

describe.runIf(runIntegrationTests)("private-banking API integration", () => {
  beforeAll(async () => {
    await prisma.activityLog.deleteMany({ where: { clientCode: { startsWith: clientCode } } });
    await prisma.household.deleteMany({ where: { clientCode: { startsWith: clientCode } } });
    const household = await prisma.household.create({
      data: {
        clientCode,
        name: "統合テスト顧客",
        snapshots: {
          create: {
            label: "2026年度",
            fiscalYear: 2026,
            asOfDate: new Date("2026-01-01T00:00:00.000Z"),
            isCurrent: true,
          },
        },
      },
    });
    householdId = household.id;
  });

  afterAll(async () => {
    await prisma.activityLog.deleteMany({ where: { clientCode: { startsWith: clientCode } } });
    await prisma.household.deleteMany({ where: { clientCode: { startsWith: clientCode } } });
    if (staffId) await prisma.staff.deleteMany({ where: { id: staffId } });
  });

  it("実DBの顧客データから品質上の不備を判定する", async () => {
    const response = await getClients();
    expect(response.status).toBe(200);
    const clients = await response.json() as Array<{ id: number; qualityIssues: Array<{ code: string }> }>;
    const client = clients.find((item) => item.id === householdId);
    expect(client?.qualityIssues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      "staff-missing",
      "birth-date-missing",
      "family-missing",
      "assets-missing",
      "tax-not-calculated",
    ]));
  });

  it("旧シナリオデータを含む顧客バックアップを別顧客へ復元する", async () => {
    await prisma.planningScenario.create({
      data: {
        householdId,
        name: "バックアップ対象案",
        assetChangePercent: 7.5,
        liabilityChangePercent: -2,
        inheritanceTaxJpy: 9_000_000,
        successionCostsJpy: 1_000_000,
        note: "復元確認",
      },
    });

    const exported = householdBackupSchema.parse(await exportHousehold(householdId));
    expect(exported.planningScenarios).toHaveLength(1);
    expect(exported.activityLogs).toHaveLength(0);

    const imported = await importHousehold(exported);
    expect(imported.renamedClientCode).toBe(`${clientCode}-2`);
    expect(imported.counts).toEqual(expect.objectContaining({ planningScenarios: 1, activityLogs: 0 }));

    const restored = await prisma.household.findUniqueOrThrow({
      where: { id: imported.household.id },
      include: { planningScenarios: true, activityLogs: { orderBy: { createdAt: "asc" } } },
    });
    expect(restored.planningScenarios[0]).toEqual(expect.objectContaining({ name: "バックアップ対象案", note: "復元確認" }));
    expect(restored.activityLogs).toHaveLength(0);
    expect(restored.activityLogs.every((log) => log.clientCode === `${clientCode}-2`)).toBe(true);
  });

  it("担当者未設定の顧客へ担当者を一括設定し、履歴も残す", async () => {
    const staff = await prisma.staff.create({ data: { staffCode: `IT-${Date.now()}`, name: `統合テスト担当-${Date.now()}`, nameKana: "トウゴウテスト" } });
    staffId = staff.id;
    const response = await bulkAssignStaff(jsonRequest("http://integration.test/api/clients/bulk-staff", "POST", { householdIds: [householdId], staffId }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(expect.objectContaining({ count: 1, staffName: staff.name }));
    expect(await prisma.household.findUnique({ where: { id: householdId }, select: { staffId: true } })).toEqual({ staffId });
    expect(await prisma.activityLog.findFirst({ where: { householdId, summary: { contains: staff.name } } })).not.toBeNull();
  });

  it("一覧で入力した評価額を既約分数にして取得者へ保存する", async () => {
    const snapshot = await prisma.snapshot.findFirstOrThrow({ where: { householdId } });
    const [first, second] = await Promise.all([
      prisma.familyMember.create({ data: { householdId, name: "長女", relationship: "CHILD", sortOrder: 0 } }),
      prisma.familyMember.create({ data: { householdId, name: "長男", relationship: "CHILD", sortOrder: 1 } }),
    ]);
    const position = await prisma.position.create({ data: {
      snapshotId: snapshot.id, side: "ASSET", category: "DEPOSIT", name: "割り振りテスト預金", originalAmount: 100, valueJpy: 100,
    } });
    const response = await savePositionAllocations(jsonRequest("http://integration.test/api/positions/allocations", "PATCH", {
      snapshotId: snapshot.id,
      positions: [{ positionId: position.id, amounts: [{ familyMemberId: first.id, amountJpy: 25 }, { familyMemberId: second.id, amountJpy: 75 }] }],
    }));
    expect(response.status).toBe(200);
    expect(await prisma.positionAllocation.findMany({ where: { positionId: position.id }, orderBy: { familyMemberId: "asc" }, select: { familyMemberId: true, numerator: true, denominator: true, role: true } })).toEqual([
      { familyMemberId: first.id, numerator: 1, denominator: 4, role: "ACQUIRER" },
      { familyMemberId: second.id, numerator: 3, denominator: 4, role: "ACQUIRER" },
    ]);
  });
});
