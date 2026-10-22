// 原本は tax_apps/shared/staff-directory/。写しを直さず原本を直して `bash shared/sync.sh` で配る
import { describe, expect, it } from 'vitest';
import { FALLBACK_OPERATOR, findSelectedOperator, operatorRequestHeaders, parseDirectoryOperators, pickOperator, type Operator } from './operator';

const operator = (overrides: Partial<Operator> & { id: number }): Operator => ({
  fullName: '架空 花子',
  kana: '',
  companyName: '架空税理士法人',
  departmentName: '架空部',
  ...overrides,
});

describe('parseDirectoryOperators', () => {
  it('社員台帳から操作者表示に必要な項目だけ取り出す', () => {
    expect(parseDirectoryOperators([{ id: 7, fullName: '架空 花子', nameKana: 'カクウ ハナコ', companyName: '架空税理士法人', departmentName: '架空部', mobilePhone: '' }])).toEqual([
      { id: 7, fullName: '架空 花子', kana: 'カクウ ハナコ', companyName: '架空税理士法人', departmentName: '架空部' },
    ]);
  });

  it('空・不正形式は控えで動かす', () => {
    expect(parseDirectoryOperators([])).toBeNull();
    expect(parseDirectoryOperators({ error: 'x' })).toBeNull();
    expect(parseDirectoryOperators([{ id: 1, fullName: '' }])).toBeNull();
  });
});

describe('pickOperator', () => {
  const list = [operator({ id: 1 }), operator({ id: 2, fullName: '架空 太郎' })];

  it('選択中の社員を返し、不明なIDは先頭へ戻す', () => {
    expect(pickOperator(list, 2).id).toBe(2);
    expect(pickOperator(list, 99).id).toBe(1);
    expect(pickOperator([], null)).toBe(FALLBACK_OPERATOR);
  });
});

describe('findSelectedOperator', () => {
  const list = [operator({ id: 1 }), operator({ id: 2, fullName: '架空 太郎' })];

  it('未選択・台帳に居ない ID は先頭へ寄せず null（履歴に別人の名前を残さない）', () => {
    expect(findSelectedOperator(list, 2)?.fullName).toBe('架空 太郎');
    expect(findSelectedOperator(list, null)).toBeNull();
    expect(findSelectedOperator(list, 99)).toBeNull();
  });
});

describe('operatorRequestHeaders', () => {
  it('日本語名をHTTPヘッダーで送れる形にする', () => {
    expect(operatorRequestHeaders(operator({ id: 1 }))).toEqual({ 'x-operator-name': encodeURIComponent('架空 花子') });
  });
});
