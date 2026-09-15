// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AssetsView } from "@/components/positions-view";
import { type Position, type Snapshot } from "@/lib/portfolio-view";

afterEach(cleanup);

const position = (id: number, category: string, name: string, valueJpy: number, assetDetails: Position["assetDetails"] = null) =>
  ({ id, side: "ASSET", category, name, valueJpy, originalAmount: valueJpy, currency: "JPY", fxRate: 1, includedInNetWorth: true, institution: "", valuationMethod: "残高", assetDetails } as Position);

function renderView(inheritanceTaxCalculation: Snapshot["inheritanceTaxCalculation"], insuranceDetails: Position["assetDetails"]) {
  const snapshot = {
    id: 1, fiscalYear: 2027, isCurrent: true, updatedAt: "2027-01-01T00:00:00Z", estimatedInheritanceTax: 10_000_000, inheritanceTaxCalculation,
    positions: [position(1, "DEPOSIT", "普通預金", 50_000_000), position(2, "INSURANCE", "あおば生命", 5_000_000, insuranceDetails)],
  } as unknown as Snapshot;
  const noop = () => {};
  render(<AssetsView snapshot={snapshot} snapshots={[snapshot]} legalHeirNames={new Set()} onSelectSnapshot={noop} onCreateNext={noop} onAdd={noop} onBulkManage={noop} onEdit={noop} onDelete={noop} onReorder={async () => true} onEditSettings={noop} saving={false} />);
  const row = screen.getByText("あおば生命").closest("tr") as HTMLElement;
  return (label: string) => row.querySelector(`td[data-label="${label}"]`) as HTMLElement;
}

const calculation = { totalTaxBeforeDeductionsJpy: 11_000_000, insuranceNonTaxableAmountJpy: 0, retirementNonTaxableAmountJpy: 0 } as Snapshot["inheritanceTaxCalculation"];

describe("AssetsView（生命保険の相続税負担額）", () => {
  it("連携計算値があれば、相続税負担額を解約返戻金「—」と死亡保険金の2段に分けて並べる", () => {
    const cell = renderView(calculation, { deathBenefit: 50_000_000 });
    const lines = cell("相続税負担額").querySelectorAll(".deemed-amount");
    expect(lines).toHaveLength(2);
    expect(within(lines[0] as HTMLElement).getByText("解約返戻金に対応する相続税なし")).toBeTruthy();
    expect(lines[0].textContent).toContain("—");
    expect(lines[0].textContent).not.toContain("対象外");
    // 正味財産 = 預金5,000万円 + 死亡保険金5,000万円。相続税1,100万円のうち半分が死亡保険金の段に出る。
    expect(lines[1].textContent).toContain("5,500,000");
    expect(cell("円換算時価").querySelectorAll(".deemed-amount")).toHaveLength(2);
  });

  it("死亡保険金が未入力なら段を分けない", () => {
    const cell = renderView(calculation, null);
    expect(cell("相続税負担額").querySelectorAll(".deemed-amount")).toHaveLength(0);
  });

  it("手動の想定相続税だけのときは解約返戻金で按分しているので段を分けない", () => {
    const cell = renderView(null, { deathBenefit: 50_000_000 });
    expect(cell("相続税負担額").querySelectorAll(".deemed-amount")).toHaveLength(0);
    expect(cell("相続税負担額").textContent).not.toBe("—");
  });
});
