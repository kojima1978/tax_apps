import { describe, expect, it, vi } from 'vitest';
import { joinAddress, splitAddress, zipDigits } from './zipAddress';

describe('住所を2欄に分ける・つなぐ', () => {
  it('郵便番号から引いた住所で始まれば、残りを番地・建物名へ', () => {
    expect(splitAddress('東京都千代田区千代田1-1 架空ビル3F', '東京都千代田区千代田')).toEqual({
      area: '東京都千代田区千代田',
      rest: '1-1 架空ビル3F',
    });
  });

  it('一致しなければ全部を上の欄に置く（番地の欄へ丸ごと入れない）', () => {
    expect(splitAddress('大阪府大阪市北区梅田1-1', '東京都千代田区千代田')).toEqual({
      area: '大阪府大阪市北区梅田1-1',
      rest: '',
    });
    expect(splitAddress('東京都千代田区千代田1-1', '')).toEqual({ area: '東京都千代田区千代田1-1', rest: '' });
  });

  it('分けてつなぎ直すと元に戻る', () => {
    const base = '北海道札幌市中央区北一条西';
    for (const address of ['北海道札幌市中央区北一条西2-1', base, '']) {
      expect(joinAddress(splitAddress(address, base))).toBe(address);
    }
  });

  it('つなぐときは間に空白を入れず、前後の空白を落とす', () => {
    expect(joinAddress({ area: '東京都千代田区千代田 ', rest: ' 1-1 ' })).toBe('東京都千代田区千代田1-1');
  });

  it('郵便番号は全角・〒・ハイフンを落として数字だけにする', () => {
    expect(zipDigits('〒１００－０００１')).toBe('1000001');
  });
});

// 本物は3MB近くあるので、同じ形式の小さな表で差し替える
const DATA = JSON.stringify({
  c: ['東京都千代田区', '北海道札幌市中央区'],
  z: ['10000010|千代田', '06000001'].join('\n'),
});

describe('郵便番号から住所を引く', () => {
  it('7桁そろうまでは同梱データを読まず、そろえば市区町村と町域をつないで返す', async () => {
    let loads = 0;
    vi.resetModules();
    vi.doMock('./data/zipAddresses.json?raw', () => {
      loads += 1;
      return { default: DATA };
    });
    const { lookupZipAddress } = await import('./zipAddress');
    expect(await lookupZipAddress('100-000')).toBe('');
    expect(loads).toBe(0);
    expect(await lookupZipAddress('100-0001')).toBe('東京都千代田区千代田');
    expect(await lookupZipAddress('0600000')).toBe('北海道札幌市中央区');
    expect(await lookupZipAddress('9999999')).toBe('');
    expect(loads).toBe(1);
  });
});
