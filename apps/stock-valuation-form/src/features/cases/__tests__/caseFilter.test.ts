import { describe, expect, it } from 'vitest';
import { filterCasesByCompany } from '../caseFilter';

const cases = [
  { companyName: '甲田製作所' },
  { companyName: '乙山商事' },
  { companyName: 'ABC Trading' },
  { companyName: '' },
];

describe('filterCasesByCompany', () => {
  it('空の条件では全件返す', () => {
    expect(filterCasesByCompany(cases, '')).toHaveLength(4);
    expect(filterCasesByCompany(cases, '  ')).toHaveLength(4);
  });

  it('会社名の一部で絞り込む', () => {
    expect(filterCasesByCompany(cases, '製作')).toEqual([{ companyName: '甲田製作所' }]);
  });

  it('空白の打ち分けは無視する（「甲田 製作所」でも当たる）', () => {
    expect(filterCasesByCompany(cases, '甲田　製作')).toEqual([{ companyName: '甲田製作所' }]);
    expect(filterCasesByCompany([{ companyName: '甲田 製作所' }], '甲田製作所')).toHaveLength(1);
  });

  it('英字は大文字小文字を問わない', () => {
    expect(filterCasesByCompany(cases, 'abc')).toEqual([{ companyName: 'ABC Trading' }]);
  });

  it('当たらなければ空（会社名未入力の案件は文字では拾えない）', () => {
    expect(filterCasesByCompany(cases, '丙川')).toEqual([]);
  });
});
