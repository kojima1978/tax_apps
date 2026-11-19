import { describe, expect, it } from "vitest";
import { helpDocProblems } from "@/shared/help-doc/helpDoc";
import { HELP_SECTIONS } from "../help-content";
import { sectionLabels } from "../portfolio-view";

describe("使い方の本文", () => {
  it("見出しの番号・空の欄・表の列数が崩れていない", () => {
    expect(helpDocProblems(HELP_SECTIONS)).toEqual([]);
  });

  it("顧客の画面の表はサイドバーの画面を全部、サイドバーの順で載せる", () => {
    const section = HELP_SECTIONS.find((s) => s.id === "customer-screens");
    const table = section?.blocks.find((b) => b.kind === "table");
    const names = table && table.kind === "table" ? table.rows.map((row) => row[0]) : [];
    expect(names).toEqual(Object.values(sectionLabels));
  });
});
