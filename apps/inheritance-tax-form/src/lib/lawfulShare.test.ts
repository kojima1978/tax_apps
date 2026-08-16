import { describe, expect, it } from 'vitest';
import { adoptionCounted, autoLawfulShares, type Member } from './lawfulShare';

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

describe('adoptionCounted 養子の数の制限（相法15条2項）', () => {
  /** 続柄コードの並びから法定相続人を作る。'90*' は実子とみなされる養子 */
  const counted = (...codes: string[]): boolean[] => adoptionCounted(codes.map((code): Member => ({
    relation: code.replace('*', ''), renounced: false, realChild: code.endsWith('*'),
  })));

  it('実子がいるときは養子1人まで', () => {
    expect(counted('01', '11', '90', '90')).toEqual([true, true, true, false]);
  });

  it('実子がいないときは養子2人まで', () => {
    expect(counted('01', '90', '90', '90')).toEqual([true, true, true, false]);
  });

  it('実子とみなされる養子は制限を受けず、実子としても数える', () => {
    // 90* が実子の側に立つので、残りの養子は1人までになる
    expect(counted('90*', '90', '90')).toEqual([true, true, false]);
  });

  it('養子がいなければ全員そのまま', () => {
    expect(counted('01', '11', '12', '13')).toEqual([true, true, true, true]);
  });

  it('孫は実子ではないので、養子は2人まで数える', () => {
    expect(counted('30', '90', '90')).toEqual([true, true, true]);
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
