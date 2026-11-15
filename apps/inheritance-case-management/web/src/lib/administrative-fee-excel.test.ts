import { describe, it, expect } from "vitest";
import {
  ADMINISTRATIVE_FEE_EXCEL_HEADERS,
  administrativeFeeItemsToSheetRows,
  parseAdministrativeFeeSheetRows,
} from "./administrative-fee-excel";

describe("administrativeFeeItemsToSheetRows", () => {
  it("1行目に見出しを置き、備考が無い行は空文字にする", () => {
    const rows = administrativeFeeItemsToSheetRows([
      { category: "戸籍収集", name: "戸籍謄本の取得", unitPrice: 2200, note: null },
      { category: "その他", name: "相談", unitPrice: 5500, note: "1時間ごと" },
    ]);
    expect(rows[0]).toEqual([...ADMINISTRATIVE_FEE_EXCEL_HEADERS]);
    expect(rows[1]).toEqual(["戸籍収集", "戸籍謄本の取得", 2200, ""]);
    expect(rows[2]).toEqual(["その他", "相談", 5500, "1時間ごと"]);
  });
});

describe("parseAdministrativeFeeSheetRows", () => {
  it("見出し行と空行を読み飛ばす", () => {
    const { items, errors } = parseAdministrativeFeeSheetRows([
      [...ADMINISTRATIVE_FEE_EXCEL_HEADERS],
      [],
      ["", "", "", ""],
      ["戸籍収集", "戸籍謄本の取得", 2200, ""],
    ]);
    expect(errors).toEqual([]);
    expect(items).toEqual([{ category: "戸籍収集", name: "戸籍謄本の取得", unitPrice: 2200, note: null }]);
  });

  it("分類が空の行は直前の分類を引き継ぐ", () => {
    const { items } = parseAdministrativeFeeSheetRows([
      ["戸籍収集", "戸籍謄本の取得", 2200],
      ["", "除籍謄本の取得", 2200],
    ]);
    expect(items.map(i => i.category)).toEqual(["戸籍収集", "戸籍収集"]);
  });

  it("カンマ・円記号・全角数字つきの料金を読む", () => {
    const { items, errors } = parseAdministrativeFeeSheetRows([
      ["戸籍収集", "A", "1,100円"],
      ["戸籍収集", "B", "¥22,000"],
      ["戸籍収集", "C", "３３０００"],
      ["戸籍収集", "D", ""],
    ]);
    expect(errors).toEqual([]);
    expect(items.map(i => i.unitPrice)).toEqual([1100, 22000, 33000, 0]);
  });

  it("数字として読めない料金は行番号つきで知らせ、その行は取り込まない", () => {
    const { items, errors } = parseAdministrativeFeeSheetRows([
      ["戸籍収集", "A", "応相談"],
      ["戸籍収集", "B", 2200],
    ]);
    expect(items).toHaveLength(1);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("1行目");
    expect(errors[0]).toContain("応相談");
  });

  it("手続き内容が無い行を知らせる", () => {
    const { items, errors } = parseAdministrativeFeeSheetRows([["戸籍収集", "", 2200]]);
    expect(items).toEqual([]);
    expect(errors[0]).toContain("手続き内容がありません");
  });

  it("1行目から分類が無ければ知らせる", () => {
    const { items, errors } = parseAdministrativeFeeSheetRows([["", "戸籍謄本の取得", 2200]]);
    expect(items).toEqual([]);
    expect(errors[0]).toContain("手続き分類がありません");
  });

  it("同じ分類＋手続き内容が重なったら後の行を採る", () => {
    const { items } = parseAdministrativeFeeSheetRows([
      ["戸籍収集", "戸籍謄本の取得", 2200],
      ["戸籍収集", "戸籍謄本の取得", 3300, "改定"],
    ]);
    expect(items).toEqual([{ category: "戸籍収集", name: "戸籍謄本の取得", unitPrice: 3300, note: "改定" }]);
  });

  it("前後の空白・全角スペースを落とす", () => {
    const { items } = parseAdministrativeFeeSheetRows([["　戸籍収集 ", " 戸籍謄本の取得　", " 2,200 "]]);
    expect(items).toEqual([{ category: "戸籍収集", name: "戸籍謄本の取得", unitPrice: 2200, note: null }]);
  });

  it("「区分 / 内容」の見出しも読み飛ばす", () => {
    const { items, errors } = parseAdministrativeFeeSheetRows([
      ["区分", "内容", "料金", "備考"],
      ["戸籍収集", "戸籍謄本の取得", 2200],
    ]);
    expect(errors).toEqual([]);
    expect(items).toHaveLength(1);
  });
});
