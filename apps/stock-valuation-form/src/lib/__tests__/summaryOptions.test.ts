import { describe, it, expect } from 'vitest';
import type { TableId } from '@/types/form';
import type { ActionItem } from '@/lib/clientSummary';
import type { ValuationBasis } from '@/lib/valuationReport';
import {
  ACTION_FIELD, ASSUMED_PROFIT_FIELD, ASSUMED_PROFIT_OFF_FIELD, BASIS_FIELD, FORECAST_DETAIL_FIELD,
  ZERO_PROFIT_FIELD,
  changedOptionCount, filterActions, filterBases, formatAssumedProfit, isRowVisible, readSummaryOptions,
  resetSummaryOptionFields, sectionField, toStoredFlag,
} from '@/lib/summaryOptions';

const mkGetField = (fields: Record<string, string>) => (table: TableId, field: string): string => (
  table === 'table1_1' ? fields[field] ?? '' : ''
);

describe('readSummaryOptions（保存値の読み取り）', () => {
  it('未設定ならすべて表示・絞り込みなしになる', () => {
    const options = readSummaryOptions(mkGetField({}));
    expect(Object.values(options.sections).every(Boolean)).toBe(true);
    expect(options).toMatchObject({
      basis: 'both', showZeroProfit: true, showAssumedProfit: true, actionFilter: 'all', showForecastDetail: true,
    });
    expect(changedOptionCount(options)).toBe(0);
  });

  it('隠す側の値を保存したセクションだけ落ちる', () => {
    const options = readSummaryOptions(mkGetField({
      [sectionField('holders')]: '1',
      [sectionField('sensitivity')]: '1',
    }));
    expect(options.sections.holders).toBe(false);
    expect(options.sections.sensitivity).toBe(false);
    expect(options.sections.prices).toBe(true);
    expect(changedOptionCount(options)).toBe(2);
  });

  it('選択肢は保存値が想定外なら既定へ倒す', () => {
    const options = readSummaryOptions(mkGetField({ [BASIS_FIELD]: 'unknown', [ACTION_FIELD]: '' }));
    expect(options.basis).toBe('both');
    expect(options.actionFilter).toBe('all');
  });

  it('絞り込みの設定も変更件数に数える', () => {
    const options = readSummaryOptions(mkGetField({
      [BASIS_FIELD]: 'inheritance',
      [ZERO_PROFIT_FIELD]: '1',
      [ASSUMED_PROFIT_OFF_FIELD]: '1',
      [ACTION_FIELD]: 'high',
      [FORECAST_DETAIL_FIELD]: '1',
    }));
    expect(options).toMatchObject({
      basis: 'inheritance', showZeroProfit: false, showAssumedProfit: false, actionFilter: 'high', showForecastDetail: false,
    });
    expect(changedOptionCount(options)).toBe(5);
  });

  it('想定利益は千円の数値として読み、カンマや空白は無視する', () => {
    const read = (text: string) => readSummaryOptions(mkGetField({ [ASSUMED_PROFIT_FIELD]: text }));
    expect(read('').assumedProfit).toBeNull();
    expect(read('5,000').assumedProfit).toBe(5000);
    expect(read(' 1 200 ').assumedProfit).toBe(1200);
    expect(read('-800').assumedProfit).toBe(-800); // 欠損の想定も受け付ける
    expect(read('未定').assumedProfit).toBeNull();
    // 入力欄には打った文字をそのまま返す
    expect(read('5,000').assumedProfitText).toBe('5,000');
  });

  it('想定利益の「額」は出力を絞る条件ではないので、変更件数にも「すべて出力に戻す」にも含めない', () => {
    const options = readSummaryOptions(mkGetField({ [ASSUMED_PROFIT_FIELD]: '5000' }));
    expect(options.assumedProfit).toBe(5000);
    expect(changedOptionCount(options)).toBe(0);
    expect(resetSummaryOptionFields().some((f) => f.field === ASSUMED_PROFIT_FIELD)).toBe(false);
    // 併記のチェックは絞り込み条件なので、こちらは戻す対象に入れる
    expect(resetSummaryOptionFields().some((f) => f.field === ASSUMED_PROFIT_OFF_FIELD)).toBe(true);
  });

  it('併記のチェックを外すと、金額が入っていても行を出さない', () => {
    const options = readSummaryOptions(mkGetField({
      [ASSUMED_PROFIT_FIELD]: '5,000',
      [ASSUMED_PROFIT_OFF_FIELD]: '1',
    }));
    expect(options).toMatchObject({ showAssumedProfit: false, assumedProfit: 5000, assumedProfitText: '5,000' });
    expect(isRowVisible({ scope: 'common', assumedProfit: true }, options)).toBe(false);
    // 「すべて出力に戻す」を通すとチェックだけ戻り、金額はそのまま残る
    const stored = Object.fromEntries(resetSummaryOptionFields().map((f) => [f.field, f.value]));
    const restored = readSummaryOptions(mkGetField({ [ASSUMED_PROFIT_FIELD]: '5,000', ...stored }));
    expect(restored).toMatchObject({ showAssumedProfit: true, assumedProfit: 5000 });
  });

  it('想定利益の入力は3桁区切りへ整形する（欠損のマイナスは残す）', () => {
    expect(formatAssumedProfit('3000')).toBe('3,000');
    expect(formatAssumedProfit('1234567')).toBe('1,234,567');
    expect(formatAssumedProfit('-2000')).toBe('-2,000');
    expect(formatAssumedProfit('-')).toBe('-');
    expect(formatAssumedProfit('12a3')).toBe('123');
    expect(formatAssumedProfit('')).toBe('');
  });

  it('チェックボックスの値は表示なら空、非表示なら1で保存する', () => {
    expect(toStoredFlag(true)).toBe('');
    expect(toStoredFlag(false)).toBe('1');
  });

  it('すべて表示へ戻す欄は全条件を空へ戻す', () => {
    const fields = resetSummaryOptionFields();
    expect(fields).toHaveLength(13); // セクション8 + 絞り込み5
    expect(fields.every((f) => f.value === '')).toBe(true);
    const stored = Object.fromEntries(fields.map((f) => [f.field, f.value]));
    expect(changedOptionCount(readSummaryOptions(mkGetField(stored)))).toBe(0);
  });
});

describe('filterActions（次の一手の優先度）', () => {
  const actions = [
    { title: 'a', description: '', priority: '高' },
    { title: 'b', description: '', priority: '中' },
    { title: 'c', description: '', priority: '低' },
  ] as ActionItem[];

  it('allはすべて、midは高・中、highは高だけ残す', () => {
    expect(filterActions(actions, 'all')).toHaveLength(3);
    expect(filterActions(actions, 'mid').map((a) => a.title)).toEqual(['a', 'b']);
    expect(filterActions(actions, 'high').map((a) => a.title)).toEqual(['a']);
  });
});

describe('filterBases / isRowVisible（評価ベースの絞り込み）', () => {
  const bases = [
    { key: 'inheritance', label: '相続税評価額' },
    { key: 'special-market-value', label: '所得税・法人税' },
  ] as ValuationBasis[];

  it('bothなら両方、指定すればその1つだけ残す', () => {
    expect(filterBases(bases, 'both')).toHaveLength(2);
    expect(filterBases(bases, 'inheritance').map((b) => b.key)).toEqual(['inheritance']);
    expect(filterBases(bases, 'special-market-value').map((b) => b.key)).toEqual(['special-market-value']);
  });

  it('共通行は絞り込んでも残り、他ベースの行だけ落ちる', () => {
    const opts = { basis: 'inheritance', showZeroProfit: true, showAssumedProfit: true, assumedProfit: null } as const;
    expect(isRowVisible({ scope: 'common' }, opts)).toBe(true);
    expect(isRowVisible({ scope: 'inheritance' }, opts)).toBe(true);
    expect(isRowVisible({ scope: 'special-market-value' }, opts)).toBe(false);
  });

  it('想定利益の行は、併記のチェックが入っていて金額を入れたときだけ出す', () => {
    const off = { basis: 'both', showZeroProfit: true, showAssumedProfit: true, assumedProfit: null } as const;
    const on = { basis: 'both', showZeroProfit: true, showAssumedProfit: true, assumedProfit: 5000 } as const;
    expect(isRowVisible({ scope: 'common', assumedProfit: true }, off)).toBe(false);
    expect(isRowVisible({ scope: 'common', assumedProfit: true }, on)).toBe(true);
    // 金額を入れても通常の行は増減しない
    expect(isRowVisible({ scope: 'common' }, off)).toBe(true);
  });

  it('「利益0の場合」を出さない設定なら、共通行でも落ちる', () => {
    const opts = { basis: 'both', showZeroProfit: false, showAssumedProfit: true, assumedProfit: null } as const;
    expect(isRowVisible({ scope: 'common', zeroProfit: true }, opts)).toBe(false);
    expect(isRowVisible({ scope: 'common' }, opts)).toBe(true);
  });
});
