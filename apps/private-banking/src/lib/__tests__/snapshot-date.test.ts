import { describe, expect, it } from "vitest";
import {
  defaultAsOfDate,
  isAsOfDateForFiscalYear,
  parseDateOnlyUtc,
} from "@/lib/snapshot-date";

describe("snapshot date", () => {
  it("年度初日の初期値を作る", () => {
    expect(defaultAsOfDate(2027)).toBe("2027-01-01");
  });

  it("実在する日付だけをUTCとして解釈する", () => {
    expect(parseDateOnlyUtc("2028-02-29")?.toISOString()).toBe("2028-02-29T00:00:00.000Z");
    expect(parseDateOnlyUtc("2027-02-29")).toBeNull();
    expect(parseDateOnlyUtc("2027-2-9")).toBeNull();
  });

  it("基準日が対象年度内にあることを確認する", () => {
    expect(isAsOfDateForFiscalYear("2027-06-30", 2027)).toBe(true);
    expect(isAsOfDateForFiscalYear("2026-12-31", 2027)).toBe(false);
  });
});
