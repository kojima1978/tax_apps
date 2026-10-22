// 原本は tax_apps/shared/staff-directory/。写しを直さず原本を直して `bash shared/sync.sh` で配る
import { describe, expect, it } from 'vitest';
import {
  assigneeFilterPeople,
  assigneeMatches,
  parseAssigneeFilter,
  personMatches,
  pushRecent,
  sectionsByDepartment,
  sortPeople,
} from './assignee';
import type { Operator } from './operator';

// 名前はすべて架空（リポジトリは公開）
const person = (overrides: Partial<Operator> & { id: number }): Operator => ({
  fullName: '架空 花子',
  kana: '',
  companyName: '架空税理士法人',
  departmentName: '架空部',
  ...overrides,
});

describe('personMatches', () => {
  const p = person({ id: 1, fullName: '架空 太郎', kana: 'カクウ タロウ', departmentName: '資産税部' });

  it('名前・読み・部署で当たる。空白・カタカナ/ひらがな・全角半角の違いは無視', () => {
    expect(personMatches(p, '架空太郎')).toBe(true);
    expect(personMatches(p, 'かくう')).toBe(true);
    expect(personMatches(p, 'ｶｸｳ')).toBe(true);
    expect(personMatches(p, '資産')).toBe(true);
    expect(personMatches(p, '医療')).toBe(false);
    expect(personMatches(p, '  ')).toBe(true);
  });
});

describe('sortPeople', () => {
  it('読みのある人は読み順に先へ、読みの無い人は台帳の並びのまま後ろへ', () => {
    const list = [person({ id: 1 }), person({ id: 2, kana: 'わたなべ' }), person({ id: 3 }), person({ id: 4, kana: 'アオキ' })];
    expect(sortPeople(list).map((p) => p.id)).toEqual([4, 2, 1, 3]);
  });
});

describe('sectionsByDepartment', () => {
  it('部署ごとにまとめ、部署なしは最後', () => {
    const list = [person({ id: 1, departmentName: '' }), person({ id: 2, departmentName: '医療部' }), person({ id: 3, departmentName: '会計部' }), person({ id: 4, departmentName: '医療部' })];
    expect(sectionsByDepartment(list).map((s) => [s.label, s.people.map((p) => p.id)])).toEqual([
      ['医療部', [2, 4]],
      ['会計部', [3]],
      ['部署なし', [1]],
    ]);
  });

  it('会社が2つ以上あるときだけ見出しに会社名を付ける', () => {
    const list = [person({ id: 1, companyName: '架空A' }), person({ id: 2, companyName: '架空B', departmentName: '' })];
    expect(sectionsByDepartment(list).map((s) => s.label)).toEqual(['架空A 架空部', '架空B 部署なし']);
  });
});

describe('pushRecent', () => {
  it('先頭へ寄せて重複を消し、上限で切る', () => {
    expect(pushRecent([1, 2, 3], 2)).toEqual([2, 1, 3]);
    expect(pushRecent([1, 2, 3], 4, 3)).toEqual([4, 1, 2]);
  });
});

describe('parseAssigneeFilter / assigneeMatches', () => {
  it('知らない値は「すべて」へ戻す', () => {
    expect(parseAssigneeFilter('staff:12')).toBe('staff:12');
    expect(parseAssigneeFilter('staff:0')).toBe('all');
    expect(parseAssigneeFilter('staff:x')).toBe('all');
    expect(parseAssigneeFilter(null)).toBe('all');
  });

  it('自分・特定の人・担当者なしで当たり外れを決める', () => {
    const a = { staffId: 2 };
    expect(assigneeMatches(a, 'all', null)).toBe(true);
    expect(assigneeMatches(a, 'mine', 2)).toBe(true);
    expect(assigneeMatches(a, 'mine', null)).toBe(false);
    expect(assigneeMatches(a, 'staff:2', null)).toBe(true);
    expect(assigneeMatches(a, 'staff:3', 2)).toBe(false);
    expect(assigneeMatches(null, 'none', 2)).toBe(true);
    expect(assigneeMatches(a, 'none', 2)).toBe(false);
  });
});

describe('assigneeFilterPeople', () => {
  it('実際に担当になっている人だけを重複なく。名前は台帳の今の氏名、居なければ写し', () => {
    const operators = [person({ id: 1, fullName: '架空 太郎', kana: 'かくう たろう' }), person({ id: 2, fullName: '架空 花子', kana: 'あおき' })];
    const assignees = [{ staffId: 1, name: '旧姓 太郎' }, null, { staffId: 9, name: '退職 次郎' }, { staffId: 1, name: '旧姓 太郎' }, { staffId: 2, name: '架空 花子' }];
    expect(assigneeFilterPeople(assignees, operators)).toEqual([
      { staffId: 2, name: '架空 花子' },
      { staffId: 1, name: '架空 太郎' },
      { staffId: 9, name: '退職 次郎' },
    ]);
  });
});
