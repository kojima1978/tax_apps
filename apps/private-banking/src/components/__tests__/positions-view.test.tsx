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

  it("削除は行の「…」メニューの中にあり、押しても修正は開かない", () => {
    const { onEdit, onDelete } = renderRow();
    // 顧客一覧と同じく、常時出ているのは「…」だけ。開くまで削除は見えない。
    expect(screen.queryByRole("menuitem", { name: "明細を削除" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "普通預金の操作" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "明細を削除" }));
    expect(onDelete).toHaveBeenCalledWith(snapshot.positions[0]);
    expect(onEdit).not.toHaveBeenCalled();
  });

  it("「…」メニューからも修正を開ける", () => {
    const { onEdit } = renderRow();
    fireEvent.click(screen.getByRole("button", { name: "普通預金の操作" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "明細を修正" }));
    expect(onEdit).toHaveBeenCalledWith(snapshot.positions[0]);
  });

  it("入れ替え先が無い明細には並び替えハンドルを出さない", () => {
    const { row } = renderRow();
    // 同じ科目の明細が1件しか無い＝動かしようがない。無効なハンドルを並べず場所だけ空ける。
    expect(row.querySelector(".drag-handle")).toBeNull();
    expect(row.querySelector(".drag-handle-placeholder")).toBeTruthy();
  });
});

describe("AssetsView（表示順）", () => {
  const snapshot = {
    id: 1, fiscalYear: 2027, isCurrent: true, updatedAt: "2027-01-01T00:00:00Z", estimatedInheritanceTax: 0, inheritanceTaxCalculation: null,
    positions: [position(1, "DEPOSIT", "普通預金", 30_000_000), position(2, "DEPOSIT", "定期預金", 80_000_000), position(3, "DEPOSIT", "外貨預金", 50_000_000)],
  } as unknown as Snapshot;
  const renderList = () => {
    render(<AssetsView snapshot={snapshot} legalHeirNames={new Set()} onAdd={() => {}} onBulkManage={() => {}} onEdit={() => {}} onDelete={() => {}} onReorder={async () => true} saving={false} />);
    return () => [...document.querySelectorAll(".position-name-button")].map((element) => element.textContent);
  };

  it("中分類が1種類でも評価額順は選べる（中分類の並べ替えは出さない）", () => {
    const names = renderList();
    const select = screen.getByLabelText("資産の部の表示順") as HTMLSelectElement;
    expect([...select.options].map((option) => option.value)).toEqual(["manual", "value-desc", "value-asc"]);
    expect(names()).toEqual(["普通預金", "定期預金", "外貨預金"]);
    fireEvent.change(select, { target: { value: "value-desc" } });
    expect(names()).toEqual(["定期預金", "外貨預金", "普通預金"]);
    fireEvent.change(select, { target: { value: "value-asc" } });
    expect(names()).toEqual(["普通預金", "外貨預金", "定期預金"]);
  });

  it("評価額順で並べている間はハンドルを出さない（入れ替えても表示が変わらないため）", () => {
    renderList();
    expect(document.querySelectorAll(".drag-handle")).toHaveLength(3);
    fireEvent.change(screen.getByLabelText("資産の部の表示順"), { target: { value: "value-desc" } });
    expect(document.querySelectorAll(".drag-handle")).toHaveLength(0);
    expect(document.querySelectorAll(".drag-handle-placeholder")).toHaveLength(3);
  });
});
