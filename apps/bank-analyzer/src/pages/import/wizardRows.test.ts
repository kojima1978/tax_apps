import { describe, expect, it } from 'vitest';
import { blankRow, checkRows, duplicateWarning, type EditRow } from './wizardRows';

const row = (day: number, dup: EditRow['dup']): EditRow => ({
  ...blankRow(`2024-04-${String(day).padStart(2, '0')}`),
  description: `摘要${day}`,
  amountOut: '1000',
  dup,
});

describe('duplicateWarning', () => {
  const rows = [row(1, 'high'), row(2, 'high'), row(3, 'high'), row(4, null), row(5, null)];

  it('3行続けて一致したら注意を出す', () => {
    expect(duplicateWarning(checkRows(rows, false))).toBe('既存データと 3 行連続で一致しています。重複インポートの可能性が高いです。');
  });

  it('重複の行を消したら注意も消える', () => {
    const left = rows.filter((r) => r.dup === null);
    expect(duplicateWarning(checkRows(left, false))).toBeNull();
  });

  it('一部だけ消したら数え直した件数で出る', () => {
    const more = [row(1, 'high'), row(2, 'high'), row(3, 'high'), row(4, null), row(5, 'high'), row(6, null)];
    const left = more.filter((_, i) => i !== 1);
    // 連続は2行に減ったが、5行中3行（60%）が一致
    expect(duplicateWarning(checkRows(left, false))).toBe('5 件中 3 件（60%）が既存データと一致しています。');
  });

  it('未入力の行は数えない', () => {
    const withBlank = [row(1, 'high'), row(2, 'high'), blankRow(), blankRow(), blankRow(), blankRow()];
    // 未入力を数えると 6 件中 2 件（33%）で注意になるが、数えなければ 2 件中 2 件で連続2行・件数2件 → 注意なし
    expect(duplicateWarning(checkRows(withBlank, false))).toBeNull();
  });
});
