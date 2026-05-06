import type { GiftRecipientResult, GiftScenarioResult } from '../../types';
import {
  currencyColumn,
  formatCurrency,
  getGiftBreakdownTotals,
  heirLabelColumn,
} from '../../utils';
import type { HeirColumn } from '../HeirScenarioTable';

export type GiftConditionGroup = {
  key: string;
  groupLabel: string;
  annualAmount: number;
  years: number;
  generalCount: number;
  specialCount: number;
  totalCount: number;
  giftTaxPerYear: number;
  totalGift: number;
  totalGiftTax: number;
};

export type GiftTimelineTotals = {
  amountByYear: number[];
  taxByYear: number[];
  amountAfterTimeline: number;
  taxAfterTimeline: number;
};

export const CIRCLED_NUMBERS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
export const GIFT_YEAR_COLUMN_COUNT = 15;

export function formatCurrencyOrDash(value: number): string {
  return value > 0 ? formatCurrency(value) : '—';
}

export function formatSignedDeduction(value: number): string {
  return value > 0 ? `−${formatCurrency(value)}` : '—';
}

export function formatManNumber(value: number): string {
  return Math.round(value).toLocaleString();
}

export function formatManTotal(value: number): string {
  return `${formatManNumber(value)}万円`;
}

function addYears(date: Date, years: number): Date {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
}

export function addYearsAndDays(date: Date, years: number, days: number): Date {
  const next = addYears(date, years);
  next.setDate(next.getDate() + days);
  return next;
}

function getReiwaYear(date: Date): number {
  return date.getFullYear() - 2018;
}

export function formatWarekiDate(date: Date): string {
  const year = String(getReiwaYear(date)).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `令和${year}年${month}月${day}日`;
}

function formatReiwaShortYear(date: Date): string {
  return `R${String(getReiwaYear(date)).padStart(2, '0')}`;
}

export function getGiftYearLabels(startDate: Date): string[] {
  return Array.from(
    { length: GIFT_YEAR_COLUMN_COUNT },
    (_, i) => formatReiwaShortYear(addYears(startDate, i)),
  );
}

export function buildGiftColumns(
  scenario: GiftScenarioResult,
  recipientResults: GiftRecipientResult[],
): HeirColumn[] {
  const { taxResult } = scenario;
  const giftGroups = taxResult.heirBreakdowns.map(b => getGiftBreakdownTotals(recipientResults, b));
  const acqTotal = taxResult.heirBreakdowns.reduce((s, b) => s + b.acquisitionAmount, 0);
  const giftTotal = giftGroups.reduce((s, g) => s + g.totalGift, 0);
  const giftTaxTotal = giftGroups.reduce((s, g) => s + g.totalGiftTax, 0);

  const getOwnNetProceeds = (i: number) => {
    const b = taxResult.heirBreakdowns[i];
    if (!b) return 0;
    return b.acquisitionAmount - b.finalTax + (giftGroups[i]?.ownNetGift ?? 0);
  };
  const getNetProceeds = (i: number) => getOwnNetProceeds(i) + (giftGroups[i]?.relatedNetGift ?? 0);
  const netTotal = taxResult.heirBreakdowns.reduce((s, _, i) => s + getNetProceeds(i), 0);

  return [
    heirLabelColumn(i => taxResult.heirBreakdowns[i]?.label),
    currencyColumn('遺産取得額', i => taxResult.heirBreakdowns[i]?.acquisitionAmount ?? 0, acqTotal),
    {
      label: '贈与額',
      getValue: i => formatCurrencyOrDash(giftGroups[i]?.totalGift ?? 0),
      getTotalValue: () => formatCurrencyOrDash(giftTotal),
    },
    {
      label: '贈与税負担',
      getValue: i => formatCurrencyOrDash(giftGroups[i]?.totalGiftTax ?? 0),
      getTotalValue: () => formatCurrencyOrDash(giftTaxTotal),
    },
    currencyColumn('納付相続税', i => taxResult.heirBreakdowns[i]?.finalTax ?? 0, taxResult.totalFinalTax),
    {
      label: '税引後',
      bold: true,
      getValue: i => formatCurrency(getNetProceeds(i)),
      getTotalValue: () => formatCurrency(netTotal),
    },
  ];
}

function getRecipientGroupLabel(recipient: GiftRecipientResult): string {
  return recipient.isHeir
    ? recipient.heirLabel
    : (recipient.sourceHeirLabel ?? recipient.heirLabel);
}

function getRecipientGroupId(recipient: GiftRecipientResult): string {
  return recipient.isHeir
    ? recipient.heirId
    : (recipient.sourceHeirId ?? recipient.heirId);
}

export function getGiftConditionGroups(recipients: GiftRecipientResult[]): GiftConditionGroup[] {
  const groups = new Map<string, GiftConditionGroup>();

  for (const r of recipients) {
    const groupId = getRecipientGroupId(r);
    const groupLabel = getRecipientGroupLabel(r);
    const key = `${groupId}:${r.years}`;
    const existing = groups.get(key);
    const addSpecial = r.taxType === 'special' ? 1 : 0;
    const addGeneral = r.taxType === 'general' ? 1 : 0;

    if (existing) {
      existing.annualAmount += r.annualAmount;
      existing.specialCount += addSpecial;
      existing.generalCount += addGeneral;
      existing.totalCount += 1;
      existing.giftTaxPerYear += r.giftTaxPerYear;
      existing.totalGift += r.totalGift;
      existing.totalGiftTax += r.totalGiftTax;
    } else {
      groups.set(key, {
        key,
        groupLabel,
        annualAmount: r.annualAmount,
        years: r.years,
        generalCount: addGeneral,
        specialCount: addSpecial,
        totalCount: 1,
        giftTaxPerYear: r.giftTaxPerYear,
        totalGift: r.totalGift,
        totalGiftTax: r.totalGiftTax,
      });
    }
  }

  return Array.from(groups.values());
}

export function getGiftTimelineTotals(recipients: GiftRecipientResult[]): GiftTimelineTotals {
  const amountByYear = Array(GIFT_YEAR_COLUMN_COUNT).fill(0) as number[];
  const taxByYear = Array(GIFT_YEAR_COLUMN_COUNT).fill(0) as number[];
  let amountAfterTimeline = 0;
  let taxAfterTimeline = 0;

  for (const recipient of recipients) {
    const visibleYears = Math.min(recipient.years, GIFT_YEAR_COLUMN_COUNT);

    for (let i = 0; i < visibleYears; i++) {
      amountByYear[i] += recipient.annualAmount;
      taxByYear[i] += recipient.giftTaxPerYear;
    }

    if (recipient.years > GIFT_YEAR_COLUMN_COUNT) {
      amountAfterTimeline += recipient.annualAmount;
      taxAfterTimeline += recipient.giftTaxPerYear;
    }
  }

  return { amountByYear, taxByYear, amountAfterTimeline, taxAfterTimeline };
}
