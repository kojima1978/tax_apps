import { describe, expect, it } from "vitest";
import {
  adoptedPropertyLocationDetails, findMunicipality, findMunicipalityCandidates, municipalities, normalizePropertyLocationFields,
  parsePropertyLocation, propertyLocationDraft, propertyLocationOf,
} from "@/lib/municipality";
import { composedPropertyLocation, normalizeAza, normalizeLotNumber, propertyLocationText, storedPropertyLocation } from "@/lib/property-location";

// 町名・地番は架空のもの（市区町村名だけ表に合わせて実在の名前を使う）

describe("市区町村の表", () => {
  it("47都道府県・団体コードは5桁で重複しない", () => {
    expect(new Set(municipalities.map((item) => item.prefecture)).size).toBe(47);
    expect(municipalities.every((item) => /^\d{5}$/.test(item.code))).toBe(true);
    expect(new Set(municipalities.map((item) => item.code)).size).toBe(municipalities.length);
  });
});

describe("findMunicipality", () => {
  it("都道府県から書いた名前・都道府県を除いた名前のどちらでも引ける", () => {
    expect(findMunicipality("東京都港区")).toMatchObject({ code: "13103", name: "東京都港区" });
    expect(findMunicipality("港区")?.code).toBe("13103");
    expect(findMunicipality(" 東京都 港区 ")?.code).toBe("13103");
  });

  it("郡名を外した町村名でも引け、保存する名前は郡から書く", () => {
    expect(findMunicipality("北海道余市町")).toMatchObject({ code: "01408", name: "北海道余市郡余市町" });
  });

  it("「ヶ」と「ケ」の揺れを吸収する", () => {
    expect(findMunicipality("鎌ヶ谷市")).toMatchObject({ code: "12224", name: "千葉県鎌ケ谷市" });
  });

  it("同じ名前が複数の都道府県にあれば、都道府県が無いと決めない", () => {
    expect(findMunicipality("府中市")).toBeNull();
    expect(findMunicipalityCandidates("府中市").map((item) => item.code)).toEqual(["13206", "34208"]);
    expect(findMunicipality("東京都府中市")?.code).toBe("13206");
    expect(findMunicipality("広島県府中市")?.code).toBe("34208");
  });

  it("表に無い名前・空は null", () => {
    expect(findMunicipality("テスト市")).toBeNull();
    expect(findMunicipality("")).toBeNull();
    expect(findMunicipality("東京都")).toBeNull();
  });
});

describe("normalizeLotNumber / normalizeAza", () => {
  it.each([
    ["123-4", "123番4"], ["１２３－４", "123番4"], ["123ー4", "123番4"], ["123番地4", "123番4"], ["123番地の4", "123番4"],
    ["123の4", "123番4"], ["123番4", "123番4"], ["123", "123番"], ["123番地", "123番"], ["123番4外", "123番4外"],
  ])("%s → %s", (input, expected) => expect(normalizeLotNumber(input)).toBe(expected));

  it("字は先頭の「字」を外し、「大字」は残す", () => {
    expect(normalizeAza("字テスト")).toBe("テスト");
    expect(normalizeAza("大字テスト")).toBe("大字テスト");
    expect(normalizeAza("字")).toBe("字");
  });
});

describe("parsePropertyLocation", () => {
  it("市区町村・町名・地番に分け、市区町村コードを付ける", () => {
    expect(parsePropertyLocation("東京都港区テスト一丁目123番4")).toEqual({
      location: { municipalityCode: "13103", municipalityName: "東京都港区", townName: "テスト一丁目", aza: "", lotNumber: "123番4", houseNumber: "", source: "東京都港区テスト一丁目123番4" },
      problems: [],
    });
  });

  it("全角数字・全角ハイフンの地番も揃える", () => {
    expect(parsePropertyLocation("東京都港区テスト一丁目１２３－４").location.lotNumber).toBe("123番4");
  });

  it("大字の後ろの字を分ける", () => {
    expect(parsePropertyLocation("北海道余市郡余市町大字テスト字サンプル45番地").location).toMatchObject({
      municipalityCode: "01408", townName: "大字テスト", aza: "サンプル", lotNumber: "45番",
    });
  });

  it("郡名を省いた原文でも照合する", () => {
    expect(parsePropertyLocation("北海道余市町大字テスト12番3").location).toMatchObject({
      municipalityName: "北海道余市郡余市町", townName: "大字テスト", lotNumber: "12番3",
    });
  });

  it("地名の一部の「字」（十文字町など）では分けない", () => {
    expect(parsePropertyLocation("秋田県横手市十文字町テスト1番2").location).toMatchObject({
      municipalityCode: "05203", townName: "十文字町テスト", aza: "", lotNumber: "1番2",
    });
  });

  it("町名の「ヶ」は原文のまま残し、市区町村名は表の書き方にする", () => {
    expect(parsePropertyLocation("千葉県鎌ヶ谷市テストヶ丘1-1").location).toMatchObject({
      municipalityName: "千葉県鎌ケ谷市", townName: "テストヶ丘", lotNumber: "1番1",
    });
  });

  it("同じ名前の市が複数あるときは分けずに知らせる", () => {
    const parsed = parsePropertyLocation("府中市テスト町1番");
    expect(parsed.location.municipalityName).toBe("");
    expect(parsed.problems).toEqual(["同じ名前の市区町村が複数あります。都道府県から入力してください。"]);
    expect(parsePropertyLocation("東京都府中市テスト町1番").location.municipalityCode).toBe("13206");
  });

  it("照合できない原文は分けずに知らせる", () => {
    expect(parsePropertyLocation("テスト県テスト市1番").problems).toEqual(["市区町村を照合できませんでした。"]);
  });

  it("住居表示は地番として扱わない", () => {
    const parsed = parsePropertyLocation("東京都港区テスト1-2-3");
    expect(parsed.location).toMatchObject({ municipalityCode: "13103", townName: "テスト", lotNumber: "" });
    expect(parsed.problems[0]).toContain("住居表示");
    expect(parsePropertyLocation("東京都港区テスト一丁目2番3号").location.lotNumber).toBe("");
  });

  it("空白の後ろ（建物名など）は分けずに知らせる", () => {
    const parsed = parsePropertyLocation("東京都港区テスト一丁目123番4 サンプルマンション101");
    expect(parsed.location.lotNumber).toBe("123番4");
    expect(parsed.problems).toEqual(["後ろの「サンプルマンション101」は分けていません。"]);
  });

  it("地番が無ければ町名までにして知らせる", () => {
    const parsed = parsePropertyLocation("東京都港区テスト");
    expect(parsed.location).toMatchObject({ townName: "テスト", lotNumber: "" });
    expect(parsed.problems).toEqual(["地番を見つけられませんでした。"]);
  });
});

describe("保存済みの所在の読み方", () => {
  it("構造を保存していればそれを使い、原文から分けない", () => {
    const details = { municipalityName: "東京都港区", municipalityCode: "13103", lotNumber: "1番", propertyAddress: "港区テスト1" };
    expect(propertyLocationOf(details)).toMatchObject({ inferred: false, location: { townName: "", lotNumber: "1番", source: "港区テスト1" } });
  });

  it("原文だけの古い明細は分けた案を返す（inferred）", () => {
    expect(propertyLocationOf({ propertyAddress: "東京都港区テスト2番" })).toMatchObject({ inferred: true, location: { municipalityCode: "13103", lotNumber: "2番" } });
    expect(propertyLocationOf({})).toMatchObject({ inferred: false, problems: [] });
  });

  it("表示は市区町村と地番がそろえば構造から組み、そうでなければ原文", () => {
    const stored = storedPropertyLocation({ municipalityName: "北海道余市郡余市町", townName: "大字テスト", aza: "サンプル", lotNumber: "45番", houseNumber: "45番1", propertyAddress: "原文" });
    expect(composedPropertyLocation(stored)).toBe("北海道余市郡余市町大字テスト字サンプル45番　家屋番号 45番1");
    expect(propertyLocationText({ municipalityName: "東京都港区", propertyAddress: "東京都港区テスト1-2-3" })).toBe("東京都港区テスト1-2-3");
    expect(propertyLocationText({ propertyAddress: "東京都港区テスト1-2-3" })).toBe("東京都港区テスト1-2-3");
    expect(propertyLocationText(null)).toBe("");
  });
});

describe("normalizePropertyLocationFields", () => {
  it("市区町村コードは名前から付け直し（送られたコードは使わない）、名前・地番・字を揃える", () => {
    expect(normalizePropertyLocationFields({ municipalityName: "港区", municipalityCode: "99999", townName: "", aza: "字テスト", lotNumber: "1-2", propertyAddress: "x" })).toEqual({
      municipalityName: "東京都港区", municipalityCode: "13103", aza: "テスト", lotNumber: "1番2", propertyAddress: "x",
    });
  });

  it("表に無い名前は入力のまま残し、コードを付けない", () => {
    expect(normalizePropertyLocationFields({ municipalityName: "テスト市", municipalityCode: "13103" })).toEqual({ municipalityName: "テスト市" });
  });

  it("所在の欄が無い明細はそのまま", () => {
    expect(normalizePropertyLocationFields({ propertyAddress: "東京都港区テスト1" })).toEqual({ propertyAddress: "東京都港区テスト1" });
  });
});

describe("所在をまとめて分ける", () => {
  it("対象は構造を持たず原文だけがある明細。分け切れなかった点も一緒に返す", () => {
    expect(propertyLocationDraft({ propertyAddress: "東京都港区テスト一丁目123番4" })).toEqual({
      location: expect.objectContaining({ municipalityCode: "13103", townName: "テスト一丁目", lotNumber: "123番4" }), problems: [],
    });
    expect(propertyLocationDraft({ propertyAddress: "東京都港区テスト1-2-3" })?.problems[0]).toContain("住居表示");
    expect(propertyLocationDraft({ propertyAddress: "港区テスト1", municipalityName: "東京都港区" })).toBeNull();
    expect(propertyLocationDraft({})).toBeNull();
    expect(propertyLocationDraft(null)).toBeNull();
  });

  it("所在の欄だけを足し、原文・ほかの補足項目は変えない", () => {
    const details = { propertyAddress: "北海道余市町大字テスト字サンプル45番地", landArea: 120.5, propertyPlan: "KEEP" };
    const draft = propertyLocationDraft(details)!;
    expect(adoptedPropertyLocationDetails(details, draft.location)).toEqual({
      propertyAddress: "北海道余市町大字テスト字サンプル45番地", landArea: 120.5, propertyPlan: "KEEP",
      municipalityName: "北海道余市郡余市町", municipalityCode: "01408", townName: "大字テスト", aza: "サンプル", lotNumber: "45番",
    });
  });

  it("家屋番号は案から上書きしない（入っていれば構造ありとして対象外）", () => {
    expect(propertyLocationDraft({ propertyAddress: "東京都港区テスト2番", houseNumber: "2番1" })).toBeNull();
    const location = parsePropertyLocation("東京都港区テスト2番").location;
    expect(adoptedPropertyLocationDetails({ propertyAddress: "東京都港区テスト2番", houseNumber: "2番の1" }, location)).toMatchObject({ houseNumber: "2番1", lotNumber: "2番" });
  });

  it("空の字・町名はキーを作らない", () => {
    const details = { propertyAddress: "東京都港区123番4" };
    expect(adoptedPropertyLocationDetails(details, propertyLocationDraft(details)!.location)).toEqual({
      propertyAddress: "東京都港区123番4", municipalityName: "東京都港区", municipalityCode: "13103", lotNumber: "123番4",
    });
  });
});
