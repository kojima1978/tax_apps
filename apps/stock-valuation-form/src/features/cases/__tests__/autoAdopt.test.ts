import { describe, expect, it } from 'vitest';
import { ADOPT_RETRY_MS, shouldAdoptIntoCase } from '../autoAdopt';

/** 自動で案件にすべき形（入力があり、どの案件にも紐づいていない）を基準に1つずつ崩す。 */
const base = {
  currentId: null as number | null,
  hasInput: true,
  snapshot: '{"table1_1":{"f12":"甲田製作所"}}',
  unlinkedSnapshot: null as string | null,
  failedAt: null as number | null,
  now: 1_000_000,
};

describe('shouldAdoptIntoCase', () => {
  it('案件に入っていない入力があれば案件にする', () => {
    expect(shouldAdoptIntoCase(base)).toBe(true);
  });

  it('すでに案件を開いていれば作らない（そこへ書き戻される）', () => {
    expect(shouldAdoptIntoCase({ ...base, currentId: 3 })).toBe(false);
  });

  it('入力が無ければ作らない（白紙の案件を並べない）', () => {
    expect(shouldAdoptIntoCase({ ...base, hasInput: false })).toBe(false);
  });

  it('案件から外した直後の入力では作らない（ゴミ箱へ入れた案件を作り直さない）', () => {
    expect(shouldAdoptIntoCase({ ...base, unlinkedSnapshot: base.snapshot })).toBe(false);
  });

  it('外したあと入力を続けたら作る（そこからは別の案件）', () => {
    expect(shouldAdoptIntoCase({ ...base, unlinkedSnapshot: '{"table1_1":{}}' })).toBe(true);
  });

  it('作成に失敗した直後は作らない（届かないサーバへ打鍵ごとに投げない）', () => {
    expect(shouldAdoptIntoCase({ ...base, failedAt: base.now - 1 })).toBe(false);
    expect(shouldAdoptIntoCase({ ...base, failedAt: base.now - (ADOPT_RETRY_MS - 1) })).toBe(false);
  });

  it('間隔をおけばもう一度試す（サーバが戻ったら案件に入る）', () => {
    expect(shouldAdoptIntoCase({ ...base, failedAt: base.now - ADOPT_RETRY_MS })).toBe(true);
  });
});
