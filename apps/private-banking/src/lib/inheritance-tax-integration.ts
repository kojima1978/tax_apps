import type { Portfolio } from "@/lib/portfolio-view";

const JPY_PER_MAN_YEN = 10_000;

export function createInheritanceTaxRequest(portfolio: Portfolio) {
  const current = portfolio.snapshots.find((snapshot) => snapshot.isCurrent);
  if (!current) throw new Error("CURRENT_SNAPSHOT_NOT_FOUND");

  let assets = 0;
  let liabilities = 0;
  let insuranceSurrenderValueJpy = 0;
  const insuranceContracts: Array<{ deathBenefitJpy: number; beneficiaryIsLegalHeir: boolean }> = [];
  for (const position of current.positions) {
    if (position.side === "ASSET") {
      assets += position.valueJpy;
      if (position.category === "INSURANCE") {
        insuranceSurrenderValueJpy += position.valueJpy;
        insuranceContracts.push({
          deathBenefitJpy: Math.round(((position.assetDetails?.deathBenefit ?? 0) * position.fxRate) / JPY_PER_MAN_YEN) * JPY_PER_MAN_YEN,
          beneficiaryIsLegalHeir: position.assetDetails?.beneficiaryIsLegalHeir === true,
        });
      }
    }
    else if (position.side === "LIABILITY" && position.includedInNetWorth) liabilities += position.valueJpy;
  }

  const estimatedNetEstate = Math.max(0, assets - liabilities);
  return {
    snapshotId: current.id,
    estimatedNetEstate,
    request: {
      estateValueJpy: Math.round(estimatedNetEstate / JPY_PER_MAN_YEN) * JPY_PER_MAN_YEN,
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
    },
  };
}
