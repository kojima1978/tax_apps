/**
 * 所得税計算ロジック（令和7年分）
 *
 * 参考:
 *   - 所得税の税率: https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/2260.htm
 *   - 基礎控除: https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1199.htm
 *   - 給与所得控除: https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1410.htm
 *   - 公的年金等控除: https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1600.htm
 *   - 一時所得: https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1490.htm
 */

// ============================================
// 給与所得控除（令和7年分）
// ============================================
export function calcSalaryDeduction(revenue: number): number {
  if (revenue <= 0) return 0;
  if (revenue <= 1_900_000) return Math.max(650_000, revenue);
  if (revenue <= 3_600_000) return Math.floor(revenue * 0.3) + 80_000;
  if (revenue <= 6_600_000) return Math.floor(revenue * 0.2) + 440_000;
  if (revenue <= 8_500_000) return Math.floor(revenue * 0.1) + 1_100_000;
  return 1_950_000;
}

/** 給与所得 = 給与収入 − 給与所得控除 */
export function calcSalaryIncome(revenue: number): number {
  return Math.max(0, revenue - calcSalaryDeduction(revenue));
}

// ============================================
// 公的年金等控除（令和7年分・その他の所得1,000万円以下）
// ============================================
export function calcPensionDeduction(revenue: number, age65orOver: boolean): number {
  if (revenue <= 0) return 0;

  if (age65orOver) {
    // 65歳以上
    if (revenue <= 3_300_000) return Math.max(1_100_000, revenue);
    if (revenue <= 4_100_000) return Math.floor(revenue * 0.25) + 275_000;
    if (revenue <= 7_700_000) return Math.floor(revenue * 0.15) + 685_000;
    if (revenue <= 10_000_000) return Math.floor(revenue * 0.05) + 1_455_000;
    return 1_955_000;
  } else {
    // 65歳未満
    if (revenue <= 1_300_000) return Math.max(600_000, revenue);
    if (revenue <= 4_100_000) return Math.floor(revenue * 0.25) + 275_000;
    if (revenue <= 7_700_000) return Math.floor(revenue * 0.15) + 685_000;
    if (revenue <= 10_000_000) return Math.floor(revenue * 0.05) + 1_455_000;
    return 1_955_000;
  }
}

/** 公的年金等の雑所得 = 年金収入 − 公的年金等控除 */
export function calcPensionIncome(revenue: number, age65orOver: boolean): number {
  return Math.max(0, revenue - calcPensionDeduction(revenue, age65orOver));
}

// ============================================
// 事業所得
// ============================================
export function calcBusinessIncome(revenue: number, expenses: number): number {
  return Math.max(0, revenue - expenses);
}

// ============================================
// 一時所得
// ============================================
const TEMPORARY_INCOME_SPECIAL_DEDUCTION = 500_000;

/** 一時所得の金額（課税前） */
export function calcTemporaryIncome(revenue: number, expenses: number): number {
  const raw = revenue - expenses - TEMPORARY_INCOME_SPECIAL_DEDUCTION;
  return Math.max(0, raw);
}

/** 一時所得の総所得金額への算入額（1/2） */
export function calcTemporaryIncomeForTax(revenue: number, expenses: number): number {
  return Math.floor(calcTemporaryIncome(revenue, expenses) / 2);
}

// ============================================
// 合計所得金額
// ============================================
export interface IncomeInputs {
  salaryRevenue: number;
  pensionRevenue: number;
  pensionAge65: boolean;
  businessRevenue: number;
  businessExpenses: number;
  temporaryRevenue: number;
  temporaryExpenses: number;
  miscIncome: number; // その他の雑所得（所得金額を直接入力）
}

export interface IncomeBreakdown {
  salaryIncome: number;
  salaryDeduction: number;
  pensionIncome: number;
  pensionDeduction: number;
  businessIncome: number;
  temporaryIncome: number;          // 一時所得の金額
  temporaryIncomeForTax: number;    // 算入額（1/2）
  miscIncome: number;
  totalIncome: number;              // 合計所得金額
}

export function calcIncomeBreakdown(inputs: IncomeInputs): IncomeBreakdown {
  const salaryDeduction = calcSalaryDeduction(inputs.salaryRevenue);
  const salaryIncome = calcSalaryIncome(inputs.salaryRevenue);
  const pensionDeduction = calcPensionDeduction(inputs.pensionRevenue, inputs.pensionAge65);
  const pensionIncome = calcPensionIncome(inputs.pensionRevenue, inputs.pensionAge65);
  const businessIncome = calcBusinessIncome(inputs.businessRevenue, inputs.businessExpenses);
  const temporaryIncome = calcTemporaryIncome(inputs.temporaryRevenue, inputs.temporaryExpenses);
  const temporaryIncomeForTax = calcTemporaryIncomeForTax(inputs.temporaryRevenue, inputs.temporaryExpenses);
  const miscIncome = Math.max(0, inputs.miscIncome);

  const totalIncome =
    salaryIncome +
    pensionIncome +
    businessIncome +
    temporaryIncomeForTax +
    miscIncome;

  return {
    salaryIncome,
    salaryDeduction,
    pensionIncome,
    pensionDeduction,
    businessIncome,
    temporaryIncome,
    temporaryIncomeForTax,
    miscIncome,
    totalIncome,
  };
}

// ============================================
// 基礎控除（令和7年分）
// ============================================
export function calcBasicDeduction(totalIncome: number): number {
  if (totalIncome <= 1_320_000) return 950_000;
  if (totalIncome <= 3_360_000) return 880_000;
  if (totalIncome <= 4_890_000) return 680_000;
  if (totalIncome <= 6_550_000) return 630_000;
  if (totalIncome <= 23_500_000) return 580_000;
  if (totalIncome <= 24_000_000) return 480_000;
  if (totalIncome <= 24_500_000) return 320_000;
  if (totalIncome <= 25_000_000) return 160_000;
  return 0;
}

// ============================================
// 配偶者控除・配偶者特別控除（令和7年分）
// ============================================
export function calcSpouseDeduction(totalIncome: number, spouseIncome: number): { type: 'none' | 'spouse' | 'special'; amount: number } {
  if (totalIncome > 10_000_000) return { type: 'none', amount: 0 };
  if (spouseIncome < 0) return { type: 'none', amount: 0 };

  // 配偶者控除（配偶者の合計所得48万円以下）
  if (spouseIncome <= 480_000) {
    if (totalIncome <= 9_000_000) return { type: 'spouse', amount: 380_000 };
    if (totalIncome <= 9_500_000) return { type: 'spouse', amount: 260_000 };
    return { type: 'spouse', amount: 130_000 };
  }

  // 配偶者特別控除（配偶者の合計所得48万超～133万円以下）
  if (spouseIncome > 1_330_000) return { type: 'none', amount: 0 };

  // 簡易テーブル（納税者本人の所得900万以下の場合）
  const brackets: [number, number][] = [
    [950_000, 380_000],
    [1_000_000, 360_000],
    [1_050_000, 310_000],
    [1_100_000, 260_000],
    [1_150_000, 210_000],
    [1_200_000, 160_000],
    [1_250_000, 110_000],
    [1_300_000, 60_000],
    [1_330_000, 30_000],
  ];

  let baseAmount = 0;
  for (const [limit, amount] of brackets) {
    if (spouseIncome <= limit) {
      baseAmount = amount;
      break;
    }
  }

  // 納税者本人の所得による調整
  if (totalIncome <= 9_000_000) return { type: 'special', amount: baseAmount };
  if (totalIncome <= 9_500_000) return { type: 'special', amount: Math.floor(baseAmount * 2 / 3) };
  return { type: 'special', amount: Math.floor(baseAmount / 3) };
}

// ============================================
// 扶養控除
// ============================================
export interface DependentCounts {
  general: number;       // 一般の扶養親族（16～18歳、23～69歳）: 38万
  specific: number;      // 特定扶養親族（19～22歳）: 63万
  elderly: number;       // 老人扶養親族（70歳以上・同居以外）: 48万
  elderlyCohabit: number; // 老人扶養親族（同居老親等）: 58万
}

export function calcDependentDeduction(counts: DependentCounts): number {
  return (
    counts.general * 380_000 +
    counts.specific * 630_000 +
    counts.elderly * 480_000 +
    counts.elderlyCohabit * 580_000
  );
}

// ============================================
// 所得控除合計
// ============================================
export interface DeductionInputs {
  socialInsurance: number;      // 社会保険料控除
  lifeInsurance: number;        // 生命保険料控除
  earthquakeInsurance: number;  // 地震保険料控除
  medical: number;              // 医療費控除
  donation: number;             // 寄附金控除（ふるさと納税等）
  spouseIncome: number;         // 配偶者の合計所得金額（-1 = 配偶者なし）
  dependents: DependentCounts;
}

export interface DeductionBreakdown {
  socialInsurance: number;
  lifeInsurance: number;
  earthquakeInsurance: number;
  medical: number;
  donation: number;
  spouseDeduction: number;
  spouseDeductionType: 'none' | 'spouse' | 'special';
  dependentDeduction: number;
  basicDeduction: number;
  totalDeduction: number;
}

export function calcDeductionBreakdown(totalIncome: number, inputs: DeductionInputs): DeductionBreakdown {
  const basicDeduction = calcBasicDeduction(totalIncome);
  const spouse = calcSpouseDeduction(totalIncome, inputs.spouseIncome);
  const dependentDeduction = calcDependentDeduction(inputs.dependents);

  const totalDeduction =
    inputs.socialInsurance +
    inputs.lifeInsurance +
    inputs.earthquakeInsurance +
    inputs.medical +
    inputs.donation +
    spouse.amount +
    dependentDeduction +
    basicDeduction;

  return {
    socialInsurance: inputs.socialInsurance,
    lifeInsurance: inputs.lifeInsurance,
    earthquakeInsurance: inputs.earthquakeInsurance,
    medical: inputs.medical,
    donation: inputs.donation,
    spouseDeduction: spouse.amount,
    spouseDeductionType: spouse.type,
    dependentDeduction,
    basicDeduction,
    totalDeduction,
  };
}

// ============================================
// 所得税額（速算表）
// ============================================
const TAX_BRACKETS: { limit: number; rate: number; deduction: number }[] = [
  { limit: 1_950_000, rate: 0.05, deduction: 0 },
  { limit: 3_300_000, rate: 0.10, deduction: 97_500 },
  { limit: 6_950_000, rate: 0.20, deduction: 427_500 },
  { limit: 9_000_000, rate: 0.23, deduction: 636_000 },
  { limit: 18_000_000, rate: 0.33, deduction: 1_536_000 },
  { limit: 40_000_000, rate: 0.40, deduction: 2_796_000 },
  { limit: Infinity, rate: 0.45, deduction: 4_796_000 },
];

export function calcIncomeTax(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;

  for (const bracket of TAX_BRACKETS) {
    if (taxableIncome <= bracket.limit) {
      return Math.floor(taxableIncome * bracket.rate - bracket.deduction);
    }
  }
  // fallback (won't reach)
  return 0;
}

/** 課税される所得金額（1,000円未満切捨て） */
export function calcTaxableIncome(totalIncome: number, totalDeduction: number): number {
  return Math.max(0, Math.floor((totalIncome - totalDeduction) / 1000) * 1000);
}

// ============================================
// 復興特別所得税
// ============================================
export function calcReconstructionTax(incomeTax: number): number {
  return Math.floor(incomeTax * 0.021);
}

// ============================================
// 住民税（概算）
// ============================================
const RESIDENT_TAX_RATE = 0.10;
const RESIDENT_TAX_PER_CAPITA = 5_000; // 均等割

export function calcResidentTax(taxableIncome: number): number {
  if (taxableIncome <= 0) return RESIDENT_TAX_PER_CAPITA;
  return Math.floor(taxableIncome * RESIDENT_TAX_RATE) + RESIDENT_TAX_PER_CAPITA;
}

// ============================================
// 最終結果
// ============================================
export interface TaxResult {
  income: IncomeBreakdown;
  deduction: DeductionBreakdown;
  taxableIncome: number;
  incomeTax: number;
  taxRate: number;
  taxDeductionAmount: number;
  reconstructionTax: number;
  totalTax: number;            // 所得税 + 復興特別所得税
  residentTax: number;         // 住民税（概算）
  grandTotal: number;          // 所得税 + 復興 + 住民税
}

export function calcAll(incomeInputs: IncomeInputs, deductionInputs: DeductionInputs): TaxResult {
  const income = calcIncomeBreakdown(incomeInputs);
  const deduction = calcDeductionBreakdown(income.totalIncome, deductionInputs);
  const taxableIncome = calcTaxableIncome(income.totalIncome, deduction.totalDeduction);
  const incomeTax = calcIncomeTax(taxableIncome);
  const reconstructionTax = calcReconstructionTax(incomeTax);
  const totalTax = incomeTax + reconstructionTax;

  // 住民税の課税所得（基礎控除が所得税と住民税で異なるが、概算として同額で計算）
  const residentTax = calcResidentTax(taxableIncome);
  const grandTotal = totalTax + residentTax;

  // 適用税率・控除額
  let taxRate = 0;
  let taxDeductionAmount = 0;
  for (const bracket of TAX_BRACKETS) {
    if (taxableIncome <= bracket.limit) {
      taxRate = bracket.rate;
      taxDeductionAmount = bracket.deduction;
      break;
    }
  }

  return {
    income,
    deduction,
    taxableIncome,
    incomeTax,
    taxRate,
    taxDeductionAmount,
    reconstructionTax,
    totalTax,
    residentTax,
    grandTotal,
  };
}
