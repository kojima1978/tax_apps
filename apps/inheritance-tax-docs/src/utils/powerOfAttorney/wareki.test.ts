import { describe, expect, it } from 'vitest';
import { formatWareki, joinWareki, parseBirthDate, seirekiYearOf, splitWareki, warekiFromIsoDate } from './wareki';

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

describe('formatWareki / warekiFromIsoDate', () => {
  it('UTC 0時の日付をそのまま和暦にする', () => {
    expect(formatWareki(new Date(Date.UTC(2026, 9, 25)))).toBe('令和8年10月25日');
  });

  it('カレンダーの値を和暦にし、読めない値・存在しない日は空にする', () => {
    expect(warekiFromIsoDate('2026-10-25')).toBe('令和8年10月25日');
    expect(warekiFromIsoDate('2019-05-01')).toBe('令和元年5月1日');
    expect(warekiFromIsoDate('')).toBe('');
    expect(warekiFromIsoDate('2026-02-30')).toBe('');
  });
});

describe('4つの欄（元号・年・月・日）', () => {
  it('保存してある和暦を分け、つなぎ直すと同じ日になる', () => {
    expect(splitWareki('昭和45年3月2日')).toEqual({ era: '昭和', year: '45', month: '3', day: '2' });
    expect(parseBirthDate(joinWareki(splitWareki('昭和45年3月2日')))).toEqual({ ok: true, text: '昭和45年3月2日' });
  });

  it('元年は 1 で入れて「元年」で刷る', () => {
    expect(splitWareki('平成元年1月8日')).toEqual({ era: '平成', year: '1', month: '1', day: '8' });
    expect(parseBirthDate(joinWareki({ era: '令和', year: '1', month: '5', day: '1' }))).toEqual({ ok: true, text: '令和元年5月1日' });
  });

  it('全角の数字も読む', () => {
    expect(parseBirthDate(joinWareki({ era: '昭和', year: '４５', month: '３', day: '２' }))).toEqual({ ok: true, text: '昭和45年3月2日' });
  });

  it('全部空なら空（手書きの欄）', () => {
    expect(joinWareki({ era: '', year: '', month: '', day: '' })).toBe('');
  });

  it('途中まで入れた形は分け直せて、そろうまで誤りにする', () => {
    const partial = joinWareki({ era: '昭和', year: '45', month: '', day: '' });
    expect(splitWareki(partial)).toEqual({ era: '昭和', year: '45', month: '', day: '' });
    expect(parseBirthDate(partial)).toEqual({ ok: false, error: '年月日をそろえてください' });
    expect(parseBirthDate(joinWareki({ era: '', year: '45', month: '3', day: '2' }))).toEqual({ ok: false, error: '元号を選んでください' });
  });

  it('そろっていても存在しない日・元号違いは今までどおり弾く', () => {
    expect(parseBirthDate(joinWareki({ era: '昭和', year: '45', month: '2', day: '30' }))).toEqual({ ok: false, error: '存在しない日付です' });
    expect(parseBirthDate(joinWareki({ era: '平成', year: '31', month: '5', day: '1' }))).toEqual({
      ok: false,
      error: '元号と年月日の組み合わせを確認してください',
    });
  });

  it('西暦で入っていた値は和暦に直して分ける', () => {
    expect(splitWareki('1970/3/2')).toEqual({ era: '昭和', year: '45', month: '3', day: '2' });
    expect(splitWareki('読めない')).toEqual({ era: '', year: '', month: '', day: '' });
  });

  it('照合用の西暦年', () => {
    expect(seirekiYearOf('昭和45年3月2日')).toBe(1970);
    expect(seirekiYearOf('令和元年5月1日')).toBe(2019);
    expect(seirekiYearOf('昭和45年月日')).toBeNull();
    expect(seirekiYearOf('')).toBeNull();
  });
});
