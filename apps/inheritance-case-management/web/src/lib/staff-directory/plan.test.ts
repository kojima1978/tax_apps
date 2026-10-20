import { describe, expect, it } from 'vitest';
import { planAssignees, planDepartments, type DirectoryLink, type LocalAssignee, type LocalDepartment } from './plan';

// 名前はすべて架空（リポジトリは公開）

const dept = (over: Partial<LocalDepartment> & { id: number }): LocalDepartment => ({
  name: '資産税部',
  sortOrder: 0,
  active: true,
  staffDirectoryId: null,
  ...over,
});

const assignee = (over: Partial<LocalAssignee> & { id: number }): LocalAssignee => ({
  name: '山田',
  employeeId: null,
  departmentId: null,
  active: true,
  staffDirectoryId: null,
  ...over,
});

describe('planDepartments', () => {
  it('取込記録 → 名前の順で結び付け、どれにも当たらなければ作る', () => {
    const links: DirectoryLink[] = [{ entity: 'department', externalId: '5', localId: 100 }];
    const ops = planDepartments(
      [
        { id: 100, name: '資産税部', sortOrder: 0, active: true },
        { id: 101, name: '会計部', sortOrder: 1, active: true },
        { id: 102, name: '総務部', sortOrder: 2, active: true },
      ],
      links,
      [dept({ id: 5, name: '資産税' }), dept({ id: 6, name: '会計部', sortOrder: 1 })],
    );
    expect(ops).toEqual([
      { kind: 'update', id: 5, data: { name: '資産税部', staffDirectoryId: 100 } },
      { kind: 'update', id: 6, data: { staffDirectoryId: 101 } },
      { kind: 'create', data: { name: '総務部', sortOrder: 2, active: true, staffDirectoryId: 102 } },
    ]);
  });

  it('結び付いていて変わりが無ければ何も書かない', () => {
    const ops = planDepartments(
      [{ id: 100, name: '資産税部', sortOrder: 0, active: true }],
      [],
      [dept({ id: 5, staffDirectoryId: 100 })],
    );
    expect(ops).toEqual([]);
  });

  it('台帳ID の付いた部署は名前が同じでも別の台帳の部署に取られない', () => {
    const ops = planDepartments(
      [{ id: 200, name: '資産税部', sortOrder: 0, active: true }],
      [],
      [dept({ id: 5, staffDirectoryId: 100 })],
    );
    expect(ops).toEqual([
      { kind: 'create', data: { name: '資産税部', sortOrder: 0, active: true, staffDirectoryId: 200 } },
      { kind: 'update', id: 5, data: { active: false } },
    ]);
  });
});

describe('planAssignees', () => {
  const departmentMap = new Map([[100, 5]]);

  it('取込記録で結び付け、氏名・社員番号・部署・在籍を台帳に揃える', () => {
    const ops = planAssignees(
      [{ id: 1, employeeNo: 'T001', name: '山田 太郎', departmentId: 100, retiredOn: '2026-03-31' }],
      [{ entity: 'staff', externalId: '12', localId: 1 }],
      [assignee({ id: 12, name: '山田' })],
      departmentMap,
    );
    expect(ops).toEqual([
      {
        kind: 'update',
        id: 12,
        data: { name: '山田 太郎', employeeId: 'T001', departmentId: 5, active: false, staffDirectoryId: 1 },
      },
    ]);
  });

  it('名前が同じでも取込記録が無ければ結び付けず、新しく作る', () => {
    const ops = planAssignees(
      [{ id: 2, employeeNo: null, name: '山田', departmentId: null, retiredOn: null }],
      [],
      [assignee({ id: 12, name: '山田' })],
      departmentMap,
    );
    expect(ops).toEqual([
      { kind: 'create', data: { name: '山田', employeeId: null, departmentId: null, active: true, staffDirectoryId: 2 } },
    ]);
  });

  it('台帳ID で結び付いた人は取込記録より優先し、同じ行を2人に割り当てない', () => {
    const ops = planAssignees(
      [
        { id: 1, employeeNo: null, name: '山田', departmentId: null, retiredOn: null },
        { id: 2, employeeNo: null, name: '鈴木', departmentId: null, retiredOn: null },
      ],
      [{ entity: 'staff', externalId: '12', localId: 2 }],
      [assignee({ id: 12, name: '山田', staffDirectoryId: 1 })],
      departmentMap,
    );
    expect(ops).toEqual([
      { kind: 'create', data: { name: '鈴木', employeeId: null, departmentId: null, active: true, staffDirectoryId: 2 } },
    ]);
  });
});
