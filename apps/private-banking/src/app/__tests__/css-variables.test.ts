import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// 定義の無い CSS 変数は黙って「継承した色」になり、崩れても見た目では気づけない
// （2026-11-17 に --slate-600 が50か所・ほか6つが未定義のまま使われていた）。
// 予備の値 `var(--x, …)` を書いたものは意図して未定義を許しているので対象外。

const SRC = path.resolve(__dirname, "../..");

function files(dir: string, ext: RegExp): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : files(full, ext);
    return ext.test(entry.name) ? [full] : [];
  });
}

describe("CSS 変数", () => {
  it("使っている変数はどれもどこかで定義されている", () => {
    const css = files(SRC, /\.css$/).map((file) => readFileSync(file, "utf8"));
    const tsx = files(SRC, /\.tsx$/).map((file) => readFileSync(file, "utf8"));

    const defined = new Set<string>();
    for (const text of css) for (const m of text.matchAll(/(--[a-z0-9-]+)\s*:/g)) defined.add(m[1]);
    // style={{ "--x": … }} で部品から渡すもの
    for (const text of tsx) for (const m of text.matchAll(/["'](--[a-z0-9-]+)["']\s*:/g)) defined.add(m[1]);

    const undefinedVars = new Set<string>();
    for (const text of [...css, ...tsx]) {
      for (const m of text.matchAll(/var\(\s*(--[a-z0-9-]+)\s*([,)])/g)) {
        if (m[2] === ")" && !defined.has(m[1])) undefinedVars.add(m[1]);
      }
    }
    expect([...undefinedVars].sort()).toEqual([]);
  });
});
