// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PositionListView } from "@/components/position-list-view";
import { PositionDetailsView } from "@/components/position-details-view";
import { PositionDetailsPrintView } from "@/components/position-details-print-view";
import { buildPositionTaxBurden } from "@/components/positions-view";
import { type Position, type Snapshot } from "@/lib/portfolio-view";
import { type FamilyMember } from "@/lib/family";
import { yen, triangleYen } from "@/lib/format";

const navigation = vi.hoisted(() => ({ query: "", path: "/customers/1/position-list", replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(navigation.query), usePathname: () => navigation.path, useRouter: () => ({ replace: navigation.replace, push: navigation.push }) }));
const position = (id: number, patch: Partial<Position>): Position => ({
  id, side: "ASSET", category: "DEPOSIT", name: "普通預金", institution: "銀行", currency: "JPY", originalAmount: 50_000_000, fxRate: 1, valueJpy: 50_000_000,
  liquidity: "", includedInNetWorth: true, valuationMethod: "残高", valuationFormula: "MANUAL", valuationQuantity: null, valuationUnitPrice: null, adjustmentRate: null, landArea: null, roadsideValue: null,
  fixedAssetTaxValue: null, valuationMultiplier: null, ownershipShare: null, ownershipNumerator: null, ownershipDenominator: null, assetDetails: null, note: "", ...patch,
});
const insurance = position(2, { category: "INSURANCE", name: "あおば生命", valueJpy: 5_000_000, originalAmount: 5_000_000, assetDetails: { deathBenefit: 50_000_000, beneficiary: "子", insuredPerson: "本人" } });
const guarantee = position(3, { side: "LIABILITY", category: "GUARANTEE", name: "保証", includedInNetWorth: false, valueJpy: 20_000_000 });
const snapshot = { id: 7, fiscalYear: 2026, isCurrent: false, positions: [position(1, {}), insurance, guarantee], estimatedInheritanceTax: 10_000_000, inheritanceTaxCalculation: null } as Snapshot;
const familyMembers = [
  { id: 10, name: "長女", nameKana: "", relationship: "CHILD", acquisitionReason: "INHERITANCE", civilShareNumerator: 1, civilShareDenominator: 2, taxShareNumerator: null, taxShareDenominator: null, specialTaxAddition: false, disabilityCategory: "NONE", birthDate: null, note: "", sortOrder: 0 },
  { id: 11, name: "長男", nameKana: "", relationship: "CHILD", acquisitionReason: "INHERITANCE", civilShareNumerator: 1, civilShareDenominator: 2, taxShareNumerator: null, taxShareDenominator: null, specialTaxAddition: false, disabilityCategory: "NONE", birthDate: null, note: "", sortOrder: 1 },
] as FamilyMember[];
beforeEach(() => { navigation.query = ""; navigation.path = "/customers/1/position-list"; navigation.replace.mockReset(); navigation.push.mockReset(); localStorage.clear(); });
afterEach(cleanup);

describe("資産・負債一覧と詳細の連携", () => {
  it("受取人でも検索でき、絞り込みと年度を引き継いで正しい詳細へ移動する", () => {
    navigation.query = "snapshot=7&q=子&listSection=ASSET";
    render(<PositionListView snapshot={snapshot} detailHref="/customers/1/positions?snapshot=7&q=子&listSection=ASSET" taxBurden={() => null} onAdd={vi.fn()} onBulkManage={vi.fn()} saving={false} />);
    expect(document.querySelectorAll(".position-summary-group")).toHaveLength(1);
    const href = new URL(screen.getByRole("link", { name: "あおば生命の詳細" }).getAttribute("href")!, "http://localhost");
    expect(href.pathname).toBe("/customers/1/positions/insurance");
    expect(Object.fromEntries(href.searchParams)).toMatchObject({ snapshot: "7", q: "子", listSection: "ASSET", position: "2" });
    const list = screen.getByRole("table", { name: "資産・負債一覧" });
    const moneyCell = within(list).getByRole("cell", { name: `死亡保険金 ${yen.format(50_000_000)}` });
    expect(moneyCell.textContent).toBe(yen.format(50_000_000));
    expect(within(list).getByText("解約返戻金")).toBeTruthy();
    expect(within(list).getByText(yen.format(5_000_000))).toBeTruthy();
  });

  it("一覧で相続人ごとの評価額を均等割りし保存できる", async () => {
    const save = vi.fn().mockResolvedValue(true);
    render(<PositionListView snapshot={{ ...snapshot, positions: [snapshot.positions[0]] }} detailHref="/customers/1/positions?snapshot=7" taxBurden={() => null} familyMembers={familyMembers} onAdd={vi.fn()} onBulkManage={vi.fn()} onSaveAllocations={save} saving={false} />);
    fireEvent.click(screen.getByRole("button", { name: "割り振りを編集" }));
    const allocationTable = screen.getByRole("table", { name: "財産の割り振り入力" });
    expect(within(allocationTable).getAllByRole("columnheader").slice(0, 5).map((header) => header.textContent)).toEqual([
      "No.",
      "区分",
      "科目・名称",
      "所在地・金融機関等／参考情報",
      "評価額・給付額／相続税額",
    ]);
    const allocationNumberCell = within(allocationTable).getByRole("cell", { name: "一覧番号 1" }) as HTMLTableCellElement;
    expect(allocationNumberCell.textContent).toBe("1");
    expect(allocationNumberCell.rowSpan).toBe(2);
    const allocationMoneyCell = allocationTable.querySelector(".position-summary-sticky-money[rowspan='2']") as HTMLTableCellElement;
    expect(allocationMoneyCell.rowSpan).toBe(2);
    expect(allocationMoneyCell.querySelectorAll(".position-summary-money-lines > div")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "均等割り" }));
    expect((screen.getByRole("textbox", { name: "普通預金の長女取得額" }) as HTMLInputElement).value).toBe("25,000,000");
    expect((screen.getByRole("textbox", { name: "普通預金の長男取得額" }) as HTMLInputElement).value).toBe("25,000,000");
    fireEvent.click(screen.getByRole("button", { name: "割り振りを保存" }));
    expect(save).toHaveBeenCalledWith([{ positionId: 1, amounts: [{ familyMemberId: 10, amountJpy: 25_000_000 }, { familyMemberId: 11, amountJpy: 25_000_000 }] }]);
  });

  it("財産情報の列は詳細へ進み、相続人・未割当の列は対象行の割り振り編集を開く", async () => {
    render(<PositionListView snapshot={{ ...snapshot, positions: [snapshot.positions[0], insurance] }} detailHref="/customers/1/positions?snapshot=7" taxBurden={() => null} familyMembers={familyMembers} onAdd={vi.fn()} onBulkManage={vi.fn()} saving={false} />);
    const list = screen.getByRole("table", { name: "資産・負債一覧" });
    const detailLinks = within(list).getAllByRole("link", { name: "普通預金の詳細を開く" });
    expect(detailLinks.length).toBeGreaterThanOrEqual(4);
    expect(detailLinks.every((link) => link.getAttribute("href")?.includes("/positions/deposit"))).toBe(true);

    fireEvent.click(within(list).getByRole("button", { name: "普通預金の長女の取得・負担額を編集" }));
    const input = screen.getByRole("textbox", { name: "普通預金の長女取得額" });
    await waitFor(() => expect(document.activeElement).toBe(input));
    expect(screen.getByRole("button", { name: "編集を終了" })).toBeTruthy();
  });

  it("生命保険・退職金の相続人列は割り振り編集ではなく受取人情報を開く", () => {
    render(<PositionListView snapshot={{ ...snapshot, positions: [insurance] }} detailHref="/customers/1/positions?snapshot=7" taxBurden={() => null} familyMembers={familyMembers} onAdd={vi.fn()} onBulkManage={vi.fn()} saving={false} />);
    const list = screen.getByRole("table", { name: "資産・負債一覧" });
    expect(within(list).queryByRole("button", { name: /あおば生命の長女の取得・負担額を編集/ })).toBeNull();
    expect(within(list).getAllByRole("link", { name: "あおば生命の受取人情報を開く" }).length).toBeGreaterThan(0);
  });

  it("入力済みの割り振りを維持して残額すべてを指定相続人へ割り振る", () => {
    render(<PositionListView snapshot={{ ...snapshot, positions: [position(1, { valueJpy: 100, originalAmount: 100 })] }} detailHref="/customers/1/positions?snapshot=7" taxBurden={() => 10} familyMembers={familyMembers} onAdd={vi.fn()} onBulkManage={vi.fn()} saving={false} />);
    fireEvent.click(screen.getByRole("button", { name: "割り振りを編集" }));
    const daughter = screen.getByRole("textbox", { name: "普通預金の長女取得額" }) as HTMLInputElement;
    const son = screen.getByRole("textbox", { name: "普通預金の長男取得額" }) as HTMLInputElement;
    fireEvent.change(daughter, { target: { value: "30" } });
    fireEvent.change(son, { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: "普通預金の残額すべてを長男へ割り振る" }));
    expect(daughter.value).toBe("30");
    expect(son.value).toBe("70");
    expect(screen.queryByText(/税負担目安/)).toBeNull();
    expect(screen.queryByText("割当済み")).toBeNull();
    expect((screen.getByRole("button", { name: "普通預金の残額すべてを長男へ割り振る" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "普通預金の全額を長女へ割り振る" }));
    expect(daughter.value).toBe("100");
    expect(son.value).toBe("");
    fireEvent.click(screen.getByRole("button", { name: "編集を終了" }));
    fireEvent.click(screen.getByRole("button", { name: "割り振りを編集" }));
    expect((screen.getByRole("textbox", { name: "普通預金の長女取得額" }) as HTMLInputElement).value).toBe("100");
    expect((screen.getByRole("textbox", { name: "普通預金の長男取得額" }) as HTMLInputElement).value).toBe("");
  });

  it("通常一覧は1明細を2行で表示し、評価額・給付額・相続税額と相続人別の割り振りを一覧できる", () => {
    const allocated = position(1, { valueJpy: 100, originalAmount: 100, valuationMethod: "単価×数量×調整率", valuationFormula: "STOCK", valuationQuantity: 10, valuationUnitPrice: 5, adjustmentRate: 2, assetDetails: { accountType: "ORDINARY", branchName: "本店", accountSuffix: "1234" }, allocations: [
      { id: 1, familyMemberId: 10, familyMemberName: "長女", role: "ACQUIRER", numerator: 3, denominator: 5 },
      { id: 2, familyMemberId: 11, familyMemberName: "長男", role: "ACQUIRER", numerator: 2, denominator: 5 },
    ] });
    render(<PositionListView snapshot={{ ...snapshot, positions: [allocated] }} detailHref="/customers/1/positions?snapshot=7" taxBurden={() => 12} familyMembers={familyMembers} onAdd={vi.fn()} onBulkManage={vi.fn()} saving={false} />);
    const list = screen.getByRole("table", { name: "資産・負債一覧" });
    expect(within(list).getAllByRole("columnheader").slice(0, 5).map((header) => header.textContent)).toEqual([
      "No.",
      "区分",
      "科目・名称",
      "所在地・金融機関等／参考情報",
      "評価額・給付額／相続税額",
    ]);
    const numberCell = within(list).getByRole("cell", { name: "一覧番号 1" }) as HTMLTableCellElement;
    expect(numberCell.textContent).toBe("1");
    expect(numberCell.rowSpan).toBe(2);
    expect(within(list).getByRole("columnheader", { name: /評価額・給付額／相続税額/ })).toBeTruthy();
    expect(within(list).getByRole("columnheader", { name: /長女/ })).toBeTruthy();
    expect(within(list).getByRole("columnheader", { name: /長男/ })).toBeTruthy();
    const group = list.querySelector(".position-summary-group") as HTMLElement;
    expect(group.querySelectorAll("tr")).toHaveLength(2);
    expect(list.querySelectorAll(".position-summary-action-column")).toHaveLength(4);
    const secondaryLastCell = group.querySelector(".position-summary-secondary-row > :last-child") as HTMLElement;
    expect(secondaryLastCell.classList.contains("position-summary-unallocated")).toBe(true);
    expect(secondaryLastCell.classList.contains("position-summary-action-column")).toBe(false);
    const moneyCells = [...group.querySelectorAll(".position-summary-sticky-money")];
    expect(moneyCells).toHaveLength(2);
    expect(moneyCells.map((cell) => cell.textContent)).toEqual([yen.format(100), yen.format(12)]);
    expect(within(group).getByText(yen.format(60))).toBeTruthy();
    expect(within(group).getByText(yen.format(40))).toBeTruthy();
    const personTaxes = [...group.querySelectorAll(".position-summary-person-tax")].map((cell) => cell.textContent);
    expect(personTaxes).toEqual([yen.format(7), yen.format(5), "—"]);
    expect(within(group).getByText("預金種類：普通預金")).toBeTruthy();
    expect(within(group).getByText("支店：本店")).toBeTruthy();
    expect(within(group).getByText("口座番号（末尾）")).toBeTruthy();
    expect(within(group).getByText("1234")).toBeTruthy();
    expect(within(group).queryByText("計算根拠")).toBeNull();
    expect(within(group).queryByText("評価方法")).toBeNull();
    expect(within(group).queryByText("口座番号（末尾）：1234")).toBeNull();
    expect(group.querySelectorAll(".position-summary-supplement span")).toHaveLength(2);
    expect(within(group).queryByText(/割り振り \d/)).toBeNull();
    expect(within(group).getByText(yen.format(12))).toBeTruthy();
    expect(within(group).queryByText(/税負担目安/)).toBeNull();
    expect(within(group).queryByText("割当済み")).toBeNull();
    expect(screen.getByText(/一覧では生命保険は死亡保険金、退職金は死亡退職金/)).toBeTruthy();
    expect(screen.getByText(/非課税額控除後の課税対象額を使用します/)).toBeTruthy();
    expect(screen.getByText(/生命保険契約に関する権利は解約返戻金相当額で評価します/)).toBeTruthy();
  });

  it("参考情報は計算根拠を避け、科目ごとの判断材料を重複なく優先する", () => {
    const termDeposit = position(4, { name: "定期預金", assetDetails: { maturityDate: "2027-03-31" } });
    const foreignDeposit = position(5, { name: "ドル預金", currency: "USD", originalAmount: 10_000, fxRate: 150, valueJpy: 1_500_000 });
    const insuranceRights = position(6, { category: "INSURANCE_RIGHTS", name: "契約者権利", valueJpy: 2_000_000, assetDetails: { insuranceType: "終身", policyNumber: "R-1", insuredPerson: "配偶者" } });
    const land = position(7, { category: "HOME_REAL_ESTATE", name: "自宅土地", ownershipNumerator: 1, ownershipDenominator: 2, ownershipShare: 0.5, assetDetails: { propertyType: "LAND", propertyAddress: "東京都", landCategory: "RESIDENTIAL", smallLotType: "RESIDENTIAL" } });
    const privateShares = position(8, { category: "PRIVATE_SHARES", name: "自社株", valuationQuantity: 300, assetDetails: { shareClass: "普通株式", totalIssuedShares: 1_000, valuationApproach: "類似業種比準方式" } });
    render(<PositionListView snapshot={{ ...snapshot, positions: [insurance, termDeposit, foreignDeposit, insuranceRights, land, privateShares] }} detailHref="/customers/1/positions?snapshot=7" taxBurden={() => null} onAdd={vi.fn()} onBulkManage={vi.fn()} saving={false} />);
    const list = screen.getByRole("table", { name: "資産・負債一覧" });
    expect(within(list).getByText("解約返戻金")).toBeTruthy();
    expect(within(list).getByText("満期日")).toBeTruthy();
    expect(within(list).getByText("2027-03-31")).toBeTruthy();
    expect(within(list).getByText("外貨・換算")).toBeTruthy();
    expect(within(list).getByText("10,000 USD × 150円")).toBeTruthy();
    expect(within(list).getByText("被保険者")).toBeTruthy();
    expect(within(list).getByText("配偶者")).toBeTruthy();
    expect(within(list).getByText("小規模宅地等・持分")).toBeTruthy();
    expect(within(list).getByText("特定居住用宅地／1/2")).toBeTruthy();
    expect(within(list).getByText("保有比率")).toBeTruthy();
    expect(within(list).getByText("30%")).toBeTruthy();
    expect(within(list).queryByText("被保険者：本人")).toBeNull();
    expect(within(list).queryByText("計算根拠")).toBeNull();
  });

  it("貸付金・負債・保証の参考情報は返済や契約の判断材料を表示する", () => {
    const loan = position(9, { category: "LOAN_RECEIVABLE", name: "役員貸付金", assetDetails: { repaymentDueDate: "2030-03-31", interestRate: 1.5, collateral: "対象不動産" } });
    const lease = position(10, { side: "LIABILITY", category: "LEASE_OBLIGATION", name: "リース債務", assetDetails: { contractEndDate: "2029-12-31" } });
    const payable = position(11, { side: "LIABILITY", category: "ACCOUNTS_PAYABLE", name: "未払金", assetDetails: { paymentDueDate: "2027-01-31" } });
    const deposit = position(12, { side: "LIABILITY", category: "DEPOSITS_RECEIVED", name: "敷金預り金", assetDetails: { relatedProperty: "本社ビル", returnTerms: "退去時返還" } });
    const guaranteed = position(13, { side: "LIABILITY", category: "GUARANTEE", name: "債務保証", includedInNetWorth: false, assetDetails: { principalDebtor: "株式会社A", guaranteeExpiryDate: "2031-03-31" } });
    render(<PositionListView snapshot={{ ...snapshot, positions: [loan, lease, payable, deposit, guaranteed] }} detailHref="/customers/1/positions?snapshot=7" taxBurden={() => null} onAdd={vi.fn()} onBulkManage={vi.fn()} saving={false} />);
    const list = screen.getByRole("table", { name: "資産・負債一覧" });
    expect(within(list).getByText("返済期限・利率")).toBeTruthy();
    expect(within(list).getByText("2030-03-31／年1.5%")).toBeTruthy();
    expect(within(list).getByText("契約終了日")).toBeTruthy();
    expect(within(list).getByText("2029-12-31")).toBeTruthy();
    expect(within(list).getByText("支払期限")).toBeTruthy();
    expect(within(list).getByText("2027-01-31")).toBeTruthy();
    expect(within(list).getByText("対象物件")).toBeTruthy();
    expect(within(list).getByText("本社ビル")).toBeTruthy();
    expect(within(list).getByText("主債務者・保証期限")).toBeTruthy();
    expect(within(list).getByText("株式会社A／2031-03-31")).toBeTruthy();
    expect(within(list).queryByText("計算根拠")).toBeNull();
  });

  it("金額順は生命保険の解約返戻金ではなく死亡保険金で並べる", () => {
    navigation.query = "listSort=value-desc";
    const deposit = position(7, { name: "大口預金", valueJpy: 40_000_000, originalAmount: 40_000_000 });
    render(<PositionListView snapshot={{ ...snapshot, positions: [deposit, insurance] }} detailHref="/customers/1/positions?snapshot=7" taxBurden={() => null} onAdd={vi.fn()} onBulkManage={vi.fn()} saving={false} />);
    const names = [...document.querySelectorAll(".position-summary-name strong")].map((node) => node.textContent);
    expect(names).toEqual(["あおば生命", "大口預金"]);
    const list = screen.getByRole("table", { name: "資産・負債一覧" });
    expect(within(list).getAllByRole("cell", { name: /一覧番号/ }).map((cell) => cell.textContent)).toEqual(["1", "2"]);
  });

  it("一覧末尾で全明細の取得・負担合計と計算済み相続税額を相続人別に表示する", () => {
    const asset = position(1, { valueJpy: 100, originalAmount: 100, allocations: [
      { id: 1, familyMemberId: 10, familyMemberName: "長女", role: "ACQUIRER", numerator: 3, denominator: 5 },
      { id: 2, familyMemberId: 11, familyMemberName: "長男", role: "ACQUIRER", numerator: 2, denominator: 5 },
    ] });
    const liability = position(4, { side: "LIABILITY", category: "LOAN", name: "借入金", valueJpy: 20, originalAmount: 20, allocations: [
      { id: 3, familyMemberId: 10, familyMemberName: "長女", role: "DEBT_BEARER", numerator: 1, denominator: 2 },
      { id: 4, familyMemberId: 11, familyMemberName: "長男", role: "DEBT_BEARER", numerator: 1, denominator: 2 },
    ] });
    const calculation = {
      acquisitionAllocationMode: "ACTUAL",
      totalInheritanceTaxJpy: 12,
      heirs: [
        { id: "rank1-1", type: "child", finalTaxJpy: 7 },
        { id: "rank1-2", type: "child", finalTaxJpy: 5 },
      ],
    } as Snapshot["inheritanceTaxCalculation"];
    render(<PositionListView snapshot={{ ...snapshot, positions: [asset, liability], inheritanceTaxCalculation: calculation }} detailHref="/customers/1/positions?snapshot=7" taxBurden={(p) => p.id === 1 ? 20 : -8} familyMembers={familyMembers} onAdd={vi.fn()} onBulkManage={vi.fn()} saving={false} />);

    const list = screen.getByRole("table", { name: "資産・負債一覧" });
    const totals = list.querySelector(".position-summary-totals") as HTMLElement;
    const acquisitionRow = within(totals).getByRole("row", { name: /取得・負担合計/ });
    expect(acquisitionRow.textContent).toContain(yen.format(80));
    expect(acquisitionRow.textContent).toContain(yen.format(50));
    expect(acquisitionRow.textContent).toContain(yen.format(30));
    const taxRow = within(totals).getByRole("row", { name: /相続税額/ });
    expect(taxRow.textContent).toContain("相続税額（縦計）");
    expect(taxRow.textContent).toContain("表示明細の割り振り別合計");
    expect(within(taxRow).getAllByRole("cell").map((cell) => cell.textContent)).toEqual([
      triangleYen(12), triangleYen(8), triangleYen(4), triangleYen(0), "",
    ]);
  });

  it("法定相続分による概算は一覧末尾の相続税額として表示しない", () => {
    const calculation = {
      acquisitionAllocationMode: "LEGAL",
      totalInheritanceTaxJpy: 12,
      heirs: [
        { id: "rank1-1", type: "child", finalTaxJpy: 7 },
        { id: "rank1-2", type: "child", finalTaxJpy: 5 },
      ],
    } as Snapshot["inheritanceTaxCalculation"];
    render(<PositionListView snapshot={{ ...snapshot, inheritanceTaxCalculation: calculation }} detailHref="/customers/1/positions?snapshot=7" taxBurden={() => null} familyMembers={familyMembers} onAdd={vi.fn()} onBulkManage={vi.fn()} saving={false} />);

    const list = screen.getByRole("table", { name: "資産・負債一覧" });
    const totals = list.querySelector(".position-summary-totals") as HTMLElement;
    const taxRow = within(totals).getByRole("row", { name: /相続税額/ });
    expect(taxRow.textContent).toContain("相続税額（縦計）");
    expect(taxRow.textContent).toContain("相続税の計算後に表示");
    expect(taxRow.textContent).not.toContain(yen.format(12));
    expect(taxRow.textContent).not.toContain(yen.format(7));
    expect(taxRow.textContent).not.toContain(yen.format(5));
  });

  it("未割当税額も円単位で縦計し、負債の軽減額と端数を含め全体と一致する", () => {
    const asset = position(1, { valueJpy: 100, allocations: [
      { id: 1, familyMemberId: 10, familyMemberName: "長女", role: "ACQUIRER", numerator: 1, denominator: 3 },
    ] });
    const debt = position(4, { side: "LIABILITY", category: "LOAN", valueJpy: 20, allocations: [
      { id: 2, familyMemberId: 10, familyMemberName: "長女", role: "DEBT_BEARER", numerator: 1, denominator: 2 },
    ] });
    render(<PositionListView snapshot={{ ...snapshot, positions: [asset, debt] }} detailHref="/customers/1/positions" taxBurden={(p) => p.id === 1 ? 101 : -11} familyMembers={familyMembers} onAdd={vi.fn()} onBulkManage={vi.fn()} saving={false} />);
    const totals = document.querySelector(".position-summary-totals") as HTMLElement;
    const taxRow = within(totals).getByRole("row", { name: /相続税額/ });
    expect(within(taxRow).getAllByRole("cell").map((cell) => cell.textContent)).toEqual([
      triangleYen(90), triangleYen(27), triangleYen(0), triangleYen(63), "",
    ]);
  });

  it("絞り込み中は表示明細だけを縦計し、未計算は0円と区別する", () => {
    navigation.query = "listCategory=DEPOSIT";
    render(<PositionListView snapshot={{ ...snapshot, positions: [position(1, {}), position(4, {}), insurance] }} detailHref="/customers/1/positions" taxBurden={(p) => p.id === 4 ? null : p.id === 1 ? 10 : 100} familyMembers={familyMembers} onAdd={vi.fn()} onBulkManage={vi.fn()} saving={false} />);
    const totals = document.querySelector(".position-summary-totals") as HTMLElement;
    const taxRow = within(totals).getByRole("row", { name: /相続税額/ });
    expect(taxRow.textContent).toContain("未計算の明細を除く");
    expect(within(taxRow).getAllByRole("cell").map((cell) => cell.textContent)).toEqual([
      triangleYen(10), triangleYen(0), triangleYen(0), triangleYen(10), "",
    ]);
  });

  it("全明細を法定相続分で一括割り振りし、確認後に未保存状態へ反映する", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<PositionListView snapshot={{ ...snapshot, positions: [position(1, { valueJpy: 101, originalAmount: 101 })] }} detailHref="/customers/1/positions?snapshot=7" taxBurden={() => null} familyMembers={familyMembers} onAdd={vi.fn()} onBulkManage={vi.fn()} saving={false} />);
    fireEvent.click(screen.getByRole("button", { name: "割り振りを編集" }));
    fireEvent.click(screen.getByRole("button", { name: "全明細を法定相続分で割り振る" }));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("全1件"));
    expect((screen.getByRole("textbox", { name: "普通預金の長女取得額" }) as HTMLInputElement).value).toBe("51");
    expect((screen.getByRole("textbox", { name: "普通預金の長男取得額" }) as HTMLInputElement).value).toBe("50");
    expect(screen.getByText("1件に法定相続分を適用しました。内容を確認して保存してください。")).toBeTruthy();
    confirm.mockRestore();
  });

  it("詳細は死亡保険金と現在価値を分け、一覧に戻る検索条件を維持する", () => {
    navigation.path = "/customers/1/positions/insurance"; navigation.query = "snapshot=7&q=子&position=2";
    const add = vi.fn();
    render(<PositionDetailsView snapshot={snapshot} taxBurden={() => null} onAdd={add} onBulkManage={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} onReorder={async () => true} saving={false} spotlightId={2} />);
    const table = screen.getByRole("table", { name: "生命保険の明細" });
    expect(within(table).getAllByRole("row")).toHaveLength(2);
    expect(within(table).getAllByRole("columnheader")[0].textContent).toBe("No.");
    expect(within(table).getByRole("cell", { name: "詳細番号 1" }).textContent).toBe("1");
    expect(within(table).queryByRole("columnheader", { name: "取得者" })).toBeNull();
    expect(within(table).getByRole("columnheader", { name: "受取人・取り分" })).toBeTruthy();
    expect(table.querySelector('[data-column="死亡保険金"]')?.textContent).toContain("50,000,000");
    expect(table.querySelector('[data-column="死亡保険金"]')?.textContent).not.toContain("￥");
    expect(table.querySelector('[data-column="value"]')?.textContent).toContain("5,000,000");
    expect(table.querySelector('[data-column="value"]')?.textContent).not.toContain("￥");
    expect(screen.getByRole("link", { name: "一覧へ戻る" }).getAttribute("href")).toBe("/customers/1/position-list?snapshot=7&q=%E5%AD%90");
    fireEvent.click(screen.getByRole("button", { name: "明細を追加" }));
    expect(add).toHaveBeenCalledWith("ASSET", "INSURANCE", undefined);
  });

  it("列の表示・幅を保存し、再表示でも復元する", () => {
    navigation.path = "/customers/1/positions/insurance";
    const props = { snapshot, taxBurden: () => null, onAdd: vi.fn(), onBulkManage: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn(), onReorder: async () => true, saving: false };
    render(<PositionDetailsView {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "表示する列" }));
    expect(screen.queryByRole("checkbox", { name: "取得者を表示" })).toBeNull();
    expect(screen.getByRole("checkbox", { name: "受取人・取り分を表示" })).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: "計算根拠を表示" }));
    fireEvent.change(screen.getByRole("spinbutton", { name: "名称の列幅" }), { target: { value: "260" } });
    cleanup();
    render(<PositionDetailsView {...props} />);
    const table = screen.getByRole("table", { name: "生命保険の明細" });
    expect(within(table).getByRole("columnheader", { name: "計算根拠" })).toBeTruthy();
    expect((table.querySelector('col[data-column-width="number"]') as HTMLElement).style.width).toBe("44px");
    expect((table.querySelector('col[data-column-width="name"]') as HTMLElement).style.width).toBe("260px");
  });

  it("共通の税負担計算は死亡給付金を基準にし、B/S外の保証を除外する", () => {
    const tax = buildPositionTaxBurden({ ...snapshot, inheritanceTaxCalculation: { totalTaxBeforeDeductionsJpy: 11_000_000, insuranceNonTaxableAmountJpy: 0, retirementNonTaxableAmountJpy: 0 } as Snapshot["inheritanceTaxCalculation"] }, new Set());
    expect(tax(insurance)).toBe(5_500_000);
    expect(tax(snapshot.positions[0])).toBe(5_500_000);
    expect(tax(guarantee)).toBeNull();
  });

  it("印刷も科目別の表にし、入力画面で保存した列設定を反映する", async () => {
    localStorage.setItem("pb.position-columns.v1.insurance", JSON.stringify({ version: 1, order: ["name", "tax", "value"], visible: ["name", "tax", "value"], widths: { name: 150, tax: 140, value: 130 } }));
    render(<PositionDetailsPrintView snapshot={snapshot} taxBurden={() => 1_000_000} />);
    const table = await screen.findByRole("table", { name: "生命保険の明細" });
    expect(within(table).getAllByRole("columnheader").map((header) => header.textContent)).toEqual(["No.", "名称", "相続税負担額（円）", "解約返戻金（円）", "計算根拠"]);
    expect(within(table).getByRole("cell", { name: "詳細番号 1" }).textContent).toBe("1");
    expect(within(table).queryByRole("columnheader", { name: "取得者" })).toBeNull();
    expect(within(table).getByText("入力額 5,000,000円")).toBeTruthy();
    expect(within(table).queryByRole("columnheader", { name: "評価方法" })).toBeNull();
    expect(within(table).queryByRole("columnheader", { name: "操作・並び順" })).toBeNull();
    expect(within(table).getByRole("columnheader", { name: "名称" }).classList.contains("text")).toBe(true);
    expect(within(table).getByRole("columnheader", { name: "相続税負担額（円）" }).classList.contains("number")).toBe(true);
    expect(within(table).getByText("入力額 5,000,000円").classList.contains("text")).toBe(true);
    expect((table.querySelector('col[data-column="name"]') as HTMLElement).style.width).toBe("12%");
    expect((table.querySelector('col[data-column="value"]') as HTMLElement).style.width).toBe("11%");
    expect((table.querySelector('col[data-column="formula"]') as HTMLElement).style.width).toBe("23%");
    expect((table.querySelector('col[data-column="number"]') as HTMLElement).style.width).toBe("3%");
  });

  it("印刷詳細に貸付・負債・保証の追加情報と長文を表示する", async () => {
    const rows = [
      position(20, { category: "LOAN_RECEIVABLE", name: "長期貸付金", assetDetails: { repaymentDueDate: "2035-12-31", interestRate: 1.2345, collateral: "東京都千代田区所在の土地建物および附属設備一式（第一順位抵当権設定済み）" } }),
      position(21, { side: "LIABILITY", category: "DEPOSITS_RECEIVED", name: "預り保証金", assetDetails: { relatedProperty: "本社ビル", returnTerms: "契約終了後、原状回復費用と未払賃料を控除した残額を返還する" } }),
      position(22, { side: "LIABILITY", category: "GUARANTEE", name: "債務保証", includedInNetWorth: false, assetDetails: { principalDebtor: "株式会社A", guaranteeExpiryDate: "2036-03-31" } }),
    ];
    render(<PositionDetailsPrintView snapshot={{ ...snapshot, positions: rows }} taxBurden={() => null} />);
    const loanTable = await screen.findByRole("table", { name: "貸付金の明細" });
    expect(within(loanTable).getByRole("columnheader", { name: "返済期限" })).toBeTruthy();
    expect(within(loanTable).getByRole("columnheader", { name: "利率（年％）" })).toBeTruthy();
    expect(within(loanTable).getByText("1.2345")).toBeTruthy();
    expect(within(loanTable).getByText(/第一順位抵当権設定済み/)).toBeTruthy();
    const depositTable = screen.getByRole("table", { name: "預り敷金・保証金の明細" });
    expect(within(depositTable).getByText(/原状回復費用と未払賃料/)).toBeTruthy();
    const guaranteeTable = screen.getByRole("table", { name: "個人保証の明細" });
    expect(within(guaranteeTable).getByText("株式会社A")).toBeTruthy();
    expect(within(guaranteeTable).getByText("2036-03-31")).toBeTruthy();
  });
});
