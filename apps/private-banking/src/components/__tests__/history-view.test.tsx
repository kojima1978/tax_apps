// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HistoryView } from "@/components/history-view";
import { type Snapshot } from "@/lib/portfolio-view";

afterEach(cleanup);

const snapshot = (id: number, fiscalYear: number) => ({
  id, fiscalYear, label: `${fiscalYear}年度`, asOfDate: `${fiscalYear}-12-31`, isCurrent: false,
  estimatedInheritanceTax: 0, inheritanceTaxCalculation: null, otherTaxes: 0, fxRates: {},
  updatedAt: `${fiscalYear}-12-31T00:00:00Z`,
  positions: [{ id, side: "ASSET", category: "DEPOSIT", name: "普通預金", valueJpy: 10_000_000 * id, originalAmount: 0, currency: "JPY", fxRate: 1, includedInNetWorth: true, institution: "", valuationMethod: "残高", assetDetails: null }],
} as unknown as Snapshot);

function renderView(snapshots: Snapshot[], onCreate = () => {}) {
  const noop = () => {};
  render(<HistoryView snapshots={snapshots} onCreate={onCreate} onEditSnapshot={noop} onDeleteSnapshot={noop} saving={false} />);
}

/** 年度の列（科目の見出し列と前年度差の列を除いたもの）。 */
const periodHeaders = () => [...document.querySelectorAll("thead th.period-selector")];

describe("年度比較の列", () => {
  it("1年度しか無くても3期を表示し、不足分はデータなしにする", () => {
    const onCreate = vi.fn();
    renderView([snapshot(1, 2026)], onCreate);
    expect(periodHeaders().map((th) => th.querySelector(".period-position-label")?.textContent)).toEqual(["古い年度", "直前年度", "最新年度"]);
    expect(screen.getAllByRole("combobox").map((select) => (select as HTMLSelectElement).value)).toEqual(["", "", "1"]);
    expect(screen.getAllByRole("combobox").map((select) => (select as HTMLSelectElement).selectedOptions[0].textContent)).toEqual(["2024年度（データなし）", "2025年度（データなし）", "2026年度"]);
    expect(screen.queryByText("未登録")).toBeNull();
    expect(screen.getByText(/登録の無い期は「データなし」/)).toBeTruthy();
    expect(screen.getByText(/「データなし」の期は、その年度が登録されていません/)).toBeTruthy();
    // 空の期の列は、見出しだけでなく全行に「データなし」と出す（— だけでは無いのか0なのか分からない）。
    const bodyRows = [...document.querySelectorAll(".trend-table tbody tr:not(.trend-section)")];
    expect(bodyRows.length).toBeGreaterThan(5);
    for (const row of bodyRows) expect([...row.querySelectorAll("td")].map((td) => td.textContent).slice(0, 2)).toEqual(["データなし", "データなし"]);
    // 差が出せない理由は見出しで言う。
    expect(document.querySelector(".trend-change-column small")?.textContent).toBe("直前年度のデータなし");
    screen.getByRole("button", { name: "年度を追加" }).click();
    expect(onCreate).toHaveBeenCalled();
  });

  it("2年度でも3期を表示し、古い年度をデータなしにする", () => {
    renderView([snapshot(1, 2025), snapshot(2, 2026)]);
    expect(periodHeaders().map((th) => th.querySelector(".period-position-label")?.textContent)).toEqual(["古い年度", "直前年度", "最新年度"]);
    expect(screen.getAllByRole("combobox").map((select) => (select as HTMLSelectElement).value)).toEqual(["", "1", "2"]);
    expect(screen.getAllByRole("combobox").map((select) => (select as HTMLSelectElement).selectedOptions[0].textContent)).toEqual(["2024年度（データなし）", "2025年度", "2026年度"]);
    expect(document.querySelectorAll("td.trend-no-data").length).toBe(document.querySelectorAll(".trend-table tbody tr:not(.trend-section)").length);
    expect(document.querySelector(".trend-change-column small")?.textContent).toBe("最新 − 直前");
  });

  it("年度の一覧の基準日は西暦に和暦の年を添える", () => {
    renderView([snapshot(1, 2025), snapshot(2, 2026)]);
    const table = document.querySelector(".history-table") as HTMLElement;
    expect(table.textContent).toContain("2026（令和8）年12月31日");
    expect(table.textContent).toContain("2025（令和7）年12月31日");
  });

  it("3年度あれば3列を出し、案内は消える", () => {
    renderView([snapshot(1, 2024), snapshot(2, 2025), snapshot(3, 2026)]);
    expect(periodHeaders().map((th) => th.querySelector(".period-position-label")?.textContent)).toEqual(["古い年度", "直前年度", "最新年度"]);
    expect(screen.queryByText(/登録の無い期は/)).toBeNull();
    expect(document.querySelector(".trend-print-note")).toBeNull();
    expect(document.querySelectorAll("td.trend-no-data")).toHaveLength(0);
  });

  it("年度が3つ以上あるときは列を空にできない（登録済みの年度に「データなし」と出さない）", () => {
    renderView([snapshot(1, 2022), snapshot(2, 2023), snapshot(3, 2024), snapshot(4, 2025)]);
    for (const select of screen.getAllByRole("combobox")) {
      expect([...(select as HTMLSelectElement).options].some((option) => option.value === "")).toBe(false);
    }
  });

  it("科目の見出し行は3期ぶんを使い、差額の列まではみ出さない", () => {
    renderView([snapshot(1, 2025), snapshot(2, 2026)]);
    const sectionHeading = screen.getByText("資産の部").closest("th") as HTMLElement;
    // 科目の列 + 年度3列 = 4。差額の列は別のセルで受ける。
    expect(sectionHeading.getAttribute("colspan")).toBe("4");
  });
});
