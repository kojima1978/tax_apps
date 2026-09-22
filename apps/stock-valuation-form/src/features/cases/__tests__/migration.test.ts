import { describe, expect, it } from 'vitest';
import type { CaseSummary } from '../api';
import { shouldOfferMigration } from '../migration';

const summary = (id: number): CaseSummary => ({
  id,
  companyName: '甲田製作所',
  taxPeriod: '令和8年3月15日',
  archivedAt: null,
  createdAt: '2026-09-22T00:00:00.000Z',
  updatedAt: '2026-09-22T00:00:00.000Z',
});

/** 取り残しが起こる形（手元に入力・案件0件・未選択・未確認）を基準に、1つずつ崩して確かめる。 */
const base = { cases: [] as CaseSummary[] | null, currentId: null as number | null, hasInput: true, asked: false };

describe('shouldOfferMigration', () => {
  it('手元に入力があり案件が1件も無いときだけ誘導する', () => {
    expect(shouldOfferMigration(base)).toBe(true);
  });

  it('一度訊いたあとは出さない（断った人に毎回出さない）', () => {
    expect(shouldOfferMigration({ ...base, asked: true })).toBe(false);
  });

  it('入力が無ければ出さない（移すものが無い）', () => {
    expect(shouldOfferMigration({ ...base, hasInput: false })).toBe(false);
  });

  it('すでに案件を開いていれば出さない（その案件へ自動保存されている）', () => {
    expect(shouldOfferMigration({ ...base, currentId: 3 })).toBe(false);
  });

  it('案件がすでにあれば出さない（移行済みの端末で蒸し返さない）', () => {
    expect(shouldOfferMigration({ ...base, cases: [summary(3)] })).toBe(false);
  });

  it('サーバへ問い合わせられなかったときは出さない（同じ会社を二重に作らせない）', () => {
    expect(shouldOfferMigration({ ...base, cases: null })).toBe(false);
  });
});
