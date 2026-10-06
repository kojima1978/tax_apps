import { describe, expect, it } from "vitest";
import { type Staff, staffOptionLabel, staffOptions } from "@/lib/staff";

const staff = (overrides: Partial<Staff> = {}): Staff => ({
  id: 1,
  name: "佐藤税理士",
  nameKana: "サトウ",
  isActive: true,
  clientCount: 0,
  ...overrides,
});

describe("staffOptions", () => {
  it("退職した担当者は候補から外す", () => {
    const rows = [staff({ id: 1 }), staff({ id: 2, name: "高橋", isActive: false })];
    expect(staffOptions(rows, null).map((row) => row.id)).toEqual([1]);
  });

  it("退職していても、いま選ばれている1人だけは残す", () => {
    // 外すと選択欄が黙って「未設定」を指し、他の項目を直して保存した瞬間に担当者が消える。
    const rows = [staff({ id: 1 }), staff({ id: 2, name: "高橋", isActive: false })];
    expect(staffOptions(rows, 2).map((row) => row.id)).toEqual([1, 2]);
  });
});

describe("staffOptionLabel", () => {
  it("退職した担当者はそれと分かる形で出す", () => {
    expect(staffOptionLabel(staff())).toBe("佐藤税理士");
    expect(staffOptionLabel(staff({ name: "高橋", isActive: false }))).toBe("高橋（退職）");
  });
});
