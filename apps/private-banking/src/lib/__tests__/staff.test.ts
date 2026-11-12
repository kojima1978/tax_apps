import { describe, expect, it } from "vitest";
import { ambiguousStaffNames, type Staff, staffOptionLabel, staffOptions } from "@/lib/staff";

const staff = (overrides: Partial<Staff> = {}): Staff => ({
  id: 1,
  staffCode: "T001",
  department: "東京",
  name: "佐藤税理士",
  nameKana: "サトウ",
  isActive: true,
  staffDirectoryId: 1,
  clientCount: 0,
  ...overrides,
});

describe("staffOptions", () => {
  it("台帳に居ない（未連携の）担当者は候補から外す。選ばれている人だけは残す", () => {
    const rows = [staff({ id: 1 }), staff({ id: 2, staffDirectoryId: null })];
    expect(staffOptions(rows, null).map((row) => row.id)).toEqual([1]);
    expect(staffOptions(rows, 2).map((row) => row.id)).toEqual([1, 2]);
  });

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
  it("既定ではコードを出さず、退職した担当者はそれと分かる形で出す", () => {
    // コードは社員番号が未登録なら `SD-<台帳ID>` の自動生成なので、常に併記すると意味の無い文字が並ぶ。
    expect(staffOptionLabel(staff())).toBe("佐藤税理士（東京）");
    expect(staffOptionLabel(staff({ name: "高橋", isActive: false }))).toBe("高橋（東京）（退職）");
  });

  it("同姓同名のときだけコードを併記する", () => {
    expect(staffOptionLabel(staff(), true)).toBe("佐藤税理士（T001・東京）");
    expect(staffOptionLabel(staff({ department: "" }), true)).toBe("佐藤税理士（T001）");
  });
});

describe("ambiguousStaffNames", () => {
  it("2人以上いる氏名だけを返す", () => {
    const rows = [staff({ id: 1, name: "佐藤" }), staff({ id: 2, name: "佐藤" }), staff({ id: 3, name: "高橋" })];
    expect([...ambiguousStaffNames(rows)]).toEqual(["佐藤"]);
  });
});
