import { describe, expect, it } from 'vitest';
import { BANK_CODE_SUFFIX, BRANCH_CODE_SUFFIX, BROKER_CODE_SUFFIX } from '../data/detailCodes';
import { applyCodeSuffix, codeLinkedUpdates } from './codeLink';

const { byValue, words } = BANK_CODE_SUFFIX;
const suffix = (name: string, code: string) => applyCodeSuffix(name, byValue[code] ?? '', words);

describe('名称の末尾の語', () => {
  it('空欄なら語だけが入る', () => {
    expect(suffix('', '1')).toBe('銀行');
  });

  it('打ってある名前の後ろに付く', () => {
    expect(suffix('みずほ', '1')).toBe('みずほ銀行');
  });

  it('選び直すと伸びずに付け替わる', () => {
    expect(suffix('みずほ銀行', '2')).toBe('みずほ金庫');
  });

  it('未選択に戻すと語だけ消える', () => {
    expect(suffix('みずほ銀行', '')).toBe('みずほ');
  });

  it('「上記以外」は名称に付けない', () => {
    expect(suffix('みずほ銀行', '6')).toBe('みずほ');
    expect(byValue['6']).toBe('');
  });

  it('同じコードを選び直しても変わらない', () => {
    expect(suffix('みずほ銀行', '1')).toBe('みずほ銀行');
  });

  it('付表2は証券、支店等は本店・出張所', () => {
    expect(applyCodeSuffix('野村', BROKER_CODE_SUFFIX.byValue['6'] ?? '', BROKER_CODE_SUFFIX.words)).toBe('野村証券');
    expect(applyCodeSuffix('丸の内本店', BRANCH_CODE_SUFFIX.byValue['5'] ?? '', BRANCH_CODE_SUFFIX.words)).toBe('丸の内出張所');
  });
});

describe('連動して書き換える欄', () => {
  it('中身の差し替えと末尾の付け替えを両方返す', () => {
    const updates = codeLinkedUpdates(
      {
        autoFill: { field: 'kind', byValue: { 1: '普通預金' } },
        autoSuffix: { field: 'bank', byValue, words },
      },
      '1',
      (field) => (field === 'bank' ? 'みずほ' : ''),
    );
    expect(updates).toEqual([['kind', '普通預金'], ['bank', 'みずほ銀行']]);
  });

  it('連動先が無ければ何も返さない', () => {
    expect(codeLinkedUpdates({}, '1', () => '')).toEqual([]);
  });
});
