// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BalanceScenarioActions, BalanceSheetPanel } from "@/components/balance-sheet-panel";
import { buildBalanceView, loanBreakdownTotals, successionAssetTotals } from "@/lib/balance-view";
import { type BalanceScenario, type Position, totals } from "@/lib/portfolio-view";

afterEach(cleanup);

const asset = (category: string, valueJpy: number, assetDetails: Position["assetDetails"] = null) =>
  ({ side: "ASSET", category, valueJpy, currency: "JPY", fxRate: 1, includedInNetWorth: true, assetDetails } as Position);
const liability = (category: string, valueJpy: number, includedInNetWorth = true) =>
  ({ side: "LIABILITY", category, valueJpy, currency: "JPY", fxRate: 1, includedInNetWorth, assetDetails: null } as Position);

const positions = [
  asset("DEPOSIT", 40_000_000),
  asset("HOME_REAL_ESTATE", 60_000_000),
  asset("INSURANCE", 10_000_000, { deathBenefit: 50_000_000 }),
  liability("LOAN_HOME", 30_000_000),
  liability("GUARANTEE", 100_000_000, false),
];
const summary = totals(positions);
const successionAssets = successionAssetTotals(positions);

function renderPanel(scenario: BalanceScenario, overrides: Partial<Parameters<typeof BalanceSheetPanel>[0]> = {}, taxes: { estimatedInheritanceTax?: number; otherTaxes?: number } = {}) {
  const view = buildBalanceView({
    scenario,
    summary,
    successionAssets,
    loanBreakdown: loanBreakdownTotals(positions),
    estimatedInheritanceTax: 12_000_000,
    otherTaxes: 3_000_000,
    successionCosts: 5_000_000,
    ...taxes,
  });
  render(<BalanceSheetPanel
    view={view}
    headingSuffix={scenario}
    subtitle="テスト"
    liabilities={summary.liabilities}
    guarantees={summary.guarantees}
    deemedBenefitMissingCount={0}
    {...overrides}
  />);
  return view;
}

// 中分類名は区画と表の下の注記の両方に出るので、区画を見るときは B/S 本体に絞る。
const chart = () => within(document.querySelector(".classified-bs") as HTMLElement);

/** 区画の高さは金額比そのままなので、style から比率を読んで検証する。注記と取り違えないよう区画の見出しで探す。 */
const areaOf = (label: string) => {
  const area = [...document.querySelectorAll<HTMLElement>(".classified-bs .bs-account")].find((element) => element.querySelector("span")?.textContent === label);
  if (!area) throw new Error(`区画が見つからない: ${label}`);
  return { area, height: area.style.height };
};

describe("BalanceSheetPanel", () => {
  it("税金なしでは税金・承継関連費用の区画を描かない", () => {
    renderPanel("without-tax");
    expect(screen.getByLabelText("貸借対照表・税金なし")).toBeTruthy();
    expect(screen.queryByText("税金")).toBeNull();
    expect(screen.queryByText("承継関連費用")).toBeNull();
    expect(screen.getByText("資産合計").nextElementSibling?.textContent).toBe("1億1,000万円");
  });

  it("税金ありでは保険を死亡保険金に置き換え、税金と承継関連費用を描く", () => {
    renderPanel("with-tax");
    expect(screen.getByLabelText("貸借対照表・税金あり")).toBeTruthy();
    expect(chart().getByText("生命保険（死亡保険金）")).toBeTruthy();
    expect(areaOf("税金").area).toBeTruthy();
    expect(areaOf("承継関連費用").area).toBeTruthy();
    expect(screen.getByText("資産合計").nextElementSibling?.textContent).toBe("1億5,000万円");
  });

  it("区画の高さが金額比と一致し、両側の合計が100%になる", () => {
    renderPanel("with-tax");
    expect(areaOf("金融資産").height).toBe("60%");
    expect(areaOf("不動産").height).toBe("40%");
    const fundingLabels = ["税金", "借入金", "承継関連費用", "純資産"];
    const fundingTotal = fundingLabels.reduce((total, label) => total + Number.parseFloat(areaOf(label).height), 0);
    expect(Math.round(fundingTotal)).toBe(100);
  });

  it("面積の小さい区画は文字を詰めるクラスを付ける", () => {
    renderPanel("with-tax");
    // 承継関連費用は3.3%なので compact、純資産は66.7%なので詰めない。
    expect(areaOf("承継関連費用").area.className).toContain("compact-account");
    expect(areaOf("純資産").area.className).toMatch(/^(?!.*(micro|compact|dense)-account).*$/);
  });

  it("面積の小さい区画は番号の印を付け、表の真下の同じ側に注記を出す", () => {
    renderPanel("with-tax", {}, { estimatedInheritanceTax: 2_000_000, otherTaxes: 1_000_000 });
    const funding = document.querySelector(".funding-side .bs-account-area") as HTMLElement;
    expect([...funding.querySelectorAll(".bs-callout-marker")].map((marker) => marker.textContent)).toEqual(["①", "②"]);
    const notes = screen.getByRole("note", { name: "小さい区画・枠内に収まらない内訳の注記" });
    // 表の下は資産・負債純資産の2列で、注記は区画と同じ側の列に入る。
    expect(notes.previousElementSibling?.className).toBe("classified-bs");
    expect(notes.querySelector(".asset-notes")?.textContent).toBe("");
    const rows = [...notes.querySelectorAll(".funding-notes .bs-callout-note")];
    expect(rows.map((row) => row.querySelector(".bs-callout-note-head")?.textContent)).toEqual(["①税金300万円2%", "②承継関連費用500万円3.3%"]);
    // 小分類が枠に収まらない税金は、内訳を字下げして並べる。区画と同じ色の帯を出すため区画の色クラスを付ける。
    expect(within(rows[0] as HTMLElement).getByText("相続税")).toBeTruthy();
    expect(rows[0].className).toContain("tax-account");
  });

  it("注記が無いときは印も注記も出さない", () => {
    renderPanel("without-tax");
    expect(document.querySelector(".bs-callout-marker")).toBeNull();
    expect(screen.queryByRole("note", { name: "小さい区画・枠内に収まらない内訳の注記" })).toBeNull();
  });

  it("注記に触れると、対応する区画と番号の印を強調する", () => {
    renderPanel("with-tax");
    const note = document.querySelector(".bs-callout-note") as HTMLElement;
    fireEvent.pointerEnter(note);
    expect(areaOf("承継関連費用").area.className).toContain("is-callout-active");
    expect(document.querySelector(".bs-callout-marker")?.className).toContain("is-active");
    expect(note.className).toContain("is-active");
    fireEvent.pointerLeave(note);
    expect(areaOf("承継関連費用").area.className).not.toContain("is-callout-active");
  });

  it("死亡給付金が未入力の明細があるときだけ、税金ありB/Sで注意書きを出す", () => {
    renderPanel("with-tax", { deemedBenefitMissingCount: 2 });
    expect(screen.getByText(/未入力の明細/).textContent).toContain("2件");
    cleanup();
    renderPanel("without-tax", { deemedBenefitMissingCount: 2 });
    expect(screen.queryByText(/未入力の明細/)).toBeNull();
  });

  it("個人保証はB/S外として注記に出す", () => {
    renderPanel("without-tax");
    expect(screen.getByText(/個人保証残高/).textContent).toContain("1億円");
  });
});

describe("BalanceScenarioActions", () => {
  const renderActions = (overrides: Partial<Parameters<typeof BalanceScenarioActions>[0]> = {}) => render(<BalanceScenarioActions
    taxIncluded={false}
    isCurrent
    taxApiStatus="idle"
    onSelectScenario={() => {}}
    onCalculateTax={() => {}}
    onOpenForecast={() => {}}
    {...overrides}
  />);

  it("選択中のシナリオを aria-pressed で示す", () => {
    renderActions({ taxIncluded: true });
    const group = screen.getByRole("group", { name: "貸借対照表の表示パターン" });
    expect(within(group).getByText("税金なし").closest("button")?.getAttribute("aria-pressed")).toBe("false");
    expect(within(group).getByText("税金あり").closest("button")?.getAttribute("aria-pressed")).toBe("true");
  });

  it("過去年度では税金の操作ボタンを出さない", () => {
    renderActions({ isCurrent: false });
    expect(screen.queryByText("APIで相続税を計算")).toBeNull();
    expect(screen.queryByText("税金を入力")).toBeNull();
  });

  it("計算中はAPIボタンを押せなくする", () => {
    renderActions({ taxApiStatus: "loading" });
    expect((screen.getByText("計算中").closest("button") as HTMLButtonElement).disabled).toBe(true);
  });
});
