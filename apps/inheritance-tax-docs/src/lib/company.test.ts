import { describe, expect, it } from 'vitest';
import { FALLBACK_COMPANY, getContactLine, getFullAddress, parseDirectoryCompanies, pickCompany, type CompanyInfo } from './company';

const company = (over: Partial<CompanyInfo> & { id: number }): CompanyInfo => ({
  name: '架空税理士法人',
  postalCode: '100-0001',
  address: '東京都千代田区千代田１−１',
  phone: '03-0000-0000',
  fax: '',
  ...over,
});

describe('parseDirectoryCompanies', () => {
  it('台帳の応答から帳票に要る欄だけ取り出す', () => {
    const body = [{ id: 1, name: '架空税理士法人', shortName: '架空', postalCode: '100-0001', address: '東京都', phone: '03-0000-0000', fax: null, sortOrder: 0 }];
    expect(parseDirectoryCompanies(body)).toEqual([{ id: 1, name: '架空税理士法人', postalCode: '100-0001', address: '東京都', phone: '03-0000-0000', fax: '' }]);
  });

  it('空・配列でない・名前の無い行だけ、は控えで動かす', () => {
    expect(parseDirectoryCompanies([])).toBeNull();
    expect(parseDirectoryCompanies({ error: 'x' })).toBeNull();
    expect(parseDirectoryCompanies([{ id: 1, name: '' }])).toBeNull();
  });
});

describe('pickCompany', () => {
  const list = [company({ id: 1 }), company({ id: 2, name: '架空コンサルティング' })];
  it('選択会社を返し、不明な会社なら先頭へ戻す', () => {
    expect(pickCompany(list, 2).id).toBe(2);
    expect(pickCompany(list, null).id).toBe(1);
    expect(pickCompany(list, 99).id).toBe(1);
    expect(pickCompany([], null)).toBe(FALLBACK_COMPANY);
  });
});

describe('getFullAddress', () => {
  it('郵便番号を整形する', () => {
    expect(getFullAddress(company({ id: 1 }))).toBe('〒100-0001 東京都千代田区千代田１−１');
    expect(getFullAddress(company({ id: 1, postalCode: '' }))).toBe('東京都千代田区千代田１−１');
  });
});

describe('getContactLine', () => {
  it('空の欄は見出しごと出さない', () => {
    expect(getContactLine(company({ id: 1, fax: '03-0000-0001' }))).toBe('TEL 03-0000-0000 / FAX 03-0000-0001');
    expect(getContactLine(company({ id: 1 }))).toBe('TEL 03-0000-0000');
    expect(getContactLine(company({ id: 1, phone: '' }))).toBe('');
  });
});

