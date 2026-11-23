import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { importedLineageKeys, restoredLineageKeys } from "@/lib/backup";
import { type LineagePosition, assignLineageKeys } from "@/lib/position-lineage";

// 所在は架空のもの

const deposit = (name: string, extra: Partial<LineagePosition> = {}): LineagePosition => ({ side: "ASSET", category: "DEPOSIT", name, institution: "テスト銀行", ...extra });
const land = (address: string): LineagePosition => ({ side: "ASSET", category: "OTHER_REAL_ESTATE", name: "土地", institution: "", assetDetails: { propertyType: "LAND", propertyAddress: address } });

/** 振る順に k1, k2, … を返す（結果を読みやすくするため） */
const sequence = () => { let n = 0; return () => `k${++n}`; };

describe("系統キーの結び付け（キーを持たない明細）", () => {
  it("隣り合う年度で項目がすべて一致し、両方の年度で1件だけの明細を結ぶ（3年続けば3年とも同じキー）", () => {
    const keys = assignLineageKeys([
      { fiscalYear: 2024, positions: [deposit("普通預金")] },
      { fiscalYear: 2025, positions: [deposit("普通預金")] },
      { fiscalYear: 2026, positions: [deposit("普通預金")] },
    ], sequence());
    expect(keys).toEqual([["k1"], ["k1"], ["k1"]]);
  });

  it("並びが年度順でなくても、年度の古い順に結ぶ", () => {
    const keys = assignLineageKeys([
      { fiscalYear: 2026, positions: [deposit("普通預金")] },
      { fiscalYear: 2025, positions: [deposit("普通預金")] },
    ], sequence());
    expect(keys).toEqual([["k1"], ["k1"]]);
  });

  it("同じ組が年度の中に2件ある・名前を変えた明細は結ばない", () => {
    const keys = assignLineageKeys([
      { fiscalYear: 2025, positions: [deposit("定期預金"), deposit("定期預金"), deposit("普通預金")] },
      { fiscalYear: 2026, positions: [deposit("定期預金"), deposit("普通預金（給与口）")] },
    ], sequence());
    expect(keys).toEqual([["k1", "k2", "k3"], ["k4", "k5"]]);
  });

  it("金融機関・不動産の所在の原文が違えば別の明細", () => {
    const keys = assignLineageKeys([
      { fiscalYear: 2025, positions: [deposit("普通預金"), land("テスト市一丁目1番"), land("テスト市二丁目2番")] },
      { fiscalYear: 2026, positions: [deposit("普通預金", { institution: "サンプル銀行" }), land("テスト市二丁目2番"), land("テスト市三丁目3番")] },
    ], sequence());
    expect(keys).toEqual([["k1", "k2", "k3"], ["k4", "k3", "k5"]]);
  });

  it("間の年度に無かった明細は、その先の年度とも結ばない（隣り合う年度だけを見る）", () => {
    const keys = assignLineageKeys([
      { fiscalYear: 2024, positions: [deposit("普通預金")] },
      { fiscalYear: 2025, positions: [] },
      { fiscalYear: 2026, positions: [deposit("普通預金")] },
    ], sequence());
    expect(keys).toEqual([["k1"], [], ["k2"]]);
  });
});

describe("系統キーを持っている明細", () => {
  it("持っているキーはそのまま使い、名前が違っても書き換えない", () => {
    const keys = assignLineageKeys([
      { fiscalYear: 2025, positions: [deposit("普通預金", { lineageKey: "a" })] },
      { fiscalYear: 2026, positions: [deposit("普通預金（改称）", { lineageKey: "a" }), deposit("普通預金", { lineageKey: "b" })] },
    ], sequence());
    expect(keys).toEqual([["a"], ["a", "b"]]);
  });

  it("同じ年度で重複したキーは2件目から振り直す（DB の一意制約に当たらない）", () => {
    const keys = assignLineageKeys([{ fiscalYear: 2026, positions: [deposit("A", { lineageKey: "a" }), deposit("B", { lineageKey: "a" })] }], sequence());
    expect(keys).toEqual([["a", "k1"]]);
  });
});

describe("バックアップの復元", () => {
  it("全体の復元は顧客ごとに結び、持っているキーは変えない", () => {
    const keyOf = restoredLineageKeys(
      [{ id: 1, householdId: 1, fiscalYear: 2025 }, { id: 2, householdId: 1, fiscalYear: 2026 }, { id: 3, householdId: 2, fiscalYear: 2026 }],
      [
        { id: 10, snapshotId: 1, ...deposit("普通預金") },
        { id: 11, snapshotId: 2, ...deposit("普通預金") },
        { id: 12, snapshotId: 3, ...deposit("普通預金", { lineageKey: "8b1f2c1e-0000-4000-8000-000000000001" }) },
      ],
    );
    expect(keyOf.get(10)).toBe(keyOf.get(11));
    expect(keyOf.get(10)).toMatch(/^[0-9a-f-]{36}$/);
    expect(keyOf.get(12)).toBe("8b1f2c1e-0000-4000-8000-000000000001");
  });

  it("顧客ごとの取り込みは、つながりを保ったまま新しいキーへ振り直す", () => {
    const keys = importedLineageKeys([
      { fiscalYear: 2025, positions: [deposit("普通預金", { lineageKey: "a" }), deposit("定期預金", { lineageKey: "b" })] },
      { fiscalYear: 2026, positions: [deposit("普通預金（改称）", { lineageKey: "a" })] },
    ], sequence());
    expect(keys).toEqual([["k1", "k2"], ["k1"]]);
  });
});

describe("既存データへの適用（migration）", () => {
  it("SQL も同じ項目の組で数え、両方の年度で1件だけのものを結ぶ", () => {
    const sql = readFileSync(join(process.cwd(), "prisma/migrations/20261123000000_position_lineage_key/migration.sql"), "utf8");
    expect(sql).toContain(`PARTITION BY p.h, p.y, p."side", p."category", p."name", p."institution", p.pt, p.pa`);
    expect(sql).toContain(`COALESCE(pos."assetDetails"->>'propertyType', '')`);
    expect(sql).toContain(`COALESCE(pos."assetDetails"->>'propertyAddress', '')`);
    expect(sql).toContain("WHERE a.n = 1 AND b.n = 1");
    expect(sql).toContain(`CREATE UNIQUE INDEX "Position_snapshotId_lineageKey_key"`);
  });
});
