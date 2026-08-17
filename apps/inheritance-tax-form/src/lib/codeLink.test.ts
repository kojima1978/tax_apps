import { describe, expect, it } from 'vitest';
import { BANK_CODE_SUFFIX, BRANCH_CODE_SUFFIX, BROKER_CODE_SUFFIX } from '../data/detailCodes';
import { suffixedName, type CodeSuffix } from './codeLink';

const BANK: CodeSuffix = { field: 'bankCode', ...BANK_CODE_SUFFIX };
const shown = (name: string, code: string) => suffixedName(name, code, BANK);

describe('用紙に出す名称', () => {
  it('コードに合わせて末尾に語が付く', () => {
    expect(shown('みずほ', '1')).toBe('みずほ銀行');
    expect(shown('みずほ', '2')).toBe('みずほ金庫');
  });

  it('コードが未選択なら打ったまま', () => {
    expect(shown('みずほ', '')).toBe('みずほ');
  });

  it('「上記以外」は名称に付けない', () => {
    expect(shown('みずほ', '6')).toBe('みずほ');
    expect(BANK.byValue['6']).toBe('');
  });

  it('名称に業態まで打ってあっても重ねない', () => {
    expect(shown('みずほ銀行', '1')).toBe('みずほ銀行');
    // 打った語とコードが食い違うときはコードを優先する
    expect(shown('みずほ銀行', '2')).toBe('みずほ金庫');
  });

  it('名称が空なら語だけを出さない', () => {
    expect(shown('', '1')).toBe('');
    expect(shown('  ', '1')).toBe('');
  });

  it('付表2は証券、支店等は本店・出張所', () => {
    expect(suffixedName('野村', '6', { field: 'brokerCode', ...BROKER_CODE_SUFFIX })).toBe('野村証券');
    expect(suffixedName('丸の内本店', '5', { field: 'branchCode', ...BRANCH_CODE_SUFFIX })).toBe('丸の内出張所');
  });
});
