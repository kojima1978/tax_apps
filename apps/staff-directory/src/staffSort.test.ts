import { describe, expect, it } from 'vitest';
import { DEFAULT_SORT, formatSort, parseSort, sortStaff, toggleSort, type OrderMaps } from './staffSort';
import type { Staff } from './types';

// 並びに関わる項目だけ持たせた架空の社員
function staff(id: number, p: { no?: string; kana?: string; company?: number; dept?: number }): Staff {
  return {
    id,
    employeeNo: p.no ?? null,
    nameKana: p.kana ?? '',
    companyId: p.company ?? null,
    departmentId: p.dept ?? null,
  } as Staff;
}

const order: OrderMaps = {
  company: new Map([
    [10, 2],
    [20, 1],
  ]),
  department: new Map([
    [1, 2],
    [2, 1],
  ]),
};

const ids = (rows: Staff[]) => rows.map((s) => s.id);

describe('parseSort / formatSort', () => {
  it('向きは先頭の - で持ち、知らない値は既定に戻す', () => {
    expect(parseSort('-kana')).toEqual({ key: 'kana', desc: true });
    expect(parseSort('affiliation')).toEqual({ key: 'affiliation', desc: false });
    expect(parseSort('name')).toEqual(DEFAULT_SORT);
    expect(parseSort(null)).toEqual(DEFAULT_SORT);
    expect(formatSort({ key: 'kana', desc: true })).toBe('-kana');
  });

  it('同じ列は向きを変え、別の列は昇順から', () => {
    expect(toggleSort({ key: 'kana', desc: false }, 'kana')).toEqual({ key: 'kana', desc: true });
    expect(toggleSort({ key: 'kana', desc: true }, 'employeeNo')).toEqual({ key: 'employeeNo', desc: false });
    // 担当の件数だけは多い順から
    expect(toggleSort({ key: 'kana', desc: false }, 'workload')).toEqual({ key: 'workload', desc: true });
  });
});

describe('sortStaff', () => {
  it('社員番号は数の大きさで並べ、空欄は降順でも末尾', () => {
    const rows = [staff(1, {}), staff(2, { no: '10' }), staff(3, { no: '9' })];
    expect(ids(sortStaff(rows, { key: 'employeeNo', desc: false }, order))).toEqual([3, 2, 1]);
    expect(ids(sortStaff(rows, { key: 'employeeNo', desc: true }, order))).toEqual([2, 3, 1]);
  });

  it('フリガナは読みの順、未入力は末尾', () => {
    const rows = [staff(1, { kana: 'ワタナベ' }), staff(2, {}), staff(3, { kana: 'アオキ' })];
    expect(ids(sortStaff(rows, { key: 'kana', desc: false }, order))).toEqual([3, 1, 2]);
    expect(ids(sortStaff(rows, { key: 'kana', desc: true }, order))).toEqual([1, 3, 2]);
  });

  it('所属は会社の表示順 → 部署の表示順。部署の無い人は会社の末尾、所属の無い人は最後', () => {
    const rows = [
      staff(1, { company: 10, dept: 2 }),
      staff(2, { company: 20 }),
      staff(3, { company: 10, dept: 1 }),
      staff(4, {}),
      staff(5, { company: 20, dept: 2 }),
    ];
    expect(ids(sortStaff(rows, { key: 'affiliation', desc: false }, order))).toEqual([5, 2, 1, 3, 4]);
  });

  it('同じ値どうしは最後に台帳ID の順', () => {
    const rows = [staff(3, { no: '1' }), staff(1, { no: '1' }), staff(2, { no: '1' })];
    expect(ids(sortStaff(rows, { key: 'employeeNo', desc: true }, order))).toEqual([1, 2, 3]);
  });

  it('社員番号が同じ（空を含む）なら 所属 → フリガナ → 台帳ID。二番目以降は降順でも昇順', () => {
    const rows = [
      staff(1, { company: 10, dept: 1, kana: 'イ' }),
      staff(2, { company: 10, dept: 2, kana: 'ウ' }),
      staff(3, { company: 10, dept: 1, kana: 'ア' }),
      staff(4, { company: 10, dept: 1, kana: 'ア' }),
      staff(5, { no: '7', company: 10, dept: 1 }),
    ];
    expect(ids(sortStaff(rows, { key: 'employeeNo', desc: false }, order))).toEqual([5, 2, 3, 4, 1]);
    expect(ids(sortStaff(rows, { key: 'employeeNo', desc: true }, order))).toEqual([5, 2, 3, 4, 1]);
  });

  it('所属で並べたときは 所属が同じなら社員番号 → フリガナ', () => {
    const rows = [
      staff(1, { company: 10, dept: 1, kana: 'イ' }),
      staff(2, { company: 10, dept: 1, kana: 'ア' }),
      staff(3, { company: 10, dept: 1, no: '2' }),
    ];
    expect(ids(sortStaff(rows, { key: 'affiliation', desc: true }, order))).toEqual([3, 2, 1]);
  });

  it('フリガナで並べたときは 同じ読みなら社員番号 → 所属', () => {
    const rows = [staff(1, { kana: 'ア', company: 10, dept: 1 }), staff(2, { kana: 'ア', company: 10, dept: 2 })];
    expect(ids(sortStaff(rows, { key: 'kana', desc: false }, order))).toEqual([2, 1]);
  });

  it('担当の件数で並べたときは 読めていない人（null）を向きによらず末尾、同じ件数なら社員番号', () => {
    const counts = new Map([
      [1, 3],
      [2, 0],
      [3, 3],
    ]);
    const withWorkload: OrderMaps = { ...order, workload: (id) => counts.get(id) ?? null };
    const rows = [staff(1, { no: '2' }), staff(2, { no: '3' }), staff(3, { no: '1' }), staff(4, { no: '4' })];
    expect(ids(sortStaff(rows, { key: 'workload', desc: true }, withWorkload))).toEqual([3, 1, 2, 4]);
    expect(ids(sortStaff(rows, { key: 'workload', desc: false }, withWorkload))).toEqual([2, 3, 1, 4]);
    // 件数をまだ読めていなければ全員空欄 → 社員番号の順
    expect(ids(sortStaff(rows, { key: 'workload', desc: true }, order))).toEqual([3, 1, 2, 4]);
  });
});
