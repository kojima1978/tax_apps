// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PositionListView } from "@/components/position-list-view";
import { PositionDetailsView } from "@/components/position-details-view";
import { buildPositionTaxBurden } from "@/components/positions-view";
import { type Position, type Snapshot } from "@/lib/portfolio-view";

const navigation = vi.hoisted(() => ({ query: "", path: "/customers/1/position-list", replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(navigation.query), usePathname: () => navigation.path, useRouter: () => ({ replace: navigation.replace, push: navigation.push }) }));
const position = (id: number, patch: Partial<Position>): Position => ({
  id, side: "ASSET", category: "DEPOSIT", name: "普通預金", institution: "銀行", currency: "JPY", originalAmount: 50_000_000, fxRate: 1, valueJpy: 50_000_000,
  liquidity: "", includedInNetWorth: true, valuationMethod: "残高", valuationFormula: "MANUAL", valuationQuantity: null, valuationUnitPrice: null, adjustmentRate: null, landArea: null, roadsideValue: null,
  fixedAssetTaxValue: null, valuationMultiplier: null, ownershipShare: null, ownershipNumerator: null, ownershipDenominator: null, assetDetails: null, note: "", ...patch,
});
const insurance = position(2, { category: "INSURANCE", name: "あおば生命", valueJpy: 5_000_000, originalAmount: 5_000_000, assetDetails: { deathBenefit: 50_000_000, beneficiary: "子", insuredPerson: "本人" } });
const guarantee = position(3, { side: "LIABILITY", category: "GUARANTEE", name: "保証", includedInNetWorth: false, valueJpy: 20_000_000 });
const snapshot = { id: 7, fiscalYear: 2026, isCurrent: false, positions: [position(1, {}), insurance, guarantee], estimatedInheritanceTax: 10_000_000, inheritanceTaxCalculation: null } as Snapshot;
beforeEach(() => { navigation.query = ""; navigation.path = "/customers/1/position-list"; navigation.replace.mockReset(); navigation.push.mockReset(); localStorage.clear(); });
afterEach(cleanup);

describe("資産・負債一覧と詳細の連携", () => {
  it("受取人でも検索でき、絞り込みと年度を引き継いで正しい詳細へ移動する", () => {
    navigation.query = "snapshot=7&q=子&listSection=ASSET";
    render(<PositionListView snapshot={snapshot} detailHref="/customers/1/positions?snapshot=7&q=子&listSection=ASSET" taxBurden={() => null} onAdd={vi.fn()} onBulkManage={vi.fn()} saving={false} />);
    expect(document.querySelectorAll("tbody tr")).toHaveLength(1);
    const href = new URL(screen.getByRole("link", { name: "あおば生命の詳細" }).getAttribute("href")!, "http://localhost");
    expect(href.pathname).toBe("/customers/1/positions/insurance");
    expect(Object.fromEntries(href.searchParams)).toMatchObject({ snapshot: "7", q: "子", listSection: "ASSET", position: "2" });
  });

  it("詳細は死亡保険金と現在価値を分け、一覧に戻る検索条件を維持する", () => {
    navigation.path = "/customers/1/positions/insurance"; navigation.query = "snapshot=7&q=子&position=2";
    const add = vi.fn();
    render(<PositionDetailsView snapshot={snapshot} taxBurden={() => null} onAdd={add} onBulkManage={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} onReorder={async () => true} saving={false} spotlightId={2} />);
    const table = screen.getByRole("table", { name: "生命保険の明細" });
    expect(within(table).getAllByRole("row")).toHaveLength(2);
    expect(table.querySelector('[data-column="死亡保険金"]')?.textContent).toContain("50,000,000");
    expect(table.querySelector('[data-column="value"]')?.textContent).toContain("5,000,000");
    expect(screen.getByRole("link", { name: "一覧へ戻る" }).getAttribute("href")).toBe("/customers/1/position-list?snapshot=7&q=%E5%AD%90");
    fireEvent.click(screen.getByRole("button", { name: "明細を追加" }));
    expect(add).toHaveBeenCalledWith("ASSET", "INSURANCE", undefined);
  });

  it("列の表示・幅を保存し、再表示でも復元する", () => {
    navigation.path = "/customers/1/positions/insurance";
    const props = { snapshot, taxBurden: () => null, onAdd: vi.fn(), onBulkManage: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn(), onReorder: async () => true, saving: false };
    render(<PositionDetailsView {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "表示する列" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "計算根拠を表示" }));
    fireEvent.change(screen.getByRole("spinbutton", { name: "名称の列幅" }), { target: { value: "260" } });
    cleanup();
    render(<PositionDetailsView {...props} />);
    const table = screen.getByRole("table", { name: "生命保険の明細" });
    expect(within(table).getByRole("columnheader", { name: "計算根拠" })).toBeTruthy();
    expect((table.querySelector("col") as HTMLElement).style.width).toBe("260px");
  });

  it("共通の税負担計算は死亡給付金を基準にし、B/S外の保証を除外する", () => {
    const tax = buildPositionTaxBurden({ ...snapshot, inheritanceTaxCalculation: { totalTaxBeforeDeductionsJpy: 11_000_000, insuranceNonTaxableAmountJpy: 0, retirementNonTaxableAmountJpy: 0 } as Snapshot["inheritanceTaxCalculation"] }, new Set());
    expect(tax(insurance)).toBe(5_500_000);
    expect(tax(snapshot.positions[0])).toBe(5_500_000);
    expect(tax(guarantee)).toBeNull();
  });
});
