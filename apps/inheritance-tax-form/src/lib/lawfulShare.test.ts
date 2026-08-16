import { describe, expect, it } from 'vitest';
import { autoLawfulShares } from './lawfulShare';

/** '1/2' の並びで見比べる（undefined は「自動では決められない」） */
const shares = (...relations: string[]): string[] | undefined => (
  autoLawfulShares(relations)?.map((share) => `${share.num}/${share.den}`)
);

describe('autoLawfulShares 民法900条の割合', () => {
  it('配偶者と子2人なら1/2と1/4ずつ', () => {
    expect(shares('01', '11', '21')).toEqual(['1/2', '1/4', '1/4']);
  });

  it('養子も子として数える', () => {
    expect(shares('01', '11', '90')).toEqual(['1/2', '1/4', '1/4']);
  });

  it('配偶者がいなければ同順位で等分する', () => {
    expect(shares('11', '12', '13')).toEqual(['1/3', '1/3', '1/3']);
  });

  it('配偶者と直系尊属なら2/3と1/6ずつ', () => {
    expect(shares('01', '41', '42')).toEqual(['2/3', '1/6', '1/6']);
  });

  it('配偶者と兄弟姉妹なら3/4と1/8ずつ', () => {
    expect(shares('01', '61', '63')).toEqual(['3/4', '1/8', '1/8']);
  });

  it('配偶者だけなら全部', () => {
    expect(shares('01')).toEqual(['1/1']);
  });
});

describe('autoLawfulShares 自動では決められない組み合わせ', () => {
  it('孫（代襲相続かどうかで変わる）', () => {
    expect(shares('01', '11', '30')).toBeUndefined();
  });

  it('続柄が「その他」', () => {
    expect(shares('01', '99')).toBeUndefined();
  });

  it('続柄が未入力', () => {
    expect(shares('01', '')).toBeUndefined();
  });

  it('順位の違う血族が混ざっている', () => {
    expect(shares('11', '41')).toBeUndefined();
  });

  it('父母と祖父母が混ざっている', () => {
    expect(shares('41', '51')).toBeUndefined();
  });

  it('配偶者が2人', () => {
    expect(shares('01', '01')).toBeUndefined();
  });

  it('1人もいない', () => {
    expect(shares()).toBeUndefined();
  });
});
