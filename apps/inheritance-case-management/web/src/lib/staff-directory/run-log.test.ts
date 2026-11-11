import { describe, expect, it } from 'vitest';
import { parseTrigger, prunableRunIds, summarizeRuns, type SyncRunRow } from './run-log';

const row = (id: number, ok: boolean, extra: Partial<SyncRunRow> = {}): SyncRunRow => ({
  id,
  at: new Date(`2026-11-10T0${id}:00:00.000Z`),
  trigger: 'interval',
  ok,
  error: ok ? null : '社員台帳に接続できませんでした',
  created: 0,
  updated: 0,
  unlinked: ok ? [{ id: 1, name: '架空太郎' }] : null,
  ...extra,
});

describe('summarizeRuns', () => {
  it('記録が無ければ null', () => {
    expect(summarizeRuns([], null)).toBeNull();
  });

  it('失敗中でも最後に成功した時刻と、その回の未連携を出す', () => {
    const ok = row(1, true);
    const failed = row(3, false, { trigger: 'directory' });
    const status = summarizeRuns([failed, row(2, false), ok], ok);
    expect(status).toMatchObject({
      ok: false,
      trigger: 'directory',
      at: '2026-11-10T03:00:00.000Z',
      lastSuccessAt: '2026-11-10T01:00:00.000Z',
      error: '社員台帳に接続できませんでした',
      unlinked: [{ id: 1, name: '架空太郎' }],
    });
    expect(status?.history.map((h) => h.at)).toEqual(['2026-11-10T03:00:00.000Z', '2026-11-10T02:00:00.000Z', '2026-11-10T01:00:00.000Z']);
  });

  it('一度も成功していなければ最後に成功した時刻は null、未連携は空', () => {
    expect(summarizeRuns([row(1, false)], null)).toMatchObject({ lastSuccessAt: null, unlinked: [] });
  });

  it('知らないきっかけは手動として読む', () => {
    expect(summarizeRuns([row(1, true, { trigger: '???' })], null)?.trigger).toBe('manual');
  });
});

describe('parseTrigger', () => {
  it('台帳からの知らせだけを directory と読む', () => {
    expect(parseTrigger({ trigger: 'directory' })).toBe('directory');
    expect(parseTrigger({ trigger: 'interval' })).toBe('manual');
    expect(parseTrigger(null)).toBe('manual');
    expect(parseTrigger('directory')).toBe('manual');
  });
});

describe('prunableRunIds', () => {
  it('直近の件数を超えた分を消す。最後に成功した行は古くても残す', () => {
    expect(prunableRunIds([6, 5, 4, 3, 2, 1], 2, 3)).toEqual([3, 1]);
    expect(prunableRunIds([3, 2, 1], 1, 3)).toEqual([]);
  });
});
