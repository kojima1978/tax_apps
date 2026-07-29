import { describe, expect, it } from "vitest";
import { fxRateFor, parseFxRates } from "@/lib/fx-rates";

describe("parseFxRates", () => {
  it("登録済みの通貨だけを取り出す", () => {
    expect(parseFxRates({ USD: 150.25, EUR: "165", JPY: 1, XXX: 10 })).toEqual({ USD: 150.25, EUR: 165 });
  });

  it("未設定・0以下・数値でない値は捨てる", () => {
    expect(parseFxRates({ USD: 0, EUR: -1, GBP: "", AUD: "abc" })).toEqual({});
  });

  it("null や配列は空の表として扱う", () => {
    expect(parseFxRates(null)).toEqual({});
    expect(parseFxRates([150])).toEqual({});
  });
});

describe("fxRateFor", () => {
  it("円建ては常に1", () => {
    expect(fxRateFor({}, "JPY")).toBe(1);
  });

  it("登録済みの外貨はそのレート、未登録は null", () => {
    expect(fxRateFor({ USD: 150.25 }, "USD")).toBe(150.25);
    expect(fxRateFor({ USD: 150.25 }, "EUR")).toBeNull();
  });
});
