import { describe, expect, it } from "vitest";
import { fullBackupSchema, householdBackupSchema, positionData } from "@/lib/backup";

// 評価方法は算式と科目から決まる派生値なので、復元経路にも既定の文字列を置けない。
// 以前は取り込みスキーマが `.default("手動入力")` を持っていて、ここだけが
// 「手動入力」を書き続ける抜け道になっていた。

/** 明細1件だけを持つ最小の顧客バックアップを、取り込みスキーマに通して返す。 */
const restoredPosition = (overrides: Record<string, unknown>) =>
  householdBackupSchema.parse({
    schemaVersion: 1,
    kind: "household",
    household: { clientCode: "TEST-1", name: "テスト" },
    snapshots: [{
      label: "現状",
      asOfDate: "2026-04-01",
      fiscalYear: 2026,
      positions: [{
        side: "ASSET",
        category: "DEPOSIT",
        name: "普通預金",
        originalAmount: "100",
        valueJpy: "100",
        ...overrides,
      }],
    }],
  }).snapshots[0].positions[0];

describe("バックアップの復元：評価方法", () => {
  it("列を持たない旧バックアップを、既定の文字列で埋めない", () => {
    expect(restoredPosition({}).valuationMethod).toBeUndefined();
  });

  it("列が無ければ科目と算式から引き直す（「手動入力」は入らない）", () => {
    expect(positionData(restoredPosition({})).valuationMethod).toBe("残高");
    expect(positionData(restoredPosition({ category: "INSURANCE_RIGHTS" })).valuationMethod).toBe("解約返戻金");
    expect(positionData(restoredPosition({ valuationFormula: "LAND_ROADSIDE" })).valuationMethod).toBe("路線価方式");
  });

  it("列を持つバックアップはその値をそのまま戻す", () => {
    // 復元は書き出した内容を再現するもの。ここで引き直すと、
    // バックアップと復元後で中身が変わり、リストア訓練の意味が無くなる。
    expect(positionData(restoredPosition({ valuationMethod: "倍率方式" })).valuationMethod).toBe("倍率方式");
  });
});

describe("バックアップの復元：日付", () => {
  /** 顧客バックアップ1件を組み立てる（日付だけを差し替える）。 */
  const backup = (overrides: { birthDate?: string | null; asOfDate?: string }) => ({
    schemaVersion: 1,
    kind: "household",
    household: { clientCode: "TEST-1", name: "テスト", birthDate: overrides.birthDate ?? null },
    snapshots: [{ label: "現状", asOfDate: overrides.asOfDate ?? "2026-04-01", fiscalYear: 2026, positions: [] }],
  });

  it("実在しない日付のファイルは取り込まない（3月3日として保存しない）", () => {
    // 通すと `new Date("2026-02-31T00:00:00.000Z")` が 3月3日 になり、
    // 取り込んだ時点で元のファイルと中身が違う（どこで変わったか後から辿れない）。
    expect(householdBackupSchema.safeParse(backup({ birthDate: "1974-02-31" })).success).toBe(false);
    expect(householdBackupSchema.safeParse(backup({ asOfDate: "2026-02-31" })).success).toBe(false);
    expect(householdBackupSchema.safeParse(backup({ asOfDate: "2026-13-01" })).success).toBe(false);
  });

  it("日時で書かれた旧いファイルは日付の部分だけ取り込む", () => {
    const parsed = householdBackupSchema.parse(backup({ birthDate: "1974-03-03T00:00:00.000Z", asOfDate: "2026-04-01T00:00:00.000Z" }));
    expect(parsed.household.birthDate).toBe("1974-03-03");
    expect(parsed.snapshots[0].asOfDate).toBe("2026-04-01");
  });
});

describe("バックアップの復元：追加データ", () => {
  it("旧い顧客バックアップではシナリオと操作履歴を空配列として扱う", () => {
    const parsed = householdBackupSchema.parse({
      schemaVersion: 1,
      kind: "household",
      household: { clientCode: "TEST-1", name: "テスト" },
      snapshots: [{ label: "現状", asOfDate: "2026-04-01", fiscalYear: 2026 }],
    });

    expect(parsed.planningScenarios).toEqual([]);
    expect(parsed.activityLogs).toEqual([]);
  });

  it("顧客バックアップのシナリオと操作履歴を検証して保持する", () => {
    const parsed = householdBackupSchema.parse({
      schemaVersion: 1,
      kind: "household",
      household: { clientCode: "TEST-1", name: "テスト" },
      snapshots: [{ label: "現状", asOfDate: "2026-04-01", fiscalYear: 2026 }],
      planningScenarios: [{ name: "承継案", assetChangePercent: "5.50", inheritanceTaxJpy: "1000000" }],
      activityLogs: [{ action: "CREATE", entityType: "SCENARIO", summary: "承継案を登録", createdAt: "2026-04-02T03:00:00.000Z" }],
    });

    expect(parsed.planningScenarios[0]).toEqual(expect.objectContaining({ name: "承継案", assetChangePercent: "5.50" }));
    expect(parsed.activityLogs[0]).toEqual(expect.objectContaining({ action: "CREATE", summary: "承継案を登録" }));
  });

  it("旧い全体バックアップでも追加テーブルを空配列として扱う", () => {
    const parsed = fullBackupSchema.parse({
      schemaVersion: 1,
      kind: "full",
      data: { households: [], snapshots: [], positions: [], familyMembers: [] },
    });

    expect(parsed.data.planningScenarios).toEqual([]);
    expect(parsed.data.activityLogs).toEqual([]);
  });
});
