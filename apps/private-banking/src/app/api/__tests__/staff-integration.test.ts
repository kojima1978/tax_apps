import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST as createStaff } from "@/app/api/staff/route";
import { POST as createClient, PATCH as updateClient } from "@/app/api/clients/route";
import { exportAll, exportHousehold, fullBackupSchema, householdBackupSchema, importHousehold, restoreAll } from "@/lib/backup";
import { prisma } from "@/lib/prisma";

const request = (body: unknown) => new Request("http://test.local/api", { method: "POST", body: JSON.stringify(body) });
const enabled = process.env.RUN_STAFF_TESTS === "1";
// 社員台帳には居ない番号（台帳の同期で触られないよう、台帳ID の付いた行として作る）
const DIRECTORY_ID_BASE = 1_900_000_000;
let firstId: number;
let secondId: number;
let householdId: number;

// 担当者は社員台帳の写しなので、ここでは prisma で直接「写し」の行を作る。
// 全体復元を含むため、明示した検証専用DBでだけ実行する。
describe.runIf(enabled)("担当者の履歴・バックアップの実DB検証", () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL || new URL(process.env.DATABASE_URL).pathname !== "/pb_staff_verification") throw new Error("検証専用DBを指定してください。");
    await prisma.activityLog.deleteMany({ where: { clientCode: { startsWith: "STAFF-TEST" } } });
    await prisma.household.deleteMany({ where: { clientCode: { startsWith: "STAFF-TEST" } } });
    await prisma.staff.deleteMany({ where: { staffCode: { startsWith: "TEST-" } } });
    firstId = (await prisma.staff.create({ data: { staffCode: "TEST-001", name: "同姓 同名", nameKana: "ドウセイドウメイ", department: "東京", staffDirectoryId: DIRECTORY_ID_BASE + 1 } })).id;
    secondId = (await prisma.staff.create({ data: { staffCode: "TEST-002", name: "同姓 同名", department: "大阪", staffDirectoryId: DIRECTORY_ID_BASE + 2 } })).id;
  });
  afterAll(async () => { await prisma.$disconnect(); });

  it("担当者の一覧からは追加できない", async () => {
    expect((await createStaff()).status).toBe(405);
  });

  it("新規担当・担当変更・同じ担当での保存・担当解除を履歴に反映する", async () => {
    const created = await createClient(request({ clientCode: "STAFF-TEST", name: "履歴検証顧客", fiscalYear: 2026, staffId: firstId }));
    expect(created.status).toBe(201);
    householdId = (await created.json()).id;
    const save = (staffId: number | null) => updateClient(request({ id: householdId, clientCode: "STAFF-TEST", name: "履歴検証顧客", staffId }));
    expect((await save(secondId)).status).toBe(200);
    expect((await save(secondId)).status).toBe(200);
    let history = await prisma.staffAssignment.findMany({ where: { householdId }, orderBy: { id: "asc" } });
    expect(history).toHaveLength(2);
    expect(history[0].endedAt).not.toBeNull();
    expect(history[1].endedAt).toBeNull();
    expect(history[0].endedAt).toEqual(history[1].startedAt);
    expect((await save(null)).status).toBe(200);
    history = await prisma.staffAssignment.findMany({ where: { householdId } });
    expect(history.every((row) => row.endedAt !== null)).toBe(true);
    expect((await save(firstId)).status).toBe(200);
  });

  it("退職者の新規割当は拒否し、既存担当のままの保存は維持する", async () => {
    await prisma.staff.update({ where: { id: firstId }, data: { name: "改名後", isActive: false } });
    const same = await updateClient(request({ id: householdId, clientCode: "STAFF-TEST", name: "履歴検証顧客", staffId: firstId }));
    expect(same.status).toBe(200);
    const rejected = await createClient(request({ clientCode: "REJECTED", name: "作成不可", fiscalYear: 2026, staffId: firstId }));
    expect(rejected.status).toBe(400);
    expect(await prisma.household.count({ where: { clientCode: "REJECTED" } })).toBe(0);
  });

  it("台帳ID で復元するので、社員番号（コード）が変わっていても同じ人に結び付く", async () => {
    const exported = householdBackupSchema.parse(await exportHousehold(householdId));
    expect(exported.household.assignedStaffDetails?.staffDirectoryId).toBe(DIRECTORY_ID_BASE + 1);
    await prisma.staff.update({ where: { id: firstId }, data: { staffCode: "TEST-001-NEW" } });
    const imported = await importHousehold(exported);
    expect((await prisma.household.findUniqueOrThrow({ where: { id: imported.household.id } })).staffId).toBe(firstId);
    const restoredHistory = await prisma.staffAssignment.findMany({ where: { householdId: imported.household.id }, orderBy: { id: "asc" } });
    expect(restoredHistory.map((row) => row.staffName)).toEqual(exported.staffAssignments.map((row) => row.staffName));
    await prisma.staff.update({ where: { id: firstId }, data: { staffCode: "TEST-001", name: "同姓 同名", isActive: true } });
  });

  it("担当者の一覧に無い人は作らず、取り込みを止める", async () => {
    const exported = householdBackupSchema.parse(await exportHousehold(householdId));
    const unknown = { ...exported, household: { ...exported.household, clientCode: "STAFF-TEST-UNKNOWN", assignedStaffCode: "TEST-404", assignedStaffDetails: { ...exported.household.assignedStaffDetails!, staffCode: "TEST-404", staffDirectoryId: DIRECTORY_ID_BASE + 404 } } };
    await expect(importHousehold(unknown)).rejects.toThrow("社員台帳に登録してから");
    expect(await prisma.household.count({ where: { clientCode: { startsWith: "STAFF-TEST-UNKNOWN" } } })).toBe(0);
    expect(await prisma.staff.count({ where: { staffCode: "TEST-404" } })).toBe(0);
  });

  it("v1の同姓同名が曖昧な場合は取り込みをロールバックする", async () => {
    const legacy = householdBackupSchema.parse({ schemaVersion: 1, kind: "household", household: { clientCode: "LEGACY-AMBIGUOUS", name: "旧形式", assignedStaff: "同姓 同名" }, snapshots: [{ label: "現在", fiscalYear: 2026, asOfDate: "2026-01-01" }] });
    await expect(importHousehold(legacy)).rejects.toThrow("同姓同名");
    expect(await prisma.household.count({ where: { clientCode: "LEGACY-AMBIGUOUS" } })).toBe(0);
  });

  it("全体復元は担当者の一覧を書き換えず、履歴だけ戻す", async () => {
    const exported = fullBackupSchema.parse(await exportAll());
    await prisma.staff.update({ where: { id: secondId }, data: { name: "変更後" } });
    await restoreAll(exported);
    expect(await prisma.staff.findUniqueOrThrow({ where: { id: secondId } })).toMatchObject({ name: "変更後" });
    expect(await prisma.staffAssignment.count()).toBe(exported.data.staffAssignments.length);
  });
});
