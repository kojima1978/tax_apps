// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { type FormEvent } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PositionModal } from "@/components/position-modal";

afterEach(cleanup);

function renderModal(onClose: () => void = () => {}) {
  const submitted: Array<Record<string, FormDataEntryValue>> = [];
  const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitted.push(Object.fromEntries(new FormData(event.currentTarget).entries()));
  });
  const { container } = render(<PositionModal position={null} people={[]} legalHeirNames={new Set()} fxRates={{} as never} onClose={onClose} onSubmit={onSubmit} saving={false} />);
  const form = container.querySelector("form")!;
  return {
    form, submitted, container,
    summary: () => container.querySelector(".position-modal-summary strong")?.textContent,
    submitButton: () => screen.getByRole("button", { name: "登録する" }) as HTMLButtonElement,
  };
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

  it("建物では床面積を入力でき、評価額の計算には使わない", () => {
    const { form, submitted, summary } = renderModal();
    fireEvent.change(screen.getByLabelText("中分類"), { target: { value: "不動産" } });
    fireEvent.change(screen.getByLabelText("資産区分"), { target: { value: "BUILDING" } });
    typeIn("床面積（㎡）", "120.5");
    typeIn("固定資産税評価額（円）", "8000000");
    typeIn("倍率", "1.1");
    typeIn("調整率", "1.0");
    expect(summary()).toBe("8,800,000 円");
    fireEvent.submit(form);
    expect(submitted[0]).toMatchObject({ "assetDetail.floorArea": "120.5", valuationFormula: "BUILDING" });
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

describe("PositionModal（切り替えたときに残る値）", () => {
  it("外貨を選んだあと区分を切り替えると円に戻る", () => {
    const { form, summary } = renderModal();
    fireEvent.change(screen.getByLabelText("通貨"), { target: { value: "USD" } });
    typeIn("残高（USD）", "1000");
    expect(summary()).toBe("1,000 USD");
    // 負債の部に通貨欄は無い（円建てのみ）。以前は currency の state が USD のまま残り、
    // 見出しも操作行も USD と出したまま JPY で保存されていた。
    fireEvent.click(screen.getByLabelText("負債の部"));
    expect(screen.queryByLabelText("通貨")).toBeNull();
    expect(form.querySelector<HTMLInputElement>('input[name="currency"]')!.value).toBe("JPY");
    expect(screen.getByLabelText("借入残高（円）")).toBeTruthy();
  });

  it("科目を変えると算式の入力値を持ち越さない", () => {
    const { summary } = renderModal();
    fireEvent.change(screen.getByLabelText("中分類"), { target: { value: "事業用資産" } });
    typeIn("単価（円）", "1000");
    typeIn("株数・口数", "10");
    typeIn("調整率", "0.5");
    expect(summary()).toBe("5,000 円");
    // 自社株の単価がそのまま事業用資産の「簿価」に入ると、気づかないまま誤った評価額で進む。
    fireEvent.change(screen.getByLabelText("科目"), { target: { value: "BUSINESS_ASSETS" } });
    fireEvent.change(screen.getByLabelText("評価額の計算方法"), { target: { value: "UNIT_RATE" } });
    expect(screen.getByLabelText("簿価（円）")).toHaveProperty("value", "");
    expect(screen.getByLabelText("調整率")).toHaveProperty("value", "1.0");
    expect(summary()).toBe("未入力");
  });
});

describe("PositionModal（受取人ごとの分数）", () => {
  const addRecipient = () => {
    fireEvent.change(screen.getByLabelText("科目"), { target: { value: "INSURANCE" } });
    fireEvent.click(screen.getByRole("button", { name: "受取人を追加" }));
  };

  it("合計が1でない間は登録できず、1に戻すと押せる", () => {
    const { submitButton } = renderModal();
    addRecipient();
    expect(submitButton().disabled).toBe(false);
    fireEvent.change(screen.getByLabelText("受取人1の分子"), { target: { value: "2" } });
    expect(screen.getByText(/分数の合計が 3\/2 です/)).toBeTruthy();
    expect(submitButton().disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("受取人1の分子"), { target: { value: "1" } });
    expect(submitButton().disabled).toBe(false);
  });

  it("受取人欄が消える科目へ変えたら登録ボタンを戻す", () => {
    const { submitButton } = renderModal();
    addRecipient();
    fireEvent.change(screen.getByLabelText("受取人1の分子"), { target: { value: "2" } });
    expect(submitButton().disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("科目"), { target: { value: "DEPOSIT" } });
    expect(submitButton().disabled).toBe(false);
  });
});

describe("PositionModal（モーダルの作法）", () => {
  it("開いたらフォーカスをモーダルの中へ移す", () => {
    const { container } = renderModal();
    expect(document.activeElement).toBe(container.querySelector(".position-modal"));
  });

  it("Escape で閉じる", () => {
    const onClose = vi.fn();
    const { container } = renderModal(onClose);
    fireEvent.keyDown(container.querySelector(".modal-layer")!, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
