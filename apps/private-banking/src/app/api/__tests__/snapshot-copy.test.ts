import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  snapshot: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: { ...db, $transaction: (run: (tx: typeof db) => unknown) => run(db) } }));
vi.mock("@/lib/activity-log", () => ({ writeActivityLog: vi.fn() }));
import { POST } from "@/app/api/snapshots/route";

const lineageKey = "8b1f2c1e-0000-4000-8000-000000000001";
const sourcePosition = {
  id: 7, snapshotId: 1, side: "ASSET", category: "DEPOSIT", name: "普通預金", institution: "テスト銀行",
  assetDetails: null, lineageKey, createdAt: new Date(), updatedAt: new Date(),
  allocations: [{ id: 1, positionId: 7, familyMemberId: 3, role: "ACQUIRER", numerator: 1, denominator: 1 }],
};

beforeEach(() => {
  vi.clearAllMocks();
  db.snapshot.findUnique.mockImplementation(async ({ where }) => where.id === 1 ? {
    id: 1, householdId: 2, fiscalYear: 2025, estimatedInheritanceTax: 0, otherTaxes: 0, successionCosts: 0, fxRates: null,
    positions: [sourcePosition], household: { id: 2, name: "テスト", clientCode: "TEST" },
  } : null);
  db.snapshot.findFirst.mockResolvedValue(null);
  db.snapshot.create.mockResolvedValue({ id: 9, fiscalYear: 2026, isCurrent: true });
});

const create = (creationMode: "COPY" | "BLANK") => POST(new Request("http://localhost/api/snapshots", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ sourceSnapshotId: 1, fiscalYear: 2026, creationMode }),
}));

describe("年度の作成", () => {
  it("前年度コピーは明細の系統キーを写し、ID と日時は作り直す", async () => {
    expect((await create("COPY")).status).toBe(201);
    const [copied] = db.snapshot.create.mock.calls[0][0].data.positions.create;
    expect(copied.lineageKey).toBe(lineageKey);
    expect(copied).not.toHaveProperty("id");
    expect(copied).not.toHaveProperty("snapshotId");
    expect(copied).not.toHaveProperty("createdAt");
    expect(copied.allocations.create).toEqual([{ familyMemberId: 3, role: "ACQUIRER", numerator: 1, denominator: 1 }]);
  });

  it("空の年度は明細を作らない", async () => {
    expect((await create("BLANK")).status).toBe(201);
    expect(db.snapshot.create.mock.calls[0][0].data).not.toHaveProperty("positions");
  });
});
