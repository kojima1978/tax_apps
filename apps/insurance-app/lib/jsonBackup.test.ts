import { describe, expect, it } from 'vitest';
import type { AppState } from '@/types';
import {
  BULK_JSON_EXPORT_TYPE,
  getCasesFromJsonBackup,
  remapAppStateIds,
} from '@/lib/jsonBackup';

const state: AppState = {
  familyMembers: [
    { id: 'member-1', name: '保険 太郎', nameKana: '', relationship: '本人', birthDate: '1980-01-01', gender: 'male' },
    { id: 'member-2', name: '保険 花子', nameKana: '', relationship: '配偶者', birthDate: '1982-01-01', gender: 'female' },
  ],
  agency: { name: '', representative: '', phone: '' },
  policies: [{
    id: 'policy-1',
    companyName: 'テスト生命',
    policyType: '終身保険',
    policyNumber: 'A-1',
    contractDate: '2020-01-01',
    contractAge: 40,
    insuredId: 'member-1',
    beneficiaryId: 'member-2',
    beneficiaryAllocations: [{ beneficiaryId: 'member-2', percentage: 100 }],
    deathBenefitDisease: 10_000_000,
    deathBenefitAccident: 0,
    hospDayDisease: 0,
    hospDayAccident: 0,
    diagnosisBenefit: 0,
    policyEndAge: 999,
    paymentFrequency: 'monthly',
    premiumAmount: 10_000,
    paymentEndAge: 60,
    annualPremium: 120_000,
    maturityBenefit: 0,
  }],
};

describe('JSON一括バックアップ', () => {
  it('従来の1案件JSONも復元対象として受け付ける', () => {
    expect(getCasesFromJsonBackup({ ...state, caseTitle: '太郎様' })).toHaveLength(1);
  });

  it('一括JSONから複数案件を取り出す', () => {
    const cases = getCasesFromJsonBackup({
      exportType: BULK_JSON_EXPORT_TYPE,
      schemaVersion: 1,
      exportedAt: '2026-10-22T00:00:00.000Z',
      cases: [{ ...state, caseTitle: '1件目' }, { ...state, caseTitle: '2件目' }],
    });
    expect(cases.map(item => item.caseTitle)).toEqual(['1件目', '2件目']);
  });

  it('家族・証券IDと参照先をまとめて振り直す', () => {
    let sequence = 0;
    const remapped = remapAppStateIds(state, () => `new-${++sequence}`);
    expect(remapped.familyMembers.map(member => member.id)).toEqual(['new-1', 'new-2']);
    expect(remapped.policies[0].id).toBe('new-3');
    expect(remapped.policies[0].insuredId).toBe('new-1');
    expect(remapped.policies[0].beneficiaryId).toBe('new-2');
    expect(remapped.policies[0].beneficiaryAllocations?.[0].beneficiaryId).toBe('new-2');
  });
});
