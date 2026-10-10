import { describe, expect, it } from 'vitest';
import { printFitScale } from './usePrintFit';

describe('printFitScale', () => {
  // 281mm ≒ 1062px
  it('用紙より広い表は印刷できる幅へ縮める', () => {
    expect(printFitScale(2124, 281)).toBeCloseTo(0.5, 2);
  });
  it('用紙に収まる表は縮めない・広げない', () => {
    expect(printFitScale(800, 281)).toBe(1);
  });
  it('幅が測れないときは縮めない', () => {
    expect(printFitScale(0, 281)).toBe(1);
  });
});
