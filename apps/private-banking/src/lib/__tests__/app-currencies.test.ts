import { describe, expect, it } from "vitest";
import { addableAppCurrencies, appCurrencySchema } from "@/lib/app-currencies";
import { fullBackupSchema, householdBackupSchema } from "@/lib/backup";

describe("共通設定の通貨（JSON バックアップ）", () => {
  it("コードは大文字へそろえ、ISO に無いコードは通さない", () => {
    expect(appCurrencySchema.parse({ code: " cad ", name: " カナダドル " })).toEqual({ code: "CAD", name: "カナダドル" });
    expect(appCurrencySchema.safeParse({ code: "XYZ", name: "架空" }).success).toBe(false);
  });

  it("足すのは標準以外の通貨だけ。同じファイル内で重なったら先の方を使う", () => {
    expect(addableAppCurrencies([
      { code: "USD", name: "米ドル" },
      { code: "CAD", name: "カナダドル" },
      { code: "CAD", name: "加ドル" },
      { code: "AUD", name: "豪ドル" },
    ])).toEqual([{ code: "CAD", name: "カナダドル" }, { code: "AUD", name: "豪ドル" }]);
  });

  it("通貨の項目が無い旧いファイルも読める（何も足さない）", () => {
    const full = fullBackupSchema.parse({ schemaVersion: 2, kind: "full", data: { households: [], snapshots: [], positions: [] } });
    expect(full.data.appCurrencies).toEqual([]);
    const household = householdBackupSchema.parse({ schemaVersion: 2, kind: "household", household: { clientCode: "T-1", name: "テスト" }, snapshots: [] });
    expect(household.appCurrencies).toEqual([]);
  });

  it("全体・顧客のどちらのファイルでも通貨を読み取る", () => {
    const full = fullBackupSchema.parse({ schemaVersion: 2, kind: "full", data: { households: [], snapshots: [], positions: [], appCurrencies: [{ code: "chf", name: "スイスフラン" }] } });
    expect(full.data.appCurrencies).toEqual([{ code: "CHF", name: "スイスフラン" }]);
    const household = householdBackupSchema.parse({ schemaVersion: 2, kind: "household", household: { clientCode: "T-1", name: "テスト" }, appCurrencies: [{ code: "CHF", name: "スイスフラン" }], snapshots: [] });
    expect(household.appCurrencies).toEqual([{ code: "CHF", name: "スイスフラン" }]);
  });
});
