import { normalizePersonSearchText } from './person-search';
import type { CaseStatus } from '@/types/shared';

export interface CaseDuplicateInput {
    deceasedName: string;
    deceasedNameKana?: string;
    dateOfDeath?: string;
}

export interface CaseDuplicateRecord {
    id: number;
    deceasedName: string;
    deceasedNameKana: string | null;
    dateOfDeath: string;
    fiscalYear: number;
    status: CaseStatus;
}

export interface CaseDuplicateCandidate extends CaseDuplicateRecord {
    nameMatches: boolean;
    kanaMatches: boolean;
    dateMatches: boolean;
}

export interface CaseDuplicateResult {
    candidates: CaseDuplicateCandidate[];
    total: number;
}

export function findCaseDuplicates(records: CaseDuplicateRecord[], input: CaseDuplicateInput): CaseDuplicateResult {
    const name = normalizePersonSearchText(input.deceasedName);
    const kana = normalizePersonSearchText(input.deceasedNameKana ?? '');
    if (!name && !kana) return { candidates: [], total: 0 };

    const matches = records.flatMap(record => {
        const nameMatches = Boolean(name && normalizePersonSearchText(record.deceasedName) === name);
        const kanaMatches = Boolean(kana && normalizePersonSearchText(record.deceasedNameKana ?? '') === kana);
        if (!nameMatches && !kanaMatches) return [];
        return [{ ...record, nameMatches, kanaMatches, dateMatches: Boolean(input.dateOfDeath && record.dateOfDeath === input.dateOfDeath) }];
    }).sort((a, b) => Number(b.dateMatches) - Number(a.dateMatches) || b.fiscalYear - a.fiscalYear || b.id - a.id);

    return { candidates: matches.slice(0, 10), total: matches.length };
}
