import { describe, expect, it } from 'vitest';
import { findCaseDuplicates, type CaseDuplicateRecord } from './case-duplicates';

const base: CaseDuplicateRecord = { id: 1, deceasedName: '山田 太郎', deceasedNameKana: 'ヤマダ タロウ', dateOfDeath: '2026-01-01', fiscalYear: 2026, status: '入金済' };

describe('new case duplicate check', () => {
    it('matches names despite spaces and different fiscal years or closed status', () => {
        const result = findCaseDuplicates([{ ...base, fiscalYear: 2020 }], { deceasedName: '山田　太郎', dateOfDeath: '2026-01-01' });
        expect(result.total).toBe(1);
        expect(result.candidates[0]).toMatchObject({ nameMatches: true, dateMatches: true, status: '入金済' });
    });
    it('matches normalized kana even when the written name differs', () => {
        expect(findCaseDuplicates([base], { deceasedName: '山田 多郎', deceasedNameKana: 'ﾔﾏﾀﾞﾀﾛｳ' }).candidates[0]).toMatchObject({ nameMatches: false, kanaMatches: true });
        expect(findCaseDuplicates([base], { deceasedName: '', deceasedNameKana: 'やまだたろう' }).total).toBe(1);
    });
    it('keeps same-name different-date cases as possible duplicates and prioritizes date matches', () => {
        const result = findCaseDuplicates([{ ...base, id: 2, fiscalYear: 2027, dateOfDeath: '2027-01-01' }, base], { deceasedName: '山田太郎', dateOfDeath: base.dateOfDeath });
        expect(result.candidates.map(c => c.id)).toEqual([1, 2]);
        expect(result.candidates[1].dateMatches).toBe(false);
    });
    it('does not suggest cases from the death date alone, empty fields, or partial names', () => {
        for (const deceasedName of ['', ' ', '山田', '佐藤太郎']) {
            expect(findCaseDuplicates([base], { deceasedName, dateOfDeath: base.dateOfDeath }).total).toBe(0);
        }
        expect(findCaseDuplicates([{ ...base, deceasedNameKana: null }], { deceasedName: '', deceasedNameKana: ' ' }).total).toBe(0);
    });
    it('limits displayed candidates while retaining the true total', () => {
        const records = Array.from({ length: 12 }, (_, index) => ({ ...base, id: index + 1 }));
        const result = findCaseDuplicates(records, { deceasedName: base.deceasedName });
        expect(result.total).toBe(12);
        expect(result.candidates).toHaveLength(10);
    });
});
