// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DataQualityView } from "@/components/data-quality-view";
import type { ClientSummary } from "@/lib/clients";

const baseClient: ClientSummary = {
  id: 8, clientCode: "0001", name: "中原 美佐", nameKana: "ナカハラ ミサ", staffId: null,
  assignedStaff: "", relatedCompany: "", latestFiscalYear: 2026, latestAsOfDate: "2026-01-01",
  latestUpdatedAt: "2026-10-11T00:00:00.000Z", assets: 100_000_000, registeredLiabilities: 20_000_000,
  netWorth: 80_000_000, estimatedInheritanceTax: 10_000_000, qualityIssues: [],
};

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("データ品質チェック", () => {
  it("不備を顧客横断で集計し、修正先へリンクする", async () => {
    const clients: ClientSummary[] = [
      { ...baseClient, qualityIssues: [
        { code: "staff-missing", label: "担当者未設定", severity: "warning", href: "profile" },
        { code: "tax-recalculation-required", label: "相続税の再計算が必要", severity: "critical", href: "tax" },
      ] },
      { ...baseClient, id: 9, clientCode: "0002", name: "脇田 和典", qualityIssues: [
        { code: "staff-missing", label: "担当者未設定", severity: "warning", href: "profile" },
      ] },
    ];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => clients }));
    render(<DataQualityView />);
    const attentionSummary = (await screen.findByText("要確認の顧客")).closest("article") as HTMLElement;
    const summary = document.querySelector(".quality-summary") as HTMLElement;
    expect(attentionSummary.textContent).toContain("2件");
    expect(within(summary).getByText("担当者未設定").closest("article")?.textContent).toContain("2件");
    expect(screen.getByRole("link", { name: "相続税の再計算が必要" }).getAttribute("href")).toBe("/customers/8/tax");
    expect(screen.getByRole("link", { name: /中原 美佐/ }).getAttribute("href")).toBe("/customers/8/balance");
  });

  it("不備が無ければ完了状態を表示する", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [baseClient] }));
    render(<DataQualityView />);
    expect(await screen.findByText("すべて確認済みです")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });
});
