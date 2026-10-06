import { describe, expect, it } from "vitest";
import {
  CLIENT_SORT_DEFAULT,
  type ClientSortMode,
  type ClientSummary,
  filterClients,
  highlightRanges,
  matchesClient,
  normalizeSearchText,
  searchTerms,
  sharedFiscalYear,
  showsUnassignedStaff,
  sortClients,
} from "@/lib/clients";

const client = (overrides: Partial<ClientSummary> = {}): ClientSummary => ({
  id: 1,
  clientCode: "PB-000001",
  name: "山田 太郎",
  nameKana: "ヤマダ タロウ",
  staffId: 1,
  assignedStaff: "佐藤",
  relatedCompany: "",
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

  it("関連法人の名称でも当たる（部分一致・法人のカナは持たない）", () => {
    const withCompany = client({ relatedCompany: "株式会社山田商店" });
    expect(matchesClient(withCompany, searchTerms("山田商店"))).toBe(true);
    expect(matchesClient(withCompany, searchTerms("株式会社"))).toBe(true);
    expect(matchesClient(client(), searchTerms("山田商店"))).toBe(false);
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
    client({ id: 3, name: "高橋 次郎", nameKana: "タカハシ ジロウ", clientCode: "PB-000003", relatedCompany: "有限会社タカハシ工務店" }),
  ];

  it("検索語なしでは元の配列をそのまま返す", () => {
    expect(filterClients(clients, [])).toBe(clients);
  });

  it("一致する顧客だけ残す", () => {
    expect(filterClients(clients, searchTerms("すずき")).map((item) => item.id)).toEqual([2]);
  });

  it("関連法人で絞り込める", () => {
    expect(filterClients(clients, searchTerms("工務店")).map((item) => item.id)).toEqual([3]);
  });
});

describe("sortClients", () => {
  const ids = (clients: ClientSummary[], mode: ClientSortMode) => sortClients(clients, mode).map((item) => item.id);

  it("カナ順に並べる（漢字の文字コード順とは別物）", () => {
    // 文字コードでは 和(U+548C) < 青(U+9752) だが、カナでは アオキ < ワダ。
    const clients = [
      client({ id: 1, name: "和田 一郎", nameKana: "ワダ イチロウ" }),
      client({ id: 2, name: "青木 次郎", nameKana: "アオキ ジロウ" }),
    ];
    expect(ids(clients, "kana")).toEqual([2, 1]);
  });

  it("カナはひらがな・半角カナでも同じ位置に並ぶ", () => {
    const clients = [
      client({ id: 1, nameKana: "ワダ イチロウ" }),
      client({ id: 2, nameKana: "あおき じろう" }),
      client({ id: 3, nameKana: "ｲﾄｳ ｻﾌﾞﾛｳ" }),
    ];
    expect(ids(clients, "kana")).toEqual([2, 3, 1]);
  });

  it("カナが空なら氏名で代わりに並べる", () => {
    const clients = [
      client({ id: 1, name: "ワダ イチロウ", nameKana: "" }),
      client({ id: 2, name: "アオキ ジロウ", nameKana: "" }),
    ];
    expect(ids(clients, "kana")).toEqual([2, 1]);
  });

  it("既定はコード順（カナ順とは別の並びになる）", () => {
    const clients = [
      client({ id: 1, clientCode: "0002", nameKana: "アオキ ジロウ" }),
      client({ id: 2, clientCode: "0001", nameKana: "ワダ イチロウ" }),
    ];
    expect(ids(clients, CLIENT_SORT_DEFAULT)).toEqual([2, 1]);
    expect(ids(clients, "kana")).toEqual([1, 2]);
  });

  it("顧客コードは桁が揃っていなくても数値として並ぶ", () => {
    const clients = [
      client({ id: 1, clientCode: "0006" }),
      client({ id: 2, clientCode: "005" }),
      client({ id: 3, clientCode: "0003" }),
    ];
    expect(ids(clients, "code")).toEqual([3, 2, 1]);
  });

  it("年度は新しい順に並べ、年度なしは末尾へ置く", () => {
    const clients = [
      client({ id: 1, latestFiscalYear: 2024 }),
      client({ id: 2, latestFiscalYear: null }),
      client({ id: 3, latestFiscalYear: 2026 }),
    ];
    expect(ids(clients, "year-desc")).toEqual([3, 1, 2]);
  });

  it("年度なしだけでも比較が壊れない（null 同士で NaN にしない）", () => {
    const clients = [client({ id: 2, latestFiscalYear: null }), client({ id: 1, latestFiscalYear: null })];
    expect(ids(clients, "year-desc")).toEqual([1, 2]);
  });

  it("登録の新しい順は id の降順", () => {
    const clients = [client({ id: 1 }), client({ id: 3 }), client({ id: 2 })];
    expect(ids(clients, "newest")).toEqual([3, 2, 1]);
  });

  it("同じ値のときは id の昇順で決着させる（ページ送りで行がぶれないように）", () => {
    const clients = [
      client({ id: 5, nameKana: "ヤマダ タロウ" }),
      client({ id: 3, nameKana: "ヤマダ タロウ" }),
    ];
    expect(ids(clients, "kana")).toEqual([3, 5]);
  });

  it("元の配列は並べ替えない", () => {
    const clients = [client({ id: 1, nameKana: "ワダ イチロウ" }), client({ id: 2, nameKana: "アオキ ジロウ" })];
    sortClients(clients, "kana");
    expect(clients.map((item) => item.id)).toEqual([1, 2]);
  });
});

describe("sharedFiscalYear", () => {
  it("全員が同じ年度ならその年度を返す（行ごとに出す必要が無い）", () => {
    expect(sharedFiscalYear([client({ id: 1 }), client({ id: 2 })])).toBe(2025);
  });

  it("年度がばらついていたら null（行ごとに出させる）", () => {
    expect(sharedFiscalYear([client({ id: 1 }), client({ id: 2, latestFiscalYear: 2024 })])).toBeNull();
  });

  it("年度なしが混ざっていたら null（「年度なし」は目印なので消さない）", () => {
    expect(sharedFiscalYear([client({ id: 1 }), client({ id: 2, latestFiscalYear: null })])).toBeNull();
  });

  it("全員が年度なしでも null（出すべき共通の年度が無い）", () => {
    expect(sharedFiscalYear([client({ latestFiscalYear: null })])).toBeNull();
  });

  it("0件なら null", () => {
    expect(sharedFiscalYear([])).toBeNull();
  });
});

describe("showsUnassignedStaff", () => {
  it("担当者が1人も居なければ出さない", () => {
    expect(showsUnassignedStaff([client({ assignedStaff: "" }), client({ assignedStaff: "  " })])).toBe(false);
  });

  it("誰か1人でも居れば出す（空いている行の目印になる）", () => {
    expect(showsUnassignedStaff([client({ assignedStaff: "" }), client({ assignedStaff: "佐藤" })])).toBe(true);
  });

  it("0件なら出さない", () => {
    expect(showsUnassignedStaff([])).toBe(false);
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
