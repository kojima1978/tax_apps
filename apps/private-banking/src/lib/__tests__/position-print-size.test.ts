import { describe, expect, it } from "vitest";
import { LARGE_PRINT_MAX_HEIRS, positionPrintSize } from "../position-print-size";

describe("positionPrintSize", () => {
  it("相続人6人までは大きい文字で刷る", () => {
    expect(LARGE_PRINT_MAX_HEIRS).toBe(6);
    for (const n of [0, 1, 2, 3, 4, 5, 6]) expect(positionPrintSize(n)).toBe("large");
  });

  it("7人以上は列が狭いので今までの文字のまま", () => {
    for (const n of [7, 8, 12]) expect(positionPrintSize(n)).toBe("standard");
  });
});
