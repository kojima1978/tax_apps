import { describe, expect, it } from "vitest";
import { ambiguousStaffNames, groupStaffByDepartment, type Staff, staffOptionLabel, staffOptions } from "@/lib/staff";

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

describe("groupStaffByDepartment", () => {
  const rows = [
    staff({ id: 1, name: "渡辺", department: "資産税部" }),
    staff({ id: 2, name: "山田", department: "第一部" }),
    staff({ id: 3, name: "青木", department: "" }),
    staff({ id: 4, name: "三河", department: "第一部" }),
  ];

  it("部署名順に束ね、部署なしは最後に置く", () => {
    // 漢字の並びなので読み順にはならない（実測で「資産税部」が「第一部」より先に来る）。
    expect(groupStaffByDepartment(rows).map((group) => [group.label, group.options.map((row) => row.name)]))
      .toEqual([["資産税部", ["渡辺"]], ["第一部", ["山田", "三河"]], ["部署なし", ["青木"]]]);
  });

  it("渡した順を変えてもグループの並びは変わらない", () => {
    expect(groupStaffByDepartment([...rows].reverse()).map((group) => group.label))
      .toEqual(["資産税部", "第一部", "部署なし"]);
  });
});
