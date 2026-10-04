// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
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
  it("1年度しか無ければ推移表を出さず、年度を追加する入口だけ出す", () => {
    const onCreate = vi.fn();
    renderView([snapshot(1, 2026)], onCreate);
    expect(document.querySelector(".trend-table")).toBeNull();
    const empty = document.querySelector(".trend-empty-state") as HTMLElement;
    expect(within(empty).getByText("年度を追加すると、前の年度と並べて比べられます。")).toBeTruthy();
    within(empty).getByRole("button", { name: "年度を追加" }).click();
    expect(onCreate).toHaveBeenCalled();
  });

  it("2年度なら列も2つ。空の「—」だけの列を作らない", () => {
    renderView([snapshot(1, 2025), snapshot(2, 2026)]);
    expect(periodHeaders().map((th) => th.querySelector(".period-position-label")?.textContent)).toEqual(["直前年度", "最新年度"]);
    expect(document.querySelector(".trend-table")?.className).toContain("trend-columns-2");
    expect(screen.getByText("もう1年度登録すると、3年度を並べて比べられます。")).toBeTruthy();
  });

  it("3年度あれば3列を出し、案内は消える", () => {
    renderView([snapshot(1, 2024), snapshot(2, 2025), snapshot(3, 2026)]);
    expect(periodHeaders().map((th) => th.querySelector(".period-position-label")?.textContent)).toEqual(["古い年度", "直前年度", "最新年度"]);
    expect(screen.queryByText(/もう1年度登録すると/)).toBeNull();
  });

  it("列が減っても、科目の見出し行は差額の列まではみ出さない", () => {
    renderView([snapshot(1, 2025), snapshot(2, 2026)]);
    const sectionHeading = screen.getByText("資産の部").closest("th") as HTMLElement;
    // 科目の列 + 年度2列 = 3。差額の列は別のセルで受ける。
    expect(sectionHeading.getAttribute("colspan")).toBe("3");
  });
});
