import { describe, expect, it } from 'vitest';
import { formatWareki, parseBirthDate, todayWareki } from './wareki';

describe('parseBirthDate', () => {
  it.each([
    ['1970/3/2', '昭和45年3月2日'],
    ['1970-03-02', '昭和45年3月2日'],
    ['１９７０年３月２日', '昭和45年3月2日'],
    ['昭和45年3月2日', '昭和45年3月2日'],
    ['S45.3.2', '昭和45年3月2日'],
    ['h1.1.8', '平成元年1月8日'],
    ['平成元年1月8日', '平成元年1月8日'],
    ['2019/5/1', '令和元年5月1日'],
    ['大正 15年 12月 24日', '大正15年12月24日'],
  ])('%s → %s', (input, expected) => {
    expect(parseBirthDate(input)).toEqual({ ok: true, text: expected });
  });

  it('空は空のまま通す（手書きの欄）', () => {
    expect(parseBirthDate('  ')).toEqual({ ok: true, text: '' });
  });

  it('存在しない日付は弾く（繰り上げて別の日にしない）', () => {
    expect(parseBirthDate('1970/2/30')).toEqual({ ok: false, error: '存在しない日付です' });
    expect(parseBirthDate('昭和45年2月30日')).toEqual({ ok: false, error: '存在しない日付です' });
  });

  it('元号が合わない日付は弾く', () => {
    expect(parseBirthDate('平成31年5月1日')).toEqual({ ok: false, error: '元号と年月日の組み合わせを確認してください' });
    expect(parseBirthDate('昭和64年1月8日')).toEqual({ ok: false, error: '元号と年月日の組み合わせを確認してください' });
  });

  it('読めない形は弾く', () => {
    expect(parseBirthDate('45/3/2').ok).toBe(false);
  });
});

describe('formatWareki / todayWareki', () => {
  it('UTC 0時の日付をそのまま和暦にする', () => {
    expect(formatWareki(new Date(Date.UTC(2026, 9, 25)))).toBe('令和8年10月25日');
  });

  it('今日は日本時間で数える（UTC の前日 15時 = 日本の0時）', () => {
    expect(todayWareki(new Date('2026-10-24T15:00:00Z'))).toBe('令和8年10月25日');
    expect(todayWareki(new Date('2026-10-24T14:59:59Z'))).toBe('令和8年10月24日');
  });
});
