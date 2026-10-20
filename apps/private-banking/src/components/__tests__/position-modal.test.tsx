// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { type FormEvent } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PositionModal } from "@/components/position-modal";
import { assetCategories, liabilityCategories, type PositionSection } from "@/lib/portfolio-view";

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
  it("物件の名称と所在地を等幅2列用の通常幅で表示し、入力内容を保持する", () => {
    const { container, form, submitted } = renderModal();
    fireEvent.change(screen.getByLabelText("中分類"), { target: { value: "不動産" } });
    const grid = container.querySelector(".position-identity-grid")!;
    expect(grid.querySelectorAll("label").length).toBe(2);
    expect(grid.querySelector(".position-field-wide")).toBeNull();
    typeIn("名称", "自宅マンション");
    typeIn("所在地", "東京都港区南青山1-2-3 ○○マンション101号室");
    fireEvent.change(screen.getByLabelText("資産区分"), { target: { value: "BUILDING" } });
    fireEvent.submit(form);
    expect(submitted[0]).toMatchObject({ name: "自宅マンション", "assetDetail.propertyAddress": "東京都港区南青山1-2-3 ○○マンション101号室" });
    expect(grid.querySelector(".position-field-wide")).toBeNull();
  });
  it.each(["LAND_ROADSIDE", "LAND_MULTIPLIER", "BUILDING"])("%sの評価方式・単価または倍率・調整率を同じ行にまとめる", (method) => {
    const { container, form, submitted } = renderModal();
    fireEvent.change(screen.getByLabelText("中分類"), { target: { value: "不動産" } });
    if (method === "BUILDING") fireEvent.change(screen.getByLabelText("資産区分"), { target: { value: "BUILDING" } });
    else fireEvent.change(screen.getByLabelText("評価額の計算方法"), { target: { value: method } });
    const row = container.querySelector(".property-method-row")!;
    expect(row.children.length).toBe(3);
    expect(row.children[0].contains(screen.getByLabelText("評価額の計算方法"))).toBe(true);
    const baseLabel = method === "LAND_ROADSIDE" ? "路線価（円/㎡）" : "倍率";
    expect(row.children[1].contains(screen.getByLabelText(baseLabel))).toBe(true);
    expect(row.children[2].contains(screen.getByLabelText("調整率"))).toBe(true);
    typeIn(baseLabel, "2");
    typeIn("調整率", "0.8");
    fireEvent.submit(form);
    expect(submitted[0]).toMatchObject({ valuationFormula: method, adjustmentRate: "0.8" });
    expect(form.querySelectorAll('[name="valuationFormula"]').length).toBe(1);
    fireEvent.change(screen.getByLabelText("評価額の計算方法"), { target: { value: "MANUAL" } });
    expect(container.querySelector(".property-method-row")?.children.length).toBe(1);
    expect(screen.queryByLabelText("調整率")).toBeNull();
  });
  it("土地の固定資産税評価額・持分・小規模宅地を同じ行にまとめ、建物では特例欄を出さない", () => {
    const { container, form, submitted } = renderModal();
    fireEvent.change(screen.getByLabelText("中分類"), { target: { value: "不動産" } });
    const row = container.querySelector(".land-valuation-conditions")!;
    expect(row.children.length).toBe(3);
    expect(row.children[0].contains(screen.getByLabelText("固定資産税評価額（円）"))).toBe(true);
    expect(row.children[1]).toBe(screen.getByRole("group", { name: "持分" }));
    expect(row.children[2].querySelector('[name="assetDetail.smallLotType"]')).not.toBeNull();
    typeIn("固定資産税評価額（円）", "12345678");
    typeIn("持分の分子", "1");
    typeIn("持分の分母", "2");
    fireEvent.submit(form);
    expect(submitted[0]).toMatchObject({ fixedAssetTaxValue: "12,345,678", ownershipNumerator: "1", ownershipDenominator: "2" });
    fireEvent.change(screen.getByLabelText("資産区分"), { target: { value: "BUILDING" } });
    expect(container.querySelector(".building-position-modal")).not.toBeNull();
    expect(container.querySelector(".land-valuation-conditions")).toBeNull();
    expect(container.querySelector(".property-valuation-conditions")?.children.length).toBe(2);
    expect(container.querySelector('[name="assetDetail.smallLotType"]')).toBeNull();
    fireEvent.change(screen.getByLabelText("資産区分"), { target: { value: "LAND" } });
    expect(container.querySelector(".building-position-modal")).toBeNull();
  });
  it.each([...assetCategories.map((category) => [category, "ASSET"] as const), ...liabilityCategories.map((category) => [category, "LIABILITY"] as const), ["GUARANTEE", "CONTINGENT"] as const])("%sの配置を変更しても科目・通貨・金額を一度だけ送信する", (category, section) => {
    const submitted: Array<Record<string, FormDataEntryValue>> = [];
    const { container } = render(<PositionModal position={null} defaultCategory={category} defaultSection={section as PositionSection} people={[]} legalHeirNames={new Set()} fxRates={{ USD: 150 }} onClose={vi.fn()} onSubmit={(event) => { event.preventDefault(); submitted.push(Object.fromEntries(new FormData(event.currentTarget))); }} saving={false} />);
    const form = container.querySelector("form")!;
    for (const name of ["category", "currency", "name", "originalAmount", "valuationFormula", "allocationsJson"]) {
      expect(form.querySelectorAll(`[name="${name}"]`).length).toBe(1);
    }
    fireEvent.submit(form);
    expect(submitted[0]).toMatchObject({ category, currency: "JPY", entrySection: section });
  });
  it.each(["DEPOSIT", "BUSINESS_ASSETS"])("%sの通貨欄を基本情報に配置し、評価方法を変えても値を保持する", (category) => {
    const { container } = render(<PositionModal position={null} defaultCategory={category} people={[]} legalHeirNames={new Set()} fxRates={{ USD: 150 }} onClose={vi.fn()} onSubmit={vi.fn()} saving={false} />);
    fireEvent.change(screen.getByLabelText("通貨"), { target: { value: "USD" } });
    expect(container.querySelector(".position-identity-grid")?.contains(screen.getByLabelText("通貨"))).toBe(true);
    if (category === "BUSINESS_ASSETS") fireEvent.change(screen.getByLabelText("評価額の計算方法"), { target: { value: "UNIT_RATE" } });
    expect((screen.getByLabelText("通貨") as HTMLSelectElement).value).toBe("USD");
    expect(container.querySelectorAll('[name="currency"]').length).toBe(1);
  });
  it("通貨ラベルの隣に為替設定リンクを置き、通貨選択の下に適用レートを表示する", () => {
    const onOpenFxSettings = vi.fn();
    const { container } = render(<PositionModal position={null} defaultCategory="INSURANCE" people={[]} legalHeirNames={new Set()} fxRates={{ USD: 150 }} onClose={vi.fn()} onSubmit={vi.fn()} saving={false} onOpenFxSettings={onOpenFxSettings} />);
    const heading = container.querySelector(".valuation-currency-heading")!;
    const link = screen.getByRole("button", { name: "為替レート設定へ" });
    expect(heading.contains(link)).toBe(true);
    expect(heading.querySelector("label")?.textContent).toBe("通貨");
    fireEvent.change(screen.getByLabelText("通貨"), { target: { value: "USD" } });
    expect(screen.getByText("円換算レート 1 USD = 150 円").previousElementSibling).toBe(screen.getByLabelText("通貨"));
    fireEvent.click(link);
    expect(onOpenFxSettings).toHaveBeenCalledOnce();
  });
  it("外貨の解約返戻金の横に円評価額を表示し、円建てでは重複表示しない", () => {
    const { container } = render(<PositionModal position={null} defaultCategory="INSURANCE" people={[]} legalHeirNames={new Set()} fxRates={{ USD: 150 }} onClose={vi.fn()} onSubmit={vi.fn()} saving={false} />);
    expect(container.querySelector(".valuation-converted-field")).toBeNull();
    fireEvent.change(screen.getByLabelText("通貨"), { target: { value: "USD" } });
    typeIn("解約返戻金（USD）", "10000.5");
    expect(container.querySelector(".valuation-converted-field output")?.textContent).toBe("1,500,075");
    expect(container.querySelector(".valuation-manual-grid")?.contains(container.querySelector(".valuation-converted-field"))).toBe(true);
    expect(container.querySelector(".position-modal-summary small")).toBeNull();
    fireEvent.change(screen.getByLabelText("通貨"), { target: { value: "JPY" } });
    expect(container.querySelector(".valuation-converted-field")).toBeNull();
  });
  it("有価証券の通貨を銘柄情報にまとめ、計算方法を変えても一つの通貨欄と金額を送る", () => {
    const submitted: Array<Record<string, FormDataEntryValue>> = [];
    const { container } = render(<PositionModal position={null} defaultCategory="SECURITIES" people={[]} legalHeirNames={new Set()} fxRates={{ USD: 150 }} onClose={vi.fn()} onSubmit={(event) => { event.preventDefault(); submitted.push(Object.fromEntries(new FormData(event.currentTarget))); }} saving={false} />);
    expect(container.querySelector(".position-identity-grid")?.contains(screen.getByLabelText("通貨"))).toBe(true);
    expect(screen.getByLabelText("銘柄名").closest("label")?.classList.contains("position-field-wide")).toBe(false);
    typeIn("単価（円）", "2500");
    typeIn("株数・口数", "100");
    expect(container.querySelectorAll(".valuation-result").length).toBe(1);
    expect(screen.getByRole("status", { name: "算式による評価額（円）" }).textContent).toBe("250,000");
    expect(container.querySelector(".stock-formula .valuation-result output")?.getAttribute("name")).toBeNull();
    fireEvent.submit(container.querySelector("form")!);
    expect(submitted[0]).toMatchObject({ currency: "JPY", originalAmount: "250000", valuationFormula: "STOCK" });
    fireEvent.change(screen.getByLabelText("通貨"), { target: { value: "USD" } });
    fireEvent.change(screen.getByLabelText("評価額の計算方法"), { target: { value: "MANUAL" } });
    typeIn("評価額（USD）", "5000");
    expect(container.querySelectorAll('[name="currency"]').length).toBe(1);
    fireEvent.submit(container.querySelector("form")!);
    expect(submitted[1]).toMatchObject({ currency: "USD", originalAmount: "5,000", valuationFormula: "MANUAL" });
  });
  it("死亡保険金と受取人を別の列としてまとめ、外貨換算は金額側に表示する", () => {
    const { container } = render(<PositionModal position={null} defaultCategory="INSURANCE" people={["配偶者", "子"]} legalHeirNames={new Set(["配偶者", "子"])} fxRates={{ USD: 150 }} onClose={vi.fn()} onSubmit={vi.fn()} saving={false} />);
    fireEvent.change(screen.getByLabelText("通貨"), { target: { value: "USD" } });
    typeIn("死亡保険金（USD）", "100000");
    const amountColumn = container.querySelector(".benefit-amount-field")!;
    const recipientsColumn = screen.getByRole("group", { name: "死亡保険金の受取人" });
    expect(amountColumn.parentElement).toBe(recipientsColumn.parentElement);
    expect(amountColumn.contains(screen.getByText(/死亡保険金の円換算額/))).toBe(true);
    expect(recipientsColumn.contains(screen.getByLabelText("受取人"))).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "受取人を追加" }));
    expect(recipientsColumn.contains(screen.getByLabelText("受取人2"))).toBe(true);
    expect(recipientsColumn.contains(screen.getByLabelText("受取人1の分母"))).toBe(true);
  });
  it.each(["USD", "EUR"])("保険金と返戻金を%sで入力し、円換算を別表示する", (currency) => {
    const submitted: Array<Record<string, FormDataEntryValue>> = [];
    const { container } = render(<PositionModal position={null} defaultCategory="INSURANCE" people={[]} legalHeirNames={new Set()} fxRates={{ USD: 150, EUR: 165 }} onClose={vi.fn()} saving={false} onSubmit={(e) => { e.preventDefault(); submitted.push(Object.fromEntries(new FormData(e.currentTarget))); }} />);
    fireEvent.change(screen.getByLabelText("通貨"), { target: { value: currency } });
    typeIn(`死亡保険金（${currency}）`, "100000.25");
    typeIn(`解約返戻金（${currency}）`, "10000.50");
    expect(screen.getByText(/死亡保険金の円換算額/).textContent).toContain(currency === "USD" ? "15,000,038円" : "16,500,041円");
    fireEvent.submit(container.querySelector("form")!);
    expect(submitted[0]).toMatchObject({ currency, "assetDetail.deathBenefit": "100,000.25", originalAmount: "10,000.50" });
    expect(screen.queryByLabelText("死亡保険金（円）")).toBeNull();
  });
  it("外貨対応明細から為替設定を開いても入力内容を保持する", () => {
    const onOpenFxSettings = vi.fn();
    render(<PositionModal position={null} people={[]} legalHeirNames={new Set()} fxRates={{}} onClose={vi.fn()} onSubmit={vi.fn()} saving={false} onOpenFxSettings={onOpenFxSettings} />);
    typeIn("名称", "入力中の外貨預金");
    fireEvent.change(screen.getByLabelText("通貨"), { target: { value: "USD" } });
    fireEvent.click(screen.getByRole("button", { name: "為替レート設定へ" }));
    expect(onOpenFxSettings).toHaveBeenCalledOnce();
    expect((screen.getByLabelText("名称") as HTMLInputElement).value).toBe("入力中の外貨預金");
  });
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

  it("不動産の算式・参照情報・結果欄を重複表示せず、切り捨てた評価額を操作行と保存値に反映する", () => {
    const { container, form, submitted, summary } = renderModal();
    fireEvent.change(screen.getByLabelText("中分類"), { target: { value: "不動産" } });
    expect(container.querySelector(".valuation-formula-expression")).toBeNull();
    expect(container.querySelector(".valuation-source-summary")).toBeNull();
    expect(container.querySelector(".valuation-result")).toBeNull();
    expect(screen.queryByText("不動産の情報から使用")).toBeNull();
    typeIn("面積（㎡）", "100.5");
    typeIn("路線価（円/㎡）", "1001");
    typeIn("持分の分子", "1");
    typeIn("持分の分母", "3");
    expect(summary()).toBe("33,533 円");
    fireEvent.submit(form);
    expect(submitted[0].originalAmount).toBe("33533");
  });

  it("貸付金の返済期限・利率・担保を登録できる", () => {
    const { form, submitted } = renderModal();
    fireEvent.change(screen.getByLabelText("中分類"), { target: { value: "事業用資産" } });
    fireEvent.change(screen.getByLabelText("科目"), { target: { value: "LOAN_RECEIVABLE" } });
    typeIn("返済期限", "2030-03-31");
    typeIn("利率（年％）", "1.5");
    typeIn("担保", "対象不動産");
    fireEvent.submit(form);
    expect(submitted[0]).toMatchObject({
      "assetDetail.repaymentDueDate": "2030-03-31",
      "assetDetail.interestRate": "1.5",
      "assetDetail.collateral": "対象不動産",
    });
  });

  it("負債・偶発債務は科目に応じた補足項目を表示する", () => {
    renderModal();
    fireEvent.click(screen.getByLabelText("負債の部"));
    expect(screen.getByLabelText("返済期限")).toBeTruthy();
    expect(screen.getByLabelText("利率（年％）")).toBeTruthy();
    expect(screen.getByLabelText("担保")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("科目"), { target: { value: "LEASE_OBLIGATION" } });
    expect(screen.getByLabelText("契約終了日")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("科目"), { target: { value: "ACCOUNTS_PAYABLE" } });
    expect(screen.getByLabelText("支払期限")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("科目"), { target: { value: "DEPOSITS_RECEIVED" } });
    expect(screen.getByLabelText("対象物件")).toBeTruthy();
    expect(screen.getByLabelText("返還条件")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("偶発債務の部"));
    expect(screen.getByLabelText("主債務者")).toBeTruthy();
    expect(screen.getByLabelText("保証期限")).toBeTruthy();
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
