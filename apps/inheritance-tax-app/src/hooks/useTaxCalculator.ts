import type { HeirComposition, TaxCalculationResult } from '../types';
import {
  TAX_BRACKETS,
  BASIC_DEDUCTION,
  SPOUSE_DEDUCTION_LIMIT,
  THIRD_RANK_SURCHARGE_RATE,
} from '../constants';

/**
 * 法定相続分に対する税額を計算
 * @param shareAmount 法定相続分の金額（万円）
 * @returns 算出税額（万円）
 */
function calculateTaxForShare(shareAmount: number): number {
  if (shareAmount <= 0) return 0;
  const bracket = TAX_BRACKETS.find(b => shareAmount <= b.threshold) || TAX_BRACKETS[TAX_BRACKETS.length - 1];
  const tax = shareAmount * (bracket.rate / 100) - bracket.deduction;
  return Math.floor(Math.max(0, tax));
}

/**
 * 有効な相続人の情報を取得（基礎控除計算用および税額計算用）
 */
function getHeirInfo(composition: HeirComposition): {
  rank: number;
  totalHeirsCount: number; // 基礎控除計算用の法定相続人数
  rankHeirsCount: number; // 税額計算上の同順位相続人の数
} {
  let rank = 0;
  let rankHeirsCount = 0; // 該当順位の相続人の数（代襲含む）

  // 第1順位：子供（代襲相続人含む）
  const childrenCount = composition.rank1Children.reduce((acc, child) => {
    if (child.isDeceased && child.representatives) {
      return acc + child.representatives.length;
    }
    return acc + (child.isDeceased ? 0 : 1);
  }, 0);

  // 第3順位：兄弟姉妹（代襲相続人含む）
  const siblingsCount = composition.rank3Siblings.reduce((acc, sibling) => {
    if (sibling.isDeceased && sibling.representatives) {
      return acc + sibling.representatives.length;
    }
    return acc + (sibling.isDeceased ? 0 : 1);
  }, 0);

  // 第2順位：直系尊属
  const ascendantsCount = composition.rank2Ascendants.length;

  // 基礎控除人数を計算（放棄などは考慮しない前提）
  // 順位決定ロジック
  if (childrenCount > 0) {
    rank = 1;
    rankHeirsCount = childrenCount;
  } else if (ascendantsCount > 0) {
    rank = 2;
    rankHeirsCount = ascendantsCount;
  } else if (siblingsCount > 0) {
    rank = 3;
    rankHeirsCount = siblingsCount;
  }

  // ユーザー選択順位が指定されている場合はそちらを優先（シミュレーション用）
  if (composition.selectedRank === 'rank1' && childrenCount > 0) {
    rank = 1;
    rankHeirsCount = childrenCount;
  } else if (composition.selectedRank === 'rank2' && ascendantsCount > 0) {
    rank = 2;
    rankHeirsCount = ascendantsCount;
  } else if (composition.selectedRank === 'rank3' && siblingsCount > 0) {
    rank = 3;
    rankHeirsCount = siblingsCount;
  }

  // 法定相続人の総数（基礎控除用）
  const totalHeirsCount = (composition.hasSpouse ? 1 : 0) + rankHeirsCount;

  return { rank, totalHeirsCount, rankHeirsCount };
}


/**
 * 相続税を計算
 */
export function calculateInheritanceTax(
  estateValue: number, // 相続財産額（万円）
  composition: HeirComposition
): TaxCalculationResult {
  // 1. 相続人情報の取得
  const { rank, totalHeirsCount, rankHeirsCount } = getHeirInfo(composition);

  // 2. 基礎控除額の計算: 3,000万円 + (600万円 × 法定相続人の数)
  const basicDeduction = totalHeirsCount > 0
    ? BASIC_DEDUCTION.BASE + (BASIC_DEDUCTION.PER_HEIR * totalHeirsCount)
    : BASIC_DEDUCTION.BASE;

  // 3. 課税遺産総額
  const taxableAmount = Math.max(0, estateValue - basicDeduction);

  if (taxableAmount === 0 || totalHeirsCount === 0) {
    return {
      estateValue,
      basicDeduction,
      taxableAmount: 0,
      totalTax: 0,
      taxAfterSpouseDeduction: 0,
      effectiveTaxRate: 0,
      effectiveTaxRateAfterSpouse: 0,
    };
  }

  // 4. 法定相続分の計算
  let spouseShareRatio = 0;
  let otherShareRatio = 0;

  if (composition.hasSpouse) {
    if (rank === 1) { // 配偶者 1/2
      spouseShareRatio = 0.5;
      otherShareRatio = 0.5;
    } else if (rank === 2) { // 配偶者 2/3
      spouseShareRatio = 2 / 3;
      otherShareRatio = 1 / 3;
    } else if (rank === 3) { // 配偶者 3/4
      spouseShareRatio = 0.75;
      otherShareRatio = 0.25;
    } else { // 配偶者のみ
      spouseShareRatio = 1.0;
      otherShareRatio = 0;
    }
  } else {
    // 配偶者なし
    spouseShareRatio = 0;
    otherShareRatio = 1.0;
  }

  // 5. 各相続人の法的相続分に応じた税額計算（相続税の総額）
  let totalTax = 0;
  let spouseTax = 0; // 配偶者の算出税額（この後、総額を実際のあん分で分けるが、ここでは法定相続分通りに分けたと仮定した場合の税額）

  // A. 配偶者の税額（法定相続分で取得したと仮定）
  if (spouseShareRatio > 0) {
    const spouseAmount = Math.floor(taxableAmount * spouseShareRatio);
    spouseTax = calculateTaxForShare(spouseAmount);
    totalTax += spouseTax;
  }

  // B. 他の相続人の税額（法定相続分で取得したと仮定）
  if (otherShareRatio > 0 && rankHeirsCount > 0) {
    const othersTotalAmount = Math.floor(taxableAmount * otherShareRatio);
    // 各人の取得分（均等割と仮定）
    const perPersonAmount = Math.floor(othersTotalAmount / rankHeirsCount);

    // 各人の税額を算出
    const perPersonTax = calculateTaxForShare(perPersonAmount);

    // 全員分の税額
    let othersTax = perPersonTax * rankHeirsCount;

    // 第3順位（兄弟姉妹）の場合は2割加算
    // ※代襲相続人（甥姪）も2割加算だが、子が代襲する場合は対象外。
    // ここでは簡易的にrank3なら一律2割加算とする。
    if (rank === 3) {
      othersTax = Math.floor(othersTax * THIRD_RANK_SURCHARGE_RATE);
    }

    totalTax += othersTax;
  }

  // 6. 配偶者控除後の税額計算
  // 実際の遺産分割割合が不明なため、法定相続分通りに分割したと仮定して計算する
  // 配偶者の軽減：
  // 1. 法定相続分 or 1億6000万円 のいずれか大きい額までは非課税
  // ここでは全員が法定相続分通りに取得したと仮定しているので、配偶者は全額控除されることになる（0になるはずだが、実務上は算出税額から控除）
  // 算出税額の合計 × (配偶者の課税価格 / 課税価格の合計) で配偶者の税額を割り振る

  // 法定相続分で分けた場合の配偶者の税額負担分
  // = 総額 × (配偶者の取得分 / 遺産総額) ... ではなく、
  // = 総額 × (配偶者の法定相続分 / 全員の法定相続分) なので、
  // 上記で計算した `spouseTax` はあくまで「法定相続分で取得したと仮定した時の、そのパーツの税額」であり、
  // 実際の「配偶者の負担すべき税額」は `totalTax * (spouseAmount / taxableAmount)` となる。
  // 配偶者の軽減額は、 `totalTax * (Min(配偶者の取得額, Max(1.6億, 法定相続分)) / taxableAmount)`

  let taxAfterSpouseDeduction = totalTax;

  if (composition.hasSpouse) {
    // 配偶者の取得額（法定相続分通りと仮定）
    const spouseAcquisition = Math.floor(taxableAmount * spouseShareRatio);

    // 配偶者の軽減対象額
    // 法定相続分(spouseAcquisition) と 1億6000万円 の大きい方
    const maxDeductionAmount = Math.max(SPOUSE_DEDUCTION_LIMIT, spouseAcquisition);

    // 実際に配偶者が取得する額（ここでは法定相続分と仮定）
    const actualAcquisition = spouseAcquisition;

    // 軽減される額の計算対象（配偶者の取得額のうち、軽減対象枠内の金額）
    const deductibleAcquisition = Math.min(actualAcquisition, maxDeductionAmount);

    // 軽減税額
    // 総税額 × (軽減対象額 / 課税遺産総額)
    const reductionAmount = Math.floor(totalTax * (deductibleAcquisition / taxableAmount));

    // 配偶者本人の税額から軽減（ただしここでは全体の税額を表示しているので、全体から引く）
    // ※注意：早見表の「2次相続（配偶者なし）」と比較するための「1次相続（配偶者あり）」の列は、
    // 「家族全体で支払う税金」を表示するのが一般的。
    // 配偶者が払う分は原則0になる（法定相続分以下のため）。
    // そのため、残りの相続人（子供など）が払う分だけが残る。





    // 家族全体の支払税額 = 総額 - (配偶者の負担税額 - 配偶者が支払う税額) 
    // = 総額 - 軽減額
    taxAfterSpouseDeduction = Math.max(0, totalTax - reductionAmount);
  }

  // 7. 実効税率
  const effectiveTaxRate = estateValue > 0 ? (totalTax / estateValue) * 100 : 0;
  const effectiveTaxRateAfterSpouse = estateValue > 0 ? (taxAfterSpouseDeduction / estateValue) * 100 : 0;

  return {
    estateValue,
    basicDeduction,
    taxableAmount,
    totalTax,
    taxAfterSpouseDeduction,
    effectiveTaxRate,
    effectiveTaxRateAfterSpouse,
  };
}
