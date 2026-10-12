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
    expect(screen.getAllByText("未登録")).toHaveLength(2);
    expect(screen.getByText(/過去データが未登録の期/)).toBeTruthy();
    screen.getByRole("button", { name: "年度を追加" }).click();
    expect(onCreate).toHaveBeenCalled();
  });

  it("2年度でも3期を表示し、古い年度をデータなしにする", () => {
    renderView([snapshot(1, 2025), snapshot(2, 2026)]);
    expect(periodHeaders().map((th) => th.querySelector(".period-position-label")?.textContent)).toEqual(["古い年度", "直前年度", "最新年度"]);
    expect(screen.getAllByRole("combobox").map((select) => (select as HTMLSelectElement).value)).toEqual(["", "1", "2"]);
    expect(screen.getAllByRole("combobox").map((select) => (select as HTMLSelectElement).selectedOptions[0].textContent)).toEqual(["2024年度（データなし）", "2025年度", "2026年度"]);
    expect(document.querySelector(".trend-table")?.className).toContain("trend-columns-3");
    expect(screen.getAllByText("未登録")).toHaveLength(1);
  });

  it("3年度あれば3列を出し、案内は消える", () => {
    renderView([snapshot(1, 2024), snapshot(2, 2025), snapshot(3, 2026)]);
    expect(periodHeaders().map((th) => th.querySelector(".period-position-label")?.textContent)).toEqual(["古い年度", "直前年度", "最新年度"]);
    expect(screen.queryByText(/もう1年度登録すると/)).toBeNull();
  });

  it("科目の見出し行は3期ぶんを使い、差額の列まではみ出さない", () => {
    renderView([snapshot(1, 2025), snapshot(2, 2026)]);
    const sectionHeading = screen.getByText("資産の部").closest("th") as HTMLElement;
    // 科目の列 + 年度3列 = 4。差額の列は別のセルで受ける。
    expect(sectionHeading.getAttribute("colspan")).toBe("4");
  });
});
