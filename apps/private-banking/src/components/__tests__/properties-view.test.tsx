// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PropertiesView } from "@/components/properties-view";
import { type PropertyRow } from "@/lib/properties";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const row = (id: number, plan = "KEEP"): PropertyRow => ({
  householdId: 1, snapshotId: 1, isCurrent: true, clientCode: "001", clientName: "テスト", clientNameKana: "テスト", assignedStaff: "担当",
  fiscalYear: 2026, asOfDate: "2026-01-01", positionId: id, category: "HOME_REAL_ESTATE", categoryLabel: "居宅", propertyType: "LAND", propertyTypeLabel: "土地",
  name: `土地${id}`, address: "東京都", useLabel: "宅地", area: 100, ownership: "1/1", fixedAssetTaxValue: 1000, valueJpy: 2000,
  valuationMethod: "路線価", valuationDetail: "算式", note: "", plan: plan as PropertyRow["plan"], planLabel: plan === "KEEP" ? "保有・承継" : "売却予定", planNote: "長いメモは必要な出力のみ", planTiming: "相続後",
});
function setup(rows: PropertyRow[]) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ rows, fiscalYears: [2026] }) }));
  return render(<PropertiesView />);
}
describe("不動産一覧の方針", () => {
  it("一覧は方針だけを表示し、絞り込みと方針付き出力を切り替えられる", async () => {
    const { container } = setup([row(1), row(2, "SELL")]);
    await screen.findByText("土地1");
    expect(container.querySelector(".property-plan-print-details")).toBeNull();
    fireEvent.change(screen.getByLabelText("今後の方針"), { target: { value: "SELL" } });
    expect(screen.queryByText("土地1")).toBeNull();
    expect(screen.getByText("土地2")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("希望時期・メモ付きで出力"));
    expect(container.querySelector(".property-plan-print-details")?.textContent).toContain("相続後");
  });
  it("先頭の五択に該当箇所を示し、件数ボタンで絞り込み・解除できる", async () => {
    const { container } = setup([row(1), row(2, "SELL"), row(3, "UNDECIDED")]);
    await screen.findByText("土地1");
    expect([...container.querySelectorAll(".properties-plan-choice")].map((cell) => cell.textContent)).toEqual(["未定", "保有・承継", "売却予定", "処分予定", "要検討"]);
    expect(container.querySelectorAll(".properties-row:first-child td")[1].textContent).toContain("●");
    fireEvent.click(screen.getByRole("button", { name: "売却予定 1件" }));
    expect(container.querySelectorAll(".properties-row")).toHaveLength(1);
    expect(screen.queryByText("土地1")).toBeNull();
    expect(screen.getByRole("button", { name: "売却予定 1件" }).getAttribute("aria-pressed")).toBe("true");
    expect((screen.getByLabelText("今後の方針") as HTMLSelectElement).value).toBe("SELL");
    fireEvent.click(screen.getByRole("button", { name: "すべて 3件" }));
    expect(container.querySelectorAll(".properties-row")).toHaveLength(3);
  });
  it("印刷時は表示ページだけでなく、絞り込み結果の全件を出力する", async () => {
    const { container } = setup(Array.from({ length: 26 }, (_, index) => row(index + 1)));
    await screen.findByText("土地1");
    expect(container.querySelectorAll(".properties-row")).toHaveLength(25);
    fireEvent(window, new Event("beforeprint"));
    await waitFor(() => expect(container.querySelectorAll(".properties-row")).toHaveLength(26));
    fireEvent(window, new Event("afterprint"));
    await waitFor(() => expect(container.querySelectorAll(".properties-row")).toHaveLength(25));
  });
});
