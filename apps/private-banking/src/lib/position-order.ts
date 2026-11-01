import { categoryRank, middleClassification, middleClassificationRank, positionSection, propertyTypeOf, type Position } from "@/lib/portfolio-view";

const sectionRank = { ASSET: 0, LIABILITY: 1, CONTINGENT: 2 };

/** 資産・負債一覧の標準順。別帳票の参照番号にも同じ並びを使う。 */
export function comparePositionClassification(a: Position, b: Position) {
  return sectionRank[positionSection(a)] - sectionRank[positionSection(b)]
    || (middleClassificationRank.get(middleClassification(a)) ?? 99) - (middleClassificationRank.get(middleClassification(b)) ?? 99)
    || (categoryRank.get(a.category) ?? 99) - (categoryRank.get(b.category) ?? 99)
    || (propertyTypeOf(a) === "BUILDING" ? 1 : 0) - (propertyTypeOf(b) === "BUILDING" ? 1 : 0);
}
