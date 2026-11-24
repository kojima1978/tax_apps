import { describe, it, expect } from 'vitest';
import { backHrefFromHelp, backLabelFromHelp, helpHrefForCase } from './helpNavigation';

describe('helpNavigation', () => {
  it('案件を開いているときは使い方へ案件の id を渡す', () => {
    expect(helpHrefForCase('abc-123')).toBe('/help/?case=abc-123');
  });

  it('案件を開いていないときは素の使い方へ', () => {
    expect(helpHrefForCase(null)).toBe('/help/');
    expect(helpHrefForCase(undefined)).toBe('/help/');
  });

  it('戻り先は案件があればその案件の画面', () => {
    expect(backHrefFromHelp('abc-123')).toBe('/?case=abc-123');
    expect(backLabelFromHelp('abc-123')).toBe('元の画面へ戻る');
  });

  it('戻り先は案件が無ければお客様一覧', () => {
    expect(backHrefFromHelp(null)).toBe('/');
    expect(backLabelFromHelp(null)).toBe('お客様一覧へ');
  });

  it('id はエスケープする', () => {
    expect(helpHrefForCase('a b&c')).toBe('/help/?case=a%20b%26c');
    expect(backHrefFromHelp('a b&c')).toBe('/?case=a%20b%26c');
  });
});
