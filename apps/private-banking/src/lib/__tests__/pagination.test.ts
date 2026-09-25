import { describe, expect, it } from "vitest";
import { pageCount, pageSlice } from "@/lib/pagination";

describe("pageSlice", () => {
  const rows = Array.from({ length: 12 }, (_, index) => index + 1);

  it("0件でも1ページと数える", () => {
    expect(pageCount(0, 50)).toBe(1);
    expect(pageSlice([], 1, 50)).toEqual({ current: 1, last: 1, from: 0, rows: [] });
  });

  it("ページ番号ぶんだけ切り出す", () => {
    expect(pageCount(12, 5)).toBe(3);
    expect(pageSlice(rows, 2, 5)).toEqual({ current: 2, last: 3, from: 5, rows: [6, 7, 8, 9, 10] });
    expect(pageSlice(rows, 3, 5).rows).toEqual([11, 12]);
  });

  it("範囲外のページ番号は端へ寄せる（絞り込みで件数が減ったとき空振りにしない）", () => {
    expect(pageSlice(rows, 9, 5)).toMatchObject({ current: 3, from: 10 });
    expect(pageSlice(rows, 0, 5)).toMatchObject({ current: 1, from: 0 });
  });
});
