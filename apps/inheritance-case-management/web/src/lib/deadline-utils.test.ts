import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDeadlineDate, getDeadlineStatus } from './deadline-utils';

const iso = (d: Date) => d.toISOString().slice(0, 10);

describe('申告期限（相続開始から10ヶ月）', () => {
  it('同じ日付の10ヶ月後になる', () => {
    expect(iso(getDeadlineDate('2025-01-15'))).toBe('2025-11-15');
    expect(iso(getDeadlineDate('2024-02-29'))).toBe('2024-12-29');
  });

  it('10ヶ月後に同じ日が無い月は翌月へ繰り上がる', () => {
    // 1/31 の10ヶ月後は11/31。存在しないので12/1 になる（Date の仕様そのまま）。
    // 法律上の期限と1日ずれるが、画面・DB検索・CSV が同じ関数を見ているので
    // ここを変えるなら3箇所まとめて変わる。現状の挙動を固定しておく。
    expect(iso(getDeadlineDate('2025-01-31'))).toBe('2025-12-01');
    // 閏年でない年の2/29も同じ形。
    expect(iso(getDeadlineDate('2024-04-29'))).toBe('2025-03-01');
  });
});

describe('期限バッジ', () => {
  afterEach(() => vi.useRealTimers());

  const badgeAt = (today: string, deadline: string) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${today}T09:00:00+09:00`));
    return getDeadlineStatus(new Date(`${deadline}T00:00:00Z`));
  };

  it('残日数を日単位で数える（時刻の差では動かない）', () => {
    expect(badgeAt('2026-10-04', '2026-10-04').badge).toBe('残0日');
    expect(badgeAt('2026-10-04', '2026-10-05').badge).toBe('残1日');
  });

  it('14日以内は警告色、15〜30日は通常色', () => {
    expect(badgeAt('2026-10-04', '2026-10-18').className).toContain('amber');
    expect(badgeAt('2026-10-04', '2026-10-19').className).not.toContain('amber');
    expect(badgeAt('2026-10-04', '2026-11-03').badge).toBe('残30日');
    expect(badgeAt('2026-10-04', '2026-11-04').badge).toBe('残31日');
  });

  it('1日でも過ぎたら期限超過', () => {
    const over = badgeAt('2026-10-04', '2026-10-03');
    expect(over.badge).toBe('期限超過');
    expect(over.className).toContain('red');
  });
});
