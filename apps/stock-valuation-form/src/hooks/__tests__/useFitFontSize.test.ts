import { describe, expect, it } from 'vitest';
import { MIN_FIT_FONT_SIZE, fitFontSize } from '../useFitFontSize';

describe('fitFontSize', () => {
  it('枠に収まっているときは基準サイズのまま', () => {
    expect(fitFontSize(80, 160, 9)).toBe(9);
    expect(fitFontSize(160, 160, 9)).toBe(9);
  });

  it('はみ出したぶんだけ比で縮める', () => {
    // 基準9pxで180px必要な社名を120pxの枠へ → 9 × 120/180 = 6px
    expect(fitFontSize(180, 120, 9)).toBeCloseTo(6);
  });

  it('読めなくなる手前で止める', () => {
    expect(fitFontSize(10000, 100, 9)).toBe(MIN_FIT_FONT_SIZE);
  });

  it('測れなかったときは基準サイズを返す（canvas の無い環境で縮まない）', () => {
    expect(fitFontSize(0, 120, 9)).toBe(9);
    expect(fitFontSize(180, 0, 9)).toBe(9);
  });
});
