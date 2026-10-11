// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActivityView } from "@/components/activity-view";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("操作履歴", () => {
  it("履歴を新しい順のタイムラインとして表示する", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [
      { id: 2, action: "CALCULATE", entityType: "TAX", summary: "相続税を再計算", actor: "システム", createdAt: "2026-10-11T01:30:00.000Z" },
      { id: 1, action: "UPDATE", entityType: "POSITION", summary: "資産明細を更新", actor: "担当者", createdAt: "2026-10-10T01:30:00.000Z" },
    ] }));
    render(<ActivityView householdId={8} />);
    const items = await screen.findAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual(expect.arrayContaining([
      expect.stringContaining("相続税を再計算"), expect.stringContaining("資産明細を更新"),
    ]));
    expect(items[0].textContent).toContain("計算");
    expect(items[0].querySelector("time")?.getAttribute("datetime")).toBe("2026-10-11T01:30:00.000Z");
  });

  it("取得失敗時は空表示とエラーを同時に示す", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    render(<ActivityView householdId={8} />);
    expect((await screen.findByRole("alert")).textContent).toContain("操作履歴を読み込めませんでした");
    expect(screen.getByText("まだ操作履歴はありません")).toBeTruthy();
  });
});
