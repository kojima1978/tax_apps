// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { lookupZipAddress } from '../lib/zipAddress';
import { useZipPrefecture } from './useZipPrefecture';

vi.mock('../lib/zipAddress', () => ({ lookupZipAddress: vi.fn() }));

const lookup = vi.mocked(lookupZipAddress);

/** 応答が返る時期をこちら側で決める呼び出し */
const deferred = () => {
  let settle: (address: string) => void = () => {};
  const promise = new Promise<string>((resolve) => { settle = resolve; });
  return { promise, settle: (address: string) => settle(address) };
};

const zipHook = (zip: string) =>
  renderHook(({ zip: value }) => useZipPrefecture(value), { initialProps: { zip } });

afterEach(() => {
  cleanup();
  lookup.mockReset();
});

describe('郵便番号から都道府県を求める', () => {
  it('住所の先頭の都道府県名を返す', async () => {
    lookup.mockResolvedValue('東京都千代田区千代田');
    const { result } = zipHook('1000001');
    await waitFor(() => expect(result.current).toBe('東京都'));
  });

  it('「京都府」を「東京都」と取り違えない（先頭一致で見るため）', async () => {
    lookup.mockResolvedValue('京都府京都市中京区');
    const { result } = zipHook('6040000');
    await waitFor(() => expect(result.current).toBe('京都府'));
  });

  it('住所が引けなければ空文字（税務署の候補を絞らない）', async () => {
    lookup.mockResolvedValue('');
    const { result } = zipHook('9999999');
    await waitFor(() => expect(lookup).toHaveBeenCalledWith('9999999'));
    expect(result.current).toBe('');
  });

  it('郵便番号を打ち替えると引き直す', async () => {
    lookup.mockResolvedValue('東京都千代田区千代田');
    const { result, rerender } = zipHook('1000001');
    await waitFor(() => expect(result.current).toBe('東京都'));

    lookup.mockResolvedValue('北海道札幌市中央区北一条西');
    rerender({ zip: '0600001' });
    await waitFor(() => expect(result.current).toBe('北海道'));
  });

  it('打ち替えた後に届いた古い応答は捨てる', async () => {
    const slow = deferred();
    lookup.mockReturnValueOnce(slow.promise).mockResolvedValue('北海道札幌市中央区北一条西');
    const { result, rerender } = zipHook('1000001');

    rerender({ zip: '0600001' });
    await waitFor(() => expect(result.current).toBe('北海道'));

    await act(async () => { slow.settle('東京都千代田区千代田'); });
    expect(result.current).toBe('北海道');
  });
});
