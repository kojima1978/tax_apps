import { describe, expect, it } from 'vitest';
import { FALLBACK_OPERATOR, operatorRequestHeaders, parseDirectoryOperators, pickOperator, type Operator } from './operator';

const operator = (overrides: Partial<Operator> & { id: number }): Operator => ({
  fullName: '山田 花子',
  companyName: '架空税理士法人',
  departmentName: '申告部',
  ...overrides,
});

describe('parseDirectoryOperators', () => {
  it('社員台帳から操作者表示に必要な項目だけ取り出す', () => {
    expect(parseDirectoryOperators([{ id: 7, fullName: '山田 花子', companyName: '架空税理士法人', departmentName: '申告部' }])).toEqual([
      { id: 7, fullName: '山田 花子', companyName: '架空税理士法人', departmentName: '申告部' },
    ]);
  });

  it('空・不正形式は控えで動かす', () => {
    expect(parseDirectoryOperators([])).toBeNull();
    expect(parseDirectoryOperators({ error: 'x' })).toBeNull();
    expect(parseDirectoryOperators([{ id: 1, fullName: '' }])).toBeNull();
  });
});

describe('pickOperator', () => {
  const list = [operator({ id: 1 }), operator({ id: 2, fullName: '佐藤 太郎' })];

  it('選択中の社員を返し、不明なIDは先頭へ戻す', () => {
    expect(pickOperator(list, 2).id).toBe(2);
    expect(pickOperator(list, 99).id).toBe(1);
    expect(pickOperator([], null)).toBe(FALLBACK_OPERATOR);
  });
});

describe('operatorRequestHeaders', () => {
  it('日本語名をHTTPヘッダーで送れる形にする', () => {
    expect(operatorRequestHeaders(operator({ id: 1 }))).toEqual({ 'x-operator-name': encodeURIComponent('山田 花子') });
  });
});
