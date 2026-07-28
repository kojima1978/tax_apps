export const relationshipOptions = [
  { value: "SELF", label: "本人" },
  { value: "SPOUSE", label: "配偶者" },
  { value: "CHILD", label: "子" },
  { value: "GRANDCHILD", label: "孫" },
  { value: "PARENT", label: "父母" },
  { value: "GRANDPARENT", label: "祖父母" },
  { value: "SIBLING", label: "兄弟姉妹" },
  { value: "NIECE_NEPHEW", label: "甥・姪" },
  { value: "OTHER", label: "その他" },
] as const;

export const relativeRelationshipOptions = relationshipOptions.filter(({ value }) => value !== "SELF");

export const acquisitionReasonOptions = [
  { value: "INHERITANCE", label: "相続" },
  { value: "BEQUEST", label: "遺贈" },
  { value: "GIFT", label: "生前贈与" },
  { value: "OTHER", label: "その他" },
] as const;

export const disabilityOptions = [
  { value: "NONE", label: "該当なし" },
  { value: "GENERAL", label: "一般障害者" },
  { value: "SPECIAL", label: "特別障害者" },
] as const;

export type Relationship = typeof relationshipOptions[number]["value"];
export type AcquisitionReason = typeof acquisitionReasonOptions[number]["value"];
export type DisabilityCategory = typeof disabilityOptions[number]["value"];

export type FamilyMember = {
  id: number;
  name: string;
  nameKana: string;
  relationship: Relationship;
  acquisitionReason: AcquisitionReason;
  civilShareNumerator: number | null;
  civilShareDenominator: number | null;
  taxShareNumerator: number | null;
  taxShareDenominator: number | null;
  specialTaxAddition: boolean;
  disabilityCategory: DisabilityCategory;
  birthDate: string | null;
  note: string;
  sortOrder: number;
};

export type FamilyMemberDraft = Omit<FamilyMember, "id"> & { id?: number };

export const relationshipLabels = Object.fromEntries(relationshipOptions.map(({ value, label }) => [value, label])) as Record<Relationship, string>;
export const acquisitionReasonLabels = Object.fromEntries(acquisitionReasonOptions.map(({ value, label }) => [value, label])) as Record<AcquisitionReason, string>;
export const disabilityLabels = Object.fromEntries(disabilityOptions.map(({ value, label }) => [value, label])) as Record<DisabilityCategory, string>;

const rank1 = new Set<Relationship>(["CHILD", "GRANDCHILD"]);
const rank2 = new Set<Relationship>(["PARENT", "GRANDPARENT"]);
const rank3 = new Set<Relationship>(["SIBLING", "NIECE_NEPHEW"]);

export function familyComposition(members: Pick<FamilyMemberDraft, "relationship" | "acquisitionReason">[]) {
  const heirs = members.filter((member) => member.acquisitionReason === "INHERITANCE" && member.relationship !== "SELF");
  const hasSpouse = heirs.some((member) => member.relationship === "SPOUSE");
  const selectedRank = heirs.some((member) => rank1.has(member.relationship))
    ? "rank1"
    : heirs.some((member) => rank2.has(member.relationship))
      ? "rank2"
      : heirs.some((member) => rank3.has(member.relationship))
        ? "rank3"
        : "none";
  const selectedRelationships = selectedRank === "rank1" ? rank1 : selectedRank === "rank2" ? rank2 : selectedRank === "rank3" ? rank3 : new Set<Relationship>();
  return {
    hasSpouse,
    heirRank: selectedRank as "none" | "rank1" | "rank2" | "rank3",
    heirCount: heirs.filter((member) => selectedRelationships.has(member.relationship)).length,
  };
}

function share(numerator: number, denominator: number) {
  return { numerator, denominator };
}

export function legalShareFor(member: Pick<FamilyMemberDraft, "relationship">, members: Pick<FamilyMemberDraft, "relationship" | "acquisitionReason">[]) {
  const composition = familyComposition(members);
  if (member.relationship === "SELF" || member.relationship === "OTHER") return null;
  const isSpouse = member.relationship === "SPOUSE";
  if (isSpouse && !composition.hasSpouse) return null;
  if (isSpouse) {
    if (composition.heirRank === "rank1") return share(1, 2);
    if (composition.heirRank === "rank2") return share(2, 3);
    if (composition.heirRank === "rank3") return share(3, 4);
    return share(1, 1);
  }
  const memberRank = rank1.has(member.relationship) ? "rank1" : rank2.has(member.relationship) ? "rank2" : rank3.has(member.relationship) ? "rank3" : "none";
  if (memberRank !== composition.heirRank || composition.heirCount === 0) return null;
  const commonDenominator = composition.hasSpouse
    ? composition.heirRank === "rank1" ? 2 : composition.heirRank === "rank2" ? 3 : 4
    : 1;
  const groupNumerator = composition.hasSpouse ? 1 : 1;
  return share(groupNumerator, commonDenominator * composition.heirCount);
}

export function ageOnDate(birthDate: string | null, referenceDate: string) {
  if (!birthDate) return null;
  const birth = new Date(`${birthDate}T00:00:00Z`);
  const reference = new Date(`${referenceDate}T00:00:00Z`);
  if (Number.isNaN(birth.getTime()) || birth > reference) return null;
  let age = reference.getUTCFullYear() - birth.getUTCFullYear();
  if (
    reference.getUTCMonth() < birth.getUTCMonth()
    || (reference.getUTCMonth() === birth.getUTCMonth() && reference.getUTCDate() < birth.getUTCDate())
  ) age -= 1;
  return age;
}
