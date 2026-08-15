import { describe, expect, it } from 'vitest';
import { isCurrentInheritanceAfterPrevious } from './table7';

describe('第7表の日付比較', () => {
  it('②今回の相続が①前の相続より後ならエラーにする', () => {
    expect(isCurrentInheritanceAfterPrevious(
      { era: '5', year: '6', month: '4', day: '1' },
      { era: '5', year: '5', month: '4', day: '1' },
    )).toBe(true);
  });

  it('同日または②が①より前ならエラーにしない', () => {
    const previous = { era: '5', year: '5', month: '4', day: '1' };
    expect(isCurrentInheritanceAfterPrevious(previous, previous)).toBe(false);
    expect(isCurrentInheritanceAfterPrevious(
      { era: '4', year: '31', month: '3', day: '31' },
      previous,
    )).toBe(false);
  });

  it('日付が未入力または不正なら比較しない', () => {
    expect(isCurrentInheritanceAfterPrevious(
      { era: '5', year: '6', month: '2', day: '30' },
      { era: '5', year: '5', month: '4', day: '1' },
    )).toBe(false);
    expect(isCurrentInheritanceAfterPrevious(
      { era: '5', year: '6', month: '', day: '' },
      { era: '5', year: '5', month: '4', day: '1' },
    )).toBe(false);
  });
});
