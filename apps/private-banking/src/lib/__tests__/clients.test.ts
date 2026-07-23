import { describe, expect, it } from "vitest";
import {
  type ClientSummary,
  filterClients,
  highlightRanges,
  matchesClient,
  normalizeSearchText,
  searchTerms,
} from "@/lib/clients";

const client = (overrides: Partial<ClientSummary> = {}): ClientSummary => ({
  id: 1,
  clientCode: "PB-000001",
  name: "山田 太郎",
  nameKana: "ヤマダ タロウ",
  assignedStaff: "佐藤",
  latestFiscalYear: 2025,
  ...overrides,
});

describe("normalizeSearchText", () => {
  it("ひらがなはカタカナに寄せる", () => {
    expect(normalizeSearchText("やまだ")).toBe("ヤマダ");
  });

  it("半角カナの濁点を合成する（1文字ずつだと合成できない箇所）", () => {
    expect(normalizeSearchText("ﾔﾏﾀﾞ")).toBe("ヤマダ");
  });

  it("全角英数字と記号は半角にして小文字化する", () => {
    expect(normalizeSearchText("ＰＢ－０００１")).toBe("pb-0001");
  });

  it("空白は無視する", () => {
    expect(normalizeSearchText("山田 太郎")).toBe("山田太郎");
    expect(normalizeSearchText("山田　太郎")).toBe("山田太郎");
  });
});

describe("searchTerms", () => {
  it("空白区切りで正規化した検索語に分解する", () => {
    expect(searchTerms(" やまだ  PB-1 ")).toEqual(["ヤマダ", "pb-1"]);
  });

  it("空文字は検索語なしとして扱う", () => {
    expect(searchTerms("   ")).toEqual([]);
  });
});

describe("matchesClient", () => {
  it("検索語がなければ全件ヒット", () => {
    expect(matchesClient(client(), [])).toBe(true);
  });

  it("ひらがな入力でカタカナのフリガナに当たる", () => {
    expect(matchesClient(client(), searchTerms("やまだ"))).toBe(true);
  });

  it("半角カナ入力でも当たる", () => {
    expect(matchesClient(client(), searchTerms("ﾔﾏﾀﾞ"))).toBe(true);
  });

  it("空白をまたいだ姓名でも当たる", () => {
    expect(matchesClient(client(), searchTerms("山田太郎"))).toBe(true);
  });

  it("顧客コードは小文字入力でも当たる", () => {
    expect(matchesClient(client(), searchTerms("pb-000001"))).toBe(true);
  });

  it("複数の検索語は AND、項目はまたいでよい", () => {
    expect(matchesClient(client(), searchTerms("やまだ 佐藤"))).toBe(true);
    expect(matchesClient(client(), searchTerms("やまだ 鈴木"))).toBe(false);
  });
});

describe("filterClients", () => {
  const clients = [
    client({ id: 1, name: "山田 太郎", nameKana: "ヤマダ タロウ", clientCode: "PB-000001" }),
    client({ id: 2, name: "鈴木 花子", nameKana: "スズキ ハナコ", clientCode: "PB-000002", assignedStaff: "田中" }),
  ];

  it("検索語なしでは元の配列をそのまま返す", () => {
    expect(filterClients(clients, [])).toBe(clients);
  });

  it("一致する顧客だけ残す", () => {
    expect(filterClients(clients, searchTerms("すずき")).map((item) => item.id)).toEqual([2]);
  });
});

describe("highlightRanges", () => {
  it("検索語がなければ範囲なし", () => {
    expect(highlightRanges("山田 太郎", [])).toEqual([]);
  });

  it("正規化前の文字位置で範囲を返す", () => {
    expect(highlightRanges("山田太郎", searchTerms("太郎"))).toEqual([[2, 4]]);
  });

  it("濁点で文字数が変わっても元の位置に戻す", () => {
    expect(highlightRanges("ﾔﾏﾀﾞ太郎", searchTerms("やまだ"))).toEqual([[0, 4]]);
  });

  it("複数箇所ヒットすればすべて返す", () => {
    expect(highlightRanges("山田太郎山田", searchTerms("山田"))).toEqual([[0, 2], [4, 6]]);
  });

  it("重なる範囲は連結する", () => {
    expect(highlightRanges("山田太郎", searchTerms("山田 田太"))).toEqual([[0, 3]]);
  });
});
