import { describe, expect, it } from 'vitest';
import { parseId, toDateString, toId } from '../json.js';

describe('toId', () => {
  it('BigInt を数値にする', () => {
    expect(toId(4184n)).toBe(4184);
  });

  it('安全な範囲を超えたら丸めずに落とす', () => {
    expect(() => toId(2n ** 53n)).toThrow(RangeError);
  });
});

describe('parseId', () => {
  it.each([
    ['12', 12n],
    [12, 12n],
  ])('%j → %s', (input, expected) => {
    expect(parseId(input)).toBe(expected);
  });

  it.each(['0', '-1', '1.5', '01', 'abc', '', null, undefined, 1.5])('%j は null', (input) => {
    expect(parseId(input)).toBeNull();
  });
});

describe('toDateString', () => {
  it('Prisma が返す UTC 0時の Date を日付だけにする', () => {
    expect(toDateString(new Date('2021-04-01T00:00:00.000Z'))).toBe('2021-04-01');
  });

  it('null はそのまま', () => {
    expect(toDateString(null)).toBeNull();
  });
});
