import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  snapshot: { findUnique: vi.fn(), update: vi.fn() },
  position: { findMany: vi.fn(), update: vi.fn() },
  household: { update: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: { ...db, $transaction: (run: (tx: typeof db) => unknown) => run(db) } }));
vi.mock("@/lib/activity-log", () => ({ writeActivityLog: vi.fn() }));
import { PUT } from "@/app/api/snapshots/[id]/route";

beforeEach(() => {
  vi.clearAllMocks();
  db.snapshot.findUnique.mockResolvedValue({ id: 1, fiscalYear: 2026, isCurrent: true, householdId: 2, household: { id: 2, name: "テスト", clientCode: "TEST" } });
  db.position.findMany.mockResolvedValue([{ id: 3, currency: "USD", originalAmount: 1000 }]);
});

const save = (fxRatesOnly: boolean, fxRates = { USD: 150.25 }) => PUT(new Request("http://localhost/api/snapshots/1", {
  method: "PUT", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ asOfDate: "2026-01-01", estimatedInheritanceTax: "12345678", otherTaxes: "987654", fxRates, fxRatesOnly }),
}), { params: Promise.resolve({ id: "1" }) });

describe("年度・為替設定の保存", () => {
  it("為替だけの変更では基準日・税額・税計算結果を上書きしない", async () => {
    expect((await save(true)).status).toBe(200);
    expect(db.snapshot.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { fxRates: { USD: 150.25 } } });
    expect(db.household.update).not.toHaveBeenCalled();
    expect(db.position.update).toHaveBeenCalledOnce();
    expect(db.position.update.mock.calls[0][0].data.valueJpy.toString()).toBe("150250");
  });

  it("年度設定では従来どおり税額を更新する", async () => {
    expect((await save(false)).status).toBe(200);
    expect(db.household.update).toHaveBeenCalledOnce();
    const update = db.snapshot.update.mock.calls[0][0];
    expect(update.data.estimatedInheritanceTax.toString()).toBe("12345678");
    expect(update.data.otherTaxes.toString()).toBe("987654");
  });

  it("既存の外貨明細が使うレートの削除は保存しない", async () => {
    expect((await save(true, {} as { USD: number })).status).toBe(400);
    expect(db.snapshot.update).not.toHaveBeenCalled();
  });
});
