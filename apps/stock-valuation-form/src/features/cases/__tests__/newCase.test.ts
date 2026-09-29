import { describe, expect, it } from 'vitest';
import { initialFormData } from '@/types/form';
import { taxPeriodLabel } from '../caseLabels';
import {
  applyCaseProfile,
  emptyCaseProfile,
  isCaseProfileReady,
  nextTaxPeriod,
  parseTaxPeriod,
} from '../newCase';

describe('applyCaseProfile', () => {
  it('会社名と課税時期を第1表の1の欄へ入れる', () => {
    const next = applyCaseProfile(initialFormData, {
      companyName: '甲田製作所',
      era: '令和',
      year: '8',
      month: '3',
      day: '15',
    });

    expect(next.table1_1.f12).toBe('甲田製作所');
    expect(next.table1_1.f14_g).toBe('令和');
    expect(next.table1_1.f14_y).toBe('8');
    expect(next.table1_1.f14_m).toBe('3');
    expect(next.table1_1.f14_d).toBe('15');
  });

  // 一覧に出る名前は保存のたびに欄から作り直される。ここで入れた値がそのまま出ないと、
  // 「作るときに入れたのに一覧では会社名未入力」になる。
  it('入れた値から一覧の課税時期がそのまま作られる', () => {
    const next = applyCaseProfile(initialFormData, {
      companyName: '甲田製作所',
      era: '令和',
      year: '8',
      month: '3',
      day: '15',
    });
    expect(taxPeriodLabel((table, field) => next[table][field] ?? '')).toBe('令和8年3月15日');
  });

  it('会社名の前後の空白は落とす（名寄せで揺れないように）', () => {
    const next = applyCaseProfile(initialFormData, { ...emptyCaseProfile(), companyName: ' 甲田製作所 ' });
    expect(next.table1_1.f12).toBe('甲田製作所');
  });

  it('ほかの表・ほかの欄には触らない', () => {
    const base = { ...initialFormData, table5: { ...initialFormData.table5, a_1_1: '現金' } };
    const next = applyCaseProfile(base, { ...emptyCaseProfile(), companyName: '甲田製作所' });
    expect(next.table5.a_1_1).toBe('現金');
  });
});

describe('isCaseProfileReady', () => {
  it('会社名と年がそろって初めて作れる（どちらも一覧で見分けるのに要る）', () => {
    expect(isCaseProfileReady(emptyCaseProfile())).toBe(false);
    expect(isCaseProfileReady({ ...emptyCaseProfile(), companyName: '甲田製作所' })).toBe(false);
    expect(isCaseProfileReady({ ...emptyCaseProfile(), year: '8' })).toBe(false);
    expect(isCaseProfileReady({ ...emptyCaseProfile(), companyName: '甲田製作所', year: '8' })).toBe(true);
  });

  it('空白だけの会社名は未入力と同じ', () => {
    expect(isCaseProfileReady({ ...emptyCaseProfile(), companyName: '　', year: '8' })).toBe(false);
  });
});

describe('parseTaxPeriod', () => {
  it('一覧のラベルを欄の値に戻す', () => {
    expect(parseTaxPeriod('令和8年3月15日')).toEqual({ era: '令和', year: '8', month: '3', day: '15' });
  });

  it('月・日が欠けていても読む', () => {
    expect(parseTaxPeriod('令和8年')).toEqual({ era: '令和', year: '8', month: '', day: '' });
  });

  it('元号が無ければ既定の元号として読む', () => {
    expect(parseTaxPeriod('8年3月15日')?.era).toBe('令和');
  });

  it('読めない文字列は null', () => {
    expect(parseTaxPeriod('')).toBeNull();
    expect(parseTaxPeriod('未定')).toBeNull();
  });
});

describe('nextTaxPeriod', () => {
  it('年だけ1つ進める（月日は据え置き。翌年度更新と同じ規則）', () => {
    expect(nextTaxPeriod('令和8年3月15日')).toEqual({ era: '令和', year: '9', month: '3', day: '15' });
  });

  it('読めないラベルは空欄から', () => {
    expect(nextTaxPeriod('')).toEqual({ era: '令和', year: '', month: '', day: '' });
  });

  // プルダウンに無い年を入れると、画面は先頭の選択肢を出すのに保存値は別、という食い違いになる。
  it('選択肢に無い年になるときは空欄から', () => {
    expect(nextTaxPeriod('令和64年3月15日').year).toBe('');
  });
});
