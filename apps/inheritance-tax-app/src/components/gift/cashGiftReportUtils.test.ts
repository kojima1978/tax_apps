import { describe, expect, it } from 'vitest';
import type { GiftRecipientResult } from '../../types';
import {
  getGiftTimelineTotals,
  getGiftYearLabels,
} from './cashGiftReportUtils';

const createRecipient = (
  id: string,
  years: number,
  annualAmount: number,
  giftTaxPerYear: number,
): GiftRecipientResult => ({
  id,
  heirId: id,
  heirLabel: id,
  annualAmount,
  years,
  taxableAmountPerYear: Math.max(annualAmount - 110, 0),
  giftTaxPerYear,
  totalGift: annualAmount * years,
  totalGiftTax: giftTaxPerYear * years,
  netGift: (annualAmount - giftTaxPerYear) * years,
  isHeir: true,
  taxType: 'general',
});

describe('cash gift report timeline', () => {
  it('贈与年数にかかわらず年次見出しを10列作る', () => {
    expect(getGiftYearLabels(new Date(2026, 0, 1))).toEqual([
      'R08', 'R09', 'R10', 'R11', 'R12', 'R13', 'R14', 'R15', 'R16', 'R17',
    ]);
  });

  it('10年分を表示し、贈与期間外の年度は0で集計する', () => {
    const recipients = [
      createRecipient('spouse', 3, 400, 33.5),
      createRecipient('child-1', 5, 200, 9),
    ];

    expect(getGiftTimelineTotals(recipients)).toEqual({
      amountByYear: [600, 600, 600, 200, 200, 0, 0, 0, 0, 0],
      taxByYear: [42.5, 42.5, 42.5, 9, 9, 0, 0, 0, 0, 0],
    });
  });
});
