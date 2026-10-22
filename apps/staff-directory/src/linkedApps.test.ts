import { describe, expect, it } from 'vitest';
import { backupStaffIds, lostCopies, parseLinkedCopies } from './linkedApps';

// 名前はすべて架空（リポジトリは公開）
describe('parseLinkedCopies', () => {
  it('台帳ID の付いた担当者だけ取り出す（台帳と結び付いていない人は対象外）', () => {
    const body = [
      { id: 5, name: '架空', staffDirectoryId: 1, active: true },
      { id: 6, name: '未連携', staffDirectoryId: null },
    ];
    expect(parseLinkedCopies(body)).toEqual([{ staffDirectoryId: 1, name: '架空' }]);
  });

  it('配列でなければ null（確かめられなかった扱い）', () => {
    expect(parseLinkedCopies({ error: 'x' })).toBeNull();
  });
});

describe('lostCopies', () => {
  it('復元するファイルに居ない台帳ID だけを ID 順に返す', () => {
    const restored = backupStaffIds({ staff: [{ id: 1 }, { id: 3 }] });
    const copies = [
      { staffDirectoryId: 4, name: '架空四郎' },
      { staffDirectoryId: 1, name: '架空一郎' },
      { staffDirectoryId: 2, name: '架空二郎' },
    ];
    expect(lostCopies(copies, restored).map((c) => c.staffDirectoryId)).toEqual([2, 4]);
  });
});
