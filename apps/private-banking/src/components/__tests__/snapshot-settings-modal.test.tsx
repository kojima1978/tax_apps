// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SnapshotSettingsModal } from "@/components/dashboard-modals";
import type { Snapshot } from "@/lib/portfolio-view";

afterEach(cleanup);
const snapshot = { id: 1, fiscalYear: 2026, asOfDate: "2026-01-01", estimatedInheritanceTax: 12345678, otherTaxes: 987654, fxRates: { USD: 150.25 } } as unknown as Snapshot;

describe("年度・為替設定", () => {
  it("設定対象の顧客名と年度を明示する", () => {
    render(<SnapshotSettingsModal snapshot={snapshot} customerName="対象の顧客" fxOnly onClose={vi.fn()} onSubmit={vi.fn()} saving={false} />);
    expect(screen.getByText(/対象顧客：対象の顧客/).textContent).toContain("対象年度：2026年度");
    expect(screen.getByRole("dialog").getAttribute("aria-describedby")).toBe("snapshot-settings-context");
  });
  it("追加通貨を表示し、未表示の旧通貨レートも消さない", () => {
    const { container } = render(<SnapshotSettingsModal snapshot={{ ...snapshot, fxRates: { USD: 150, GBP: 190 } }} currencyCodes={["JPY", "USD", "EUR", "CAD"]} onClose={vi.fn()} onSubmit={vi.fn()} saving={false} />);
    expect(screen.getByLabelText("CAD")).toBeTruthy();
    expect(screen.queryByLabelText("GBP")).toBeNull();
    expect(new FormData(container.querySelector("form")!).get("fxRate.GBP")).toBe("190");
  });
  it("税額をカンマ表示し、入力・全角貼付・0を扱える", () => {
    render(<SnapshotSettingsModal snapshot={snapshot} onClose={vi.fn()} onSubmit={vi.fn()} saving={false} />);
    const tax = screen.getByLabelText("相続税（円）") as HTMLInputElement;
    const other = screen.getByLabelText("その他税金（円）") as HTMLInputElement;
    expect(tax.value).toBe("12,345,678");
    expect(other.value).toBe("987,654");
    fireEvent.change(tax, { target: { value: "９８７６５４３２" } });
    expect(tax.value).toBe("98,765,432");
    fireEvent.change(other, { target: { value: "0" } });
    expect(other.value).toBe("0");
    expect(tax.required).toBe(true);
  });

  it("為替専用では税額を編集させず、USDへフォーカスして戻れる", () => {
    const onClose = vi.fn();
    const { container } = render(<SnapshotSettingsModal snapshot={snapshot} fxOnly onClose={onClose} onSubmit={vi.fn()} saving={false} />);
    expect(screen.getByRole("dialog").getAttribute("aria-label") ?? screen.getByRole("heading").textContent).toContain("為替レート設定");
    expect(screen.queryByLabelText("相続税（円）")).toBeNull();
    expect(document.activeElement).toBe(screen.getByLabelText("USD"));
    expect((screen.getByLabelText("USD") as HTMLInputElement).value).toBe("150.25");
    const data = new FormData(container.querySelector("form")!);
    expect(data.get("fxRatesOnly")).toBe("true");
    expect(data.get("estimatedInheritanceTax")).toBe("12345678");
    fireEvent.click(screen.getByRole("button", { name: "戻る" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
