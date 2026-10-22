import { describe, expect, it } from 'vitest';
import { assigneeLabel, filterGroupsByAssignee } from '../caseAssignee';

// 名前はすべて架空（リポジトリは公開）
const people = [{ id: 1, fullName: '架空 太郎' }, { id: 2, fullName: '架空 花子' }];

describe('assigneeLabel', () => {
  it('台帳に居れば今の氏名、居なければ設定時の写し、未設定は null', () => {
    expect(assigneeLabel({ staffId: 1, name: '旧姓 太郎' }, people)).toBe('架空 太郎');
    expect(assigneeLabel({ staffId: 9, name: '退職 次郎' }, people)).toBe('退職 次郎');
    expect(assigneeLabel(null, people)).toBeNull();
  });
});

describe('filterGroupsByAssignee', () => {
  const groups = [
    { key: 'a', items: [{ assignee: { staffId: 2, name: '架空 花子' } }, { assignee: { staffId: 1, name: '架空 太郎' } }] },
    { key: 'b', items: [{ assignee: null }] },
    { key: 'c', items: [{ assignee: { staffId: 2, name: '架空 花子' } }] },
  ];
  const keys = (list: readonly { key: string }[]) => list.map((g) => g.key);

  it('自分の担当はどれかの年分の担当なら残す（前の年分の担当からも探せる）', () => {
    expect(keys(filterGroupsByAssignee(groups, 'mine', 1))).toEqual(['a']);
  });

  it('操作者を選んでいなければ「自分の担当」は空（全部を見せない）', () => {
    expect(filterGroupsByAssignee(groups, 'mine', null)).toEqual([]);
  });

  it('特定の人はその人がどれかの年分の担当なら残す', () => {
    expect(keys(filterGroupsByAssignee(groups, 'staff:2', null))).toEqual(['a', 'c']);
    expect(filterGroupsByAssignee(groups, 'staff:9', 1)).toEqual([]);
  });

  it('担当者なしはどの年分にも担当が居ない会社だけ', () => {
    expect(keys(filterGroupsByAssignee(groups, 'none', 1))).toEqual(['b']);
    expect(filterGroupsByAssignee(groups, 'all', null)).toBe(groups);
  });
});
