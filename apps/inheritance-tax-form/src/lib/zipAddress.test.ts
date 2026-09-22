import { describe, expect, it, vi } from 'vitest';

// 本物は3MB近くあるので、同じ形式の小さな表で差し替える。
// z の各行は「先頭7文字＝郵便番号」＋「c の添字」＋任意の「|町域」。
const DATA = JSON.stringify({
  c: ['東京都千代田区', '北海道札幌市中央区', '京都府京都市中京区'],
  z: ['10000010|千代田', '06000011|北一条西', '60400002'].join('\n'),
});

/**
 * モジュール内のキャッシュ（`loading`）を捨てた状態で読み直す。
 * 差し替えはテストごとに登録し直す（`vi.mock` を1度だけ書くと、同梱データを
 * 読んだ回数がファイル全体で1回しか数えられない）。
 */
const fresh = async () => {
  let count = 0;
  vi.resetModules();
  vi.doMock('../data/zipAddresses.json?raw', () => {
    count += 1;
    return { default: DATA };
  });
  const { lookupZipAddress } = await import('./zipAddress');
  return { lookup: lookupZipAddress, loads: () => count };
};

describe('郵便番号から住所を引く', () => {
  it('7桁そろうまでは同梱データを読まない（3MB近くあるので）', async () => {
    const { lookup, loads } = await fresh();
    expect(await lookup('')).toBe('');
    expect(await lookup('100')).toBe('');
    expect(await lookup('100000')).toBe('');
    expect(await lookup('10000012')).toBe('');
    expect(loads()).toBe(0);
  });

  it('市区町村と町域をつないで返す', async () => {
    const { lookup } = await fresh();
    expect(await lookup('1000001')).toBe('東京都千代田区千代田');
    expect(await lookup('0600001')).toBe('北海道札幌市中央区北一条西');
  });

  it('町域の無い郵便番号は市区町村まで', async () => {
    const { lookup } = await fresh();
    expect(await lookup('6040000')).toBe('京都府京都市中京区');
  });

  it('ハイフンや〒が混じっていても引ける', async () => {
    const { lookup } = await fresh();
    expect(await lookup('100-0001')).toBe('東京都千代田区千代田');
    expect(await lookup('〒100-0001')).toBe('東京都千代田区千代田');
  });

  it('該当が無ければ空文字（画面の住所欄は触らない）', async () => {
    const { lookup } = await fresh();
    expect(await lookup('9999999')).toBe('');
  });

  it('同梱データの読み込みは初回だけ', async () => {
    const { lookup, loads } = await fresh();
    await lookup('1000001');
    await lookup('0600001');
    await lookup('9999999');
    expect(loads()).toBe(1);
  });
});
