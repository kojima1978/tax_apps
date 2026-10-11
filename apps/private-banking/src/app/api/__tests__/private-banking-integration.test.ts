import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GET as getActivity } from "@/app/api/activity/route";
import { GET as getClients } from "@/app/api/clients/route";
import { DELETE as deleteScenario, GET as getScenarios, POST as createScenario, PUT as updateScenario } from "@/app/api/scenarios/route";
import { exportHousehold, householdBackupSchema, importHousehold } from "@/lib/backup";
import { prisma } from "@/lib/prisma";

const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === "1";
const clientCode = "INTEGRATION-TEST";
let householdId = 0;

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

  it("シナリオの登録・更新・削除と操作履歴を1つの流れで永続化する", async () => {
    const createdResponse = await createScenario(jsonRequest("http://integration.test/api/scenarios", "POST", {
      householdId,
      name: "統合テスト案",
      assetChangePercent: 10,
      liabilityChangePercent: -5,
      inheritanceTaxJpy: 12_000_000,
      successionCostsJpy: 3_000_000,
      note: "作成時",
    }));
    expect(createdResponse.status).toBe(201);
    const created = await createdResponse.json() as { id: number };

    const listResponse = await getScenarios(new Request(`http://integration.test/api/scenarios?householdId=${householdId}`));
    const scenarios = await listResponse.json() as Array<{ id: number; name: string; assetChangePercent: number }>;
    expect(scenarios).toContainEqual(expect.objectContaining({ id: created.id, name: "統合テスト案", assetChangePercent: 10 }));

    const updatedResponse = await updateScenario(jsonRequest("http://integration.test/api/scenarios", "PUT", {
      id: created.id,
      householdId,
      name: "統合テスト案・更新",
      assetChangePercent: 15,
      liabilityChangePercent: 0,
      inheritanceTaxJpy: 10_000_000,
      successionCostsJpy: 2_000_000,
      note: "更新後",
    }));
    expect(updatedResponse.status).toBe(200);
    expect(await updatedResponse.json()).toEqual(expect.objectContaining({ id: created.id, name: "統合テスト案・更新", assetChangePercent: 15 }));

    const deletedResponse = await deleteScenario(jsonRequest("http://integration.test/api/scenarios", "DELETE", { id: created.id, householdId }));
    expect(deletedResponse.status).toBe(200);
    expect(await prisma.planningScenario.findUnique({ where: { id: created.id } })).toBeNull();

    const activityResponse = await getActivity(new Request(`http://integration.test/api/activity?householdId=${householdId}`));
    const activity = await activityResponse.json() as Array<{ action: string; entityType: string; summary: string }>;
    expect(activity.map((item) => item.action)).toEqual(["DELETE", "UPDATE", "CREATE"]);
    expect(activity.every((item) => item.entityType === "SCENARIO")).toBe(true);
    expect(activity[0]?.summary).toContain("統合テスト案・更新");
  });

  it("顧客バックアップでシナリオと操作履歴を別顧客へ復元する", async () => {
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
    expect(exported.activityLogs).toHaveLength(3);

    const imported = await importHousehold(exported);
    expect(imported.renamedClientCode).toBe(`${clientCode}-2`);
    expect(imported.counts).toEqual(expect.objectContaining({ planningScenarios: 1, activityLogs: 3 }));

    const restored = await prisma.household.findUniqueOrThrow({
      where: { id: imported.household.id },
      include: { planningScenarios: true, activityLogs: { orderBy: { createdAt: "asc" } } },
    });
    expect(restored.planningScenarios[0]).toEqual(expect.objectContaining({ name: "バックアップ対象案", note: "復元確認" }));
    expect(restored.activityLogs).toHaveLength(3);
    expect(restored.activityLogs.every((log) => log.clientCode === `${clientCode}-2`)).toBe(true);
  });
});
