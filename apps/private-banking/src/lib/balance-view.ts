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

/**
 * 区画エリア（科目を積む領域）の高さ(px)。一番狭いのは画面で、印刷ではない。
 * 画面は `.classified-bs` の `clamp(420px, calc(100dvh - 330px), 720px)` の下限 420px から
 * 見出し（32.6px）と合計欄（35px）を引いた実測 326px。ウィンドウの縦が 750px 以下なら幅に
 * よらずここへ張り付くので、普通のノートPCでは常にこの高さ。印刷は `height: 120mm`（約453px）
 * から見出しと合計欄（計約70px）を引いた実測 382.5〜384.5px で、画面より広い。
 * 印刷は注記が同じ側に2つ以上並ぶ回だけ 106mm へ縮めるが（A4横1枚に収めるため）、
 * 縮めた後も約330px（実測329.6〜331.6px）でこの値を下回らない。globals.css の印刷側を
 * 触るときはそこを崩さないこと ──
 * 下回ると印刷だけ注記の付かない切れた区画ができる。
 */
const AREA_HEIGHT = 326;
/** これ未満の面積比の区画は中身を出さない（micro-account）。 */
export const MICRO_AREA_RATIO = 0.02;
/** これ未満の面積比の区画は、文字が読めないので表の下へ注記する（compact-account）。 */
export const SMALL_AREA_RATIO = 0.04;
/** これ未満の面積比の区画は、字と余白を詰めて描く（dense-account）。 */
export const DENSE_AREA_RATIO = 0.22;

/**
 * 小分類つきの区画が内訳まで出し切るのに要る高さ(px)。globals.css の密度クラスごとの実測値。
 * 詰めない区画: 上下余白18 ＋ 見出し29 ＋ 内訳の枠12（上余白7・罫線1・上余白4）＋ 下罫線2 ＋ 1行19px。
 * dense-account: 上下余白6 ＋ 見出し12 ＋ 内訳の枠2 ＋ 1行10px。ただし4行以上は
 * `:has(.bs-subtotals > div:nth-child(4))` で更に詰まり、見出し10 ＋ 1行13px になる。
 */
function requiredHeight(ratio: number, itemCount: number) {
  if (ratio >= DENSE_AREA_RATIO) return 61 + itemCount * 19;
  return itemCount >= 4 ? 18 + itemCount * 13 : 20 + itemCount * 10;
}

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
    // 内訳が枠に収まらない区画は内訳ごと注記へ回す。一番狭い状態に合わせて判定するので、
    // 縦に余裕のあるウィンドウでは切れていなくても注記が出る。画面と印刷で同じ番号を使うため、
    // 描画後のDOMではなく面積比から決めている（余る注記は重複で済むが、欠けると情報が消える）。
    const clipped = items.length > 0 && ratio * AREA_HEIGHT < requiredHeight(ratio, items.length);
    if (!small && !clipped) return [];
    return [{ key: account.key, side, label: account.label, value: account.value, tone: account.tone, items: clipped ? items : [], anchor }];
  });
}

/** 中分類（金融資産・不動産・事業用資産）ごとの資産集計。貸借対照表の区画はこの数値で高さを決める。 */
export function successionAssetTotals(positions: Position[]) {
  let deposits = 0, securities = 0, insurance = 0, insuranceDeathBenefit = 0, insuranceRights = 0, retirementAllowance = 0, retirementDeathBenefit = 0, deemedBenefitMissingCount = 0, privateShares = 0, businessAssets = 0, loanReceivables = 0;
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
    // 生命保険契約に関する権利は保険事故が起きていないので置き換えが無い。税金ありB/Sでも解約返戻金のまま残す。
    else if (position.category === "INSURANCE_RIGHTS") insuranceRights += position.valueJpy;
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
    financial: deposits + securities + insurance + insuranceRights + retirementAllowance,
    deposits, securities, insurance, insuranceDeathBenefit, insuranceRights, retirementAllowance, retirementDeathBenefit, deemedBenefitMissingCount,
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
    financial: successionAssets.deposits + successionAssets.securities + displayedInsurance + successionAssets.insuranceRights + displayedRetirement,
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
      // 契約に関する権利はどちらのシナリオでも解約返戻金相当額なので、科目名に括弧書きを付けない。
      { label: "生命保険契約に関する権利", value: displayedAssets.insuranceRights },
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
