import { describe, it, expect } from 'vitest';
import { diffScalar } from './audit-diff';

describe('diffScalar', () => {
  it('スカラーの変化だけを拾う', () => {
    const changes = diffScalar(
      { deceasedName: '甲', taxAmount: 100, status: '受託' },
      { deceasedName: '乙', taxAmount: 100, status: '受託' },
    );
    expect(changes).toEqual([{ field: 'deceasedName', old: '甲', new: '乙' }]);
  });

  it('更新対象に無いキーは比較しない（新しい側のキーだけを見る）', () => {
    expect(diffScalar({ memo: 'あり' }, {})).toEqual([]);
  });

  it('updatedAt などの記録しないキーは無視する', () => {
    const changes = diffScalar(
      { updatedAt: new Date('2026-01-01'), createdBy: 'a' },
      { updatedAt: new Date('2026-02-01'), createdBy: 'b' },
    );
    expect(changes).toEqual([]);
  });

  it('Date は ISO 文字列として比較する', () => {
    expect(diffScalar({ dateOfDeath: new Date('2026-01-01') }, { dateOfDeath: new Date('2026-01-01') })).toEqual([]);
    expect(diffScalar({ dateOfDeath: new Date('2026-01-01') }, { dateOfDeath: new Date('2026-01-02') })).toHaveLength(1);
  });

  it('undefined と null は同じものとして扱う', () => {
    expect(diffScalar({ memo: null }, { memo: undefined })).toEqual([]);
  });

  // ここが本題。以前は assignee などのオブジェクトがそのまま記録され、
  // 画面に `[object Object]` が出ていた。
  it('子レコード以外のオブジェクトは記録しない', () => {
    const changes = diffScalar(
      { assignee: { id: 1, name: '甲' }, assigneeId: 1 },
      { assignee: { id: 2, name: '乙' }, assigneeId: 2 },
    );
    expect(changes).toEqual([{ field: 'assigneeId', old: 1, new: 2 }]);
  });

  it('子レコードは件数だけを記録する', () => {
    const changes = diffScalar(
      { heirs: [{ id: 1, name: '甲' }] },
      { heirs: [{ id: 2, name: '甲' }, { id: 3, name: '乙' }] },
    );
    expect(changes).toEqual([{ field: 'heirs', old: 1, new: 2 }]);
  });

  // 更新は deleteMany + create で作り直すので id と日時だけが必ず変わる。
  // ここを無視しないと、保存のたびに全ての子レコードが「変更あり」になる。
  it('id と日時しか違わない子レコードは変更として扱わない', () => {
    const changes = diffScalar(
      { progress: [{ id: 1, caseId: 9, name: '面談', createdAt: new Date('2026-01-01') }] },
      { progress: [{ id: 7, caseId: 9, name: '面談', createdAt: new Date('2026-05-05') }] },
    );
    expect(changes).toEqual([]);
  });

  it('件数が同じでも中身が変われば記録する', () => {
    const changes = diffScalar(
      { expenses: [{ id: 1, amount: 1000 }] },
      { expenses: [{ id: 2, amount: 2000 }] },
    );
    expect(changes).toEqual([{ field: 'expenses', old: 1, new: 1 }]);
  });

  it('片側に子レコードが無い場合は件数が null になる', () => {
    expect(diffScalar({}, { heirs: [{ id: 1 }] })).toEqual([{ field: 'heirs', old: null, new: 1 }]);
  });
});
