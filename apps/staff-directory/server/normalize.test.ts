import { describe, expect, it } from 'vitest';
import { normalizeDate, normalizeKana, normalizePhone, parseCompanyInput, parseStaffInput, parseStaffPersonalInput } from './normalize.js';

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
  it('姓・名の空白は詰め、フリガナはカタカナに揃える', () => {
    const r = parseStaffInput({ familyName: ' 山 田 ', givenName: '太郎', familyKana: 'やまだ', givenKana: 'ﾀﾛｳ' });
    expect(r).toEqual({
      ok: true,
      value: {
        familyName: '山田',
        givenName: '太郎',
        familyKana: 'ヤマダ',
        givenKana: 'タロウ',
        mobilePhone: '',
        retiredOn: null,
        affiliations: [],
      },
    });
  });

  it('姓が無ければ弾く（名は空でよい）', () => {
    expect(parseStaffInput({ familyName: '　', givenName: '太郎' })).toEqual({ ok: false, error: '姓を入力してください' });
    expect(parseStaffInput({ familyName: '山田' }).ok).toBe(true);
  });

  it('所属: 文字列の id も受け、社員番号の空は null、主所属が無ければ先頭を主所属にする', () => {
    const r = parseStaffInput({
      familyName: '山田',
      affiliations: [
        { companyId: '2', departmentId: '', employeeNo: '  ' },
        { companyId: 3, departmentId: '5', employeeNo: 'Ａ１' },
      ],
    });
    expect(r.ok && r.value.affiliations).toEqual([
      { companyId: 2, departmentId: null, employeeNo: null, isPrimary: true },
      { companyId: 3, departmentId: 5, employeeNo: 'A1', isPrimary: false },
    ]);
  });

  it('所属: 同じ会社が2つ・主所属が2つ・会社の指定なしは弾く', () => {
    const p = (affiliations: unknown) => parseStaffInput({ familyName: '山田', affiliations });
    expect(p([{ companyId: 1 }, { companyId: 1 }])).toEqual({ ok: false, error: '同じ会社の所属が2つあります' });
    expect(p([{ companyId: 1, isPrimary: true }, { companyId: 2, isPrimary: true }])).toEqual({
      ok: false,
      error: '主所属は1つだけ選んでください',
    });
    expect(p([{ companyId: '' }]).ok).toBe(false);
    expect(p([{ companyId: 1, departmentId: 'x' }]).ok).toBe(false);
  });
});

describe('parseCompanyInput', () => {
  it('郵便番号の〒を外し、7桁はハイフンを入れる', () => {
    const r = parseCompanyInput({ name: '架空商事', postalCode: '〒1000001' });
    expect(r.ok && r.value.postalCode).toBe('100-0001');
  });

  it('会社名が無い・郵便番号の形が違えば弾く', () => {
    expect(parseCompanyInput({ name: '' })).toEqual({ ok: false, error: '会社名を入力してください' });
    expect(parseCompanyInput({ name: '架空商事', postalCode: '12-345' }).ok).toBe(false);
  });
});

describe('parseStaffPersonalInput', () => {
  it('空は未入力として通る', () => {
    expect(parseStaffPersonalInput({})).toEqual({ ok: true, value: { postalCode: '', address: '', birthDate: null } });
  });

  it('郵便番号は会社と同じ形に揃え、住所は前後の空白を落とす', () => {
    const r = parseStaffPersonalInput({ postalCode: '１２３－４５６７', address: '  架空県架空市1-1 ', birthDate: '1990-01-15' });
    expect(r).toEqual({ ok: true, value: { postalCode: '123-4567', address: '架空県架空市1-1', birthDate: '1990-01-15' } });
  });

  it('存在しない生年月日は弾く', () => {
    expect(parseStaffPersonalInput({ birthDate: '1990-02-30' })).toEqual({ ok: false, error: '生年月日が存在しない日付です' });
  });
});
