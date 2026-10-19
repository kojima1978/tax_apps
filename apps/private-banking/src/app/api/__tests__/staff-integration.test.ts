import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST as createStaff, PATCH as updateStaff } from "@/app/api/staff/route";
import { POST as createClient, PATCH as updateClient } from "@/app/api/clients/route";
import { exportAll, exportHousehold, fullBackupSchema, householdBackupSchema, importHousehold, restoreAll } from "@/lib/backup";
import { prisma } from "@/lib/prisma";

const request = (body: unknown) => new Request("http://test.local/api", { method: "POST", body: JSON.stringify(body) });
const enabled = process.env.RUN_STAFF_TESTS === "1";
let firstId: number;
let secondId: number;
let householdId: number;

// 全体復元を含むため、明示した検証専用DBでだけ実行する。
describe.runIf(enabled)("担当者コード・履歴・バックアップの実DB検証", () => {
  beforeAll(async () => {
    if (!process.env.DATABASE_URL || new URL(process.env.DATABASE_URL).pathname !== "/pb_staff_verification") throw new Error("検証専用DBを指定してください。");
    await prisma.activityLog.deleteMany({ where: { clientCode: { startsWith: "STAFF-TEST" } } });
    await prisma.household.deleteMany({ where: { clientCode: { startsWith: "STAFF-TEST" } } });
    await prisma.staff.deleteMany({ where: { staffCode: { startsWith: "TEST-" } } });
  });
  afterAll(async () => { await prisma.$disconnect(); });

  it("同姓同名を別コードで登録し、コードの大小文字重複は拒否する", async () => {
    const first = await createStaff(request({ staffCode: "TEST-001", name: "同姓 同名", nameKana: "ドウセイドウメイ", department: "東京" }));
    expect(first.status).toBe(201);
    firstId = (await first.json()).id;
    const second = await createStaff(request({ staffCode: "TEST-002", name: "同姓 同名", department: "大阪" }));
    expect(second.status).toBe(201);
    secondId = (await second.json()).id;
    expect((await createStaff(request({ staffCode: "test-001", name: "別人" }))).status).toBe(409);
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
    await updateStaff(request({ id: firstId, staffCode: "TEST-001", name: "改名後", isActive: false }));
    const same = await updateClient(request({ id: householdId, clientCode: "STAFF-TEST", name: "履歴検証顧客", staffId: firstId }));
    expect(same.status).toBe(200);
    const rejected = await createClient(request({ clientCode: "REJECTED", name: "作成不可", fiscalYear: 2026, staffId: firstId }));
    expect(rejected.status).toBe(400);
    expect(await prisma.household.count({ where: { clientCode: "REJECTED" } })).toBe(0);
  });

  it("v2をコードで復元し、改名前の履歴もそのまま保持する", async () => {
    const exported = householdBackupSchema.parse(await exportHousehold(householdId));
    expect(exported.schemaVersion).toBe(2);
    expect(exported.household.assignedStaffCode).toBe("TEST-001");
    const imported = await importHousehold(exported);
    expect((await prisma.household.findUniqueOrThrow({ where: { id: imported.household.id } })).staffId).toBe(firstId);
    const restoredHistory = await prisma.staffAssignment.findMany({ where: { householdId: imported.household.id }, orderBy: { id: "asc" } });
    expect(restoredHistory.map((row) => row.staffName)).toEqual(exported.staffAssignments.map((row) => row.staffName));
    expect(restoredHistory[0].staffName).toBe("同姓 同名");
  });

  it("v1の同姓同名が曖昧な場合は取り込みをロールバックする", async () => {
    await updateStaff(request({ id: firstId, staffCode: "TEST-001", name: "同姓 同名", isActive: true }));
    const legacy = householdBackupSchema.parse({ schemaVersion: 1, kind: "household", household: { clientCode: "LEGACY-AMBIGUOUS", name: "旧形式", assignedStaff: "同姓 同名" }, snapshots: [{ label: "現在", fiscalYear: 2026, asOfDate: "2026-01-01" }] });
    await expect(importHousehold(legacy)).rejects.toThrow("同姓同名");
    expect(await prisma.household.count({ where: { clientCode: "LEGACY-AMBIGUOUS" } })).toBe(0);
  });

  it("全体バックアップで未使用担当者・退職状態・履歴を復元する", async () => {
    await createStaff(request({ staffCode: "TEST-UNUSED", name: "未使用担当", department: "名古屋" }));
    await updateStaff(request({ id: secondId, staffCode: "TEST-002", name: "同姓 同名", department: "大阪", isActive: false }));
    const exported = fullBackupSchema.parse(await exportAll());
    await updateStaff(request({ id: secondId, staffCode: "TEST-002", name: "変更後", isActive: true }));
    await restoreAll(exported);
    const restored = await prisma.staff.findUniqueOrThrow({ where: { staffCode: "TEST-002" } });
    expect(restored).toMatchObject({ name: "同姓 同名", isActive: false, department: "大阪" });
    expect(await prisma.staff.count({ where: { staffCode: "TEST-UNUSED" } })).toBe(1);
    expect(await prisma.staffAssignment.count()).toBe(exported.data.staffAssignments.length);
  });
});
