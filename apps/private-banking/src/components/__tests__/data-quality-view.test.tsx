// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
    vi.stubGlobal("fetch", vi.fn((url: string) => Promise.resolve({ ok: true, json: async () => url.includes("/staff") ? [{ id: 3, name: "佐藤", nameKana: "", isActive: true, staffDirectoryId: 3, clientCount: 0 }] : clients })));
    render(<DataQualityView />);
    const attentionSummary = (await screen.findByText("要確認の顧客")).closest("button") as HTMLElement;
    const summary = document.querySelector(".quality-summary") as HTMLElement;
    expect(attentionSummary.textContent).toContain("2件");
    expect(within(summary).getByText("担当者未設定").closest("button")?.textContent).toContain("2件");
    expect(screen.getAllByRole("link", { name: /相続税の再計算が必要/ })[0].getAttribute("href")).toBe("/customers/8/tax");
    expect(screen.getAllByRole("link", { name: /中原 美佐/ })[0].getAttribute("href")).toBe("/customers/8/balance");
  });

  it("不備が無ければ完了状態を表示する", async () => {
    vi.stubGlobal("fetch", vi.fn((url: string) => Promise.resolve({ ok: true, json: async () => url.includes("/staff") ? [] : [baseClient] })));
    render(<DataQualityView />);
    expect(await screen.findByText("すべて確認済みです")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("担当者未設定の顧客を選択して一括設定する", async () => {
    const clients = [{ ...baseClient, qualityIssues: [{ code: "staff-missing", label: "担当者未設定", severity: "warning", href: "profile" }] } satisfies ClientSummary];
    // 2つ目の引数（RequestInit）は送った中身を確かめるために型だけ持たせる
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<unknown>>((url) => {
      if (url.includes("bulk-staff")) return Promise.resolve({ ok: true, json: async () => ({ count: 1, staffName: "佐藤" }) });
      return Promise.resolve({ ok: true, json: async () => url.includes("/staff") ? [{ id: 3, name: "佐藤", nameKana: "", isActive: true, staffDirectoryId: 3, clientCount: 0 }] : clients });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<DataQualityView />);
    fireEvent.click((await screen.findAllByRole("checkbox", { name: /中原 美佐/ }))[0]);
    fireEvent.focus(screen.getByRole("combobox", { name: "担当者" }));
    fireEvent.click(screen.getByRole("option", { name: /佐藤/ }));
    fireEvent.click(screen.getByRole("button", { name: "1件に設定" }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).includes("bulk-staff"))).toBe(true));
    const call = fetchMock.mock.calls.find(([url]) => String(url).includes("bulk-staff"));
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({ householdIds: [8], staffId: "3" });
  });

  it("チェックボックスは押せる範囲の label で包み、label を押しても選択が切り替わる", async () => {
    const clients = [{ ...baseClient, qualityIssues: [{ code: "staff-missing", label: "担当者未設定", severity: "warning", href: "profile" }] } satisfies ClientSummary];
    vi.stubGlobal("fetch", vi.fn((url: string) => Promise.resolve({ ok: true, json: async () => url.includes("/staff") ? [] : clients })));
    render(<DataQualityView />);
    const [checkbox] = await screen.findAllByRole("checkbox", { name: /中原 美佐/ }) as HTMLInputElement[];
    const hit = checkbox.closest("label") as HTMLElement;
    expect(hit.className).toBe("quality-check-hit");
    fireEvent.click(hit);
    expect(checkbox.checked).toBe(true);
    expect(screen.getByRole("button", { name: "1件に設定" })).toBeTruthy();
    expect(screen.getAllByRole("link", { name: /中原 美佐/ }).every((link) => link.classList.contains("quality-client-link"))).toBe(true);
    // 最新の基準日は西暦に和暦の年を添える（表とカードの両方）。
    expect(screen.getAllByText("2026（令和8）年1月1日").length).toBeGreaterThanOrEqual(1);
  });
});
