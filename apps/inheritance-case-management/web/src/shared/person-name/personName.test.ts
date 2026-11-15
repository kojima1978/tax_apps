import { describe, expect, it } from 'vitest';
import { joinPersonName, normalizePersonNameSpacing, splitPersonName } from './personName';

describe('normalizePersonNameSpacing', () => {
    it('姓と名の間は全角スペース1つにする', () => {
        expect(normalizePersonNameSpacing('架空 太郎')).toBe('架空　太郎');
        expect(normalizePersonNameSpacing('架空  太郎')).toBe('架空　太郎');
        expect(normalizePersonNameSpacing('架空　　太郎')).toBe('架空　太郎');
        expect(normalizePersonNameSpacing('  架空\t太郎 ')).toBe('架空　太郎');
        // フリガナも同じ（カナは日本語なので全角）
        expect(normalizePersonNameSpacing('カクウ タロウ')).toBe('カクウ　タロウ');
    });

    it('空白の無い名前・空文字はそのまま', () => {
        expect(normalizePersonNameSpacing('架空太郎')).toBe('架空太郎');
        expect(normalizePersonNameSpacing('')).toBe('');
        expect(normalizePersonNameSpacing('   ')).toBe('');
    });

    it('英数字が隣にある区切りは半角スペース1つ（法人名を崩さない）', () => {
        expect(normalizePersonNameSpacing('株式会社 ABC')).toBe('株式会社 ABC');
        expect(normalizePersonNameSpacing('ABC  商事')).toBe('ABC 商事');
        expect(normalizePersonNameSpacing('ABC Bank')).toBe('ABC Bank');
        // 日本語どうしの区切りだけが全角になる（3つ以上に分かれていても境ごとに決める）
        expect(normalizePersonNameSpacing('架空 太郎 ABC')).toBe('架空　太郎 ABC');
    });
});

describe('joinPersonName', () => {
    it('姓だけのときは空白を付けない', () => {
        expect(joinPersonName('架空', '太郎')).toBe('架空　太郎');
        expect(joinPersonName('架空', '')).toBe('架空');
        expect(joinPersonName('', '')).toBe('');
        expect(joinPersonName(' 架空 ', ' 太郎 ')).toBe('架空　太郎');
    });
});

describe('splitPersonName', () => {
    it('最初の空白で割る（全角・半角どちらでも）', () => {
        expect(splitPersonName('架空　太郎')).toEqual({ familyName: '架空', givenName: '太郎' });
        expect(splitPersonName('架空 太郎')).toEqual({ familyName: '架空', givenName: '太郎' });
        expect(splitPersonName('架空太郎')).toEqual({ familyName: '架空太郎', givenName: '' });
        expect(splitPersonName('')).toEqual({ familyName: '', givenName: '' });
        // 名が2つに分かれていても名の側へ寄せる（社員台帳の取込と同じ）
        expect(splitPersonName('架空 太郎 二世')).toEqual({ familyName: '架空', givenName: '太郎二世' });
    });
});
