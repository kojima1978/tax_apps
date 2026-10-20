import { beforeEach, describe, expect, it } from 'vitest';
import type Database from 'better-sqlite3';
import { openDb } from './db.js';
import {
  applyItcmImport,
  jstDate,
  NoCompanyError,
  planItcmImport,
  type ItcmAssignee,
  type ItcmDepartment,
} from './itcm-import.js';
import { listDepartments, listStaff } from './repo.js';

// 名前はすべて架空（リポジトリは公開）

let db: Database.Database;
beforeEach(() => {
  db = openDb(':memory:');
});

const dept = (id: number, name: string, active = true): ItcmDepartment => ({ id, name, sortOrder: id, active });
const person = (id: number, name: string, over: Partial<ItcmAssignee> = {}): ItcmAssignee => ({
  id,
  name,
  employeeId: null,
  departmentId: 1,
  active: true,
  updatedAt: '2026-04-01T00:00:00.000Z',
  ...over,
});

const run = (d: ItcmDepartment[], a: ItcmAssignee[]) => applyItcmImport(db, planItcmImport(db, d, a));

describe('案件管理からの取込', () => {
  it('部署と担当者を作り、所属を台帳の部署 id へ置き換える', () => {
    const result = run([dept(1, '会計部'), dept(2, '資産税部')], [person(10, '山田', { departmentId: 2 })]);
    expect(result).toEqual({ departmentsCreated: 2, departmentsLinked: 0, staffCreated: 1 });
    const [s] = listStaff(db, 'all');
    expect(s).toMatchObject({ name: '山田', departmentName: '資産税部', retiredOn: null, nameKana: '', companyId: 1 });
  });

  it('「姓 名」は最初の空白で分ける（全角の空白も）', () => {
    run([dept(1, '会計部')], [person(10, '山田 太郎'), person(11, '鈴木　花子'), person(12, '佐藤')]);
    const names = listStaff(db, 'all').map((s) => [s.familyName, s.givenName]);
    expect(names).toEqual(expect.arrayContaining([['山田', '太郎'], ['鈴木', '花子'], ['佐藤', '']]));
  });

  it('取り込み先は表示順で先頭の会社。部署もその会社の中で探す', () => {
    db.prepare(`INSERT INTO companies (name, sort_order) VALUES ('架空商事', -1)`).run();
    db.prepare(`INSERT INTO departments (company_id, name) VALUES (1, '会計部')`).run();
    const plan = planItcmImport(db, [dept(1, '会計部')], [person(10, '山田')]);
    expect(plan.company.name).toBe('架空商事');
    expect(plan.departments[0].action).toBe('create');
    applyItcmImport(db, plan);
    expect(listStaff(db, 'all')[0]).toMatchObject({ companyName: '架空商事', departmentName: '会計部' });
  });

  it('会社が1件も無ければ止める', () => {
    db.prepare('DELETE FROM companies').run();
    expect(() => planItcmImport(db, [], [])).toThrow(NoCompanyError);
  });

  it('2回目は何もしない（取込済みを読み飛ばす）', () => {
    run([dept(1, '会計部')], [person(10, '山田')]);
    const plan = planItcmImport(db, [dept(1, '会計部')], [person(10, '山田')]);
    expect(plan.departments.map((p) => p.action)).toEqual(['skip']);
    expect(plan.staff.map((p) => p.action)).toEqual(['skip']);
    expect(applyItcmImport(db, plan)).toEqual({ departmentsCreated: 0, departmentsLinked: 0, staffCreated: 0 });
    expect(listStaff(db, 'all')).toHaveLength(1);
  });

  it('取込済みの人を台帳で直しても、流し直しで上書きしない', () => {
    run([dept(1, '会計部')], [person(10, '山田')]);
    db.prepare(`UPDATE staff SET family_kana = 'ヤマダ', mobile_phone = '090-0000-0000'`).run();
    run([dept(1, '会計部')], [person(10, '山田'), person(11, '鈴木')]);
    const all = listStaff(db, 'all');
    expect(all).toHaveLength(2);
    expect(all.find((s) => s.name === '山田')).toMatchObject({ nameKana: 'ヤマダ', mobilePhone: '090-0000-0000' });
  });

  it('台帳に同じ名前の部署があれば作らずに結び付ける', () => {
    db.prepare(`INSERT INTO departments (company_id, name) VALUES (1, '会計部')`).run();
    const result = run([dept(1, '会計部')], [person(10, '山田')]);
    expect(result).toMatchObject({ departmentsCreated: 0, departmentsLinked: 1 });
    expect(listDepartments(db)).toHaveLength(1);
    expect(listStaff(db, 'all')[0].departmentName).toBe('会計部');
  });

  it('同じ名前の人は結び付けず、別人として作って注意を出す', () => {
    db.prepare(`INSERT INTO staff (family_name) VALUES ('山田')`).run();
    const plan = planItcmImport(db, [dept(1, '会計部')], [person(10, '山田')]);
    const p = plan.staff[0];
    expect(p.action === 'create' && p.notes).toEqual(['台帳に同じ名前の人がいます（別人として登録）']);
  });

  it('使用停止の担当者は退職扱い（退職日は停止にした日・日本時間）', () => {
    run([dept(1, '会計部')], [person(10, '山田', { active: false, updatedAt: '2026-03-31T16:30:00.000Z' })]);
    expect(listStaff(db, 'active')).toHaveLength(0);
    expect(listStaff(db, 'retired')[0].retiredOn).toBe('2026-04-01');
  });

  it('社員番号は引き継ぐが、台帳で使用済み・取込内で重複なら空にする', () => {
    db.prepare(`INSERT INTO staff (id, family_name) VALUES (1, '既存')`).run();
    db.prepare(`INSERT INTO staff_affiliations (staff_id, company_id, employee_no, is_primary) VALUES (1, 1, 'A1', 1)`).run();
    const plan = planItcmImport(
      db,
      [dept(1, '会計部')],
      [person(10, '山田', { employeeId: 'A1' }), person(11, '鈴木', { employeeId: 'B2' }), person(12, '佐藤', { employeeId: 'B2' })],
    );
    const nos = plan.staff.map((p) => (p.action === 'create' ? p.employeeNo : 'skip'));
    expect(nos).toEqual([null, 'B2', null]);
    applyItcmImport(db, plan);
    expect(listStaff(db, 'all')).toHaveLength(4);
  });

  it('部署の使用停止と表示順も写す', () => {
    run([dept(1, '会計部'), dept(5, '旧部署', false)], []);
    expect(listDepartments(db).map((d) => [d.name, d.sortOrder, d.active])).toEqual([
      ['会計部', 1, true],
      ['旧部署', 5, false],
    ]);
  });
});

describe('jstDate', () => {
  it('UTC の時刻を日本の日付にする', () => {
    expect(jstDate('2026-03-31T14:59:59.000Z')).toBe('2026-03-31');
    expect(jstDate('2026-03-31T15:00:00.000Z')).toBe('2026-04-01');
    expect(jstDate('x')).toBe(null);
  });
});
