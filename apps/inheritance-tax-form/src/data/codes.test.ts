import { describe, expect, it } from 'vitest';
import {
  ERA_BASE_YEAR, convertEraDate, eraDateFault, eraForWesternYear, eraLastYear, eraWesternYear, giftYearOptions,
} from './codes';

// 日付欄の選択肢は元号によらず1〜99年、日は1〜31日を並べているので、平成40年も2月31日も
// 入れられてしまう。以前は西暦に直す側も範囲を見ていなかったため、平成40年が令和10年として
// 黙って計算に入り、満年齢（第6表の未成年者・障害者控除）と相次相続控除の年数がその西暦で動いていた。

const reason = (...args: Parameters<typeof convertEraDate>): string | null => {
  const result = convertEraDate(...args);
  return result.ok ? null : result.reason;
};

const part = (...args: Parameters<typeof convertEraDate>): string | null => {
  const result = convertEraDate(...args);
  return result.ok ? null : result.part;
};

/** 4欄をまとめて渡すための g（接頭辞は 'start' 固定）。 */
const g = (era: string, y: string, m: string, d: string) =>
  (field: string): string => ({ startEra: era, startY: y, startM: m, startD: d }[field] ?? '');

describe('元号コード → 元年の西暦', () => {
  it('元号の期間から作る（対応表を別に持たない）', () => {
    expect(ERA_BASE_YEAR).toEqual({ 1: 1868, 2: 1912, 3: 1926, 4: 1989, 5: 2019 });
  });
});

describe('和暦→西暦', () => {
  it('元号・年・月・日から西暦の年月日になる', () => {
    expect(convertEraDate('5', 8, 7, 4)).toEqual({ ok: true, year: 2026, month: 7, day: 4 });
    expect(convertEraDate('4', 31, 4, 30)).toEqual({ ok: true, year: 2019, month: 4, day: 30 });
    expect(convertEraDate('3', 64, 1, 7)).toEqual({ ok: true, year: 1989, month: 1, day: 7 });
    expect(convertEraDate('1', 1, 10, 23)).toEqual({ ok: true, year: 1868, month: 10, day: 23 });
  });

  it('元号が未選択・知らないコードは弾く', () => {
    expect(reason('', 8, 7, 4)).toBe('元号を選んでください。');
    expect(reason('9', 8, 7, 4)).toBe('元号を選んでください。');
  });

  it('整数以外・0年は弾く', () => {
    expect(reason('5', 8.5, 7, 4)).toBe('年月日は整数で入れてください。');
    expect(reason('5', 0, 7, 4)).toBe('年は1以上で入れてください。');
  });
});

describe('元号ごとの年の上限', () => {
  it('終わった元号は最後の年まで', () => {
    expect(eraLastYear('1')).toBe(45);
    expect(eraLastYear('2')).toBe(15);
    expect(eraLastYear('3')).toBe(64);
    expect(eraLastYear('4')).toBe(31);
  });

  it('続いている元号に上限は無い', () => {
    expect(eraLastYear('5')).toBeUndefined();
    expect(convertEraDate('5', 50, 1, 1)).toEqual({ ok: true, year: 2068, month: 1, day: 1 });
  });

  it('その元号に無い年は弾く（平成40年＝令和10年に化けない）', () => {
    expect(reason('4', 40, 1, 1)).toBe('平成は31年4月30日までです。');
    expect(part('4', 40, 1, 1)).toBe('y');
    expect(reason('2', 16, 1, 1)).toBe('大正は15年12月24日までです。');
  });

  it('改元の年は日付まで見る', () => {
    expect(reason('4', 31, 5, 1)).toBe('平成は31年4月30日までです。');
    expect(reason('5', 1, 4, 30)).toBe('令和は元年5月1日からです。');
    expect(reason('3', 64, 1, 8)).toBe('昭和は64年1月7日までです。');
    expect(reason('1', 1, 10, 22)).toBe('明治は元年10月23日からです。');
  });
});

describe('実在しない日付', () => {
  it('その月に無い日は弾く（3月3日へ読み替えない）', () => {
    expect(reason('5', 8, 2, 31)).toBe('2月31日はありません。');
    expect(part('5', 8, 2, 31)).toBe('d');
    expect(reason('5', 8, 4, 31)).toBe('4月31日はありません。');
  });

  it('閏日は閏年だけ通す', () => {
    expect(convertEraDate('5', 6, 2, 29).ok).toBe(true);  // 2024年
    expect(reason('5', 7, 2, 29)).toBe('2月29日はありません。');
  });

  it('月そのものの範囲外は月の欄で知らせる', () => {
    expect(reason('5', 8, 13, 1)).toBe('13月はありません。');
    expect(part('5', 8, 13, 1)).toBe('m');
  });
});

describe('日付欄の確認（4欄まとめて）', () => {
  it('4欄が揃っていない入力途中は何も出さない', () => {
    expect(eraDateFault(g('', '', '', ''), 'start')).toBeNull();
    expect(eraDateFault(g('4', '40', '', ''), 'start')).toBeNull();
    expect(eraDateFault(g('', '40', '1', '1'), 'start')).toBeNull();
  });

  it('直せる日付は何も出さない', () => {
    expect(eraDateFault(g('5', '8', '7', '4'), 'start')).toBeNull();
  });

  it('原因の欄と理由を返す', () => {
    expect(eraDateFault(g('4', '40', '1', '1'), 'start')).toEqual({ part: 'y', reason: '平成は31年4月30日までです。' });
    expect(eraDateFault(g('5', '8', '2', '31'), 'start')).toEqual({ part: 'd', reason: '2月31日はありません。' });
  });
});

describe('年分（月日を見ない変換）', () => {
  it('元号＋年から西暦年。その元号に無い年は undefined', () => {
    expect(eraWesternYear('5', 8)).toBe(2026);
    expect(eraWesternYear('4', 31)).toBe(2019);
    expect(eraWesternYear('4', 40)).toBeUndefined();
    expect(eraWesternYear('', 8)).toBeUndefined();
    expect(eraWesternYear('5', 0)).toBeUndefined();
  });

  it('西暦年を含む元号（改元の年は新しい元号）', () => {
    expect(eraForWesternYear(2019)).toEqual({ code: '5', startYear: 2019 });
    expect(eraForWesternYear(2018)).toEqual({ code: '4', startYear: 1989 });
    expect(eraForWesternYear(1867)).toBeUndefined();
  });

  it('贈与年分の上限は元号の範囲を見る（平成40年分を並べない）', () => {
    expect(giftYearOptions('5', '8')[1]?.value).toBe('令和8');
    // 平成40年は存在しないので、相続開始年が決まっていないものとして今年を上限にする
    expect(giftYearOptions('4', '40')[1]?.value).toBe(giftYearOptions('', '')[1]?.value);
  });
});
