/**
 * 返戻率入力の検算サンプル
 *
 * SurrenderValueEditor の「返戻率 → 解約返戻金」の計算を、実際のアプリと同じ
 * getCumulativePremiumsAtAge（utils/analysisUtils.ts）を読み込んで再現する。
 *
 * 実行:
 *   docker run --rm -v "<apps/insurance-app の絶対パス>://app" -w "//app" node:22-alpine \
 *     sh -c 'npx --yes tsx verify-surrender-rate.mts'
 */
import { getCumulativePremiumsAtAge, type PremiumSchedule } from '@/utils/analysisUtils';

// 検算結果を再現可能にするため「今日」を固定する（アプリ側は new Date()）。
// monthsBetween() が getMonth()/getDate() でローカル時刻を見るので、ISO文字列ではなく
// ローカル日付として組み立てる（UTCのコンテナでもJSTのブラウザでも同じ2026-08-01になる）
const NOW = new Date(2026, 7, 1);

// ---------------------------------------------------------------------------
// アプリ側の実装をそのまま写したもの
// ---------------------------------------------------------------------------

// PolicyForm.tsx: 払込累計を円・ドルの2本立てで作る
function buildPaidAtAge(policy: {
  contractDate: string;
  contractAge: number;
  paymentFrequency: PremiumSchedule['paymentFrequency'];
  premiumAmount: number;
  foreignPremiumAmount: number;
  paymentEndAge: number;
  premiumPaymentCompleted: boolean;
}, currentAge: number) {
  const cumulativeAtAge = (premiumAmount: number) => {
    const schedule: PremiumSchedule = {
      contractDate: policy.contractDate,
      contractAge: policy.contractAge,
      paymentFrequency: policy.paymentFrequency,
      premiumAmount,
      paymentEndAge: policy.paymentEndAge,
      premiumPaymentCompleted: policy.premiumPaymentCompleted,
      annualPremium: policy.paymentFrequency === 'monthly' ? premiumAmount * 12 : premiumAmount,
    };
    return (age: number) => getCumulativePremiumsAtAge(schedule, age, currentAge, NOW);
  };
  const yen = cumulativeAtAge(policy.premiumAmount);
  const foreign = cumulativeAtAge(policy.foreignPremiumAmount);
  return {
    paidAtAge: (age: number) => Math.round(yen(age)),
    foreignPaidAtAge: (age: number) => Math.round(foreign(age) * 100) / 100,
  };
}

// SurrenderValueEditor.tsx: 返戻率を入れたときに確定する金額
function amountFromRate(
  isUsd: boolean,
  basis: number,
  ratePercent: number,
  exchangeRate: number,
): { amount: number; foreignAmount?: number } {
  if (basis <= 0) throw new Error('払込累計が0のときは率入力を無効化する');
  const value = (basis * ratePercent) / 100;
  if (!isUsd) return { amount: Math.round(value) };
  const foreignAmount = Math.round(value * 100) / 100;
  return { foreignAmount, amount: Math.round(foreignAmount * exchangeRate) };
}

// ---------------------------------------------------------------------------
// 実データ（insurance.sqlite の policies テーブルより）
// ---------------------------------------------------------------------------

const USD_SINGLE = {
  label: '中原様 PSX0294089（終身保険・外貨建て・一時払）',
  contractDate: '2025-08-22',
  contractAge: 62,
  paymentFrequency: 'single' as const,
  premiumAmount: 15_000_000,      // 実支払円額
  foreignPremiumAmount: 100_650.88, // 設計書上のドル保険料
  paymentEndAge: 999,
  premiumPaymentCompleted: false,
  exchangeRate: 160,
  currentAge: 63,
};

const JPY_MONTHLY = {
  label: '山田様 DEMO-WL-001（終身保険・円建て・月払）',
  contractDate: '2015-06-01',
  contractAge: 37,
  paymentFrequency: 'monthly' as const,
  premiumAmount: 12_800,
  foreignPremiumAmount: 0,
  paymentEndAge: 65,
  premiumPaymentCompleted: false,
  exchangeRate: 0,
  currentAge: 48,
};

const NO_PREMIUM = {
  label: '中原様 個人年金保険（保険料0円・払込済み）',
  contractDate: '2015-04-01',
  contractAge: 52,
  paymentFrequency: 'monthly' as const,
  premiumAmount: 0,
  foreignPremiumAmount: 0,
  paymentEndAge: 63,
  premiumPaymentCompleted: false,
  exchangeRate: 0,
  currentAge: 63,
};

// ---------------------------------------------------------------------------

const yen = (n: number) => `${Math.round(n).toLocaleString('ja-JP')}円`;
const results: { ok: boolean; label: string }[] = [];

function check(label: string, actual: number, expected: number) {
  const ok = Math.abs(actual - expected) < 0.005;
  results.push({ ok, label });
  console.log(`  ${ok ? 'OK  ' : 'NG  '}${label}: ${actual.toLocaleString('ja-JP')}（期待値 ${expected.toLocaleString('ja-JP')}）`);
}

console.log('=== 1. 外貨建て一時払：返戻率90%を入力 ===');
console.log(USD_SINGLE.label);
{
  const { paidAtAge, foreignPaidAtAge } = buildPaidAtAge(USD_SINGLE, USD_SINGLE.currentAge);
  const age = 67;
  const usdBasis = foreignPaidAtAge(age);
  const jpyBasis = paidAtAge(age);
  console.log(`  ${age}歳時点の払込累計: $${usdBasis.toLocaleString('ja-JP')} / ${yen(jpyBasis)}`);

  const applied = amountFromRate(true, usdBasis, 90, USD_SINGLE.exchangeRate);
  check('ドル基準の解約返戻金', applied.foreignAmount!, 90_585.79);
  check('その円換算（画面表示）', applied.amount, 14_493_726);

  // 修正前の実装（円の払込累計を分母にしていた場合）との差
  const oldWay = amountFromRate(false, jpyBasis, 90, 0).amount;
  console.log(`  参考）円基準で計算した場合: ${yen(oldWay)} → 差額 ${yen(applied.amount - oldWay)}`);
  console.log(`  ※設計書の返戻率はドルベースなので、円基準だと支払時レートと評価レートの差だけずれる`);
}

console.log('');
console.log('=== 2. 円建て月払：返戻率105%を入力 ===');
console.log(JPY_MONTHLY.label);
{
  const { paidAtAge } = buildPaidAtAge(JPY_MONTHLY, JPY_MONTHLY.currentAge);
  const age = 42;
  const basis = paidAtAge(age);
  console.log(`  ${age}歳時点の払込累計: ${yen(basis)}（月額${JPY_MONTHLY.premiumAmount.toLocaleString('ja-JP')}円 × ${basis / JPY_MONTHLY.premiumAmount}回）`);
  check('解約返戻金', amountFromRate(false, basis, 105, 0).amount, 846_720);

  // 逆方向：金額を入れると率が戻るか
  const rate = (846_720 / basis) * 100;
  check('金額 846,720円 から逆算した返戻率(%)', Math.round(rate * 10) / 10, 105);
}

console.log('');
console.log('=== 3. 保険料未入力：率入力を無効化する条件 ===');
console.log(NO_PREMIUM.label);
{
  const { paidAtAge } = buildPaidAtAge(NO_PREMIUM, NO_PREMIUM.currentAge);
  const basis = paidAtAge(60);
  const disabled = basis <= 0;
  results.push({ ok: disabled, label: '率入力が無効' });
  console.log(`  ${disabled ? 'OK  ' : 'NG  '}払込累計 ${yen(basis)} → 率入力を無効化: ${disabled}`);
}

console.log('');
const failed = results.filter(r => !r.ok);
console.log(failed.length === 0
  ? `すべて一致しました（${results.length}件）`
  : `不一致 ${failed.length}件: ${failed.map(f => f.label).join(', ')}`);
process.exit(failed.length === 0 ? 0 : 1);
