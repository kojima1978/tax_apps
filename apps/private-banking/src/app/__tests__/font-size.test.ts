import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// 画面の文字は下限 11px（補足・見出しセル＝--font-note）、表のセル・金額などの中身は 12px（--font-body）。
// 2026-11-17 までは 8〜10.5px が60か所あり、数値が散っていて下限を守れなかった。
// 12px 以下は変数で書く決まりにして、小さい数値が戻ってこないようにする。印刷（@media print）は紙の大きさを別に持つので対象外。

const css = readFileSync(path.resolve(__dirname, "../globals.css"), "utf8");

function screenFontSizes(text: string) {
  const found: Array<{ line: number; value: number }> = [];
  let depth = 0;
  let printDepth: number | null = null;
  text.split(/\r?\n/).forEach((line, index) => {
    if (printDepth === null && /^\s*@media[^{]*\bprint\b/.test(line)) printDepth = depth;
    if (printDepth === null) {
      for (const m of line.matchAll(/font-size\s*:\s*(\d+(?:\.\d+)?)px/g)) found.push({ line: index + 1, value: Number(m[1]) });
    }
    depth += (line.match(/{/g) ?? []).length - (line.match(/}/g) ?? []).length;
    if (printDepth !== null && depth <= printDepth) printDepth = null;
  });
  return found;
}

describe("画面の文字の大きさ", () => {
  it("下限と本文の大きさは変数1か所で決める", () => {
    expect(css).toMatch(/--font-note:\s*11px;/);
    expect(css).toMatch(/--font-body:\s*12px;/);
  });

  it("画面用の 12px 以下は数値で書かない（--font-note / --font-body を使う）", () => {
    expect(screenFontSizes(css).filter(({ value }) => value <= 12)).toEqual([]);
  });

  it("印刷の中の数値は対象外として読み飛ばす", () => {
    const sample = ".a { font-size: 14px; }\n@media print {\n  .b { font-size: 7px; }\n}\n.c { font-size: 9px; }";
    expect(screenFontSizes(sample)).toEqual([{ line: 1, value: 14 }, { line: 5, value: 9 }]);
  });
});
