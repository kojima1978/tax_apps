import { describe, expect, it } from 'vitest';
import { countMissing, groupByDepartment, isMissing, nextStaffId, parseMissing } from './staffList';
import type { Staff } from './types';

// 未入力の判定と区切りに関わる項目だけ持たせた架空の社員
function staff(
  id: number,
  p: { givenName?: string; familyKana?: string; givenKana?: string; no?: string; mobile?: string; company?: number; dept?: number } = {},
): Staff {
  return {
    id,
    givenName: p.givenName ?? '太郎',
    familyKana: p.familyKana ?? 'ヤマダ',
    givenKana: p.givenKana ?? 'タロウ',
    employeeNo: p.no ?? null,
    mobilePhone: p.mobile ?? '',
    companyId: p.company ?? null,
    companyName: p.company ? `会社${p.company}` : null,
    departmentId: p.dept ?? null,
    departmentName: p.dept ? `部署${p.dept}` : null,
  } as Staff;
}

describe('parseMissing', () => {
  it('知らない値は絞り込みなし', () => {
    expect(parseMissing('kana')).toBe('kana');
    expect(parseMissing('mobile')).toBe('mobile');
    expect(parseMissing('name')).toBeNull();
    expect(parseMissing(null)).toBeNull();
  });
});

describe('isMissing / countMissing', () => {
  it('フリガナは姓の読みが空か、名があるのに名の読みが空なら未入力', () => {
    expect(isMissing(staff(1, { givenKana: '' }), 'kana')).toBe(true);
    expect(isMissing(staff(1, { givenName: '', givenKana: '' }), 'kana')).toBe(false);
    expect(isMissing(staff(1, { familyKana: '' }), 'kana')).toBe(true);
    expect(isMissing(staff(1), 'kana')).toBe(false);
  });

  it('項目ごとに数える', () => {
    const rows = [staff(1, { no: '1', mobile: '090-0000-0001' }), staff(2, { familyKana: '' }), staff(3, { mobile: '090-0000-0003' })];
    expect(countMissing(rows)).toEqual({ kana: 1, employeeNo: 2, mobile: 1 });
  });
});

describe('groupByDepartment', () => {
  it('主所属の会社・部署が変わったところで区切る（離れて同じ部署が出たら別の塊）', () => {
    const rows = [
      staff(1, { company: 1, dept: 1 }),
      staff(2, { company: 1, dept: 1 }),
      staff(3, { company: 1 }),
      staff(4, {}),
      staff(5, { company: 1, dept: 1 }),
    ];
    expect(groupByDepartment(rows).map((g) => [g.departmentName, g.staff.map((s) => s.id)])).toEqual([
      ['部署1', [1, 2]],
      [null, [3]],
      [null, [4]],
      ['部署1', [5]],
    ]);
  });
});

describe('nextStaffId', () => {
  it('並びのとおり次の人。最後の人と一覧に無い人は null', () => {
    const rows = [staff(5), staff(2), staff(9)];
    expect(nextStaffId(rows, 5)).toBe(2);
    expect(nextStaffId(rows, 2)).toBe(9);
    expect(nextStaffId(rows, 9)).toBeNull();
    expect(nextStaffId(rows, 7)).toBeNull();
  });
});
