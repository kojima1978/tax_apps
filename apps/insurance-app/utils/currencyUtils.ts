import type { Policy, ValuationSettings } from '@/types';

export const EMPTY_VALUATION_SETTINGS: ValuationSettings = {
  usdJpyRate: 0,
  fxRateDate: '',
};

export function yenFromUsd(amount: number, usdJpyRate: number): number {
  return Math.round(Math.max(0, amount || 0) * Math.max(0, usdJpyRate || 0));
}

/**
 * 解約返戻金の点を「契約通貨での額」に直して保存する（保存・移行の両方がここを通る）。
 * 外貨建ては foreignAmount が本物で、amount は読み出しで作る円換算の写し。写しだけしか
 * 無い古い点は、保存した時のレートで割って外貨額に戻す（レートも無ければ 0。画面はもともと
 * 外貨額から作っているので見え方は変わらない）。
 */
export function surrenderAmountForStorage(
  point: { amount?: number; foreignAmount?: number },
  isForeign: boolean,
  savedRate: number,
): number {
  if (!isForeign) return Math.max(0, point.amount || 0);
  if (typeof point.foreignAmount === 'number') return Math.max(0, point.foreignAmount);
  const rate = Math.max(0, savedRate || 0);
  return rate > 0 ? Math.round(Math.max(0, point.amount || 0) / rate) : 0;
}

/**
 * 保存されている点から契約通貨の額を取る（読み出し専用。ここでは割らない ── 列と同じく
 * 保存されている amount がもう契約通貨の額なので、割ると外貨額が壊れる）。
 * 古い版のアプリでこの DB を開いて保存すると amount が円換算の写しに戻るので、
 * foreignAmount が残っている点だけはそちらを本物として採る。
 */
export function storedSurrenderAmount(
  point: { amount?: number; foreignAmount?: number },
  isForeign: boolean,
): number {
  if (isForeign && typeof point.foreignAmount === 'number') return Math.max(0, point.foreignAmount);
  return Math.max(0, point.amount || 0);
}

export function formatWholeManYen(amount: number, zeroLabel = '0万円'): string {
  const wholeManYen = Math.floor(Math.max(0, amount) / 10_000);
  if (wholeManYen === 0) return zeroLabel;

  const oku = Math.floor(wholeManYen / 10_000);
  const manYen = wholeManYen % 10_000;
  if (oku === 0) return `${wholeManYen.toLocaleString('ja-JP')}万円`;
  if (manYen === 0) return `${oku.toLocaleString('ja-JP')}億円`;
  return `${oku.toLocaleString('ja-JP')}億${manYen.toLocaleString('ja-JP')}万円`;
}

export function derivePaymentExchangeRate(actualPremiumPaidJpy?: number, foreignPremiumAmount?: number): number {
  if (!actualPremiumPaidJpy || actualPremiumPaidJpy <= 0 || !foreignPremiumAmount || foreignPremiumAmount <= 0) {
    return 0;
  }
  return actualPremiumPaidJpy / foreignPremiumAmount;
}

export function applyValuationRateToPolicy(policy: Policy, usdJpyRate: number): Policy {
  const wholeLifeCoverage = policy.policyType === '終身保険' || policy.policyType === '変額終身保険';
  if (policy.currency !== 'USD' || usdJpyRate <= 0) {
    return {
      ...policy,
      policyEndAge: wholeLifeCoverage ? 999 : policy.policyEndAge,
    };
  }

  const premiumAmount = policy.paymentFrequency === 'single'
    && policy.paymentCurrency === 'JPY'
    && (policy.actualPremiumPaidJpy || 0) > 0
    ? Number(policy.actualPremiumPaidJpy)
    : yenFromUsd(policy.foreignPremiumAmount || 0, usdJpyRate);

  return {
    ...policy,
    policyEndAge: wholeLifeCoverage ? 999 : policy.policyEndAge,
    exchangeRate: usdJpyRate,
    premiumAmount,
    annualPremium: policy.paymentFrequency === 'monthly' ? premiumAmount * 12 : premiumAmount,
    deathBenefitDisease: yenFromUsd(policy.foreignDeathBenefitDisease || 0, usdJpyRate),
    deathBenefitAccident: yenFromUsd(policy.foreignDeathBenefitAccident || 0, usdJpyRate),
    hospDayDisease: yenFromUsd(policy.foreignHospDayDisease || 0, usdJpyRate),
    hospDayAccident: yenFromUsd(policy.foreignHospDayAccident || 0, usdJpyRate),
    diagnosisBenefit: yenFromUsd(policy.foreignDiagnosisBenefit || 0, usdJpyRate),
    maturityBenefit: yenFromUsd(policy.foreignMaturityBenefit || 0, usdJpyRate),
    paymentExchangeRate: derivePaymentExchangeRate(
      policy.actualPremiumPaidJpy,
      policy.foreignPremiumAmount,
    ),
    surrenderValues: policy.surrenderValues?.map(point => ({
      ...point,
      amount: point.foreignAmount !== undefined
        ? yenFromUsd(point.foreignAmount, usdJpyRate)
        : point.amount,
    })),
  };
}

export function inferValuationSettings(
  settings: ValuationSettings | undefined,
  policies: Policy[],
): ValuationSettings {
  if (settings?.usdJpyRate && settings.usdJpyRate > 0) return settings;
  const legacyRate = policies.find(policy => policy.currency === 'USD' && (policy.exchangeRate || 0) > 0)?.exchangeRate || 0;
  return {
    usdJpyRate: legacyRate,
    fxRateDate: settings?.fxRateDate || '',
  };
}
