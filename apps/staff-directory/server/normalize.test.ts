import { describe, expect, it } from 'vitest';
import { normalizeDate, normalizeKana, normalizePhone, parseOfficeInput, parseStaffInput } from './normalize.js';

// 名前はすべて架空（リポジトリは公開）

describe('normalizeKana', () => {
  it('ひらがな・半角カナをカタカナに揃える', () => {
    expect(normalizeKana('やまだ　たろう')).toEqual({ ok: true, value: 'ヤマダ タロウ' });
    expect(normalizeKana('ﾔﾏﾀﾞ')).toEqual({ ok: true, value: 'ヤマダ' });
  });

  it('漢字が混ざっていれば弾く', () => {
    expect(normalizeKana('山田').ok).toBe(false);
  });

  it('空は許す（未入力として一覧の末尾に並ぶ）', () => {
    expect(normalizeKana('')).toEqual({ ok: true, value: '' });
    expect(normalizeKana(undefined)).toEqual({ ok: true, value: '' });
  });
});

describe('normalizePhone', () => {
  it('全角数字・長音記号を半角とハイフンに寄せる', () => {
    expect(normalizePhone('０９０ー１２３４ー５６７８', '携帯電話')).toEqual({ ok: true, value: '090-1234-5678' });
  });

  it('数字以外の文字は弾く', () => {
    const r = normalizePhone('090-abcd', '携帯電話');
    expect(r).toEqual({ ok: false, error: '携帯電話は数字とハイフンで入力してください' });
  });
});

describe('normalizeDate', () => {
  it('空は null（在籍）', () => {
    expect(normalizeDate('', '退職日')).toEqual({ ok: true, value: null });
  });

  it('実在しない日付を黙って翌月にしない', () => {
    expect(normalizeDate('2026-02-30', '退職日')).toEqual({ ok: false, error: '退職日が存在しない日付です' });
    expect(normalizeDate('2028-02-29', '退職日')).toEqual({ ok: true, value: '2028-02-29' });
  });

  it('形の違うものは弾く', () => {
    expect(normalizeDate('2026/10/21', '退職日').ok).toBe(false);
  });
});

describe('parseStaffInput', () => {
  it('社員番号の空は null（重複検査の対象外）', () => {
    const r = parseStaffInput({ name: ' 山田 ', employeeNo: '  ' });
    expect(r).toEqual({
      ok: true,
      value: { employeeNo: null, name: '山田', nameKana: '', departmentId: null, mobilePhone: '', retiredOn: null },
    });
  });

  it('氏名が無ければ弾く', () => {
    expect(parseStaffInput({ name: '　' })).toEqual({ ok: false, error: '氏名を入力してください' });
  });

  it('部署は文字列の id も受け、空は未所属', () => {
    const a = parseStaffInput({ name: '山田', departmentId: '3' });
    const b = parseStaffInput({ name: '山田', departmentId: '' });
    expect(a.ok && a.value.departmentId).toBe(3);
    expect(b.ok && b.value.departmentId).toBe(null);
    expect(parseStaffInput({ name: '山田', departmentId: 'x' }).ok).toBe(false);
  });
});

describe('parseOfficeInput', () => {
  it('郵便番号の〒を外し、7桁はハイフンを入れる', () => {
    const r = parseOfficeInput({ postalCode: '〒1000001' });
    expect(r.ok && r.value.postalCode).toBe('100-0001');
  });

  it('郵便番号の形が違えば弾く', () => {
    expect(parseOfficeInput({ postalCode: '12-345' }).ok).toBe(false);
  });
});
