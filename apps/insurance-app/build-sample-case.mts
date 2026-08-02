/**
 * 画面確認用サンプル案件の app-state を生成する。
 * 解約返戻金は「狙った返戻率」から実際の払込累計を使って逆算するので、
 * 画面の返戻率欄がそのままの値で表示される。
 *
 * 実行: npx --yes tsx build-sample-case.mts > sample-case.json
 */
import { getCumulativePremiumsAtAge, type PremiumSchedule } from '@/utils/analysisUtils';

const NOW = new Date(2026, 7, 1);

const M1 = 'sample-m1'; // 本人（1978-05-12 生まれ → 2026-08-01 時点で48歳）
const M2 = 'sample-m2'; // 配偶者
const M3 = 'sample-m3'; // 長男

const CURRENT_AGE = 48;

function paidAt(schedule: Omit<PremiumSchedule, 'annualPremium'>, age: number): number {
  const full: PremiumSchedule = {
    ...schedule,
    annualPremium: schedule.paymentFrequency === 'monthly' ? schedule.premiumAmount * 12 : schedule.premiumAmount,
  };
  return getCumulativePremiumsAtAge(full, age, CURRENT_AGE, NOW);
}

// 狙った返戻率から解約返戻金を作る（SurrenderValueEditor の率入力と同じ計算）
function pointsFromRates(
  schedule: Omit<PremiumSchedule, 'annualPremium'>,
  rates: [age: number, ratePercent: number][],
) {
  return rates.map(([age, rate]) => ({ age, amount: Math.round((paidAt(schedule, age) * rate) / 100) }));
}

function usdPointsFromRates(
  foreignPremium: number,
  exchangeRate: number,
  rates: [age: number, ratePercent: number][],
) {
  return rates.map(([age, rate]) => {
    const foreignAmount = Math.round(((foreignPremium * rate) / 100) * 100) / 100;
    return { age, foreignAmount, amount: Math.round(foreignAmount * exchangeRate) };
  });
}

// --- 1. 終身保険（円建て・月払）: 円建ての返戻率入力と損益分岐 --------------
const wholeLifeJpy = {
  contractDate: '2015-06-01',
  contractAge: 37,
  paymentFrequency: 'monthly' as const,
  premiumAmount: 12_800,
  paymentEndAge: 65,
  premiumPaymentCompleted: false,
};

// --- 3. がん保険（円建て・月払）: 医療系でも返戻金を入力できることの確認 ----
const cancer = {
  contractDate: '2018-06-01',
  contractAge: 40,
  paymentFrequency: 'monthly' as const,
  premiumAmount: 4_600,
  paymentEndAge: 60,
  premiumPaymentCompleted: false,
};

const state = {
  familyMembers: [
    { id: M1, name: 'サンプル　太郎', nameKana: 'サンプル　タロウ', relationship: '本人', birthDate: '1978-05-12', gender: 'male' },
    { id: M2, name: 'サンプル　花子', nameKana: 'サンプル　ハナコ', relationship: '配偶者', birthDate: '1980-09-20', gender: 'female' },
    { id: M3, name: 'サンプル　一郎', nameKana: 'サンプル　イチロウ', relationship: '長男', birthDate: '2008-04-03', gender: 'male' },
  ],
  agency: { name: '税理士法人マスエージェント', representative: '児嶋', phone: '088' },
  valuationSettings: { usdJpyRate: 160, fxRateDate: '2026-08-01' },
  policies: [
    {
      id: 'sample-p1',
      companyName: '日本生命',
      policyType: '終身保険',
      policyNumber: 'SAMPLE-WL-JPY',
      ...wholeLifeJpy,
      insuredId: M1,
      beneficiaryAllocations: [{ beneficiaryId: M2, percentage: 100 }],
      deathBenefitDisease: 5_000_000,
      deathBenefitAccident: 0,
      hospDayDisease: 0,
      hospDayAccident: 0,
      diagnosisBenefit: 0,
      maturityBenefit: 0,
      policyEndAge: 999,
      annualPremium: 153_600,
      currency: 'JPY',
      // 40〜75歳を入力 → 契約37歳側と75歳以降がグラフで点線（推定）になる
      surrenderValues: pointsFromRates(wholeLifeJpy, [[40, 60], [50, 85], [60, 95], [65, 103], [75, 112]]),
      consultantNote: '【サンプル】円建ての返戻率入力・損益分岐の確認用。65歳で元本回収。',
    },
    {
      id: 'sample-p2',
      companyName: 'メットライフ生命',
      policyType: '終身保険',
      policyNumber: 'SAMPLE-WL-USD',
      contractDate: '2025-08-22',
      contractAge: 47,
      insuredId: M1,
      beneficiaryAllocations: [{ beneficiaryId: M3, percentage: 100 }],
      deathBenefitDisease: 42_668_136,
      foreignDeathBenefitDisease: 266_675.85,
      deathBenefitAccident: 0,
      hospDayDisease: 0,
      hospDayAccident: 0,
      diagnosisBenefit: 0,
      maturityBenefit: 0,
      policyEndAge: 999,
      paymentFrequency: 'single' as const,
      paymentEndAge: 999,
      premiumAmount: 15_000_000,
      annualPremium: 15_000_000,
      premiumPaymentCompleted: false,
      currency: 'USD',
      paymentCurrency: 'JPY',
      exchangeRate: 160,
      foreignPremiumAmount: 100_000,
      actualPremiumPaidJpy: 15_000_000,
      premiumPaymentDate: '2025-08-22',
      // ドル基準の返戻率（設計書どおりの数字が入る）
      surrenderValues: usdPointsFromRates(100_000, 160, [[50, 85], [60, 95], [70, 105], [80, 112]]),
      consultantNote: '【サンプル】外貨建て一時払。返戻率はドル基準。証券一覧の「一時払・実支払1,500万円」表記の確認用。',
    },
    {
      id: 'sample-p3',
      companyName: 'アフラック',
      policyType: 'がん保険',
      policyNumber: 'SAMPLE-CANCER',
      ...cancer,
      insuredId: M1,
      deathBenefitDisease: 0,
      deathBenefitAccident: 0,
      hospDayDisease: 10_000,
      hospDayAccident: 0,
      diagnosisBenefit: 1_000_000,
      maturityBenefit: 0,
      policyEndAge: 999,
      annualPremium: 55_200,
      currency: 'JPY',
      // 医療系でも返戻金を持てる（グラフは入院日額=左軸／返戻金=右軸の2軸になる）
      surrenderValues: pointsFromRates(cancer, [[50, 40], [60, 55], [70, 62]]),
      consultantNote: '【サンプル】低解約返戻金型のがん保険。返戻金の右軸表示と、100%未満（損益分岐に到達せず）の確認用。',
    },
    {
      id: 'sample-p4',
      companyName: 'ソニー生命',
      policyType: '定期保険',
      policyNumber: 'SAMPLE-TERM-1.5OKU',
      contractDate: '2023-04-01',
      contractAge: 44,
      insuredId: M1,
      beneficiaryAllocations: [{ beneficiaryId: M2, percentage: 60 }, { beneficiaryId: M3, percentage: 40 }],
      deathBenefitDisease: 150_000_000,
      deathBenefitAccident: 0,
      hospDayDisease: 0,
      hospDayAccident: 0,
      diagnosisBenefit: 0,
      maturityBenefit: 0,
      policyEndAge: 65,
      paymentFrequency: 'monthly' as const,
      paymentEndAge: 65,
      premiumAmount: 28_000,
      annualPremium: 336_000,
      premiumPaymentCompleted: false,
      currency: 'JPY',
      consultantNote: '【サンプル】1億円超の保障。評価バッジと「保険種類の総合説明」が億表記になることの確認用。',
    },
    {
      id: 'sample-p5',
      companyName: '住友生命',
      policyType: '個人年金保険',
      policyNumber: 'SAMPLE-PENSION',
      contractDate: '2018-06-01',
      contractAge: 40,
      insuredId: M1,
      pensionRecipientId: M1,
      pensionSuccessorRecipientId: M2,
      deathBenefitDisease: 0,
      deathBenefitAccident: 0,
      hospDayDisease: 0,
      hospDayAccident: 0,
      diagnosisBenefit: 0,
      maturityBenefit: 6_000_000,
      pensionPayoutYears: 10,
      policyEndAge: 70,
      paymentFrequency: 'monthly' as const,
      paymentEndAge: 60,
      premiumAmount: 20_000,
      annualPremium: 240_000,
      premiumPaymentCompleted: false,
      currency: 'JPY',
      consultantNote: '【サンプル】年金受取欄が円単位で表示されることの確認用（年間年金額600,000円）。',
    },
  ],
};

console.log(JSON.stringify(state, null, 2));
