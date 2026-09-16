import { describe, expect, it } from "vitest";
import { ageOnDate, defaultSpecialTaxAddition, familyComposition, formatShareText, legalShareFor, parseShareText } from "@/lib/family";

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
