import {
  type BalanceScenario,
  type Position,
  deemedBenefitJpy,
  deemedConfig,
  hasDeemedBenefit,
  totals,
} from "@/lib/portfolio-view";

export type SuccessionAssets = ReturnType<typeof successionAssetTotals>;
export type LoanBreakdown = ReturnType<typeof loanBreakdownTotals>;
export type BalanceView = ReturnType<typeof buildBalanceView>;

type BsItem = { label: string; value: number };
/** 貸借対照表の区画1つ。`items` がある区画は小分類つき、無い区画は補足文（caption）つきで描く。 */
export type BsAccount = { key: string; label: string; value: number; tone: string; items?: BsItem[]; caption?: string; captionClassName?: string };
export type BsSide = "asset" | "funding";
export type BsCallout = BalanceView["callouts"][number];

/** 印刷時の区画エリアの高さ(px)。一番狭い印刷に合わせて、小分類が枠内に収まるかを判定する。 */
const PRINT_AREA_HEIGHT = 420;
/** これ未満の面積比の区画は、文字が読めないので表の下へ注記する。 */
const SMALL_AREA_RATIO = 0.04;

/**
 * 片側（資産 / 負債・純資産）の区画から、表の下へ注記する区画を選ぶ。
 * 面積の小さい区画は科目名と金額を、小分類が枠内に収まらない区画はそれに加えて内訳を注記する。
 */
function sideCallouts(side: BsSide, accounts: ReadonlyArray<BsAccount>, areaTotal: number) {
  let offset = 0;
  return accounts.flatMap((account) => {
    const ratio = Math.abs(account.value) / Math.max(areaTotal, 1);
    // 番号の印を置く高さは区画の縦方向の中央。区画は上から金額比の高さで積んでいる。
    const anchor = (offset + ratio / 2) * 100;
    offset += ratio;
    const items = account.items ?? [];
    const small = ratio < SMALL_AREA_RATIO;
    // 1区画に必要な高さは 見出し18px ＋ 小分類1行11px。
    const clipped = items.length > 0 && ratio * PRINT_AREA_HEIGHT < 18 + items.length * 11;
    if (!small && !clipped) return [];
    return [{ key: account.key, side, label: account.label, value: account.value, tone: account.tone, items: clipped ? items : [], anchor }];
  });
}

/** 中分類（金融資産・不動産・事業用資産）ごとの資産集計。貸借対照表の区画はこの数値で高さを決める。 */
export function successionAssetTotals(positions: Position[]) {
  let deposits = 0, securities = 0, insurance = 0, insuranceDeathBenefit = 0, retirementAllowance = 0, retirementDeathBenefit = 0, deemedBenefitMissingCount = 0, privateShares = 0, businessAssets = 0, loanReceivables = 0;
  let homeRealEstate = 0, incomeRealEstate = 0, businessRealEstate = 0, idleRealEstate = 0, otherRealEstate = 0, otherAssets = 0;
  for (const position of positions) {
    if (position.side !== "ASSET") continue;
    if (position.category === "DEPOSIT") deposits += position.valueJpy;
    else if (position.category === "SECURITIES") securities += position.valueJpy;
    // 生命保険と退職金はB/Sに解約返戻金（解約手当金）が載り、税金ありB/Sでは死亡給付金に置き換える。
    else if (deemedConfig(position)) {
      const benefitJpy = deemedBenefitJpy(position);
      if (!hasDeemedBenefit(position)) deemedBenefitMissingCount += 1;
      if (position.category === "INSURANCE") { insurance += position.valueJpy; insuranceDeathBenefit += benefitJpy; }
      else { retirementAllowance += position.valueJpy; retirementDeathBenefit += benefitJpy; }
    }
    else if (position.category === "PRIVATE_SHARES") privateShares += position.valueJpy;
    else if (position.category === "BUSINESS_ASSETS") businessAssets += position.valueJpy;
    else if (position.category === "LOAN_RECEIVABLE") loanReceivables += position.valueJpy;
    else if (position.category === "HOME_REAL_ESTATE") homeRealEstate += position.valueJpy;
    else if (position.category === "REAL_ESTATE") incomeRealEstate += position.valueJpy;
    else if (position.category === "BUSINESS_REAL_ESTATE") businessRealEstate += position.valueJpy;
    else if (position.category === "IDLE_REAL_ESTATE") idleRealEstate += position.valueJpy;
    else if (position.category === "OTHER_REAL_ESTATE") otherRealEstate += position.valueJpy;
    else otherAssets += position.valueJpy;
  }
  return {
    financial: deposits + securities + insurance + retirementAllowance,
    deposits, securities, insurance, insuranceDeathBenefit, retirementAllowance, retirementDeathBenefit, deemedBenefitMissingCount,
    business: privateShares + businessAssets + loanReceivables,
    privateShares, businessAssets, loanReceivables,
    realEstate: homeRealEstate + incomeRealEstate + businessRealEstate + idleRealEstate + otherRealEstate,
    homeRealEstate, incomeRealEstate, businessRealEstate, idleRealEstate, otherRealEstate, otherAssets,
  };
}

/** 負債の内訳（借入金とその他負債）。個人保証はB/S外なので含めない（`totals` 側で分けている）。 */
export function loanBreakdownTotals(positions: Position[]) {
  let home = 0, investmentProperty = 0, securities = 0, business = 0, other = 0;
  let leaseObligations = 0, accountsPayable = 0, depositsReceived = 0;
  for (const position of positions) {
    if (position.side !== "LIABILITY" || !position.includedInNetWorth) continue;
    if (position.category === "LOAN_HOME") home += position.valueJpy;
    else if (position.category === "LOAN_INVESTMENT_PROPERTY") investmentProperty += position.valueJpy;
    else if (position.category === "LOAN_SECURITIES") securities += position.valueJpy;
    else if (position.category === "LOAN_BUSINESS") business += position.valueJpy;
    else if (position.category === "LEASE_OBLIGATION") leaseObligations += position.valueJpy;
    else if (position.category === "ACCOUNTS_PAYABLE") accountsPayable += position.valueJpy;
    else if (position.category === "DEPOSITS_RECEIVED") depositsReceived += position.valueJpy;
    else other += position.valueJpy;
  }
  return {
    home, investmentProperty, securities, business, other, borrowings: home + investmentProperty + securities + business + other,
    leaseObligations, accountsPayable, depositsReceived, otherLiabilities: leaseObligations + accountsPayable + depositsReceived,
  };
}

/**
 * 貸借対照表1枚分の表示値。「税金なし（現在価値）」と「税金あり（相続時予測）」では
 * 保険・退職金の金額と税金区画の有無だけが変わるので、シナリオを引数にして同じ式から作る。
 */
export function buildBalanceView({ scenario, summary, successionAssets, loanBreakdown, estimatedInheritanceTax, otherTaxes, successionCosts }: {
  scenario: BalanceScenario;
  summary: ReturnType<typeof totals>;
  successionAssets: SuccessionAssets;
  loanBreakdown: LoanBreakdown;
  estimatedInheritanceTax: number;
  otherTaxes: number;
  successionCosts: number;
}) {
  const taxIncluded = scenario === "with-tax";
  const displayedInsurance = taxIncluded ? successionAssets.insuranceDeathBenefit : successionAssets.insurance;
  const displayedRetirement = taxIncluded ? successionAssets.retirementDeathBenefit : successionAssets.retirementAllowance;
  const displayedAssets = {
    ...successionAssets,
    insurance: displayedInsurance,
    retirementAllowance: displayedRetirement,
    financial: successionAssets.deposits + successionAssets.securities + displayedInsurance + displayedRetirement,
  };
  const displayedAssetTotal = summary.assets - successionAssets.insurance - successionAssets.retirementAllowance + displayedInsurance + displayedRetirement;
  const displayedTaxes = taxIncluded ? estimatedInheritanceTax + otherTaxes : 0;
  const displayedSuccessionCosts = taxIncluded ? successionCosts : 0;
  const forecastAdjustments = displayedTaxes + displayedSuccessionCosts;
  const displayedNetWorth = displayedAssetTotal - summary.liabilities - forecastAdjustments;
  const fundingAreaTotal = summary.liabilities + forecastAdjustments + Math.abs(displayedNetWorth);
  // 小分類は枠内描画と枠外注記の両方から使うので、JSX に直書きせずデータで持つ。
  const nonZero = (items: { label: string; value: number }[]) => items.filter((item) => item.value !== 0);
  const subtotals = {
    financial: nonZero([
      { label: "預金", value: displayedAssets.deposits },
      { label: "有価証券", value: displayedAssets.securities },
      { label: `生命保険${taxIncluded ? "（死亡保険金）" : "（解約返戻金）"}`, value: displayedAssets.insurance },
      { label: `退職金${taxIncluded ? "（死亡退職金）" : "（解約手当金）"}`, value: displayedAssets.retirementAllowance },
    ]),
    realEstate: nonZero([
      { label: "居宅", value: displayedAssets.homeRealEstate },
      { label: "収益不動産", value: displayedAssets.incomeRealEstate },
      { label: "事業用不動産", value: displayedAssets.businessRealEstate },
      { label: "遊休不動産", value: displayedAssets.idleRealEstate },
      { label: "その他不動産", value: displayedAssets.otherRealEstate },
    ]),
    business: nonZero([
      { label: "自社株", value: displayedAssets.privateShares },
      { label: "事業用資産", value: displayedAssets.businessAssets },
      { label: "貸付金", value: displayedAssets.loanReceivables },
    ]),
    taxes: nonZero([
      { label: "相続税", value: estimatedInheritanceTax },
      { label: "その他税金", value: otherTaxes },
    ]),
    loans: nonZero([
      { label: "住宅ローン", value: loanBreakdown.home },
      { label: "不動産投資ローン", value: loanBreakdown.investmentProperty },
      { label: "証券担保ローン", value: loanBreakdown.securities },
      { label: "事業用借入", value: loanBreakdown.business },
      { label: "その他借入金", value: loanBreakdown.other },
    ]),
    otherLiabilities: nonZero([
      { label: "リース債務", value: loanBreakdown.leaseObligations },
      { label: "未払金", value: loanBreakdown.accountsPayable },
      { label: "預り敷金・保証金", value: loanBreakdown.depositsReceived },
    ]),
  };
  const nonZeroAccount = (account: BsAccount) => account.value !== 0;
  // 区画は上から積む順に並べる。借入金とその他負債は区画を分ける（0円の区画は出さない）。
  const assetAccounts: BsAccount[] = [
    { key: "financial", label: "金融資産", value: displayedAssets.financial, tone: "financial-account", items: subtotals.financial },
    { key: "realEstate", label: "不動産", value: displayedAssets.realEstate, tone: "real-estate-account", items: subtotals.realEstate },
    { key: "business", label: "事業用資産", value: displayedAssets.business, tone: "business-account", items: subtotals.business },
    { key: "otherAssets", label: "その他資産", value: displayedAssets.otherAssets, tone: "other-account" },
  ].filter(nonZeroAccount);
  const fundingAccounts: BsAccount[] = [
    { key: "taxes", label: "税金", value: displayedTaxes, tone: "tax-account", items: subtotals.taxes },
    { key: "loans", label: "借入金", value: loanBreakdown.borrowings, tone: "liability-account", items: subtotals.loans },
    { key: "otherLiabilities", label: "その他負債", value: loanBreakdown.otherLiabilities, tone: "liability-account", items: subtotals.otherLiabilities },
    { key: "successionCosts", label: "承継関連費用", value: displayedSuccessionCosts, tone: "forecast-account", caption: "承継時の諸費用", captionClassName: "bs-subcategories" },
    { key: "netWorth", label: "純資産", value: displayedNetWorth, tone: "net-assets", caption: taxIncluded ? "資産 − 負債 − 税金等" : "資産 − 負債" },
  ].filter(nonZeroAccount);
  // 注記番号は資産側から通し番号にする（画面の引き出し線・スマホの番号付き一覧で共通）。
  const callouts = [...sideCallouts("asset", assetAccounts, displayedAssetTotal), ...sideCallouts("funding", fundingAccounts, fundingAreaTotal)]
    .map((callout, index) => ({ ...callout, no: index + 1 }));
  return { taxIncluded, assetAccounts, fundingAccounts, callouts, displayedAssets, displayedAssetTotal, displayedTaxes, displayedSuccessionCosts, forecastAdjustments, displayedNetWorth, fundingAreaTotal, subtotals };
}
