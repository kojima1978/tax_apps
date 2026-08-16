import { describe, expect, it } from 'vitest';
import {
  SUBSTITUTE_CHILD, SUBSTITUTE_SIBLING, adoptionCounted, autoLawfulShares, civilShares, type Member,
} from './lawfulShare';

/**
 * 続柄コードの後ろに記号を付けて、続柄以外の事実を表す。
 *
 * - `11-` 相続の放棄をした
 * - `90*` 実子とみなされる養子
 * - `61~` 半血の兄弟姉妹
 * - `30<甲` 子の代襲相続人（被代襲者は甲）
 * - `99>甲` 兄弟姉妹の代襲相続人（被代襲者は甲）
 */
const member = (code: string): Member => {
  const substitute = /[<>]/.exec(code);
  return {
    relation: code.replace(/[-*~<>].*$/, ''),
    renounced: code.endsWith('-'),
    realChild: code.endsWith('*'),
    halfBlood: code.endsWith('~'),
    substitute: substitute === null ? '' : (substitute[0] === '<' ? SUBSTITUTE_CHILD : SUBSTITUTE_SIBLING),
    substituteFor: substitute === null ? '' : code.slice(substitute.index + 1).replace('~', ''),
  };
};

/** '1/2' の並びで見比べる（undefined は「自動では決められない」） */
const shares = (...codes: string[]): string[] | undefined => (
  autoLawfulShares(codes.map(member))?.map((share) => `${share.num}/${share.den}`)
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
  const counted = (...codes: string[]): boolean[] => adoptionCounted(codes.map(member));

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

describe('autoLawfulShares 代襲相続（民法901条）', () => {
  it('孫1人が子1人を代襲すると、その子の分をそのまま取る', () => {
    expect(shares('01', '11', '30<乙')).toEqual(['1/2', '1/4', '1/4']);
  });

  it('孫2人が同じ子を代襲すると、その子の1人分を分け合う', () => {
    expect(shares('01', '11', '30<乙', '30<乙')).toEqual(['1/2', '1/4', '1/8', '1/8']);
  });

  it('別々の子を代襲した孫は、それぞれ1人分を取る', () => {
    expect(shares('30<乙', '30<丙')).toEqual(['1/2', '1/2']);
  });

  it('甥姪（続柄コードが無いので「99 その他」）も兄弟姉妹の代襲として扱える', () => {
    expect(shares('01', '61', '99>弟')).toEqual(['3/4', '1/8', '1/8']);
  });

  it('代襲相続人が2人以上いて被代襲者が空なら自動では決められない', () => {
    // 同じ人を代襲したのか別々の人を代襲したのかで結果が変わる
    expect(shares('01', '30<', '30<')).toBeUndefined();
  });
});

describe('autoLawfulShares 半血の兄弟姉妹（民法900条4号但書）', () => {
  it('半血は全血の半分', () => {
    expect(shares('01', '61', '62~')).toEqual(['3/4', '1/6', '1/12']);
  });

  it('配偶者がいなければ全血2・半血1の比で分ける', () => {
    expect(shares('61', '62~', '63~')).toEqual(['1/2', '1/4', '1/4']);
  });

  it('半血の兄弟姉妹を代襲した甥姪も半分のまま', () => {
    expect(shares('61', '99>弟', '99>弟')).toEqual(['1/2', '1/4', '1/4']);
    expect(shares('61', '99>弟~', '99>弟~')).toEqual(['2/3', '1/6', '1/6']);
  });
});

describe('civilShares 民法上の相続分（相法55条の按分）', () => {
  const civil = (...codes: string[]): (string | null)[] | undefined => civilShares(codes.map(member))
    ?.map((share) => (share === null ? null : `${share.num}/${share.den}`));

  it('放棄した人がいなければ法定相続分と同じ', () => {
    expect(civil('01', '11', '12')).toEqual(['1/2', '1/4', '1/4']);
  });

  it('子の1人が放棄すると、残った人で分け直す', () => {
    // 税法上の法定相続分（1/2・1/4・1/4）を按分に使うと配偶者2/3・子A1/3になってしまう
    expect(civil('01', '11', '12-')).toEqual(['1/2', '1/2', null]);
  });

  it('養子の数の制限は受けない', () => {
    expect(civil('01', '11', '90', '90')).toEqual(['1/2', '1/6', '1/6', '1/6']);
  });

  it('その順位の血族が全員放棄したときは自動では決められない', () => {
    // 相続人は次順位（直系尊属・兄弟姉妹）へ移るが、その人は第2表④に載らないので分からない
    expect(civil('01', '11-')).toBeUndefined();
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
