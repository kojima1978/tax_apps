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

/** 中分類（金融資産・不動産・事業用資産）ごとの資産集計。貸借対照表の区画はこの数値で高さを決める。 */
export function successionAssetTotals(positions: Position[]) {
  let deposits = 0, securities = 0, insurance = 0, insuranceDeathBenefit = 0, retirementAllowance = 0, retirementDeathBenefit = 0, deemedBenefitMissingCount = 0, privateShares = 0, businessAssets = 0, loanReceivables = 0;
  let homeRealEstate = 0, incomeRealEstate = 0, idleRealEstate = 0, otherRealEstate = 0, otherAssets = 0;
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
    else if (position.category === "IDLE_REAL_ESTATE") idleRealEstate += position.valueJpy;
    else if (position.category === "OTHER_REAL_ESTATE") otherRealEstate += position.valueJpy;
    else otherAssets += position.valueJpy;
  }
  return {
    financial: deposits + securities + insurance + retirementAllowance,
    deposits, securities, insurance, insuranceDeathBenefit, retirementAllowance, retirementDeathBenefit, deemedBenefitMissingCount,
    business: privateShares + businessAssets + loanReceivables,
    privateShares, businessAssets, loanReceivables,
    realEstate: homeRealEstate + incomeRealEstate + idleRealEstate + otherRealEstate,
    homeRealEstate, incomeRealEstate, idleRealEstate, otherRealEstate, otherAssets,
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
  const smallAreaItems = [
    { side: "資産", label: "金融資産", value: displayedAssets.financial, areaTotal: displayedAssetTotal },
    { side: "資産", label: "不動産", value: displayedAssets.realEstate, areaTotal: displayedAssetTotal },
    { side: "資産", label: "事業用資産", value: displayedAssets.business, areaTotal: displayedAssetTotal },
    { side: "資産", label: "その他資産", value: displayedAssets.otherAssets, areaTotal: displayedAssetTotal },
    { side: "負債・純資産", label: "税金", value: displayedTaxes, areaTotal: fundingAreaTotal },
    { side: "負債・純資産", label: "借入金", value: loanBreakdown.borrowings, areaTotal: fundingAreaTotal },
    { side: "負債・純資産", label: "その他負債", value: loanBreakdown.otherLiabilities, areaTotal: fundingAreaTotal },
    { side: "負債・純資産", label: "承継関連費用", value: displayedSuccessionCosts, areaTotal: fundingAreaTotal },
    { side: "負債・純資産", label: "純資産", value: displayedNetWorth, areaTotal: fundingAreaTotal },
  ].filter((item) => item.value !== 0 && Math.abs(item.value) / Math.max(item.areaTotal, 1) < 0.04);
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
  // 区画の高さは金額比そのままなので、比率が小さい中分類では小分類が枠外にはみ出して切れる。
  // 印刷時の区画エリアは約420px、1区画に必要な高さは 見出し18px ＋ 小分類1行11px。
  // 収まらない中分類だけ、小分類を枠外注記へ回す。
  const clippedSubtotals = [
    { side: "資産", label: "金融資産", value: displayedAssets.financial, areaTotal: displayedAssetTotal, items: subtotals.financial },
    { side: "資産", label: "不動産", value: displayedAssets.realEstate, areaTotal: displayedAssetTotal, items: subtotals.realEstate },
    { side: "資産", label: "事業用資産", value: displayedAssets.business, areaTotal: displayedAssetTotal, items: subtotals.business },
    { side: "負債・純資産", label: "税金", value: displayedTaxes, areaTotal: fundingAreaTotal, items: subtotals.taxes },
    { side: "負債・純資産", label: "借入金", value: loanBreakdown.borrowings, areaTotal: fundingAreaTotal, items: subtotals.loans },
    { side: "負債・純資産", label: "その他負債", value: loanBreakdown.otherLiabilities, areaTotal: fundingAreaTotal, items: subtotals.otherLiabilities },
  ].filter((account) => account.value !== 0 && account.items.length > 0
    && Math.abs(account.value) / Math.max(account.areaTotal, 1) * 420 < 18 + account.items.length * 11);
  // 借入金とその他負債は区画を分けて描く（その他負債は0円なら区画を出さない）。
  const liabilityAccounts = [
    { label: "借入金", value: loanBreakdown.borrowings, items: subtotals.loans },
    { label: "その他負債", value: loanBreakdown.otherLiabilities, items: subtotals.otherLiabilities },
  ].filter((account) => account.value !== 0);
  return { taxIncluded, liabilityAccounts, displayedAssets, displayedAssetTotal, displayedTaxes, displayedSuccessionCosts, forecastAdjustments, displayedNetWorth, fundingAreaTotal, smallAreaItems, subtotals, clippedSubtotals };
}
