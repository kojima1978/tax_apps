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

/** 親族関係タブの登録者。配偶者と長男が法定相続人、本人（被相続人）と兄は違う。 */
const people = ["本人", "配偶者", "長男", "兄"];
const heirs: ReadonlySet<string> = new Set(["配偶者", "長男"]);

function renderModal(positions: Position[] = [], peopleNames: string[] = people, legalHeirNames: ReadonlySet<string> = heirs) {
  const onSubmit = vi.fn<(payloads: BulkPositionPayload[]) => Promise<boolean>>(async () => true);
  render(<BulkPositionModal snapshot={snapshotOf(positions)} people={peopleNames} legalHeirNames={legalHeirNames} onClose={() => {}} onSubmit={onSubmit} saving={false} />);
  return onSubmit;
}

/** 保存時に渡された内容。BulkPositionPayload は Record<string, unknown> なので、読むときだけ形を付ける。 */
const savedPayloads = (onSubmit: ReturnType<typeof renderModal>) =>
  (onSubmit.mock.calls[0]?.[0] ?? []) as Array<{ id: number | null; data: Record<string, unknown> }>;

/** 種類の切替。タブのラベルは件数や状態が続くので、種類名＋区切りの「・」までの前方一致で選ぶ。 */
const entryTypeLabels: Record<string, string> = {
  DEPOSIT: "現金・預貯金", SECURITIES: "有価証券", INSURANCE: "生命保険", INSURANCE_RIGHTS: "生命保険契約に関する権利", RETIREMENT_ALLOWANCE: "退職金",
  LAND: "土地", BUILDING: "建物", PRIVATE_SHARES: "自社株", LOAN_RECEIVABLE: "貸付金",
};
// 「生命保険」は「生命保険契約に関する権利」の前方一致でもあるので、区切りまで含めて突き合わせる。
const entryTab = (value: string) => screen.getByRole("tab", { name: new RegExp(`^${entryTypeLabels[value]}・`) });
const selectEntryType = (value: string) => fireEvent.click(entryTab(value));
const cell = (rowIndex: number, label: string) => screen.getByLabelText(`${rowIndex}行目 ${label}`) as HTMLInputElement;
const typeIn = (rowIndex: number, label: string, value: string) => fireEvent.change(cell(rowIndex, label), { target: { value } });
const save = () => fireEvent.click(screen.getByText("変更をまとめて保存"));

describe("BulkPositionModal（種類タブ）", () => {
  it("タブを明細一覧と同じ中分類順に並べ、登録済み件数を出す", () => {
    renderModal([position({ id: 5, category: "INSURANCE", name: "○○生命", institution: "○○生命", originalAmount: 1_000_000, valueJpy: 1_000_000 })]);
    expect(screen.getAllByRole("tab").map((tab) => tab.getAttribute("aria-label"))).toEqual([
      "現金・預貯金・登録済み0件", "有価証券・登録済み0件", "生命保険・登録済み1件", "生命保険契約に関する権利・登録済み0件", "退職金・登録済み0件",
      "土地・登録済み0件", "建物・登録済み0件", "自社株・登録済み0件", "貸付金・登録済み0件",
    ]);
    // 登録済みのある種類を最初に開く。
    expect(entryTab("INSURANCE").getAttribute("aria-selected")).toBe("true");
  });

  it("表示していない種類に未保存の入力があると、その種類のタブに印を付ける", () => {
    renderModal();
    selectEntryType("INSURANCE");
    typeIn(1, "保険会社", "◇◇生命");
    selectEntryType("LOAN_RECEIVABLE");
    expect(entryTab("INSURANCE").getAttribute("aria-label")).toBe("生命保険・登録済み0件・未保存の編集1件");
  });

  it("←→ で隣の種類へ移動する", () => {
    renderModal();
    selectEntryType("SECURITIES");
    fireEvent.keyDown(screen.getByRole("tablist"), { key: "ArrowRight" });
    expect(entryTab("INSURANCE").getAttribute("aria-selected")).toBe("true");
  });
});

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

  it("受取人を複数に按分している保険は表に出さず、個別モーダルに任せる", () => {
    renderModal([position({
      id: 6, category: "INSURANCE", name: "△△生命", institution: "△△生命", originalAmount: 1_000_000, valueJpy: 1_000_000,
      assetDetails: { deathBenefit: 10_000_000, benefitAllocations: [{ recipient: "長男", numerator: 1, denominator: 2 }, { recipient: "配偶者", numerator: 1, denominator: 2 }] },
    })]);
    selectEntryType("INSURANCE");
    expect(screen.queryByText("登録済")).toBeNull();
    expect(cell(1, "保険会社").value).toBe("");
  });

  it("受取人が1人なら按分の配列があっても表に出し、直したら配列も書き換える", async () => {
    // 個別モーダルは受取人が1人でも必ず 1/1 の配列を書く。以前は1件でも配列があれば除いていたため、
    // 画面から登録した生命保険・退職金がすべて表から漏れていた。
    const onSubmit = renderModal([position({
      id: 6, category: "INSURANCE", name: "△△生命", institution: "△△生命", originalAmount: 1_000_000, valueJpy: 1_000_000,
      assetDetails: { beneficiary: "長男", deathBenefit: 10_000_000, benefitAllocations: [{ recipient: "長男", numerator: 1, denominator: 1 }] },
    })]);
    selectEntryType("INSURANCE");
    expect(cell(1, "受取人").value).toBe("長男");
    fireEvent.change(cell(1, "受取人"), { target: { value: "配偶者" } });
    save();
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(savedPayloads(onSubmit)[0].data.assetDetails).toMatchObject({
      beneficiary: "配偶者", benefitAllocations: [{ recipient: "配偶者", numerator: 1, denominator: 1 }],
    });
  });

  it("必須が欠けている行はエラーを出し、保存しない", async () => {
    const onSubmit = renderModal();
    selectEntryType("LOAN_RECEIVABLE");
    typeIn(1, "貸付先", "取引先A");
    save();
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("入力エラー"));
    // 不足項目は「直接入力額」ではなく、画面に出ている列名で伝える。
    expect(screen.getByText("名称・貸付金残高（円）を入力してください。")).toBeTruthy();
    // どの種類でエラーが出たかはタブでも分かるようにする。
    expect(entryTab("LOAN_RECEIVABLE").getAttribute("aria-label")).toContain("入力エラー1件");
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
        assetDetails: { policyNumber: "P-9", insuredPerson: "本人", beneficiary: "配偶者", deathBenefit: 30_000_000, benefitAllocations: [{ recipient: "配偶者", numerator: 1, denominator: 1 }] },
      }),
    }]);
  });

  it.each([0, 30_000_000])("解約返戻金0円・死亡保険金%s円の生命保険を保存できる", async (deathBenefit) => {
    const onSubmit = renderModal();
    selectEntryType("INSURANCE");
    typeIn(1, "保険会社", "テスト生命");
    typeIn(1, "解約返戻金（円）", "0");
    typeIn(1, "死亡保険金（円）", String(deathBenefit));
    save();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(savedPayloads(onSubmit)[0]?.data).toMatchObject({ originalAmount: 0, assetDetails: { deathBenefit } });
  });

  it("自社株は株価（単価）0円で保存できる", async () => {
    const onSubmit = renderModal();
    selectEntryType("PRIVATE_SHARES");
    typeIn(1, "会社名", "株式会社A");
    typeIn(1, "株数・口数", "1,000");
    typeIn(1, "単価（円）", "0");
    save();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(savedPayloads(onSubmit)[0]?.data).toMatchObject({ category: "PRIVATE_SHARES", valuationUnitPrice: 0, originalAmount: 0 });
  });

  it("有価証券の単価0円は今までどおり止める", async () => {
    const onSubmit = renderModal();
    selectEntryType("SECURITIES");
    typeIn(1, "銘柄名", "上場株式");
    typeIn(1, "株数・口数", "100");
    typeIn(1, "単価（円）", "0");
    save();
    await screen.findByText("必須の数値は0より大きい値で入力してください。");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("保存済みの保険金0円を再表示しても空欄にならない", () => {
    renderModal([position({ category: "INSURANCE", name: "テスト生命", institution: "テスト生命", assetDetails: { deathBenefit: 0 } })]);
    expect(cell(1, "死亡保険金（円）").value).toBe("0");
    expect(cell(1, "解約返戻金（円）").value).toBe("0");
  });

  it("生命保険の解約返戻金は0円を許可しても空欄は保存しない", async () => {
    const onSubmit = renderModal();
    selectEntryType("INSURANCE");
    typeIn(1, "保険会社", "テスト生命");
    typeIn(1, "死亡保険金（円）", "0");
    save();
    await screen.findByText("解約返戻金（円）を入力してください。");
    expect(onSubmit).not.toHaveBeenCalled();
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
      assetDetails: { retirementRecipient: "配偶者", retirementAllowance: 15_000_000, benefitAllocations: [{ recipient: "配偶者", numerator: 1, denominator: 1 }] },
    }));
  });

  it.each([
    ["配偶者", "法定相続人のため非課税枠の対象です"],
    ["兄", "法定相続人ではないため非課税枠の対象外です"],
  ])("受取人に%sを選ぶと、非課税枠の対象かどうかをその場で出す", (recipient, note) => {
    renderModal();
    selectEntryType("INSURANCE");
    typeIn(1, "受取人", recipient);
    expect(screen.getByText(note)).toBeTruthy();
  });

  it("受取人を選んでいない行には非課税枠の判定を出さない", () => {
    renderModal();
    selectEntryType("RETIREMENT_ALLOWANCE");
    expect(screen.queryByText(/非課税枠の対象/)).toBeNull();
  });

  it("選択肢に無い受取人が登録済みでも、選択肢に足して保存で消さない", async () => {
    const onSubmit = renderModal([position({
      id: 7, category: "INSURANCE", name: "◇◇生命", institution: "◇◇生命", originalAmount: 1_000_000, valueJpy: 1_000_000,
      assetDetails: { beneficiary: "旧姓の受取人", deathBenefit: 5_000_000 },
    })]);
    selectEntryType("INSURANCE");
    expect(cell(1, "受取人").value).toBe("旧姓の受取人");
    typeIn(1, "証券番号", "P-7");
    save();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(savedPayloads(onSubmit)[0]?.data.assetDetails).toMatchObject({ beneficiary: "旧姓の受取人" });
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
      assetDetails: {},
    }));
  });

  it("建物は床面積を列として出し、assetDetails へ入れる", async () => {
    const onSubmit = renderModal();
    selectEntryType("BUILDING");
    typeIn(1, "名称", "自宅家屋");
    typeIn(1, "所在地", "東京都港区1-2-3");
    typeIn(1, "床面積（㎡）", "120.5");
    typeIn(1, "固定資産税評価額（円）", "8,000,000");
    save();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(savedPayloads(onSubmit)[0].data.assetDetails).toMatchObject({ propertyType: "BUILDING", floorArea: 120.5 });
  });

  it("床面積が空欄の建物は、項目ごと持たせない", async () => {
    const onSubmit = renderModal();
    selectEntryType("BUILDING");
    typeIn(1, "名称", "倉庫");
    typeIn(1, "所在地", "東京都港区1-2-4");
    typeIn(1, "固定資産税評価額（円）", "3,000,000");
    save();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(savedPayloads(onSubmit)[0].data.assetDetails).not.toHaveProperty("floorArea");
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

describe("BulkPositionModal（表に列の無い項目）", () => {
  it("証券種類を残したまま保存し、新規行には個別モーダルと同じ既定値を入れる", async () => {
    const onSubmit = renderModal([position({
      id: 7, category: "SECURITIES", name: "○○投信", institution: "××証券", valuationFormula: "MANUAL",
      originalAmount: 5_000_000, valueJpy: 5_000_000, assetDetails: { securityType: "FUND", securityCode: "1234" },
    })]);
    selectEntryType("SECURITIES");
    typeIn(1, "直接入力額（円）", "6,000,000");
    typeIn(2, "銘柄名", "△△株式");
    fireEvent.change(cell(2, "方式"), { target: { value: "MANUAL" } });
    typeIn(2, "直接入力額（円）", "1000000");
    save();
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const [existing, added] = savedPayloads(onSubmit);
    expect(existing.data.assetDetails).toEqual({ securityType: "FUND", securityCode: "1234" });
    expect(added.data.assetDetails).toEqual({ securityType: "LISTED_STOCK" });
  });

  it("小規模宅地等の特例は残し、表にある地目だけを入れ替える", async () => {
    const onSubmit = renderModal([position({
      id: 8, category: "HOME_REAL_ESTATE", name: "自宅土地", valuationFormula: "LAND_ROADSIDE",
      landArea: 180, roadsideValue: 600_000, adjustmentRate: 1, ownershipNumerator: 1, ownershipDenominator: 1,
      originalAmount: 108_000_000, valueJpy: 108_000_000,
      assetDetails: { propertyType: "LAND", propertyAddress: "A市B町1-1", landCategory: "RESIDENTIAL", smallLotType: "SPECIFIC_RESIDENTIAL" },
    })]);
    selectEntryType("LAND");
    fireEvent.change(cell(1, "地目"), { target: { value: "MISCELLANEOUS" } });
    save();
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(savedPayloads(onSubmit)[0].data.assetDetails).toEqual({
      propertyType: "LAND", propertyAddress: "A市B町1-1", landCategory: "MISCELLANEOUS", smallLotType: "SPECIFIC_RESIDENTIAL",
    });
  });

  it("床面積を空にしたら項目ごと消し、構造は残す", async () => {
    const onSubmit = renderModal([position({
      id: 9, category: "REAL_ESTATE", name: "貸家", valuationFormula: "BUILDING",
      fixedAssetTaxValue: 8_000_000, valuationMultiplier: 1.1, adjustmentRate: 1, ownershipNumerator: 1, ownershipDenominator: 1,
      originalAmount: 8_800_000, valueJpy: 8_800_000,
      assetDetails: { propertyType: "BUILDING", propertyAddress: "A市B町2-2", buildingType: "APARTMENT", floorArea: 120.5, buildingStructure: "RC" },
    })]);
    selectEntryType("BUILDING");
    typeIn(1, "床面積（㎡）", "");
    save();
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(savedPayloads(onSubmit)[0].data.assetDetails).toEqual({
      propertyType: "BUILDING", propertyAddress: "A市B町2-2", buildingType: "APARTMENT", buildingStructure: "RC",
    });
  });

  it("外貨建ての明細は表に出さず、個別モーダルに任せる", () => {
    // 保存は通貨をJPY・レート1で固定するので、表に出すと 100,000 USD が 100,000 円へ化ける。
    renderModal([position({
      id: 10, category: "SECURITIES", name: "US Treasury", currency: "USD", valuationFormula: "MANUAL",
      originalAmount: 100_000, fxRate: 150, valueJpy: 15_000_000,
    })]);
    expect(entryTab("SECURITIES").getAttribute("aria-label")).toBe("有価証券・登録済み0件");
  });
});

describe("BulkPositionModal（保存の対象）", () => {
  const securities = () => position({
    id: 11, category: "SECURITIES", name: "○○株式", institution: "××証券", valuationFormula: "MANUAL",
    originalAmount: 5_000_000, valueJpy: 5_000_000, assetDetails: { securityType: "LISTED_STOCK" },
  });

  it("1行も直さずに保存したら、何も送らず理由を出す", async () => {
    const onSubmit = renderModal([securities()]);
    save();
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("保存する変更がありません"));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("直した行だけを送る", async () => {
    const onSubmit = renderModal([securities(), position({ ...securities(), id: 12, name: "△△株式" })]);
    selectEntryType("SECURITIES");
    typeIn(2, "銘柄名", "△△株式（訂正）");
    save();
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(savedPayloads(onSubmit).map((payload) => payload.id)).toEqual([12]);
  });

  it("既定値しか入っていない行は数えず、どれか1つでも入れたら新規1件として数える", () => {
    renderModal();
    selectEntryType("BUILDING");
    const footer = () => screen.getByText(/^保存対象：/).textContent;
    expect(footer()).toBe("保存対象：編集 0件・新規 0件（全9種類の合計）");
    // 以前は名称・金融機関・所在地の3つしか見ておらず、固定資産税評価額だけを入れた行は
    // 「新規0件」と出るのに検証でエラーになっていた。
    typeIn(1, "固定資産税評価額（円）", "8,000,000");
    expect(footer()).toBe("保存対象：編集 0件・新規 1件（全9種類の合計）");
    expect(entryTab("BUILDING").getAttribute("aria-label")).toContain("未保存の編集1件");
  });

  it("メモだけを入れた行も捨てずにエラーで知らせる", async () => {
    const onSubmit = renderModal();
    selectEntryType("DEPOSIT");
    // 以前はこの行が保存の対象から外れ、何も言わずに消えていた。
    typeIn(1, "メモ", "あとで金額を確認");
    save();
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("入力エラー"));
    expect(screen.getByText("名称・残高を入力してください。")).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("BulkPositionModal（モーダルの作法）", () => {
  function renderWithClose() {
    const onClose = vi.fn();
    const { container } = render(<BulkPositionModal snapshot={snapshotOf([])} people={people} legalHeirNames={heirs} onClose={onClose} onSubmit={async () => true} saving={false} />);
    return { onClose, pressEscape: () => fireEvent.keyDown(container.querySelector(".modal-layer")!, { key: "Escape" }) };
  }

  it("開いたら、いま編集している種類のタブへフォーカスを移す", () => {
    renderWithClose();
    // 9種類ぶんの入力先があるので、先頭のセルではなく「どの種類か」へ移す。
    expect(document.activeElement).toBe(entryTab("SECURITIES"));
  });

  it("未保存の編集が無ければ Escape で閉じる", () => {
    const { onClose, pressEscape } = renderWithClose();
    pressEscape();
    expect(onClose).toHaveBeenCalled();
  });

  it("未保存の編集があるときは Escape で閉じず、理由を出す", () => {
    const { onClose, pressEscape } = renderWithClose();
    selectEntryType("LOAN_RECEIVABLE");
    typeIn(1, "名称", "役員貸付金");
    pressEscape();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("未保存の編集があります");
  });
});
