import { describe, expect, it } from 'vitest';
import { backupStaffIds, lostCopies, parseLinkedCopies, parseSyncStatus, relativeTime } from './linkedApps';

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

describe('parseSyncStatus', () => {
  it('案件管理の形（unlinkedAssignees）を読む', () => {
    const body = { ok: true, at: '2026-11-10T01:00:00.000Z', created: 1, updated: 2, unlinkedAssignees: [{ id: 3, name: '架空太郎' }] };
    expect(parseSyncStatus(body)).toEqual({
      ok: true, at: '2026-11-10T01:00:00.000Z', error: null, created: 1, updated: 2, unlinked: [{ id: 3, name: '架空太郎' }],
    });
  });

  it('資産・負債管理の形（unlinkedStaff）と失敗の理由を読む', () => {
    const body = { ok: false, at: '2026-11-10T01:00:00.000Z', error: '社員台帳に接続できませんでした', created: 0, updated: 0, unlinkedStaff: [{ id: 7, staffCode: 'X1', name: '架空花子' }] };
    const parsed = parseSyncStatus(body);
    expect(parsed).toMatchObject({ ok: false, error: '社員台帳に接続できませんでした', unlinked: [{ id: 7, name: '架空花子' }] });
  });

  it('null はまだ一度も写していない、形が違えば確かめられない', () => {
    expect(parseSyncStatus(null)).toBe('never');
    expect(parseSyncStatus([])).toBe('unreachable');
    expect(parseSyncStatus({ ok: 'yes' })).toBe('unreachable');
  });
});

describe('relativeTime', () => {
  const at = '2026-11-10T01:00:00.000Z';
  const base = new Date(at).getTime();
  it.each([
    [30_000, 'たった今'],
    [-5_000, 'たった今'],
    [3 * 60_000, '3分前'],
    [2 * 3_600_000, '2時間前'],
    [3 * 86_400_000, '3日前'],
  ])('%i ミリ秒後は %s', (diff, label) => {
    expect(relativeTime(at, base + diff)).toBe(label);
  });
});
