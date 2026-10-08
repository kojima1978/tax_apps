import { describe, expect, it } from 'vitest';
import { keywordCandidates } from './keywords';

describe('keywordCandidates', () => {
  it('空の摘要は候補なし', () => {
    expect(keywordCandidates('')).toEqual([]);
  });

  it('断片・連結・カタカナ連を集め、5文字に近い順に並べる', () => {
    expect(keywordCandidates('振込 ゼットゼットキュー商会')).toEqual([
      '振込',
      'ゼットゼットキュー',
      'ゼットゼットキュー商会',
      '振込ゼットゼットキュー商会',
      '振込 ゼットゼットキュー商会',
    ]);
  });

  it('英数字の連を拾い、1文字は捨てる', () => {
    const got = keywordCandidates('ATM A 12345');
    expect(got).toContain('ATM');
    expect(got).toContain('12345');
    expect(got).not.toContain('A');
  });

  it('最大6つ・20文字を超える候補は捨てる', () => {
    const got = keywordCandidates('アイウエオカキクケコサシスセソタチツテトナ ab cd ef gh ij kl');
    expect(got.length).toBeLessThanOrEqual(6);
    expect(got.every((c) => c.length <= 20)).toBe(true);
  });
});
