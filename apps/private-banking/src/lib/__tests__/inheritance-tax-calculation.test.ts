import { describe, expect, it } from "vitest";
import { taxCalcLabel } from "@/lib/inheritance-tax-calculation";

describe("taxCalcLabel", () => {
  it("まだ計算していなければ何をするボタンかを出す", () => {
    expect(taxCalcLabel("idle", false)).toBe("相続税を計算");
  });

  it("計算済みなら再計算と出す", () => {
    expect(taxCalcLabel("idle", true)).toBe("再計算");
  });

  it("実行中・直後は計算済みかどうかに関わらず同じ文言にする", () => {
    expect(taxCalcLabel("loading", false)).toBe("計算中");
    expect(taxCalcLabel("loading", true)).toBe("計算中");
    expect(taxCalcLabel("success", false)).toBe("計算しました");
    expect(taxCalcLabel("success", true)).toBe("計算しました");
  });
});
