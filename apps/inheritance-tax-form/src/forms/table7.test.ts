import { describe, expect, it } from 'vitest';
import { isCurrentInheritanceBeforePrevious } from './table7';

describe('第7表の日付比較', () => {
  it('②今回の相続が①前の相続より前ならエラーにする', () => {
    expect(isCurrentInheritanceBeforePrevious(
      { era: '5', year: '5', month: '4', day: '1' },
      { era: '5', year: '6', month: '4', day: '1' },
    )).toBe(true);
  });

  it('同日または②が①より後ならエラーにしない', () => {
    const previous = { era: '5', year: '5', month: '4', day: '1' };
    expect(isCurrentInheritanceBeforePrevious(previous, previous)).toBe(false);
    expect(isCurrentInheritanceBeforePrevious(
      { era: '5', year: '6', month: '4', day: '1' },
      previous,
    )).toBe(false);
  });

  it('日付が未入力または不正なら比較しない', () => {
    expect(isCurrentInheritanceBeforePrevious(
      { era: '5', year: '6', month: '2', day: '30' },
      { era: '5', year: '5', month: '4', day: '1' },
    )).toBe(false);
    expect(isCurrentInheritanceBeforePrevious(
      { era: '5', year: '6', month: '', day: '' },
      { era: '5', year: '5', month: '4', day: '1' },
    )).toBe(false);
  });
});
