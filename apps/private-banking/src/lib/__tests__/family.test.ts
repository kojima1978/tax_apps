import { describe, expect, it } from "vitest";
import { type FamilyMember, ageOnDate, defaultSpecialTaxAddition, familyComposition, formatShareText, legalShareFor, parseShareText, taxAdjustmentsFor } from "@/lib/family";

const member = (relationship: "SELF" | "SPOUSE" | "CHILD" | "PARENT" | "SIBLING", acquisitionReason = "INHERITANCE") => ({
  relationship,
  acquisitionReason: acquisitionReason as "INHERITANCE" | "OTHER",
});

describe("familyComposition", () => {
  it("子がいる場合は後順位の親を相続人数へ含めない", () => {
    expect(familyComposition([
      member("SPOUSE"),
      member("CHILD"),
      member("CHILD"),
      member("PARENT"),
    ])).toEqual({ hasSpouse: true, heirRank: "rank1", heirCount: 2 });
  });

  it("相続以外の取得原因は法定相続人の集計へ含めない", () => {
    expect(familyComposition([
      member("SPOUSE", "OTHER"),
      member("SIBLING"),
      member("SIBLING"),
    ])).toEqual({ hasSpouse: false, heirRank: "rank3", heirCount: 2 });
  });
});

describe("legalShareFor", () => {
  it("配偶者と子2名の法定相続分を算出する", () => {
    const members = [member("SPOUSE"), member("CHILD"), member("CHILD")];
    expect(legalShareFor(members[0], members)).toEqual({ numerator: 1, denominator: 2 });
    expect(legalShareFor(members[1], members)).toEqual({ numerator: 1, denominator: 4 });
  });

  it("配偶者と兄弟姉妹2名の法定相続分を算出する", () => {
    const members = [member("SPOUSE"), member("SIBLING"), member("SIBLING")];
    expect(legalShareFor(members[0], members)).toEqual({ numerator: 3, denominator: 4 });
    expect(legalShareFor(members[1], members)).toEqual({ numerator: 1, denominator: 8 });
  });
});

describe("ageOnDate", () => {
  it("基準日時点で誕生日前なら1歳差し引く", () => {
    expect(ageOnDate("1974-03-03", "2024-03-02")).toBe(49);
    expect(ageOnDate("1974-03-03", "2024-03-03")).toBe(50);
  });
});

describe("parseShareText", () => {
  it("「1/2」形式を分子・分母に分け、全角や空白も受け付ける", () => {
    expect(parseShareText("1/2")).toEqual({ numerator: 1, denominator: 2 });
    expect(parseShareText(" １ ／ ４ ")).toEqual({ numerator: 1, denominator: 4 });
    expect(parseShareText("1")).toEqual({ numerator: 1, denominator: 1 });
  });

  it("空欄は null、読めない入力と分母0は invalid", () => {
    expect(parseShareText("  ")).toBeNull();
    expect(parseShareText("1/")).toBe("invalid");
    expect(parseShareText("0.5")).toBe("invalid");
    expect(parseShareText("1/0")).toBe("invalid");
  });

  it("formatShareText と往復できる", () => {
    expect(parseShareText(formatShareText(2, 3))).toEqual({ numerator: 2, denominator: 3 });
    expect(formatShareText(null, 2)).toBe("");
  });
});

describe("defaultSpecialTaxAddition", () => {
  it("配偶者・子・父母は対象外、それ以外の親族は対象", () => {
    expect(["SPOUSE", "CHILD", "PARENT"].map((value) => defaultSpecialTaxAddition(value as never))).toEqual([false, false, false]);
    expect(["GRANDCHILD", "SIBLING", "NIECE_NEPHEW", "OTHER"].map((value) => defaultSpecialTaxAddition(value as never))).toEqual([true, true, true, true]);
  });
});

describe("taxAdjustmentsFor", () => {
  const relative = (overrides: Partial<FamilyMember>): FamilyMember => ({
    id: 1, name: "", nameKana: "", relationship: "CHILD", acquisitionReason: "INHERITANCE",
    civilShareNumerator: null, civilShareDenominator: null, taxShareNumerator: null, taxShareDenominator: null,
    specialTaxAddition: false, disabilityCategory: "NONE", birthDate: null, note: "", sortOrder: 0,
    ...overrides,
  });
  const adjustments = (member: FamilyMember, members: FamilyMember[]) => taxAdjustmentsFor(member, members, "2026-01-01");

  it("配偶者は配偶者税額控除、18歳未満の子は未成年者控除、障害者区分のある子は障害者控除が該当あり", () => {
    const spouse = relative({ id: 1, relationship: "SPOUSE", birthDate: "1960-05-01" });
    const minor = relative({ id: 2, birthDate: "2010-01-02" });
    const disabled = relative({ id: 3, birthDate: "1990-01-01", disabilityCategory: "SPECIAL" });
    const members = [spouse, minor, disabled];

    expect(adjustments(spouse, members)).toEqual({ specialTaxAddition: false, spouseCredit: true, minorCredit: false, disabilityCredit: false });
    expect(adjustments(minor, members)).toEqual({ specialTaxAddition: false, spouseCredit: false, minorCredit: true, disabilityCredit: false });
    expect(adjustments(disabled, members)).toEqual({ specialTaxAddition: false, spouseCredit: false, minorCredit: false, disabilityCredit: true });
  });

  it("18歳の誕生日を迎えていれば未成年者控除は該当なし", () => {
    const child = relative({ birthDate: "2008-01-01" });
    expect(adjustments(child, [child]).minorCredit).toBe(false);
    const dayBefore = relative({ birthDate: "2008-01-02" });
    expect(adjustments(dayBefore, [dayBefore]).minorCredit).toBe(true);
  });

  it("相続人でない親族は、年齢や障害者区分にかかわらず控除の対象にしない", () => {
    // 子（第1順位）がいるので、後順位の父母・兄弟姉妹は相続人にならない
    const child = relative({ id: 1 });
    const parent = relative({ id: 2, relationship: "PARENT", birthDate: "1940-01-01", disabilityCategory: "GENERAL" });
    const sibling = relative({ id: 3, relationship: "SIBLING", birthDate: "2015-01-01", specialTaxAddition: true });
    const members = [child, parent, sibling];

    expect(adjustments(parent, members)).toEqual({ specialTaxAddition: false, spouseCredit: false, minorCredit: false, disabilityCredit: false });
    // 2割加算は登録値そのままなので、相続人でなくても該当ありのまま出す
    expect(adjustments(sibling, members)).toEqual({ specialTaxAddition: true, spouseCredit: false, minorCredit: false, disabilityCredit: false });
  });

  it("子と同順位の孫は相続人として扱う（代襲相続の登録を想定）", () => {
    const child = relative({ id: 1 });
    const grandchild = relative({ id: 2, relationship: "GRANDCHILD", birthDate: "2015-01-01", specialTaxAddition: true });
    expect(adjustments(grandchild, [child, grandchild])).toEqual({ specialTaxAddition: true, spouseCredit: false, minorCredit: true, disabilityCredit: false });
  });

  it("相続で取得しない配偶者は配偶者税額控除の対象にしない（概算計算と同じ基準）", () => {
    const spouse = relative({ id: 1, relationship: "SPOUSE", acquisitionReason: "GIFT", birthDate: "1960-05-01" });
    const child = relative({ id: 2 });
    expect(adjustments(spouse, [spouse, child]).spouseCredit).toBe(false);
  });

  it("生年月日が未登録の相続人は、未成年者控除を判定できないので null", () => {
    const child = relative({ birthDate: null });
    expect(adjustments(child, [child]).minorCredit).toBeNull();
  });
});
