import { describe, expect, it } from 'vitest';
import type { PoaPrincipal } from './principalApi';
import { draftFromSlot, isBlankSlot, slotDiffersFromRecord, slotFieldsFromRecord, type PrincipalSlot } from './principalLink';

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

  it('DB へ送るときは画面に無い項目を引き継ぎ、被相続人は DB が空のときだけ埋める', () => {
    const slot: PrincipalSlot = { ...slotFieldsFromRecord(record), address: '架空県架空市9' };
    expect(draftFromSlot(slot, record, '架空 一郎')).toMatchObject({
      nameKana: 'カクウ ハナコ',
      memo: '長女',
      address: '架空県架空市9',
      deceasedName: '架空 太郎',
    });
    const fresh = draftFromSlot({ kind: 'individual', name: ' 架空 次郎 ', address: '', representative: '残らない', birthInput: '' }, undefined, '架空 一郎');
    expect(fresh).toMatchObject({ name: '架空 次郎', representative: '', deceasedName: '架空 一郎', nameKana: '' });
  });

  it('何も入っていない欄だけを空とみなす', () => {
    expect(isBlankSlot({ kind: 'individual', name: ' ', address: '', representative: '', birthInput: '' })).toBe(true);
    expect(isBlankSlot({ kind: 'individual', name: '架空 花子', address: '', representative: '', birthInput: '' })).toBe(false);
  });
});
