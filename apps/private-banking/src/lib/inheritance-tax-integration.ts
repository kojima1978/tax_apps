import { legalHeirNames } from "@/lib/family";
import { deemedAllocations, deemedBenefit, splitBenefit, type Portfolio } from "@/lib/portfolio-view";

const JPY_PER_MAN_YEN = 10_000;
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
  // 非課税枠は法定相続人が受け取る分にだけ適用される。受取人名を親族関係の登録と突き合わせて判定する。
  const heirNames = legalHeirNames(portfolio.familyMembers ?? []);
  // 受取人が親族関係タブに無い（未選択・登録前の自由入力）と非課税枠が黙って0になるので、件数を数えて警告に使う。
  const registeredNames = new Set((portfolio.familyMembers ?? []).map((member) => member.name.trim()).filter(Boolean));
  let unregisteredRecipientCount = 0;
  const countUnregisteredRecipient = (recipient: string | undefined, benefitJpy: number) => {
    if (benefitJpy > 0 && !registeredNames.has((recipient ?? "").trim())) unregisteredRecipientCount += 1;
  };

  let assets = 0;
  let liabilities = 0;
  let financialAssetsJpy = 0;
  let realEstateJpy = 0;
  let businessAssetsJpy = 0;
  let otherAssetsJpy = 0;
  let insuranceSurrenderValueJpy = 0;
  let smallLotReductionRaw = 0;
  const insuranceContracts: Array<{ deathBenefitJpy: number; beneficiaryIsLegalHeir: boolean }> = [];
  let retirementSurrenderValueJpy = 0;
  const retirementContracts: Array<{ deathBenefitJpy: number; recipientIsLegalHeir: boolean }> = [];
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
          countUnregisteredRecipient(allocation.recipient, deathBenefitJpy);
          const isLegalHeir = heirNames.has(allocation.recipient.trim());
          if (isInsurance) insuranceContracts.push({ deathBenefitJpy, beneficiaryIsLegalHeir: isLegalHeir });
          else retirementContracts.push({ deathBenefitJpy, recipientIsLegalHeir: isLegalHeir });
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
