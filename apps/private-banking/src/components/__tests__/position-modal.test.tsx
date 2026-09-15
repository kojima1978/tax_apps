// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { type FormEvent } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PositionModal } from "@/components/position-modal";

afterEach(cleanup);

function renderModal() {
  const submitted: Array<Record<string, FormDataEntryValue>> = [];
  const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitted.push(Object.fromEntries(new FormData(event.currentTarget).entries()));
  });
  const { container } = render(<PositionModal position={null} people={[]} legalHeirNames={new Set()} fxRates={{} as never} onClose={() => {}} onSubmit={onSubmit} saving={false} />);
  const form = container.querySelector("form")!;
  return { form, submitted, summary: () => container.querySelector(".position-modal-summary strong")?.textContent };
}

const typeIn = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe("PositionModal（明細を追加）", () => {
  it("直接入力の金額を操作行に表示し、単位つきの見出しで入力できる", () => {
    const { form, submitted, summary } = renderModal();
    expect(summary()).toBe("未入力");
    typeIn("残高（円）", "1234567");
    expect(summary()).toBe("1,234,567 円");
    fireEvent.submit(form);
    expect(submitted[0]).toMatchObject({ originalAmount: "1,234,567", valuationFormula: "MANUAL" });
  });

  it("算式で計算するときは読み取り専用の金額欄を出さず、計算結果をそのまま送る", () => {
    const { form, submitted, summary } = renderModal();
    fireEvent.change(screen.getByLabelText("中分類"), { target: { value: "不動産" } });
    expect(screen.queryByLabelText(/^評価額（/)).toBeNull();
    expect(summary()).toBe("未入力");
    typeIn("面積（㎡）", "180");
    typeIn("路線価（円/㎡）", "600000");
    typeIn("調整率", "0.8");
    expect(summary()).toBe("86,400,000 円");
    fireEvent.submit(form);
    expect(submitted[0]).toMatchObject({ originalAmount: "86400000", valuationFormula: "LAND_ROADSIDE" });
  });

  it("算式が使う値が未入力なら、その入力欄へ移るボタンを出す", () => {
    renderModal();
    fireEvent.change(screen.getByLabelText("中分類"), { target: { value: "不動産" } });
    const landArea = screen.getByLabelText("面積（㎡）");
    landArea.scrollIntoView = vi.fn();
    fireEvent.click(screen.getByRole("button", { name: "未入力（入力する）" }));
    expect(document.activeElement).toBe(landArea);
    typeIn("面積（㎡）", "100");
    expect(screen.queryByRole("button", { name: "未入力（入力する）" })).toBeNull();
  });
});
