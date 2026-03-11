/**
 * 賞与に対する源泉徴収税額の算出率の表（令和8年分）
 * 前月の社会保険料等控除後の給与等の金額（千円）に基づいて税率を決定
 */

interface BonusBracket {
  rate: number;
  /** 各扶養人数(0〜7)に対する上限値（千円単位）。この金額以下なら該当 */
  upperBounds: number[];
}

/**
 * 甲欄の賞与税率テーブル
 * upperBounds[i] = 扶養人数iの上限（千円）。前月給与がこの値以下なら該当する税率を適用
 */
const BONUS_TAX_TABLE: BonusBracket[] = [
  { rate: 0,      upperBounds: [82, 107, 143, 181, 218, 251, 284, 317] },
  { rate: 2.042,  upperBounds: [94, 250, 276, 300, 300, 304, 343, 383] },
  { rate: 4.084,  upperBounds: [260, 289, 321, 354, 387, 412, 438, 463] },
  { rate: 6.126,  upperBounds: [309, 346, 377, 405, 431, 457, 483, 508] },
  { rate: 8.168,  upperBounds: [342, 373, 400, 424, 452, 479, 505, 529] },
  { rate: 10.210, upperBounds: [372, 401, 426, 452, 477, 503, 527, 552] },
  { rate: 12.252, upperBounds: [402, 430, 457, 484, 509, 531, 553, 578] },
  { rate: 14.294, upperBounds: [433, 463, 492, 517, 540, 564, 589, 614] },
  { rate: 16.336, upperBounds: [520, 520, 525, 550, 577, 604, 630, 657] },
  { rate: 18.378, upperBounds: [605, 621, 636, 651, 666, 681, 697, 708] },
  { rate: 20.420, upperBounds: [684, 705, 728, 751, 774, 798, 821, 845] },
  { rate: 22.462, upperBounds: [715, 739, 764, 788, 813, 838, 862, 887] },
  { rate: 24.504, upperBounds: [752, 778, 804, 830, 856, 881, 907, 933] },
  { rate: 26.546, upperBounds: [795, 821, 848, 876, 903, 930, 957, 985] },
  { rate: 28.588, upperBounds: [854, 882, 910, 938, 966, 994, 1022, 1051] },
  { rate: 30.630, upperBounds: [922, 952, 983, 1013, 1044, 1074, 1104, 1135] },
  { rate: 32.672, upperBounds: [1318, 1342, 1367, 1391, 1416, 1440, 1464, 1489] },
  { rate: 35.735, upperBounds: [1521, 1526, 1526, 1538, 1555, 1555, 1555, 1583] },
  { rate: 38.798, upperBounds: [2621, 2645, 2669, 2693, 2716, 2740, 2764, 2788] },
  { rate: 41.861, upperBounds: [3495, 3527, 3559, 3590, 3622, 3654, 3685, 3717] },
  { rate: 45.945, upperBounds: [Infinity, Infinity, Infinity, Infinity, Infinity, Infinity, Infinity, Infinity] },
];

/**
 * 賞与の源泉徴収税率を取得
 * @param prevMonthSalaryAfterSI 前月の社会保険料等控除後の給与等の金額（円）
 * @param dependents 扶養親族等の数（0〜7）
 * @returns 税率（%）
 */
export function getBonusTaxRate(prevMonthSalaryAfterSI: number, dependents: number): number {
  const dep = Math.min(Math.max(dependents, 0), 7);
  const salaryInThousands = prevMonthSalaryAfterSI / 1000;

  for (const bracket of BONUS_TAX_TABLE) {
    if (salaryInThousands <= bracket.upperBounds[dep]) {
      return bracket.rate;
    }
  }
  return 45.945;
}
