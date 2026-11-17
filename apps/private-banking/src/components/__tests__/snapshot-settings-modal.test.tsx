// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ForecastModal, SnapshotSettingsModal } from "@/components/dashboard-modals";
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

  // 以前は素の type="date" で、年度・顧客の追加と違って和暦では入れられなかった。
  it("B/S基準日は和暦でも入れられ、開いた直後はこの欄にフォーカスする", () => {
    const { container } = render(<SnapshotSettingsModal snapshot={snapshot} onClose={vi.fn()} onSubmit={vi.fn()} saving={false} />);
    const date = container.querySelector("#snapshot-as-of-date") as HTMLInputElement;
    expect(document.activeElement).toBe(date);
    expect(date.value).toBe("2026-01-01");
    expect(date.min).toBe("2026-01-01");
    expect(date.max).toBe("2026-12-31");
    fireEvent.click(screen.getByRole("button", { name: "B/S基準日を和暦で入力する" }));
    expect((screen.getByLabelText("B/S基準日の元号") as HTMLSelectElement).value).toBe("REIWA");
    expect((screen.getByLabelText("B/S基準日の年") as HTMLInputElement).value).toBe("8");
    expect(new FormData(container.querySelector("form")!).getAll("asOfDate")).toEqual(["2026-01-01"]);
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

// 以前は type="number" で、カンマが出ず（12345678 の桁が読めない）スピナーも付いていた。
describe("税金・費用の入力", () => {
  const forecastSnapshot = { ...snapshot, successionCosts: 3000000, inheritanceTaxUpdatedAt: null } as unknown as Snapshot;
  it("金額をカンマ表示し、全角の数字も受け付け、送る値はそのまま3つそろう", () => {
    const { container } = render(<ForecastModal snapshot={forecastSnapshot} onClose={vi.fn()} onSubmit={vi.fn()} saving={false} />);
    const tax = screen.getByLabelText("想定相続税（円）") as HTMLInputElement;
    expect(tax.type).toBe("text");
    expect(tax.value).toBe("12,345,678");
    expect((screen.getByLabelText("その他税金（円）") as HTMLInputElement).value).toBe("987,654");
    expect((screen.getByLabelText("承継関連費用（円）") as HTMLInputElement).value).toBe("3,000,000");
    fireEvent.change(tax, { target: { value: "１２３４５" } });
    expect(tax.value).toBe("12,345");
    expect(document.activeElement).toBe(tax);
    expect(container.querySelectorAll('input[type="number"]')).toHaveLength(0);
  });
});

describe("為替レートの入力", () => {
  it("カンマ表示・小数6桁まで。0 は受け付けない", () => {
    render(<SnapshotSettingsModal snapshot={{ ...snapshot, fxRates: { USD: 1500.123456 } }} fxOnly onClose={vi.fn()} onSubmit={vi.fn()} saving={false} />);
    const usd = screen.getByLabelText("USD") as HTMLInputElement;
    expect(usd.type).toBe("text");
    expect(usd.value).toBe("1,500.123456");
    fireEvent.change(usd, { target: { value: "0" } });
    expect(usd.validationMessage).toBe("0より大きい数値を入力してください。");
  });
});
