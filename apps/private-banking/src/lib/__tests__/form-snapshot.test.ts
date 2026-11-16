import { describe, expect, it } from "vitest";
import { serializeFormEntries } from "@/lib/form-snapshot";

const entries = (pairs: [string, string][]) => {
  const data = new FormData();
  for (const [name, value] of pairs) data.append(name, value);
  return data.entries();
};

describe("serializeFormEntries（保存していない変更の判定）", () => {
  it("同じ内容なら同じ文字列になる", () => {
    expect(serializeFormEntries(entries([["name", "普通預金"], ["originalAmount", "1000"]])))
      .toBe(serializeFormEntries(entries([["name", "普通預金"], ["originalAmount", "1000"]])));
  });

  it("値が1文字でも違えば違う文字列になる", () => {
    expect(serializeFormEntries(entries([["name", "普通預金"]])))
      .not.toBe(serializeFormEntries(entries([["name", "普通預金 "]])));
  });

  it("欄が増減したら違う文字列になる（科目を切り替えて欄が入れ替わったとき）", () => {
    expect(serializeFormEntries(entries([["name", ""], ["valuationUnitPrice", ""]])))
      .not.toBe(serializeFormEntries(entries([["name", ""]])));
  });

  it("空欄と、欄そのものが無いことを区別する", () => {
    expect(serializeFormEntries(entries([["note", ""]]))).not.toBe(serializeFormEntries(entries([])));
  });

  it("同じ名前の欄が複数あるときは並びも見る（受取人の行の入れ替え）", () => {
    expect(serializeFormEntries(entries([["recipient", "長男"], ["recipient", "長女"]])))
      .not.toBe(serializeFormEntries(entries([["recipient", "長女"], ["recipient", "長男"]])));
  });

  it("名前と値の境目が違うものを同じにしない", () => {
    expect(serializeFormEntries(entries([["a", "b,c"]]))).not.toBe(serializeFormEntries(entries([["a,b", "c"]])));
  });

  it("ファイルは名前と大きさで比べる", () => {
    const withFile = (name: string, body: string) => {
      const data = new FormData();
      data.append("file", new File([body], name));
      return serializeFormEntries(data.entries());
    };
    expect(withFile("a.json", "12345")).toBe(withFile("a.json", "abcde"));
    expect(withFile("a.json", "12345")).not.toBe(withFile("a.json", "123456"));
    expect(withFile("a.json", "12345")).not.toBe(withFile("b.json", "12345"));
  });
});
