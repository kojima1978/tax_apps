import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/properties/locations/route";
import { prisma } from "@/lib/prisma";

// 町名・地番は架空のもの（市区町村名だけ表に合わせて実在の名前を使う）

vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: vi.fn(), position: { findMany: vi.fn(), update: vi.fn() }, snapshot: { update: vi.fn() }, activityLog: { create: vi.fn() } } }));

const householdA = { id: 3, name: "テスト　一郎", nameKana: "テスト イチロウ", clientCode: "003" };
const householdB = { id: 4, name: "サンプル　花子", nameKana: "サンプル ハナコ", clientCode: "004" };
const position = (id: number, assetDetails: Record<string, unknown>, household = householdA, snapshotId = 8) => ({
  id, name: `物件${id}`, category: "OTHER_REAL_ESTATE", valuationFormula: null, snapshotId, assetDetails,
  originalAmount: 1000, valueJpy: 1000,
  snapshot: { id: snapshotId, isCurrent: true, fiscalYear: 2026, household },
});
const ready = position(1, { propertyAddress: "東京都港区テスト一丁目123番4", propertyType: "LAND", landArea: 100 });
const residential = position(2, { propertyAddress: "東京都港区テスト1-2-3", propertyType: "LAND" });
const structured = position(3, { propertyAddress: "港区テスト5番", municipalityName: "東京都港区", municipalityCode: "13103", lotNumber: "5番", propertyType: "LAND" });
const otherClient = position(4, { propertyAddress: "北海道余市町大字テスト12番3", propertyType: "LAND" }, householdB, 9);

const post = (body: unknown) => POST(new Request("http://test/api/properties/locations", { method: "POST", body: JSON.stringify(body) }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.$transaction).mockImplementation(async (callback) => (callback as (tx: typeof prisma) => unknown)(prisma) as never);
  vi.mocked(prisma.position.findMany).mockResolvedValue([ready, residential, structured, otherClient] as never);
});

describe("GET 所在を分けていない不動産", () => {
  it("構造を保存済みの明細は出さず、顧客のカナ順に分けた案と分け切れなかった点を返す", async () => {
    const { rows } = await (await GET()).json();
    expect(rows.map((row: { positionId: number }) => row.positionId)).toEqual([4, 1, 2]);
    expect(rows[1]).toMatchObject({
      householdId: 3, snapshotId: 8, isCurrent: true, clientCode: "003", fiscalYear: 2026, name: "物件1", problems: [],
      location: { municipalityCode: "13103", municipalityName: "東京都港区", townName: "テスト一丁目", lotNumber: "123番4", source: "東京都港区テスト一丁目123番4" },
    });
    expect(rows[2].problems[0]).toContain("住居表示");
  });
});

describe("POST 分けた案をまとめて保存", () => {
  it("所在の欄だけを書き、評価額などには触れず、顧客ごとに履歴を残す", async () => {
    const response = await post({ items: [{ positionId: 1, source: ready.assetDetails.propertyAddress }, { positionId: 4, source: otherClient.assetDetails.propertyAddress }] });
    expect(await response.json()).toEqual({ updated: [1, 4], skipped: [] });
    expect(prisma.position.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { assetDetails: { ...ready.assetDetails, municipalityName: "東京都港区", municipalityCode: "13103", townName: "テスト一丁目", lotNumber: "123番4" } },
    });
    for (const [call] of vi.mocked(prisma.position.update).mock.calls) expect(Object.keys(call.data)).toEqual(["assetDetails"]);
    expect(prisma.snapshot.update).toHaveBeenCalledWith({ where: { id: 8 }, data: { updatedAt: expect.any(Date) } });
    expect(prisma.snapshot.update).toHaveBeenCalledWith({ where: { id: 9 }, data: { updatedAt: expect.any(Date) } });
    expect(prisma.activityLog.create).toHaveBeenCalledTimes(2);
    expect(prisma.activityLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ householdId: 3, action: "UPDATE", entityType: "POSITION", entityId: "1", summary: "不動産1件の所在を原文から分けて保存" }) });
  });

  it("原文が変わった・分けてある・分け切れない・見つからない明細は保存せずに理由を返す", async () => {
    const response = await post({ items: [
      { positionId: 1, source: "東京都港区テスト一丁目999番" },
      { positionId: 3, source: "港区テスト5番" },
      { positionId: 2, source: "東京都港区テスト1-2-3" },
      { positionId: 99, source: "x" },
    ] });
    const result = await response.json();
    expect(result.updated).toEqual([]);
    expect(result.skipped).toEqual([
      { positionId: 1, reason: "原文が変わっています。開き直して確かめてください。" },
      { positionId: 3, reason: "すでに所在を分けてあります。" },
      { positionId: 2, reason: expect.stringContaining("住居表示") },
      { positionId: 99, reason: "不動産の明細が見つかりません。" },
    ]);
    expect(prisma.position.update).not.toHaveBeenCalled();
    expect(prisma.snapshot.update).not.toHaveBeenCalled();
    expect(prisma.activityLog.create).not.toHaveBeenCalled();
  });

  it("前後の空白だけの違いは同じ原文とみなす", async () => {
    expect((await (await post({ items: [{ positionId: 1, source: " 東京都港区テスト一丁目123番4 " }] })).json()).updated).toEqual([1]);
  });

  it("空・余分な項目・不正な ID を拒否する", async () => {
    expect((await post({ items: [] })).status).toBe(400);
    expect((await post({ items: [{ positionId: 1, source: "x", lotNumber: "1番" }] })).status).toBe(400);
    expect((await post({ items: [{ positionId: -1, source: "x" }] })).status).toBe(400);
    expect((await post(null)).status).toBe(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
