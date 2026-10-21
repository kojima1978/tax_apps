import { describe, expect, it } from 'vitest';
import { parseImportText } from './useJsonImportExport';

describe('統合前tax-docs JSONの読込', () => {
  it('所得税の旧形式を統合アプリ形式へ変換する', () => {
    const converted = parseImportText(JSON.stringify({
      version: '2.0',
      exportedAt: '2026-10-21T00:00:00.000Z',
      taxType: 'income-tax',
      year: 2025,
      staffName: '架空 花子',
      staffPhone: '000-0000-0000',
      customerName: '架空 顧客',
      documentList: [{
        id: 'old-category',
        name: '旧カテゴリー',
        isExpanded: false,
        documents: [{
          id: 'old-document',
          text: '旧必要書類',
          checked: true,
          subItems: [{ id: 'old-sub', text: '旧明細' }],
        }],
      }],
    }));

    expect(converted).toMatchObject({
      docListType: 'income-tax',
      targetYear: 2025,
      clientName: '架空 顧客',
      personInCharge: '架空 花子',
      personInChargeContact: '000-0000-0000',
    });
    expect(converted?.documentList[0]).toMatchObject({
      id: 'old-category',
      name: '旧カテゴリー',
      isExpanded: false,
      isDisabled: false,
    });
    expect(converted?.documentList[0].documents[0]).toMatchObject({
      id: 'old-document',
      name: '旧必要書類',
      checked: true,
      specificNames: [{ id: 'old-sub', text: '旧明細' }],
    });
  });

  it('贈与税を判定し、壊れたJSONは拒否する', () => {
    const gift = parseImportText(JSON.stringify({
      version: '2.0',
      exportedAt: '',
      taxType: 'gift-tax',
      documentList: [{ id: 'cat', name: '贈与', documents: [{ id: 'doc', text: '契約書', checked: false }] }],
    }));
    expect(gift?.docListType).toBe('gift-tax');
    expect(parseImportText('{broken')).toBeNull();
  });
});
