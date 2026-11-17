import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { calculationBasisLabel, isKnownCalculationVersion } from "../tax-calculation-basis";

// シミュレーターの版の定義。CI はリポジトリ全体を持つので読めるが、
// アプリのコンテナには private-banking しか入っていないので、そこでは飛ばす。
const simulatorApi = fileURLToPath(new URL("../../../../inheritance-tax-app/server/inheritance-tax-api.ts", import.meta.url));

describe("calculationBasisLabel", () => {
  it("保存済みの計算結果にある版を、人の読める言い方にする", () => {
    expect(calculationBasisLabel("inheritance-tax-2026.1")).toBe("令和8年（2026年）時点の税率・控除額");
    expect(calculationBasisLabel("inheritance-tax-2026.2")).toBe("令和8年（2026年）時点の税率・控除額");
  });

  it("対応表に無い版は版番号をそのまま出す（空欄にしない）", () => {
    expect(isKnownCalculationVersion("inheritance-tax-2099.1")).toBe(false);
    expect(calculationBasisLabel("inheritance-tax-2099.1")).toBe("inheritance-tax-2099.1");
    expect(isKnownCalculationVersion("toString")).toBe(false);
  });

  it.skipIf(!existsSync(simulatorApi))("シミュレーターのいまの版が対応表に載っている", () => {
    const version = readFileSync(simulatorApi, "utf8").match(/const CALCULATION_VERSION = '([^']+)'/)?.[1];
    expect(version, "CALCULATION_VERSION が見つからない").toBeTruthy();
    expect(isKnownCalculationVersion(version!), `${version} を tax-calculation-basis.ts に足す`).toBe(true);
  });
});
