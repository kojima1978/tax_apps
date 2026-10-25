import { describe, expect, it } from 'vitest';
import type { PoaPrincipal } from './principalApi';
import { deceasedDiffersFromRecord, draftFromSlot, isBlankSlot, mergeHeirs, slotDiffersFromRecord, slotFieldsFromRecord, type PrincipalForm, type PrincipalSlot } from './principalLink';

const record: PoaPrincipal = {
  id: 1,
  kind: 'individual',
  name: '架空 花子',
  nameKana: 'カクウ ハナコ',
  address: '架空県架空市1-2-3',
  birthDate: '昭和45年3月2日',
  representative: '',
  deceasedName: '架空 太郎',
  memo: '長女',
  version: 3,
  createdAt: '2026-10-25 00:00:00',
  updatedAt: '2026-10-25 00:00:00',
  deletedAt: null,
  deceased: [{ id: 7, name: '架空 太郎' }],
};

describe('委任者DBと入力欄の突き合わせ', () => {
  it('DB から入れた直後は食い違いが無い', () => {
    expect(slotDiffersFromRecord(slotFieldsFromRecord(record), record)).toBe(false);
  });

  it('生年月日は西暦で打ち直しても同じ日なら食い違いにしない', () => {
    const slot: PrincipalSlot = { ...slotFieldsFromRecord(record), birthInput: '1970/3/2', address: ' 架空県架空市1-2-3 ' };
    expect(slotDiffersFromRecord(slot, record)).toBe(false);
    expect(slotDiffersFromRecord({ ...slot, birthInput: '1970/3/3' }, record)).toBe(true);
    expect(slotDiffersFromRecord({ ...slot, address: '架空県架空市9' }, record)).toBe(true);
  });

  it('法人は代表者を比べ、生年月日は見ない', () => {
    const corporate: PoaPrincipal = { ...record, kind: 'corporate', name: '架空商事株式会社', birthDate: '', representative: '代表取締役 架空 太郎' };
    const slot = slotFieldsFromRecord(corporate);
    expect(slotDiffersFromRecord({ ...slot, birthInput: '1970/3/2' }, corporate)).toBe(false);
    expect(slotDiffersFromRecord({ ...slot, representative: '代表取締役 架空 次郎' }, corporate)).toBe(true);
  });

  it('DB へ送るときは画面に無い項目（フリガナ・メモ・以前の被相続人の欄）を引き継ぐ', () => {
    const slot: PrincipalSlot = { ...slotFieldsFromRecord(record), address: '架空県架空市9' };
    expect(draftFromSlot(slot, record)).toMatchObject({
      nameKana: 'カクウ ハナコ',
      memo: '長女',
      address: '架空県架空市9',
      deceasedName: '架空 太郎',
    });
    const fresh = draftFromSlot({ kind: 'individual', name: ' 架空 次郎 ', address: '', representative: '残らない', birthInput: '' }, undefined);
    expect(fresh).toMatchObject({ name: '架空 次郎', representative: '', deceasedName: '', nameKana: '' });
  });

  it('被相続人は氏名と生年月日だけ比べ、生年月日は同じ日なら打ち方を問わない', () => {
    const deceased = { name: '架空 一郎', birthDate: '昭和15年4月1日' };
    expect(deceasedDiffersFromRecord({ name: ' 架空 一郎 ', birthInput: '1940-04-01' }, deceased)).toBe(false);
    expect(deceasedDiffersFromRecord({ name: '架空 一郎', birthInput: '' }, deceased)).toBe(true);
  });

  it('何も入っていない欄だけを空とみなす', () => {
    expect(isBlankSlot({ kind: 'individual', name: ' ', address: '', representative: '', birthInput: '' })).toBe(true);
    expect(isBlankSlot({ kind: 'individual', name: '架空 花子', address: '', representative: '', birthInput: '' })).toBe(false);
  });
});

describe('相続人をまとめて欄へ入れる', () => {
  const heir = (id: number, name: string): PoaPrincipal => ({ ...record, id, name });
  const blank = (id: number): PrincipalForm => ({ id, kind: 'individual', name: '', address: '', representative: '', birthInput: '' });

  it('空の欄から埋め、足りない分は足し、もう入っている人は飛ばす', () => {
    let next = 10;
    const typed: PrincipalForm = { ...blank(2), name: '架空 手入力' };
    const linked: PrincipalForm = { ...slotFieldsFromRecord(heir(3, '架空 三郎')), id: 3, record: heir(3, '架空 三郎') };
    const result = mergeHeirs([blank(1), typed, linked], [heir(3, '架空 三郎'), heir(4, '架空 四郎'), heir(5, '架空 五郎')], () => next++);
    expect(result.slots.map((slot) => [slot.id, slot.name, slot.record?.id])).toEqual([
      [1, '架空 四郎', 4],
      [2, '架空 手入力', undefined],
      [3, '架空 三郎', 3],
      [10, '架空 五郎', 5],
    ]);
    expect(result).toMatchObject({ added: 2, skipped: 1 });
  });

  it('全員入っていれば何も変えない', () => {
    const linked: PrincipalForm = { ...slotFieldsFromRecord(record), id: 1, record };
    const result = mergeHeirs([linked], [record], () => 99);
    expect(result).toMatchObject({ added: 0, skipped: 1 });
    expect(result.slots).toEqual([linked]);
  });
});
