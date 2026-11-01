import { beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH } from "@/app/api/positions/[id]/route";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: vi.fn(), position: { findUnique: vi.fn(), update: vi.fn() }, snapshot: { update: vi.fn() }, activityLog: { create: vi.fn() } } }));
const original = { id: 1, name: "自宅", category: "HOME_REAL_ESTATE", snapshotId: 8, assetDetails: { propertyPlan: "KEEP", propertyPlanNote: "家族と相談", propertyPlanTiming: "来年", floorArea: 80 }, snapshot: { household: { id: 3, name: "顧客", clientCode: "003" } } };
const patch = (body: unknown, id = "1") => PATCH(new Request("http://test/api/positions/1", { method: "PATCH", body: JSON.stringify(body) }), { params: Promise.resolve({ id }) });
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.$transaction).mockImplementation(async (callback) => callback(prisma));
  vi.mocked(prisma.position.findUnique).mockResolvedValue(original as never);
});
describe("不動産の方針だけを保存", () => {
  it("他の補足情報を保ち、金額・割り振りを書き換えず履歴に残す", async () => {
    expect((await patch({ snapshotId: 8, propertyPlan: "SELL" })).status).toBe(200);
    expect(prisma.position.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { assetDetails: { ...original.assetDetails, propertyPlan: "SELL" } } });
    expect(prisma.activityLog.create).toHaveBeenCalledOnce();
    expect(prisma.snapshot.update).toHaveBeenCalledWith({ where: { id: 8 }, data: { updatedAt: expect.any(Date) } });
  });
  it("別年度・不動産以外・不正な方針や追加フィールドを拒否する", async () => {
    expect((await patch({ snapshotId: 9, propertyPlan: "SELL" })).status).toBe(400);
    expect((await patch({ snapshotId: 8, propertyPlan: "UNKNOWN" })).status).toBe(400);
    expect((await patch({ snapshotId: 8, propertyPlan: "SELL", valueJpy: 0 })).status).toBe(400);
    vi.mocked(prisma.position.findUnique).mockResolvedValue({ ...original, category: "DEPOSIT" } as never);
    expect((await patch({ snapshotId: 8, propertyPlan: "SELL" })).status).toBe(400);
    expect(prisma.position.update).not.toHaveBeenCalled();
  });
  it("存在しない明細や不正なIDを拒否する", async () => {
    vi.mocked(prisma.position.findUnique).mockResolvedValue(null);
    expect((await patch({ snapshotId: 8, propertyPlan: "KEEP" })).status).toBe(404);
    expect((await patch({ snapshotId: 8, propertyPlan: "KEEP" }, "abc")).status).toBe(400);
  });
});
