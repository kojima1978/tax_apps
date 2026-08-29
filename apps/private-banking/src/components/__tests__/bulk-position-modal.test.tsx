// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BulkPositionModal } from "@/components/bulk-position-modal";
import { type BulkPositionPayload, type Position, type Snapshot } from "@/lib/portfolio-view";

afterEach(cleanup);

const position = (overrides: Partial<Position>): Position => ({
  id: 1, side: "ASSET", category: "DEPOSIT", name: "", institution: "", currency: "JPY",
  originalAmount: 0, fxRate: 1, valueJpy: 0, liquidity: "HIGH", includedInNetWorth: true,
  valuationMethod: "", valuationFormula: "MANUAL", valuationQuantity: null, valuationUnitPrice: null,
  adjustmentRate: null, landArea: null, roadsideValue: null, fixedAssetTaxValue: null, valuationMultiplier: null,
  ownershipShare: null, ownershipNumerator: null, ownershipDenominator: null, assetDetails: null, note: "",
  ...overrides,
});

const snapshotOf = (positions: Position[]): Snapshot => ({
  id: 1, label: "現在", asOfDate: "2026-08-29", fiscalYear: 2026, isCurrent: true,
  estimatedInheritanceTax: 0, inheritanceTaxCalculation: null, otherTaxes: 0,
  fxRates: {} as Snapshot["fxRates"], updatedAt: "2026-08-29T00:00:00.000Z", positions,
});

function renderModal(positions: Position[] = []) {
  const onSubmit = vi.fn<(payloads: BulkPositionPayload[]) => Promise<boolean>>(async () => true);
  render(<BulkPositionModal snapshot={snapshotOf(positions)} onClose={() => {}} onSubmit={onSubmit} saving={false} />);
  return onSubmit;
}

/** 保存時に渡された内容。BulkPositionPayload は Record<string, unknown> なので、読むときだけ形を付ける。 */
const savedPayloads = (onSubmit: ReturnType<typeof renderModal>) =>
  (onSubmit.mock.calls[0]?.[0] ?? []) as Array<{ id: number | null; data: Record<string, unknown> }>;

/** 種類の切替。select は登録件数付きのラベルなので value で選ぶ。 */
const selectEntryType = (value: string) => fireEvent.change(screen.getByLabelText(/編集・追加する種類/), { target: { value } });
const cell = (rowIndex: number, label: string) => screen.getByLabelText(`${rowIndex}行目 ${label}`) as HTMLInputElement;
const typeIn = (rowIndex: number, label: string, value: string) => fireEvent.change(cell(rowIndex, label), { target: { value } });
const save = () => fireEvent.click(screen.getByText("変更をまとめて保存"));

describe("BulkPositionModal（生命保険・退職金・貸付金）", () => {
  it("生命保険では保険向けの列だけを出し、算式や不動産の列は出さない", () => {
    renderModal();
    selectEntryType("INSURANCE");
    for (const label of ["保険会社", "証券番号", "被保険者", "解約返戻金（円）", "死亡保険金（円）", "受取人"]) {
      expect(screen.getByLabelText(`1行目 ${label}`)).toBeTruthy();
    }
    expect(screen.queryByLabelText("1行目 方式")).toBeNull();
    expect(screen.queryByLabelText("1行目 所在地")).toBeNull();
  });

  it("退職金・貸付金は科目ごとに列と必須項目が変わる", () => {
    renderModal();
    selectEntryType("RETIREMENT_ALLOWANCE");
    expect(screen.getByLabelText("1行目 制度名・契約名")).toBeTruthy();
    expect(screen.getByLabelText("1行目 死亡退職金（円）")).toBeTruthy();
    selectEntryType("LOAN_RECEIVABLE");
    expect(screen.getByLabelText("1行目 貸付先")).toBeTruthy();
    expect(screen.getByLabelText("1行目 貸付金残高（円）")).toBeTruthy();
    // 貸付金は死亡給付金の概念が無いので受取人欄も出さない。
    expect(screen.queryByLabelText("1行目 受取人")).toBeNull();
  });

  it("登録済みの生命保険を行として読み込み、保険会社名と解約返戻金を表示する", () => {
    renderModal([position({
      id: 5, category: "INSURANCE", name: "○○生命", institution: "○○生命", originalAmount: 3_000_000, valueJpy: 3_000_000,
      assetDetails: { policyNumber: "P-1", insuredPerson: "本人", beneficiary: "配偶者", deathBenefit: 20_000_000 },
    })]);
    selectEntryType("INSURANCE");
    expect(cell(1, "保険会社").value).toBe("○○生命");
    expect(cell(1, "証券番号").value).toBe("P-1");
    expect(cell(1, "死亡保険金（円）").value).toBe("20,000,000");
    expect(screen.getAllByText("登録済").length).toBe(1);
  });

  it("受取人を按分している保険は表に出さず、個別モーダルに任せる", () => {
    renderModal([position({
      id: 6, category: "INSURANCE", name: "△△生命", institution: "△△生命", originalAmount: 1_000_000, valueJpy: 1_000_000,
      assetDetails: { deathBenefit: 10_000_000, benefitAllocations: [{ recipient: "長男", numerator: 1, denominator: 2 }] },
    })]);
    selectEntryType("INSURANCE");
    expect(screen.queryByText("登録済")).toBeNull();
    expect(cell(1, "保険会社").value).toBe("");
  });

  it("必須が欠けている行はエラーを出し、保存しない", async () => {
    const onSubmit = renderModal();
    selectEntryType("LOAN_RECEIVABLE");
    typeIn(1, "貸付先", "取引先A");
    save();
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("入力エラー"));
    // 不足項目は「直接入力額」ではなく、画面に出ている列名で伝える。
    expect(screen.getByText("名称・貸付金残高（円）を入力してください。")).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("生命保険を保存すると、保険会社名を名称にして assetDetails へ証券番号等を入れる", async () => {
    const onSubmit = renderModal();
    selectEntryType("INSURANCE");
    typeIn(1, "保険会社", "□□生命");
    typeIn(1, "証券番号", "P-9");
    typeIn(1, "被保険者", "本人");
    typeIn(1, "解約返戻金（円）", "4,000,000");
    typeIn(1, "死亡保険金（円）", "30,000,000");
    typeIn(1, "受取人", "配偶者");
    save();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(savedPayloads(onSubmit)).toEqual([{
      id: null,
      data: expect.objectContaining({
        side: "ASSET", category: "INSURANCE", name: "□□生命", institution: "□□生命",
        currency: "JPY", originalAmount: 4_000_000, fxRate: 1, valuationFormula: "MANUAL",
        assetDetails: { policyNumber: "P-9", insuredPerson: "本人", beneficiary: "配偶者", deathBenefit: 30_000_000 },
      }),
    }]);
  });

  it("退職金は制度名を名称にし、死亡退職金を assetDetails へ入れる", async () => {
    const onSubmit = renderModal();
    selectEntryType("RETIREMENT_ALLOWANCE");
    typeIn(1, "制度名・契約名", "役員退職慰労金");
    typeIn(1, "支給元・勤務先", "株式会社A");
    typeIn(1, "解約手当金（円）", "2,000,000");
    typeIn(1, "死亡退職金（円）", "15,000,000");
    typeIn(1, "受取人", "配偶者");
    save();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(savedPayloads(onSubmit)[0]?.data).toEqual(expect.objectContaining({
      category: "RETIREMENT_ALLOWANCE", name: "役員退職慰労金", institution: "株式会社A", originalAmount: 2_000_000,
      assetDetails: { retirementRecipient: "配偶者", retirementAllowance: 15_000_000 },
    }));
  });

  it("貸付金は残高をそのまま評価額にする", async () => {
    const onSubmit = renderModal();
    selectEntryType("LOAN_RECEIVABLE");
    typeIn(1, "名称", "役員貸付金");
    typeIn(1, "貸付金残高（円）", "8,000,000");
    save();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(savedPayloads(onSubmit)[0]?.data).toEqual(expect.objectContaining({
      category: "LOAN_RECEIVABLE", name: "役員貸付金", originalAmount: 8_000_000,
      valuationMethod: "直接入力", assetDetails: {},
    }));
  });

  it("種類をまたいで入力した行をまとめて保存する", async () => {
    const onSubmit = renderModal();
    selectEntryType("INSURANCE");
    typeIn(1, "保険会社", "◇◇生命");
    typeIn(1, "解約返戻金（円）", "1,000,000");
    selectEntryType("LOAN_RECEIVABLE");
    typeIn(1, "名称", "貸付金");
    typeIn(1, "貸付金残高（円）", "500,000");
    save();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(savedPayloads(onSubmit).map((payload) => payload.data.category)).toEqual(["INSURANCE", "LOAN_RECEIVABLE"]);
  });
});
