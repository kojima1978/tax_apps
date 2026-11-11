import { describe, expect, it } from "vitest";
import { buildWorkload } from "@/lib/staff-directory/workload";

describe("buildWorkload", () => {
  it("顧客の担当者を台帳ID ごとに数え、リンクは PB の担当者ID で絞る", () => {
    const res = buildWorkload([
      { staff: { id: 3, staffDirectoryId: 30 } },
      { staff: { id: 3, staffDirectoryId: 30 } },
      { staff: { id: 4, staffDirectoryId: null } },
      { staff: null },
    ]);
    expect(res.activeLabel).toBe("すべて");
    expect(res.staff).toEqual([{ staffDirectoryId: 30, counts: { assignee: { active: 2, total: 2 } }, links: { assignee: "?staffId=3" } }]);
  });
});
