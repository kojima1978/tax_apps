// 原本は tax_apps/shared/staff-directory/。写しを直さず原本を直して `bash shared/sync.sh` で配る
import { describe, expect, it } from 'vitest';
import {
  assigneeFilterPeople,
  assigneeMatches,
  buildPickerSections,
  departmentOrderByName,
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
  departmentOrder: null,
  retiredOn: null,
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

describe('personMatches（複数の語）', () => {
  const p = { fullName: '架空 太郎', kana: 'カクウ タロウ', companyName: '', departmentName: '大阪', searchExtra: 'T003' };

  it('空白で区切った語は全部どこかに当たれば当たり（名前と部署・社員コードを並べて探せる）', () => {
    expect(personMatches(p, 'かくう 大阪')).toBe(true);
    expect(personMatches(p, 't003')).toBe(true);
    expect(personMatches(p, 'かくう 東京')).toBe(false);
  });
});

describe('buildPickerSections', () => {
  // 写しの行（id は写しの ID、dir が台帳ID）
  const rows = [
    { id: 11, dir: 1, fullName: '架空 一郎', kana: 'かくう いちろう', companyName: '', departmentName: '会計部' },
    { id: 12, dir: 2, fullName: '架空 二郎', kana: 'かくう じろう', companyName: '', departmentName: '医療部' },
    { id: 13, dir: null, fullName: '架空 三郎', kana: '', companyName: '', departmentName: '' },
  ];
  const directoryIdOf = (r: (typeof rows)[number]) => r.dir;

  it('自分と最近選んだ人を台帳ID で写しの行へ引き当て、先頭に出す（自分は最近から除く）', () => {
    const sections = buildPickerSections(rows, { query: '', directoryIdOf, quick: { meId: 2, recentIds: [2, 9, 1] } });
    expect(sections.map((s) => [s.kind, s.label, s.people.map((p) => p.id)])).toEqual([
      ['me', '自分（操作者）', [12]],
      ['recent', '最近選んだ人', [11]],
      ['department', '医療部', [12]],
      ['department', '会計部', [11]],
      ['department', '部署なし', [13]],
    ]);
  });

  it('検索語があれば当たった人だけ。quick が無ければ部署ごとだけ', () => {
    expect(buildPickerSections(rows, { query: 'じろう', directoryIdOf, quick: { meId: 1, recentIds: [] } }).map((s) => [s.label, s.people.map((p) => p.id)])).toEqual([
      ['検索結果（1人）', [12]],
    ]);
    expect(buildPickerSections(rows, { query: '', directoryIdOf }).map((s) => s.kind)).toEqual(['department', 'department', 'department']);
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

  it('台帳の表示順があればその順（名前順ではない）。順の無い部署は名前順で後ろ、部署なしは最後', () => {
    const list = [
      person({ id: 1, departmentName: '' }),
      person({ id: 2, departmentName: '医療部', departmentOrder: 2 }),
      person({ id: 3, departmentName: '会計部', departmentOrder: 1 }),
      person({ id: 4, departmentName: '資産税部' }),
      person({ id: 5, departmentName: '相続部' }),
    ];
    expect(sectionsByDepartment(list).map((s) => s.label)).toEqual(['会計部', '医療部', '資産税部', '相続部', '部署なし']);
    // 台帳が止まって順が1つも無ければ今までどおり名前順
    const noOrder = list.map((p) => ({ ...p, departmentOrder: null }));
    expect(sectionsByDepartment(noOrder).map((s) => s.label)).toEqual(['医療部', '会計部', '資産税部', '相続部', '部署なし']);
  });

  it('会社が2つ以上あるときだけ見出しに会社名を付ける', () => {
    const list = [person({ id: 1, companyName: '架空A' }), person({ id: 2, companyName: '架空B', departmentName: '' })];
    expect(sectionsByDepartment(list).map((s) => s.label)).toEqual(['架空A 架空部', '架空B 部署なし']);
  });
});

describe('departmentOrderByName', () => {
  it('部署名ごとに台帳の表示順。同じ名前は小さいほう、部署なし・順の無い人は入れない', () => {
    const map = departmentOrderByName([
      person({ id: 1, departmentName: '会計部', departmentOrder: 3 }),
      person({ id: 2, departmentName: '会計部', departmentOrder: 1 }),
      person({ id: 3, departmentName: '医療部', departmentOrder: 2 }),
      person({ id: 4, departmentName: '', departmentOrder: null }),
      person({ id: 5, departmentName: '総務部', departmentOrder: null }),
    ]);
    expect([...map.entries()]).toEqual([['会計部', 1], ['医療部', 2]]);
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
