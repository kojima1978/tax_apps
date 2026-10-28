// 口座の同一性（銀行名・支店名・口座番号）の規則。値はすべて架空。

import { describe, expect, it } from 'vitest';
import {
  accountIdentity,
  accountLabel,
  accountNumberOf,
  pickCompatibleAccount,
  sameAccount,
  UNKNOWN_ACCOUNT,
} from '../lib/accountIdentity.js';

const A = { id: 1, bankName: '架空銀行', branchName: '本店', accountNumber: '1111111' };

describe('同一性', () => {
  it('前後の空白は無視し、null と空文字は同じ', () => {
    expect(sameAccount({ bankName: ' 架空銀行 ', branchName: ' 本店 ', accountNumber: ' 1111111 ' }, A)).toBe(true);
    expect(sameAccount({ bankName: null, branchName: null, accountNumber: '1111111' }, { accountNumber: '1111111' })).toBe(true);
  });

  it('番号が同じでも銀行・支店が違えば別の口座', () => {
    expect(sameAccount({ ...A, bankName: '別銀行' }, A)).toBe(false);
    expect(sameAccount({ ...A, branchName: '支店' }, A)).toBe(false);
  });

  it('番号の無い口座はひとつの既定の番号でまとまる', () => {
    expect(accountNumberOf({})).toBe(UNKNOWN_ACCOUNT);
    expect(accountIdentity({ accountNumber: null })).toBe(accountIdentity({ accountNumber: '  ' }));
  });

  it('名前は埋まっている欄だけを並べる', () => {
    expect(accountLabel(A)).toBe('架空銀行 本店 1111111');
    expect(accountLabel({ accountNumber: '1111111' })).toBe('1111111');
    expect(accountLabel({})).toBe(UNKNOWN_ACCOUNT);
  });
});

describe('pickCompatibleAccount', () => {
  const B = { id: 2, bankName: '別銀行', branchName: '本店', accountNumber: '1111111' };

  it('完全に一致するものを選ぶ', () => {
    expect(pickCompatibleAccount([B, A], A)?.id).toBe(1);
    expect(pickCompatibleAccount([A, B], B)?.id).toBe(2);
  });

  it('空いている欄は両立する（取込で同じ口座が2件に割れない）', () => {
    const bare = { id: 3, bankName: '', branchName: '', accountNumber: '1111111' };
    expect(pickCompatibleAccount([bare], A)?.id).toBe(3);
    // 既存が埋まっていて、取り込む側が番号だけのときも同じ口座
    expect(pickCompatibleAccount([A], { accountNumber: '1111111' })?.id).toBe(1);
  });

  it('候補が2件以上なら混ぜない', () => {
    expect(pickCompatibleAccount([A, B], { accountNumber: '1111111' })).toBeNull();
  });

  it('番号の違う口座は候補にしない', () => {
    expect(pickCompatibleAccount([A], { ...A, accountNumber: '2222222' })).toBeNull();
    expect(pickCompatibleAccount([A], {})).toBeNull();
  });
});
