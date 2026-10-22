import { describe, expect, it } from "vitest";
import {
  buildSearchableOptionGroups,
  filterSearchableOptionGroups,
  findSearchableOption,
  flattenSearchableOptions,
  type SearchableOptionGroup,
} from "@/lib/searchable-options";

type Person = { id: number; name: string; dept: string; deptOrder: number };

const people: Person[] = [
  { id: 3, name: "渡辺 一郎", dept: "資産税部", deptOrder: 2 },
  { id: 1, name: "山田 太郎", dept: "第一部", deptOrder: 1 },
  { id: 2, name: "青木 花子", dept: "第一部", deptOrder: 1 },
];

const groupsOf = (items: Person[] = people) => buildSearchableOptionGroups(items, {
  group: (p) => p.dept,
  groupOrder: (p) => p.deptOrder,
  option: (p) => ({ value: String(p.id), label: p.name, hint: p.dept }),
});

const shape = (groups: SearchableOptionGroup[]) => groups.map((g) => [g.label, g.options.map((o) => o.label)]);

describe("buildSearchableOptionGroups", () => {
  // 中の並びはラベル順。読み順ではない（漢字は照合の都合で「山田」が「青木」より先に来る）
  it("見出しは sortOrder 順、中はラベル順に並べる（登録順や API の並びに引きずられない）", () => {
    expect(shape(groupsOf())).toEqual([
      ["第一部", ["山田 太郎", "青木 花子"]],
      ["資産税部", ["渡辺 一郎"]],
    ]);
  });

  it("渡した順を変えても同じ並びになる", () => {
    expect(shape(groupsOf([...people].reverse()))).toEqual(shape(groupsOf()));
  });

  it("sortOrder が無ければ見出し名の順にする", () => {
    const groups = buildSearchableOptionGroups(people, {
      group: (p) => p.dept,
      option: (p) => ({ value: String(p.id), label: p.name }),
    });
    expect(groups.map((g) => g.label)).toEqual(["資産税部", "第一部"]);
  });
});

describe("filterSearchableOptionGroups", () => {
  it("空の語なら全件返す", () => {
    expect(shape(filterSearchableOptionGroups(groupsOf(), "  "))).toEqual(shape(groupsOf()));
  });

  it("氏名で絞り込み、候補が無くなった見出しは落とす", () => {
    expect(shape(filterSearchableOptionGroups(groupsOf(), "青木"))).toEqual([["第一部", ["青木 花子"]]]);
  });

  it("氏名の空白は無視する（「山田太郎」で「山田 太郎」に当たる）", () => {
    expect(shape(filterSearchableOptionGroups(groupsOf(), "山田太郎"))).toEqual([["第一部", ["山田 太郎"]]]);
  });

  it("見出しに当たればその見出しは全員残す", () => {
    expect(shape(filterSearchableOptionGroups(groupsOf(), "第一部"))).toEqual([["第一部", ["山田 太郎", "青木 花子"]]]);
  });

  it("補足（部署名）も対象にする", () => {
    const groups = buildSearchableOptionGroups(people, {
      group: () => "",
      option: (p) => ({ value: String(p.id), label: p.name, hint: p.dept }),
    });
    expect(shape(filterSearchableOptionGroups(groups, "資産税"))).toEqual([["", ["渡辺 一郎"]]]);
  });

  it("ひらがなで打ってもカナの補足に当たる", () => {
    const groups: SearchableOptionGroup[] = [{ label: "", options: [{ value: "1", label: "山田 太郎", hint: "ヤマダ タロウ" }] }];
    expect(shape(filterSearchableOptionGroups(groups, "やまだ"))).toEqual([["", ["山田 太郎"]]]);
  });

  it("一致しなければ空にする", () => {
    expect(filterSearchableOptionGroups(groupsOf(), "該当なし")).toEqual([]);
  });
});

describe("flattenSearchableOptions / findSearchableOption", () => {
  it("見出しをまたいで上から1本に並べる", () => {
    expect(flattenSearchableOptions(groupsOf()).map((o) => o.value)).toEqual(["1", "2", "3"]);
  });

  it("選択中の候補を値から引ける", () => {
    expect(findSearchableOption(groupsOf(), "3")?.label).toBe("渡辺 一郎");
  });

  it("空の値と候補に無い値は null", () => {
    expect(findSearchableOption(groupsOf(), "")).toBeNull();
    expect(findSearchableOption(groupsOf(), "999")).toBeNull();
  });
});
