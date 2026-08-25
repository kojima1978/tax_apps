import { legalHeirRoster } from "@/lib/family";
import { deemedAllocations, deemedBenefit, splitBenefit, type Portfolio } from "@/lib/portfolio-view";

const JPY_PER_MAN_YEN = 10_000;
// 死亡保険金・死亡退職金の受取人。相続税APIは相続人を人数でしか持たないので、
// 配偶者か・何番目の相続人か・法定相続人以外か、の3択で渡す。
type DeemedRecipient = { kind: "spouse" } | { kind: "heir"; index: number } | { kind: "other" };
const financialCategories = new Set(["DEPOSIT", "SECURITIES", "INSURANCE", "RETIREMENT_ALLOWANCE"]);
const realEstateCategories = new Set(["HOME_REAL_ESTATE", "REAL_ESTATE", "IDLE_REAL_ESTATE"]);
const businessCategories = new Set(["PRIVATE_SHARES", "BUSINESS_ASSETS", "LOAN_RECEIVABLE"]);
// 小規模宅地等の特例（概算）：宅地区分ごとの減額割合と限度面積。限度面積を超える分は面積按分で減額する。
const smallLotRules: Record<string, { rate: number; capSqm: number }> = {
  RESIDENTIAL: { rate: 0.8, capSqm: 330 },
  BUSINESS: { rate: 0.8, capSqm: 400 },
  RENTAL: { rate: 0.5, capSqm: 200 },
};

export function createInheritanceTaxRequest(portfolio: Portfolio) {
  const current = portfolio.snapshots.find((snapshot) => snapshot.isCurrent);
  if (!current) throw new Error("CURRENT_SNAPSHOT_NOT_FOUND");
  // 非課税枠は法定相続人が受け取る分にだけ適用され、みなし相続財産は遺産分割の対象外で
  // 受取人へ直接帰属する。どちらも受取人名を親族関係の登録と突き合わせて判定する。
  const roster = legalHeirRoster(portfolio.familyMembers ?? []);
  const spouseNames = new Set(roster.spouseNames);
  // 同姓同名は先に登録された相続人として扱う（後勝ちにすると並びの意味が変わる）。
  const heirIndexByName = new Map<string, number>();
  roster.heirNames.forEach((name, index) => {
    if (!heirIndexByName.has(name)) heirIndexByName.set(name, index);
  });
  const resolveRecipient = (recipient: string | undefined): DeemedRecipient => {
    const name = (recipient ?? "").trim();
    if (spouseNames.has(name)) return { kind: "spouse" };
    const index = heirIndexByName.get(name);
    return index === undefined ? { kind: "other" } : { kind: "heir", index };
  };
  // 受取人が親族関係タブに無い（未選択・登録前の自由入力）と非課税枠が黙って0になるので、件数を数えて警告に使う。
  const registeredNames = new Set((portfolio.familyMembers ?? []).map((member) => member.name.trim()).filter(Boolean));
  let unregisteredRecipientCount = 0;
  // 法定相続人以外が受取人の分は受取人へ帰属させず按分に混ぜている（相続人以外の取得者としては計算しない）。
  // 実務との差がここに出るので、件数を数えて警告に使う。
  let nonHeirRecipientCount = 0;
  const countRecipient = (recipient: string | undefined, benefitJpy: number, resolved: DeemedRecipient) => {
    if (benefitJpy <= 0) return;
    if (!registeredNames.has((recipient ?? "").trim())) unregisteredRecipientCount += 1;
    if (resolved.kind === "other") nonHeirRecipientCount += 1;
  };

  let assets = 0;
  let liabilities = 0;
  let financialAssetsJpy = 0;
  let realEstateJpy = 0;
  let businessAssetsJpy = 0;
  let otherAssetsJpy = 0;
  let insuranceSurrenderValueJpy = 0;
  let smallLotReductionRaw = 0;
  const insuranceContracts: Array<{ deathBenefitJpy: number; recipient: DeemedRecipient }> = [];
  let retirementSurrenderValueJpy = 0;
  const retirementContracts: Array<{ deathBenefitJpy: number; recipient: DeemedRecipient }> = [];
  for (const position of current.positions) {
    if (position.side === "ASSET") {
      assets += position.valueJpy;
      if (financialCategories.has(position.category)) financialAssetsJpy += position.valueJpy;
      else if (realEstateCategories.has(position.category)) realEstateJpy += position.valueJpy;
      else if (businessCategories.has(position.category)) businessAssetsJpy += position.valueJpy;
      else otherAssetsJpy += position.valueJpy;
      const smallLotRule = smallLotRules[position.assetDetails?.smallLotType ?? ""];
      if (smallLotRule && realEstateCategories.has(position.category)) {
        const area = position.landArea ?? 0;
        const coveredRatio = area > 0 ? Math.min(1, smallLotRule.capSqm / area) : 1;
        smallLotReductionRaw += position.valueJpy * smallLotRule.rate * coveredRatio;
      }
      // 死亡退職金も生命保険と同じ扱い。B/Sには解約手当金が載り、死亡時はそれが死亡退職金に置き換わる。
      // 受取人が複数なら、給付金を分数で割り振って受取人ごとに契約1件として積む（非課税枠の判定が受取人ごとのため）。
      if (position.category === "INSURANCE" || position.category === "RETIREMENT_ALLOWANCE") {
        const isInsurance = position.category === "INSURANCE";
        if (isInsurance) insuranceSurrenderValueJpy += position.valueJpy;
        else retirementSurrenderValueJpy += position.valueJpy;
        const totalBenefitJpy = Math.round((deemedBenefit(position) * position.fxRate) / JPY_PER_MAN_YEN) * JPY_PER_MAN_YEN;
        const allocations = deemedAllocations(position);
        const benefitsJpy = splitBenefit(totalBenefitJpy, allocations, JPY_PER_MAN_YEN);
        allocations.forEach((allocation, index) => {
          const deathBenefitJpy = benefitsJpy[index];
          const contract = { deathBenefitJpy, recipient: resolveRecipient(allocation.recipient) };
          countRecipient(allocation.recipient, deathBenefitJpy, contract.recipient);
          if (isInsurance) insuranceContracts.push(contract);
          else retirementContracts.push(contract);
        });
      }
    }
    else if (position.side === "LIABILITY" && position.includedInNetWorth) liabilities += position.valueJpy;
  }

  const estimatedNetEstate = Math.max(0, assets - liabilities);
  const smallLotReductionJpy = Math.round(smallLotReductionRaw);
  const estateAfterSmallLot = Math.max(0, estimatedNetEstate - smallLotReductionJpy);
  return {
    snapshotId: current.id,
    estimatedNetEstate,
    unregisteredRecipientCount,
    nonHeirRecipientCount,
    source: {
      snapshotId: current.id,
      fiscalYear: current.fiscalYear,
      asOfDate: current.asOfDate,
      financialAssetsJpy,
      realEstateJpy,
      businessAssetsJpy,
      otherAssetsJpy,
      totalAssetsJpy: assets,
      deductibleLiabilitiesJpy: liabilities,
      estimatedNetEstateJpy: estimatedNetEstate,
      smallLotReductionJpy,
    },
    request: {
      estateValueJpy: Math.round(estateAfterSmallLot / JPY_PER_MAN_YEN) * JPY_PER_MAN_YEN,
      familyComposition: {
        hasSpouse: portfolio.planning.hasSpouse,
        selectedRank: portfolio.planning.heirRank,
        heirCount: portfolio.planning.heirRank === "none" ? 0 : portfolio.planning.heirCount,
      },
      spouseAcquisition: { mode: "legal" as const },
      ...(insuranceContracts.length > 0 ? {
        lifeInsurance: {
          surrenderValueJpy: Math.round(insuranceSurrenderValueJpy / JPY_PER_MAN_YEN) * JPY_PER_MAN_YEN,
          contracts: insuranceContracts,
        },
      } : {}),
      ...(retirementContracts.length > 0 ? {
        retirementAllowance: {
          surrenderValueJpy: Math.round(retirementSurrenderValueJpy / JPY_PER_MAN_YEN) * JPY_PER_MAN_YEN,
          contracts: retirementContracts,
        },
      } : {}),
    },
  };
}
