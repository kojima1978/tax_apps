import { describe, expect, it } from 'vitest';
import { FALLBACK_COMPANY, getFullAddress, parseDirectoryCompanies, pickCompany, type CompanyInfo } from './company';

// 会社名・住所はすべて架空（リポジトリは公開）
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
        const body = [
            { id: 1, name: '架空税理士法人', shortName: '架空', postalCode: '100-0001', address: '東京都', phone: '03-0000-0000', fax: null, sortOrder: 0 },
        ];
        expect(parseDirectoryCompanies(body)).toEqual([
            { id: 1, name: '架空税理士法人', postalCode: '100-0001', address: '東京都', phone: '03-0000-0000', fax: '' },
        ]);
    });

    it('空・配列でない・名前の無い行だけ、は控えで動かす（null）', () => {
        expect(parseDirectoryCompanies([])).toBeNull();
        expect(parseDirectoryCompanies({ error: 'x' })).toBeNull();
        expect(parseDirectoryCompanies([{ id: 1, name: '' }])).toBeNull();
    });
});

describe('pickCompany', () => {
    const list = [company({ id: 1 }), company({ id: 2, name: '架空コンサルティング' })];

    it('選んだ会社を返し、未選択や台帳から消えた会社なら先頭へ戻す', () => {
        expect(pickCompany(list, 2).id).toBe(2);
        expect(pickCompany(list, null).id).toBe(1);
        expect(pickCompany(list, 99).id).toBe(1);
        expect(pickCompany([], null)).toBe(FALLBACK_COMPANY);
    });
});

describe('getFullAddress', () => {
    it('〒はここで付け、郵便番号が空なら住所だけ', () => {
        expect(getFullAddress(company({ id: 1 }))).toBe('〒100-0001 東京都千代田区千代田１−１');
        expect(getFullAddress(company({ id: 1, postalCode: '' }))).toBe('東京都千代田区千代田１−１');
    });
});
