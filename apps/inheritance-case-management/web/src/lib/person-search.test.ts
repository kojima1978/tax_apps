import { describe, expect, it } from 'vitest';
import {
  normalizeNameKanaForStorage,
  normalizePersonSearchText,
  personMatchesSearch,
} from './person-search';

describe('カナの保存用正規化', () => {
  it('ひらがな・半角カナ・全角英数を揃える', () => {
    expect(normalizeNameKanaForStorage('やまだ たろう')).toBe('ヤマダ タロウ');
    expect(normalizeNameKanaForStorage('ﾔﾏﾀﾞ ﾀﾛｳ')).toBe('ヤマダ タロウ');
    expect(normalizeNameKanaForStorage('ＡＢＣ')).toBe('ABC');
  });

  it('連続した空白は1つにし、前後は落とす（表示用なので空白自体は残す）', () => {
    expect(normalizeNameKanaForStorage('  ヤマダ　　タロウ  ')).toBe('ヤマダ タロウ');
  });
});

describe('検索用正規化', () => {
  it('空白・中黒・長音・ハイフン・括弧を無視して比べられる形にする', () => {
    expect(normalizePersonSearchText('ヤマダ・タロウ')).toBe('ヤマダタロウ');
    expect(normalizePersonSearchText('090-1234-5678')).toBe('09012345678');
    expect(normalizePersonSearchText('１２３－４５６７')).toBe('1234567');
    expect(normalizePersonSearchText('山田（太郎）')).toBe('山田太郎');
  });

  it('英字は小文字へ寄せる', () => {
    expect(normalizePersonSearchText('Yamada')).toBe('yamada');
  });
});

describe('人の絞り込み', () => {
  const person = {
    name: '山田 太郎',
    nameKana: 'ヤマダ タロウ',
    profession: '会社役員',
    phone: '090-1234-5678',
    postalCode: '1234567',
    address: '東京都千代田区1-2-3',
    memo: '郵送は事務所宛て',
  };

  it('氏名・カナ・職業・電話・郵便番号・住所・メモのどれかに当たれば残す', () => {
    for (const query of ['山田', 'やまだたろう', '会社役員', '09012345678', '123-4567', '千代田', '事務所']) {
      expect(personMatchesSearch(person, query), query).toBe(true);
    }
  });

  it('区切り文字の有無は問わない', () => {
    expect(personMatchesSearch(person, '山田太郎')).toBe(true);
    expect(personMatchesSearch(person, '090 1234 5678')).toBe(true);
  });

  it('当たらなければ落とす', () => {
    expect(personMatchesSearch(person, '佐藤')).toBe(false);
  });

  it('検索語が空（または区切り文字だけ）なら全件残す', () => {
    expect(personMatchesSearch(person, '')).toBe(true);
    expect(personMatchesSearch(person, '   ')).toBe(true);
    expect(personMatchesSearch(person, '-')).toBe(true);
  });

  it('未入力の欄があっても落ちない', () => {
    expect(personMatchesSearch({ name: '佐藤' }, '佐藤')).toBe(true);
    expect(personMatchesSearch({}, '佐藤')).toBe(false);
  });
});
