import { describe, expect, it } from "vitest";
import { directoryStaffCode, planStaff, type DirectoryStaff, type LocalStaff } from "@/lib/staff-directory/plan";

// 名前はすべて架空（リポジトリは公開）

const directory = (overrides: Partial<DirectoryStaff> & { id: number }): DirectoryStaff => ({
  employeeNo: null,
  name: "山田",
  nameKana: "ヤマダ",
  departmentName: "資産税部",
  retiredOn: null,
  ...overrides,
});

const local = (overrides: Partial<LocalStaff> & { id: number }): LocalStaff => ({
  staffCode: "SD-1",
  name: "山田",
  nameKana: "ヤマダ",
  department: "資産税部",
  isActive: true,
  staffDirectoryId: 1,
  ...overrides,
});

describe("directoryStaffCode", () => {
  it("社員番号があればそれ、無ければ台帳ID から作る", () => {
    expect(directoryStaffCode({ id: 7, employeeNo: "A001" })).toBe("A001");
    expect(directoryStaffCode({ id: 7, employeeNo: null })).toBe("SD-7");
    expect(directoryStaffCode({ id: 7, employeeNo: "  " })).toBe("SD-7");
  });
});

describe("planStaff", () => {
  it("台帳に居て写しに無い人は作る", () => {
    expect(planStaff([directory({ id: 3, retiredOn: "2026-03-31" })], [])).toEqual({
      ops: [{ kind: "create", data: { staffCode: "SD-3", name: "山田", nameKana: "ヤマダ", department: "資産税部", isActive: false, staffDirectoryId: 3 } }],
      conflicts: [],
    });
  });

  it("台帳ID で結び付け、変わった欄だけ書く。変わりが無ければ何も書かない", () => {
    expect(planStaff([directory({ id: 1 })], [local({ id: 10 })]).ops).toEqual([]);
    expect(planStaff([directory({ id: 1, employeeNo: "A001", departmentName: null })], [local({ id: 10 })]).ops).toEqual([
      { kind: "update", id: 10, data: { staffCode: "A001", department: "" } },
    ]);
  });

  it("名前が同じでも台帳ID の無い行とは結び付けず、その行は候補から外す", () => {
    const { ops } = planStaff([directory({ id: 2 })], [local({ id: 10, staffCode: "STF-0001", staffDirectoryId: null })]);
    expect(ops).toEqual([
      { kind: "create", data: { staffCode: "SD-2", name: "山田", nameKana: "ヤマダ", department: "資産税部", isActive: true, staffDirectoryId: 2 } },
      { kind: "update", id: 10, data: { isActive: false } },
    ]);
  });

  it("台帳に無い担当者が同じコードを持っていれば写さない", () => {
    const { conflicts } = planStaff([directory({ id: 2, employeeNo: "STF-0001" })], [local({ id: 10, staffCode: "STF-0001", staffDirectoryId: null })]);
    expect(conflicts).toHaveLength(1);
  });

  it("社員番号の入れ替えは衝突として扱わない（仮のコードへの退避は sync 側）", () => {
    const { ops, conflicts } = planStaff(
      [directory({ id: 1, employeeNo: "B" }), directory({ id: 2, employeeNo: "A", name: "鈴木" })],
      [local({ id: 10, staffCode: "A" }), local({ id: 11, staffCode: "B", name: "鈴木", staffDirectoryId: 2 })],
    );
    expect(conflicts).toEqual([]);
    expect(ops).toEqual([
      { kind: "update", id: 10, data: { staffCode: "B" } },
      { kind: "update", id: 11, data: { staffCode: "A" } },
    ]);
  });
});
