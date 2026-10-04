import { describe, it, expect } from 'vitest';
import {
  convertWareki,
  dayOptionsFor,
  eraLastYear,
  nextWarekiYear,
  readWarekiDate,
  warekiDateReason,
  warekiDateOptions,
  westernYear,
  yearOptionsFor,
} from '../wareki';

// 和暦の4欄（元号・年・月・日）から西暦を作るところを固定する。
// 以前は「元号ごとの年の上限」と「実在しない日付」のどちらも見ていなかったため、
// 平成40年が選べ、2月31日が黙って3月3日へ読み替わっていた（＝日付の前後関係の確認も
// 第2表の開業後3年未満の判定も、入れたのと違う日で動いていた）。

/** 4欄をまとめて渡すための get。prefix は 'f14' 固定。 */
const get = (g: string, y: string, m: string, d: string) =>
  (field: string): string => ({ f14_g: g, f14_y: y, f14_m: m, f14_d: d }[field] ?? '');

const reason = (era: string, y: number, m: number, d: number): string => {
  const result = convertWareki(era, y, m, d);
  return result.ok ? '' : result.reason;
};

describe('和暦→西暦', () => {
  it('年月日が揃っていれば ISO 日付になる', () => {
    expect(convertWareki('令和', 8, 3, 15)).toEqual({ ok: true, value: '2026-03-15' });
    expect(convertWareki('平成', 31, 4, 30)).toEqual({ ok: true, value: '2019-04-30' });
    expect(convertWareki('昭和', 64, 1, 7)).toEqual({ ok: true, value: '1989-01-07' });
  });

  it('元号が未選択なら令和として扱う（様式の運用）', () => {
    expect(convertWareki('', 8, 3, 15)).toEqual({ ok: true, value: '2026-03-15' });
  });

  it('扱えない元号は弾く', () => {
    expect(reason('大正', 5, 1, 1)).toContain('扱えません');
  });
});

describe('元号ごとの年の上限', () => {
  it('終わった元号は最後の年まで', () => {
    expect(eraLastYear('平成')).toBe(31);
    expect(eraLastYear('昭和')).toBe(64);
  });

  it('続いている元号は様式として現実的な範囲まで', () => {
    expect(eraLastYear('令和')).toBe(64);
    expect(eraLastYear('')).toBe(64);
  });

  it('その元号に無い年は弾く（平成40年）', () => {
    expect(reason('平成', 40, 1, 1)).toBe('平成は平成31年4月30日までです。');
    expect(westernYear('平成', 40)).toBeNull();
    expect(westernYear('平成', 31)).toBe(2019);
  });

  it('改元の年は元号の期間の外も弾く', () => {
    // 平成は平成31年4月30日まで。5月1日からは令和
    expect(reason('平成', 31, 5, 1)).toBe('平成は平成31年4月30日までです。');
    expect(reason('令和', 1, 4, 30)).toBe('令和は令和元年5月1日からです。');
    expect(reason('昭和', 64, 1, 8)).toBe('昭和は昭和64年1月7日までです。');
  });
});

describe('実在しない日付', () => {
  it('その月に無い日は弾く', () => {
    expect(reason('令和', 8, 2, 31)).toBe('2月31日はありません。');
    expect(reason('令和', 8, 4, 31)).toBe('4月31日はありません。');
    expect(reason('令和', 13, 2, 29)).toBe('2月29日はありません。'); // 2031年は平年
    expect(convertWareki('令和', 6, 2, 29).ok).toBe(true);           // 2024年は閏年
  });

  it('月・日の範囲そのものを外れた値も弾く', () => {
    expect(convertWareki('令和', 8, 13, 1).ok).toBe(false);
    expect(convertWareki('令和', 8, 0, 1).ok).toBe(false);
    expect(convertWareki('令和', 0, 1, 1).ok).toBe(false);
    expect(convertWareki('令和', 8, 3, 1.5).ok).toBe(false);
  });

  it('readWarekiDate は読めない日付を null にする（3月3日へ読み替えない）', () => {
    expect(readWarekiDate(get('令和', '8', '2', '31'), 'f14')).toBeNull();
    expect(readWarekiDate(get('平成', '40', '1', '1'), 'f14')).toBeNull();
    const date = readWarekiDate(get('令和', '8', '3', '15'), 'f14');
    expect([date?.getFullYear(), date?.getMonth(), date?.getDate()]).toEqual([2026, 2, 15]);
  });

  it('どれか未入力なら入力途中として扱う（理由も出さない）', () => {
    expect(readWarekiDate(get('令和', '8', '', ''), 'f14')).toBeNull();
    expect(warekiDateReason(get('令和', '8', '', ''), 'f14')).toBeNull();
    expect(warekiDateReason(get('令和', '8', '3', '15'), 'f14')).toBeNull();
    expect(warekiDateReason(get('平成', '40', '1', '1'), 'f14')).toContain('平成31年4月30日');
  });
});

describe('プルダウンの選択肢', () => {
  it('年はその元号にある年だけ', () => {
    expect(yearOptionsFor('平成')).toEqual(['', ...Array.from({ length: 31 }, (_, i) => String(i + 1))]);
    expect(yearOptionsFor('令和')).toHaveLength(65);
  });

  it('日はその年月に実在する日だけ', () => {
    expect(dayOptionsFor('令和', '8', '2').at(-1)).toBe('28');
    expect(dayOptionsFor('令和', '6', '2').at(-1)).toBe('29');
    expect(dayOptionsFor('令和', '8', '4').at(-1)).toBe('30');
    expect(dayOptionsFor('令和', '8', '')).toHaveLength(32); // 月が未選択なら31日まで
  });

  it('すでに入っている値は選択肢に残す（画面と保存値を食い違わせない）', () => {
    expect(yearOptionsFor('平成', '40')).toContain('40');
    expect(dayOptionsFor('令和', '8', '2', '31')).toContain('31');
    expect(warekiDateOptions(get('平成', '40', '2', '31'), 'f14')).toEqual({
      year: yearOptionsFor('平成', '40'),
      day: dayOptionsFor('平成', '40', '2', '31'),
    });
  });
});

describe('1年進める', () => {
  it('ふつうは元号年に1を足す', () => {
    expect(nextWarekiYear('令和', 8, 3, 15)).toEqual({ era: '令和', year: '9' });
    expect(nextWarekiYear('', 8)).toEqual({ era: '令和', year: '9' });
  });

  it('改元をまたぐときは元号も進める', () => {
    // 平成31年の翌年は平成32年ではなく令和2年
    expect(nextWarekiYear('平成', 31, 3, 15)).toEqual({ era: '令和', year: '2' });
    // 同じ2019年でも、改元日より前なら平成31年のまま
    expect(nextWarekiYear('平成', 30, 4, 1)).toEqual({ era: '平成', year: '31' });
    expect(nextWarekiYear('平成', 30, 5, 1)).toEqual({ era: '令和', year: '1' });
  });

  it('上限を超えるときは null（空欄から始めさせる）', () => {
    expect(nextWarekiYear('令和', 64)).toBeNull();
    expect(nextWarekiYear('令和', 0)).toBeNull();
  });
});
