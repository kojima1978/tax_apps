// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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
  render(<AssetsView snapshot={snapshot} legalHeirNames={new Set()} onAdd={noop} onBulkManage={noop} onEdit={noop} onDelete={noop} onReorder={async () => true} saving={false} />);
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

describe("AssetsView（行の操作）", () => {
  const snapshot = {
    id: 1, fiscalYear: 2027, isCurrent: true, updatedAt: "2027-01-01T00:00:00Z", estimatedInheritanceTax: 0, inheritanceTaxCalculation: null,
    positions: [position(1, "DEPOSIT", "普通預金", 50_000_000)],
  } as unknown as Snapshot;
  const renderRow = () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<AssetsView snapshot={snapshot} legalHeirNames={new Set()} onAdd={() => {}} onBulkManage={() => {}} onEdit={onEdit} onDelete={onDelete} onReorder={async () => true} saving={false} />);
    return { onEdit, onDelete, row: screen.getByRole("button", { name: "普通預金を修正" }).closest("tr") as HTMLElement };
  };

  it("行を押すと修正を開く", () => {
    const { onEdit, row } = renderRow();
    fireEvent.click(row.querySelector('td[data-label="円換算時価"]') as HTMLElement);
    expect(onEdit).toHaveBeenCalledWith(snapshot.positions[0]);
  });

  it("送られてきた明細の行に目印を付ける（修正は開かない）", () => {
    const onEdit = vi.fn();
    render(<AssetsView snapshot={snapshot} legalHeirNames={new Set()} onAdd={() => {}} onBulkManage={() => {}} onEdit={onEdit} onDelete={() => {}} onReorder={async () => true} saving={false} spotlightId={1} />);
    // 不動産一覧からの送り先は id で探すので、行に id が付いていること自体が要件。
    const row = document.getElementById("position-1") as HTMLElement;
    expect(row.classList.contains("is-spotlight")).toBe(true);
    expect(onEdit).not.toHaveBeenCalled();
  });

  it("削除ボタンは文字付きで、押しても修正は開かない", () => {
    const { onEdit, onDelete } = renderRow();
    const deleteButton = screen.getByRole("button", { name: "普通預金を削除" });
    expect(deleteButton.textContent).toBe("削除");
    fireEvent.click(deleteButton);
    expect(onDelete).toHaveBeenCalledWith(snapshot.positions[0]);
    expect(onEdit).not.toHaveBeenCalled();
  });
});
