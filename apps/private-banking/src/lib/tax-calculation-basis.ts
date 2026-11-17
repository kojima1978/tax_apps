/**
 * 相続税の概算の「計算の基準」。版番号は相続税シミュレーターが付ける内部の名前
 * （`apps/inheritance-tax-app/server/inheritance-tax-api.ts` の CALCULATION_VERSION）なので、
 * お客様に渡す紙には、どの時点の税率・控除額で計算したかを人の言葉で出す。
 *
 * シミュレーター側で版を上げたら、ここに1行足す（テストがシミュレーターのいまの版を読んで、
 * 載っていなければ落ちる）。保存済みの計算結果に古い版が残るので、古い行は消さない。
 */
const calculationBases: Record<string, string> = {
  "inheritance-tax-2026.1": "令和8年（2026年）時点の税率・控除額",
  "inheritance-tax-2026.2": "令和8年（2026年）時点の税率・控除額",
};

export function isKnownCalculationVersion(version: string) {
  return Object.hasOwn(calculationBases, version);
}

/** 対応表に無い版は、今までどおり版番号をそのまま出す（空欄にしない）。 */
export function calculationBasisLabel(version: string) {
  return isKnownCalculationVersion(version) ? calculationBases[version] : version;
}
