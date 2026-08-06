import { isIncomeProtectionPolicyType } from '@/types';
import type { Policy, PolicyType, SurrenderValuePoint } from '@/types';
import { formatWholeManYen } from '@/utils/currencyUtils';

export interface EvaluationResult {
  rating: 'good' | 'caution' | 'warning';
  label: string;
  text: string;
}

// 個別分析で表示する評価項目（手動編集の対象）
export const EVALUATION_LABELS = ['保障期間', '払込状況', '保障充足度'] as const;

export const RATING_LABELS: Record<EvaluationResult['rating'], string> = {
  good: '良好',
  caution: '注意',
  warning: '警告',
};

export interface InsuranceTypeInfo {
  iconName: string;
  color: string;
  bgColor: string;
  borderColor: string;
  shortDescription: string;
  longDescription: string;
  purpose: string;
}

export interface PolicyAnalysis {
  totalPremiumsPaid: number;
  projectedTotalPremiums: number;
  remainingPremiums: number;
  currentDeathBenefit: number;
  remainingCoverageYears: number | 'lifetime';
  remainingPaymentYears: number | 'lifetime';
  isPaidUp: boolean;
  isExpired: boolean;
  evaluations: EvaluationResult[];
  consultantNote: string;
}

export interface PortfolioInsight {
  type: 'gap' | 'redundancy' | 'recommendation';
  text: string;
}

export const INSURANCE_TYPE_INFO: Record<PolicyType, InsuranceTypeInfo> = {
  '個人年金保険': {
    iconName: 'Landmark',
    color: '#92400e',
    bgColor: '#fef3c7',
    borderColor: '#f59e0b',
    shortDescription: '老後の生活資金を準備するための貯蓄型保険',
    longDescription: '契約時に定めた年齢から年金を受け取れます。公的年金の補完として、老後の生活水準を維持するために有効な保険です。払込期間中は生命保険料控除の対象となります。',
    purpose: '老後資金の計画的な準備',
  },
  '収入保障保険': {
    iconName: 'TrendingDown',
    color: '#1e40af',
    bgColor: '#dbeafe',
    borderColor: '#3b82f6',
    shortDescription: '万一の際に毎月定額の保険金を遺族に支払う保険',
    longDescription: '被保険者が亡くなった場合、保険期間満了まで毎月一定額が遺族に支払われます。保険期間が進むほど受取総額が減少するため、保険料が割安です。子育て世帯の生活保障として合理的な選択です。',
    purpose: '遺族の生活費保障（特に子育て期間）',
  },
  '定期保険': {
    iconName: 'CalendarClock',
    color: '#0f766e',
    bgColor: '#ccfbf1',
    borderColor: '#14b8a6',
    shortDescription: '一定期間の死亡保障を割安な保険料で確保する保険',
    longDescription: '保険期間内に亡くなった場合に死亡保険金が支払われる掛け捨て型の保険です。貯蓄性はありませんが、同じ保障額なら終身保険より保険料が割安です。子育て期間など大きな保障が必要な期間に適しています。',
    purpose: '一定期間の大きな死亡保障の確保',
  },
  'がん保険': {
    iconName: 'Ribbon',
    color: '#9f1239',
    bgColor: '#ffe4e6',
    borderColor: '#f43f5e',
    shortDescription: 'がんの診断・治療に備える保険',
    longDescription: 'がんと診断された際の診断一時金や、がんによる入院・通院・手術への給付金を受け取れます。治療の長期化や先進医療費、収入減少など、がん特有の経済的リスクに備える保険です。',
    purpose: 'がん治療費・収入減少への備え',
  },
  '変額終身保険': {
    iconName: 'LineChart',
    color: '#5b21b6',
    bgColor: '#ede9fe',
    borderColor: '#8b5cf6',
    shortDescription: '保険料の一部を投資信託等で運用する終身保険',
    longDescription: '死亡保障は最低保証があり、運用成績次第で解約返戻金が増減します。保障と資産形成を兼ねることができますが、運用リスクは契約者が負います。長期保有で運用益が期待できます。',
    purpose: '一生涯の死亡保障＋資産形成',
  },
  '医療保険': {
    iconName: 'HeartPulse',
    color: '#166534',
    bgColor: '#dcfce7',
    borderColor: '#22c55e',
    shortDescription: '入院・手術時に給付金を受け取れる保険',
    longDescription: '公的医療保険（高額療養費制度）では賄えない差額ベッド代、食事代、休業中の収入減少を補います。特に自営業者や手厚い保障を求める方に重要な保険です。',
    purpose: '医療費の自己負担・収入減少への備え',
  },
  '終身保険': {
    iconName: 'ShieldCheck',
    color: '#3730a3',
    bgColor: '#e0e7ff',
    borderColor: '#6366f1',
    shortDescription: '一生涯の死亡保障を提供する保険',
    longDescription: '葬儀費用・相続対策・遺族への一時金として活用できます。貯蓄性があり、払込完了後の解約返戻金が高くなります。相続税の納税資金としても利用されます。',
    purpose: '葬儀費用・相続対策・遺族保障',
  },
  '養老保険': {
    iconName: 'PiggyBank',
    color: '#9d174d',
    bgColor: '#fce7f3',
    borderColor: '#ec4899',
    shortDescription: '死亡保障と貯蓄を兼ねた保険',
    longDescription: '満期時に満期保険金を受け取れ、途中で亡くなった場合は死亡保険金が支払われます。教育資金や老後資金の計画的な準備に使われます。保障と貯蓄の両立が可能です。',
    purpose: '計画的な資金準備＋万一の保障',
  },
};

// 契約応当日を考慮した経過月数（契約日の「日」を過ぎていなければ切り捨て）
function monthsBetween(from: Date, to: Date): number {
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months--;
  return Math.max(0, months);
}

// 払込スケジュールの算出に必要な項目だけを抜き出した型。
// 編集中のフォーム（Partial<Policy>）からも同じ計算を呼べるようにするため
export type PremiumSchedule = Pick<
  Policy,
  'contractDate' | 'contractAge' | 'paymentFrequency' | 'premiumAmount' | 'paymentEndAge' | 'premiumPaymentCompleted' | 'annualPremium'
>;

// 払込期間（年）。終身払は上限なし
function getPaymentYears(policy: PremiumSchedule): number {
  return policy.paymentEndAge === 999
    ? Infinity
    : Math.max(0, policy.paymentEndAge - policy.contractAge);
}

// 契約からの経過月数に対する払込回数（契約日に1回目、以降は契約応当日ごと）。
// 「現在時点」も「将来の年齢時点」も同じモデルで数えるための共通ロジック
function getPaidCountAtElapsedMonths(policy: PremiumSchedule, elapsedMonths: number): number {
  const paymentYears = getPaymentYears(policy);
  const paidCount = policy.paymentFrequency === 'monthly'
    ? Math.min(Math.floor(elapsedMonths) + 1, paymentYears * 12)
    : Math.min(Math.floor(elapsedMonths / 12) + 1, paymentYears);
  return Math.max(0, paidCount);
}

// 累計支払済は契約日ベースの実払込回数で計算する
// （年齢差ベースだと保険年齢/満年齢のズレや被保険者≠本人のケースで最大1年超の誤差が出るため）
export function calculateTotalPremiumsPaid(policy: Policy, currentAge: number, now: Date = new Date()): number {
  if (policy.paymentFrequency === 'single') return policy.premiumAmount;
  if (policy.premiumPaymentCompleted) return calculateProjectedTotalPremiums(policy);

  const contract = new Date(policy.contractDate);
  // 契約日が不正な場合のみ年齢差ベースにフォールバック
  if (isNaN(contract.getTime())) return getCumulativePremiumsAtAge(policy, currentAge);

  if (now.getTime() < contract.getTime()) return 0;

  return policy.premiumAmount * getPaidCountAtElapsedMonths(policy, monthsBetween(contract, now));
}

export function calculateProjectedTotalPremiums(policy: PremiumSchedule): number {
  if (policy.paymentFrequency === 'single') return policy.premiumAmount;
  const paymentYears = policy.paymentEndAge === 999 ? 50 : policy.paymentEndAge - policy.contractAge;
  return policy.annualPremium * Math.max(0, paymentYears);
}

export function getPensionPayoutSummary(policy: Policy) {
  const startAge = policy.paymentEndAge;
  const periodYears = policy.pensionPayoutYears && policy.pensionPayoutYears > 0
    ? policy.pensionPayoutYears
    : policy.policyEndAge === 999
      ? 20
      : Math.max(0, policy.policyEndAge - startAge);
  const endAge = startAge + periodYears;
  const annualPayout = periodYears > 0 ? policy.maturityBenefit / periodYears : 0;
  const projectedTotalPremiums = calculateProjectedTotalPremiums(policy);
  const returnRate = projectedTotalPremiums > 0
    ? (policy.maturityBenefit / projectedTotalPremiums * 100).toFixed(1)
    : '---';

  return {
    startAge,
    endAge,
    periodYears,
    annualPayout,
    projectedTotalPremiums,
    returnRate,
  };
}

export function calculateRemainingPremiums(policy: Policy, currentAge: number): number {
  return Math.max(0, calculateProjectedTotalPremiums(policy) - calculateTotalPremiumsPaid(policy, currentAge));
}

// --- 年齢別の解約返戻金（スパース入力＋線形補間） ---

// 入力済みの返戻金を年齢昇順・重複排除で取り出す（同じ年齢は後の行を優先）
export function getSurrenderValues(policy: Policy): SurrenderValuePoint[] {
  const points = policy.surrenderValues;
  if (!Array.isArray(points) || points.length === 0) return [];

  const byAge = new Map<number, SurrenderValuePoint>();
  points.forEach(point => {
    if (!point || typeof point.age !== 'number' || typeof point.amount !== 'number') return;
    if (!Number.isFinite(point.age) || !Number.isFinite(point.amount)) return;
    if (point.age <= 0) return;
    byAge.set(Math.round(point.age), { ...point, age: Math.round(point.age) });
  });

  return [...byAge.values()].sort((a, b) => a.age - b.age);
}

export function hasSurrenderValues(policy: Policy): boolean {
  return getSurrenderValues(policy).length > 0;
}

// 入力済みの最初と最後の返戻金から年平均成長率（CAGR）を求める。
// 設計書の数値以上の精度を装わないよう0.5%刻みに丸め、異常値（減少・年15%超）は推定に使わない。
// 入力欄でも「何%で延長されるか」を出すため、証券の設定とは切り離した純粋な計算にしてある
export function calcSurrenderAnnualRate(points: SurrenderValuePoint[]): number | null {
  if (points.length < 2) return null;

  const first = points[0];
  const last = points[points.length - 1];
  const years = last.age - first.age;
  if (years <= 0 || first.amount <= 0 || last.amount <= first.amount) return null;

  const rawRate = Math.pow(last.amount / first.amount, 1 / years) - 1;
  if (!Number.isFinite(rawRate) || rawRate <= 0 || rawRate > 0.15) return null;

  return Math.round(rawRate / 0.005) * 0.005;
}

// 最終入力より先を複利で延長するときの年率。証券ごとに「横ばい」を選べる（未指定は延長する）
export function getSurrenderProjectionAnnualRate(policy: Policy): number | null {
  if (policy.surrenderProjection === 'flat') return null;
  return calcSurrenderAnnualRate(getSurrenderValues(policy));
}

// 年齢差から求めた経過月数と、契約日から求めた実経過月数のズレ（保険年齢/満年齢の差など）。
// これを年齢ベースの推移に足すことで、現在年齢時点で calculateTotalPremiumsPaid と完全に一致させる
function getAgeToElapsedMonthsOffset(policy: PremiumSchedule, currentAge?: number, now: Date = new Date()): number {
  if (currentAge === undefined) return 0;
  const contract = new Date(policy.contractDate);
  if (isNaN(contract.getTime())) return 0;
  if (now.getTime() < contract.getTime()) return 0;
  return monthsBetween(contract, now) - (currentAge - policy.contractAge) * 12;
}

// 指定年齢に達した時点の払込累計。calculateTotalPremiumsPaid と同じ払込回数モデルを
// 将来の年齢まで延長したもので、currentAge を渡せば現在年齢時点の値は完全に一致する。
// グラフの払込累計ライン・損益分岐・返戻率はすべてこの関数を分母にすること
export function getCumulativePremiumsAtAge(
  policy: PremiumSchedule,
  age: number,
  currentAge?: number,
  now: Date = new Date(),
): number {
  if (age < policy.contractAge) return 0;
  if (policy.paymentFrequency === 'single') return policy.premiumAmount;
  if (policy.premiumPaymentCompleted) return calculateProjectedTotalPremiums(policy);

  const elapsedMonths = (age - policy.contractAge) * 12 + getAgeToElapsedMonthsOffset(policy, currentAge, now);
  return policy.premiumAmount * getPaidCountAtElapsedMonths(policy, elapsedMonths);
}

// 指定年齢時点の解約返戻金。入力点の間は線形補間、最初の入力点より前は契約時0からの補間。
// 個別に将来推定を指定した証券は最後の入力点以降を過去の年平均成長率で複利推定し、
// それ以外は従来どおり横ばいとみなす（保障終了後は null）。
export function getSurrenderValueAtAge(policy: Policy, age: number): number | null {
  const points = getSurrenderValues(policy);
  if (points.length === 0) return null;
  if (age < policy.contractAge) return null;

  const first = points[0];
  const last = points[points.length - 1];
  if (policy.policyEndAge !== 999 && age > Math.max(policy.policyEndAge, last.age)) return null;

  if (age <= first.age) {
    const span = first.age - policy.contractAge;
    if (span <= 0) return first.amount;
    return first.amount * ((age - policy.contractAge) / span);
  }
  if (age >= last.age) {
    const projectionRate = getSurrenderProjectionAnnualRate(policy);
    return projectionRate === null
      ? last.amount
      : last.amount * Math.pow(1 + projectionRate, age - last.age);
  }

  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i];
    const to = points[i + 1];
    if (age >= from.age && age <= to.age) {
      const span = to.age - from.age;
      if (span <= 0) return to.amount;
      return from.amount + (to.amount - from.amount) * ((age - from.age) / span);
    }
  }
  return last.amount;
}

export interface SurrenderValueSummary {
  currentAge: number;
  currentAmount: number | null;
  currentPaid: number;
  currentRate: number | null;
  breakEvenAge: number | null;
  peak: SurrenderValuePoint | null;
  firstAge: number;
  lastAge: number;
  count: number;
}

// 解約返戻率が初めて100%に達する年齢（損益分岐年齢）
export function getSurrenderBreakEvenAge(policy: Policy, currentAge?: number): number | null {
  const points = getSurrenderValues(policy);
  if (points.length === 0) return null;

  const lastAge = points[points.length - 1].age;
  for (let age = Math.max(policy.contractAge, 0); age <= lastAge; age++) {
    const value = getSurrenderValueAtAge(policy, age);
    const paid = getCumulativePremiumsAtAge(policy, age, currentAge);
    if (value !== null && paid > 0 && value >= paid) return age;
  }
  return null;
}

export function getSurrenderValueSummary(policy: Policy, currentAge: number): SurrenderValueSummary | null {
  const points = getSurrenderValues(policy);
  if (points.length === 0) return null;

  const currentAmount = getSurrenderValueAtAge(policy, currentAge);
  // 損益分岐・グラフと同じ分母を使う（calculateTotalPremiumsPaid とも現在年齢時点で一致する）
  const currentPaid = getCumulativePremiumsAtAge(policy, currentAge, currentAge);
  const peak = points.reduce((best, point) => (point.amount > best.amount ? point : best), points[0]);

  return {
    currentAge,
    currentAmount,
    currentPaid,
    currentRate: currentAmount !== null && currentPaid > 0 ? (currentAmount / currentPaid) * 100 : null,
    breakEvenAge: getSurrenderBreakEvenAge(policy, currentAge),
    peak,
    firstAge: points[0].age,
    lastAge: points[points.length - 1].age,
    count: points.length,
  };
}

// 死亡保障推移グラフの系列色（全体グラフと受取人別グラフで共通の割当）
export const COVERAGE_CHART_COLORS = ['#a5b4fc', '#86efac', '#fde68a', '#fdba74', '#67e8f9', '#f0abfc', '#fda4af', '#c4b5fd'];

// 死亡保障推移グラフの対象証券と描画順（収入保障系は積み上げ最上段=先頭）
export function getCoverageChartPolicies(policies: Policy[]): Policy[] {
  return policies.filter(policy => policy.deathBenefitDisease > 0 && !isLikelyIncomeProtectionGrossAmount(policy));
}

function getStableColorIndex(policyId: string): number {
  let hash = 0;
  for (let i = 0; i < policyId.length; i++) {
    hash = (hash * 31 + policyId.charCodeAt(i)) >>> 0;
  }
  return hash % COVERAGE_CHART_COLORS.length;
}

export function buildCoverageColorMap(chartPolicies: Policy[]): Map<string, string> {
  const used = new Set<number>();
  const colorsById = new Map<string, string>();

  [...chartPolicies]
    .sort((a, b) => a.id.localeCompare(b.id))
    .forEach(policy => {
      let colorIndex = getStableColorIndex(policy.id);
      while (used.has(colorIndex) && used.size < COVERAGE_CHART_COLORS.length) {
        colorIndex = (colorIndex + 1) % COVERAGE_CHART_COLORS.length;
      }
      used.add(colorIndex);
      colorsById.set(policy.id, COVERAGE_CHART_COLORS[colorIndex]);
    });

  return colorsById;
}

// 指定年齢時点の死亡保障額。収入保障系は月額を残存期間の受取総額に換算する
export function getDeathBenefitAtAge(policy: Policy, age: number): number {
  if (age < policy.contractAge) return 0;
  if (policy.policyEndAge !== 999 && age >= policy.policyEndAge) return 0;
  if (isIncomeProtectionPolicyType(policy.policyType)) {
    if (isLikelyIncomeProtectionGrossAmount(policy)) return 0;
    if (policy.policyEndAge === 999) return 0;
    const remainingYears = Math.max(0, policy.policyEndAge - age);
    return policy.deathBenefitDisease * 12 * remainingYears;
  }
  return policy.deathBenefitDisease;
}

export function getIncomeProtectionDeathBenefitTotal(policy: Policy, insuredBirthDate: string, asOf: Date = new Date()): number | null {
  if (!isIncomeProtectionPolicyType(policy.policyType) || policy.policyEndAge === 999) return null;
  if (isLikelyIncomeProtectionGrossAmount(policy)) return null;

  const birth = new Date(insuredBirthDate);
  if (Number.isNaN(birth.getTime())) return null;

  const endDate = new Date(birth);
  endDate.setFullYear(birth.getFullYear() + policy.policyEndAge);
  if (asOf >= endDate) return 0;

  const remainingMonths = monthsBetween(asOf, endDate);
  return policy.deathBenefitDisease * remainingMonths;
}

export function isLikelyIncomeProtectionGrossAmount(policy: Policy): boolean {
  return isIncomeProtectionPolicyType(policy.policyType) && policy.deathBenefitDisease >= 1000000;
}

export function getCurrentDeathBenefit(policy: Policy, currentAge: number): number {
  return getDeathBenefitAtAge(policy, currentAge);
}

export function getRemainingCoverageYears(policy: Policy, currentAge: number): number | 'lifetime' {
  if (policy.policyEndAge === 999) return 'lifetime';
  return Math.max(0, policy.policyEndAge - currentAge);
}

export function getRemainingPaymentYears(policy: Policy, currentAge: number): number | 'lifetime' {
  if (policy.premiumPaymentCompleted) return 0;
  if (policy.paymentEndAge === 999) return 'lifetime';
  return Math.max(0, policy.paymentEndAge - currentAge);
}

export function isPaidUp(policy: Policy, currentAge: number): boolean {
  if (policy.paymentFrequency === 'single') return true;
  if (policy.premiumPaymentCompleted) return true;
  return policy.paymentEndAge !== 999 && currentAge >= policy.paymentEndAge;
}

export function isExpired(policy: Policy, currentAge: number): boolean {
  return policy.policyEndAge !== 999 && currentAge >= policy.policyEndAge;
}

function evaluateCoverageDuration(policy: Policy, currentAge: number): EvaluationResult {
  const remaining = getRemainingCoverageYears(policy, currentAge);
  if (remaining === 'lifetime') {
    return { rating: 'good', label: '保障期間', text: '終身保障で安心です' };
  }
  if (remaining <= 0) {
    return { rating: 'warning', label: '保障期間', text: '保障期間が終了しています' };
  }
  if (remaining <= 5) {
    return { rating: 'warning', label: '保障期間', text: `残り${remaining}年 — 更新・見直しの検討が必要です` };
  }
  if (remaining <= 10) {
    return { rating: 'caution', label: '保障期間', text: `残り${remaining}年です` };
  }
  return { rating: 'good', label: '保障期間', text: `あと${remaining}年間続きます` };
}

function evaluatePaymentStatus(policy: Policy, currentAge: number): EvaluationResult {
  if (isPaidUp(policy, currentAge)) {
    return { rating: 'good', label: '払込状況', text: '払込完了済み — 追加費用なく保障が継続しています' };
  }
  const remaining = getRemainingPaymentYears(policy, currentAge);
  if (remaining === 'lifetime') {
    return { rating: 'caution', label: '払込状況', text: '終身払いです' };
  }
  if (remaining <= 3) {
    return { rating: 'good', label: '払込状況', text: `あと${remaining}年で払込完了です` };
  }
  return { rating: 'caution', label: '払込状況', text: `払込終了まであと${remaining}年（${policy.paymentEndAge}歳まで）` };
}

function evaluateCoverageAdequacy(policy: Policy, currentAge: number): EvaluationResult | null {
  if (isExpired(policy, currentAge)) return null;

  if (policy.policyType === '医療保険') {
    if (policy.hospDayDisease < 5000 && policy.hospDayDisease > 0) {
      return { rating: 'warning', label: '保障充足度', text: `入院日額${policy.hospDayDisease.toLocaleString()}円は一般的な水準（5,000〜10,000円）を下回っています` };
    }
    if (policy.hospDayDisease >= 10000) {
      return { rating: 'good', label: '保障充足度', text: `入院日額${policy.hospDayDisease.toLocaleString()}円で十分な水準です` };
    }
    return { rating: 'caution', label: '保障充足度', text: `入院日額${policy.hospDayDisease.toLocaleString()}円は標準的な水準です` };
  }

  if (policy.policyType === 'がん保険') {
    if (policy.diagnosisBenefit >= 1000000) {
      return { rating: 'good', label: '保障充足度', text: `診断一時金${formatWholeManYen(policy.diagnosisBenefit)}で十分な水準です` };
    }
    if (policy.diagnosisBenefit > 0) {
      return { rating: 'caution', label: '保障充足度', text: `診断一時金${formatWholeManYen(policy.diagnosisBenefit)}です。治療費を考慮すると100万円以上が目安です` };
    }
    if (policy.hospDayDisease > 0) {
      return { rating: 'caution', label: '保障充足度', text: `入院日額${policy.hospDayDisease.toLocaleString()}円のがん保障です。診断一時金の追加を検討してください` };
    }
    return null;
  }

  if (['終身保険', '変額終身保険', '定期保険'].includes(policy.policyType)) {
    const benefit = policy.deathBenefitDisease;
    if (benefit < 3000000) {
      return { rating: 'caution', label: '保障充足度', text: '死亡保障額が葬儀費用の平均（約300万円）を下回っています' };
    }
    return { rating: 'good', label: '保障充足度', text: `死亡保障${formatWholeManYen(benefit)}を確保しています` };
  }

  if (isIncomeProtectionPolicyType(policy.policyType)) {
    if (isLikelyIncomeProtectionGrossAmount(policy)) {
      return {
        rating: 'warning',
        label: '保障充足度',
        text: '死亡保険金月額に総額が入っている可能性があります。証券の月額給付額を確認してください',
      };
    }
    const current = getCurrentDeathBenefit(policy, currentAge);
    if (current < 5000000) {
      return { rating: 'warning', label: '保障充足度', text: `現在の受取総額は${formatWholeManYen(current)}に逓減しています` };
    }
    return { rating: 'good', label: '保障充足度', text: `現在の受取総額は${formatWholeManYen(current)}です` };
  }

  return null;
}

function generateConsultantNote(policy: Policy, currentAge: number): string {
  const expired = isExpired(policy, currentAge);
  if (expired) {
    return `この${policy.policyType}は保障期間が終了しています。同種の保障が必要な場合は、新たな加入を検討してください。`;
  }

  const paidUp = isPaidUp(policy, currentAge);
  const remainCov = getRemainingCoverageYears(policy, currentAge);

  switch (policy.policyType) {
    case '収入保障保険': {
      if (isLikelyIncomeProtectionGrossAmount(policy)) {
        return '収入保障保険は死亡保険金月額をもとに受取総額を計算します。現在の入力額は月額としては大きいため、総額が入っていないか証券の月額給付額を確認してください。';
      }
      const current = getCurrentDeathBenefit(policy, currentAge);
      let note = `収入保障保険は死亡保険金月額${formatWholeManYen(policy.deathBenefitDisease)}が保険期間満了まで支払われ、経過年数とともに受取総額が逓減する合理的な設計です。現在の受取総額は約${formatWholeManYen(current)}です。`;
      if (remainCov !== 'lifetime' && remainCov <= 10) {
        note += `保障期間終了（${policy.policyEndAge}歳）後の遺族保障について別途検討が必要です。`;
      }
      return note;
    }
    case '定期保険': {
      let note = '一定期間の死亡保障を割安な保険料で確保できる掛け捨て型の保険です。';
      if (remainCov !== 'lifetime' && remainCov <= 10) {
        note += `保障期間が${policy.policyEndAge}歳で終了するため、更新時の保険料上昇や期間終了後の保障について検討が必要です。`;
      }
      return note;
    }
    case 'がん保険': {
      let note = 'がんの診断・治療に特化した保障です。';
      if (policy.diagnosisBenefit > 0) {
        note += `診断一時金${formatWholeManYen(policy.diagnosisBenefit)}により、治療初期の経済的負担に備えられます。`;
      }
      if (policy.hospDayDisease > 0) {
        note += `がん入院日額${policy.hospDayDisease.toLocaleString()}円が付帯しています。`;
      }
      if (remainCov !== 'lifetime' && remainCov <= 15) {
        note += `保障期間が${policy.policyEndAge}歳で終了するため、高齢期のがんリスクへの対策を検討してください。`;
      }
      return note;
    }
    case '変額終身保険': {
      let note = '運用実績により解約返戻金が変動しますが、死亡保障額は最低保証されています。';
      if (paidUp) {
        note += '払込が完了しており、追加費用なく一生涯の保障が継続しています。';
      } else {
        note += '長期保有により運用益が期待できるため、継続をお勧めします。';
      }
      return note;
    }
    case '医療保険': {
      let note = `入院日額${policy.hospDayDisease.toLocaleString()}円の医療保障を提供しています。`;
      if (policy.diagnosisBenefit > 0) {
        note += `診断一時金${formatWholeManYen(policy.diagnosisBenefit)}も付帯しており、がん等の重大疾病への備えがあります。`;
      }
      if (remainCov !== 'lifetime' && remainCov <= 15) {
        note += `保障期間が${policy.policyEndAge}歳で終了するため、高齢期の医療費リスクへの対策を検討してください。`;
      }
      return note;
    }
    case '個人年金保険': {
      let note = '公的年金を補完する私的年金として、老後の安定収入を確保します。';
      if (policy.maturityBenefit > 0) {
        note += `年金受取総額は${formatWholeManYen(policy.maturityBenefit)}の予定です。`;
      }
      if (paidUp) {
        note += '払込が完了しています。据置期間中も積立金が増加します。';
      }
      return note;
    }
    case '終身保険': {
      let note = '一生涯の死亡保障が確保されており、葬儀費用や相続対策として有効です。';
      if (paidUp) {
        note += '払込完了済みのため、解約返戻金も高水準です。必要に応じて契約者貸付も活用できます。';
      }
      return note;
    }
    case '養老保険': {
      let note = '死亡保障と貯蓄を兼ね備えた保険です。';
      if (policy.maturityBenefit > 0) {
        note += `満期保険金${formatWholeManYen(policy.maturityBenefit)}が予定されています。`;
      }
      return note;
    }
    default:
      return '';
  }
}

export function analyzePolicy(policy: Policy, currentAge: number): PolicyAnalysis {
  const evaluations: EvaluationResult[] = [
    evaluateCoverageDuration(policy, currentAge),
    evaluatePaymentStatus(policy, currentAge),
  ];
  const adequacy = evaluateCoverageAdequacy(policy, currentAge);
  if (adequacy) evaluations.push(adequacy);

  return {
    totalPremiumsPaid: calculateTotalPremiumsPaid(policy, currentAge),
    projectedTotalPremiums: calculateProjectedTotalPremiums(policy),
    remainingPremiums: calculateRemainingPremiums(policy, currentAge),
    currentDeathBenefit: getCurrentDeathBenefit(policy, currentAge),
    remainingCoverageYears: getRemainingCoverageYears(policy, currentAge),
    remainingPaymentYears: getRemainingPaymentYears(policy, currentAge),
    isPaidUp: isPaidUp(policy, currentAge),
    isExpired: isExpired(policy, currentAge),
    evaluations,
    consultantNote: generateConsultantNote(policy, currentAge),
  };
}

export function analyzePortfolio(policies: Policy[], currentAge: number): PortfolioInsight[] {
  const insights: PortfolioInsight[] = [];
  const types = new Set(policies.map(p => p.policyType));
  const activePolicies = policies.filter(p => !isExpired(p, currentAge));

  if (!types.has('医療保険') || !activePolicies.some(p => p.policyType === '医療保険')) {
    insights.push({ type: 'gap', text: '有効な医療保険がありません。入院時の自己負担に備える保障の検討をお勧めします。' });
  }

  const deathBenefitPolicies = activePolicies.filter(p => p.deathBenefitDisease > 0 && !isLikelyIncomeProtectionGrossAmount(p));
  const hasDeathBenefit = deathBenefitPolicies.length > 0;
  if (!hasDeathBenefit) {
    insights.push({ type: 'gap', text: '有効な死亡保障がありません。遺族の生活保障について検討をお勧めします。' });
  }

  const medicalPolicies = activePolicies.filter(p => p.policyType === '医療保険');
  if (medicalPolicies.length > 0 && medicalPolicies.every(p => p.policyEndAge !== 999)) {
    const earliest = Math.min(...medicalPolicies.map(p => p.policyEndAge));
    insights.push({ type: 'recommendation', text: `医療保険の保障が${earliest}歳で終了します。高齢期の医療費増加に備え、終身型医療保険の検討をお勧めします。` });
  }

  const incomeProtection = activePolicies.filter(p => isIncomeProtectionPolicyType(p.policyType));
  incomeProtection.forEach(p => {
    const remaining = getRemainingCoverageYears(p, currentAge);
    if (remaining !== 'lifetime' && remaining <= 10) {
      insights.push({ type: 'recommendation', text: `${p.policyType}（${p.companyName}）の保障期間が残り${remaining}年です。期間終了後の遺族保障について検討してください。` });
    }
  });

  if (deathBenefitPolicies.length >= 3) {
    insights.push({ type: 'redundancy', text: `死亡保障のある保険が${deathBenefitPolicies.length}件あります。保障の重複がないか確認をお勧めします。` });
  }

  if (!types.has('終身保険') && !types.has('変額終身保険')) {
    insights.push({ type: 'recommendation', text: '終身型の死亡保障がありません。葬儀費用や相続対策として終身保険の検討をお勧めします。' });
  }

  return insights;
}

export function getMonthlyPremium(policy: Policy): number {
  if (policy.paymentFrequency === 'monthly') return policy.premiumAmount;
  if (policy.paymentFrequency === 'annual') return policy.premiumAmount / 12;
  return 0;
}

export function getActiveMonthlyPremium(policy: Policy, currentAge: number | null): number {
  if (policy.paymentFrequency === 'single') return 0;
  if (policy.premiumPaymentCompleted) return 0;
  if (currentAge !== null && policy.paymentEndAge !== 999 && currentAge >= policy.paymentEndAge) return 0;
  return getMonthlyPremium(policy);
}
