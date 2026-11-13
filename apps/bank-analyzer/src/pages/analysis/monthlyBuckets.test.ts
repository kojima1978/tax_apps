// 月次入出金グラフの棒の組み立て（間の月の0埋め・年への畳み方・期間・縦軸の上限）
import { describe, expect, it } from 'vitest';
import { axisCap, axisLabel, defaultUnit, maxBucketIndex, monthBuckets, niceStep, sliceRange, yearBuckets, type Bucket } from './monthlyBuckets';

const monthly = (entries: [string, number, number][], start = '') => ({
  months: entries.map(([k]) => k),
  monthKeys: entries.map(([k]) => k),
  out: entries.map(([, o]) => o),
  in: entries.map(([, , i]) => i),
  inheritanceStartMonth: start,
});

const bucket = (key: string, out: number, inn = 0): Bucket => ({ key, label: key, note: '', out, in: inn, from: '', to: '' });

describe('月ごと', () => {
  it('取引の無い月を0で埋め、和暦の見出しと月の初日〜末日を持つ', () => {
    const b = monthBuckets(monthly([['2024-01', 10, 0], ['2024-04', 0, 5]]));
    expect(b.map((x) => [x.key, x.label, x.out, x.in])).toEqual([
      ['2024-01', 'R6.1', 10, 0],
      ['2024-02', 'R6.2', 0, 0],
      ['2024-03', 'R6.3', 0, 0],
      ['2024-04', 'R6.4', 0, 5],
    ]);
    expect([b[1]!.from, b[1]!.to]).toEqual(['2024-02-01', '2024-02-29']);
  });

  it('年をまたいで埋める。1か月だけ・0件でも作れる', () => {
    expect(monthBuckets(monthly([['2018-11', 1, 0], ['2019-02', 1, 0]])).map((x) => x.key)).toEqual(['2018-11', '2018-12', '2019-01', '2019-02']);
    expect(monthBuckets(monthly([['2019-05', 3, 4]])).map((x) => x.label)).toEqual(['R1.5']);
    expect(monthBuckets(monthly([]))).toEqual([]);
  });
});

describe('年ごと', () => {
  it('月を年に畳む。合計は月の合計と同じ', () => {
    const months = monthBuckets(monthly([['2003-07', 100, 0], ['2003-12', 50, 20], ['2004-01', 1, 2], ['2004-12', 3, 4]]));
    const years = yearBuckets(months, '');
    expect(years.map((y) => [y.key, y.label, y.out, y.in, y.note])).toEqual([
      ['2003', 'H15年', 150, 20, '7月から'],
      ['2004', 'H16年', 4, 6, ''],
    ]);
    expect([years[0]!.from, years[0]!.to]).toEqual(['2003-01-01', '2003-12-31']);
  });

  it('相続開始の年は「相続開始まで」で、期間は相続開始月の前日まで', () => {
    const months = monthBuckets(monthly([['2024-11', 1, 0], ['2025-07', 5, 0]], '2025-08'));
    const last = yearBuckets(months, '2025-08').at(-1)!;
    expect([last.label, last.note, last.from, last.to, last.out]).toEqual(['R7年', '相続開始まで', '2025-01-01', '2025-07-31', 5]);
    // 1月が相続開始月ならその年の棒は出ず、前年は12月まで（印は付けない）
    expect(yearBuckets(monthBuckets(monthly([['2024-03', 1, 0], ['2024-12', 1, 0]], '2025-01')), '2025-01').map((y) => [y.note, y.to])).toEqual([['3月から', '2024-12-31']]);
  });

  it('相続開始月が未設定で年の途中で終わるときは「○月まで」', () => {
    const years = yearBuckets(monthBuckets(monthly([['2024-01', 1, 0], ['2024-05', 1, 0]])), '');
    expect(years[0]!.note).toBe('5月まで');
  });

  it('5年を超える長さは年ごとを既定にする', () => {
    expect(defaultUnit(60)).toBe('month');
    expect(defaultUnit(61)).toBe('year');
  });
});

describe('表示期間', () => {
  const months = Array.from({ length: 40 }, (_, i) => bucket(String(i), 1));
  it('月ごとは月数、年ごとは年数（月数÷12）を最後から数える。0 は全期間', () => {
    expect(sliceRange(months, 'month', 12).map((b) => b.key)).toEqual(months.slice(28).map((b) => b.key));
    expect(sliceRange(months, 'year', 36)).toHaveLength(3);
    expect(sliceRange(months, 'year', 84)).toHaveLength(7);
    expect(sliceRange(months, 'month', 0)).toHaveLength(40);
    expect(sliceRange(months.slice(0, 2), 'month', 36)).toHaveLength(2);
  });
});

describe('最大の棒', () => {
  it('出金＋入金が最大の棒。すべて0なら -1', () => {
    expect(maxBucketIndex([bucket('a', 10), bucket('b', 0, 70), bucket('c', 50)])).toBe(1);
    expect(maxBucketIndex([bucket('a', 0), bucket('b', 0)])).toBe(-1);
    expect(maxBucketIndex([])).toBe(-1);
  });
});

describe('縦軸の上限', () => {
  it('突出した棒があるときだけ、残りの最大の 1.2 倍を切りのよい数へ上げて切る', () => {
    const flat = [100, 120, 90, 110, 130].map((v, i) => bucket(String(i), v));
    expect(axisCap(flat)).toBeNull();
    const spiky = [...flat, bucket('x', 30_000_000)];
    expect(axisCap(spiky)).toBe(200);
    // 入金側の突出も見る
    expect(axisCap([...flat, bucket('y', 0, 5_000)])).toBe(200);
  });

  it('棒が少ない（3本以下）ときは切らない', () => {
    expect(axisCap([bucket('a', 1), bucket('b', 1), bucket('c', 1_000_000)])).toBeNull();
  });

  it('上位5%は突出として扱う（100本なら上の5本を除いた最大の 1.2 倍を切りよく上げる）', () => {
    const many = Array.from({ length: 100 }, (_, i) => bucket(String(i), i < 5 ? 10_000_000 : 1_000_000));
    expect(axisCap(many)).toBe(1_500_000);
  });
});

describe('目盛り', () => {
  it('1・2・5 × 10のべきで刻む', () => {
    expect(niceStep(1_000_000)).toBe(500_000);
    expect(niceStep(3_100_000)).toBe(1_000_000);
    expect(niceStep(0)).toBe(1);
  });

  it('万・億で縮め、桁区切りを入れる', () => {
    expect(axisLabel(5_000)).toBe('5,000');
    expect(axisLabel(1_500_000)).toBe('150万');
    expect(axisLabel(30_120_000)).toBe('3,012万');
    expect(axisLabel(250_000_000)).toBe('2.5億');
  });
});
