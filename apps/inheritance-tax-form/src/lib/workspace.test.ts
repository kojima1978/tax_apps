import { describe, expect, it } from 'vitest';
import { emptyData } from './storedData';
import { workspaceIssues } from './workspace';

describe('workspaceIssues', () => {
  it('空の申告に中核項目の確認事項を出す', () => {
    const issues = workspaceIssues(emptyData());
    expect(issues.map((issue) => issue.id)).toEqual([
      'office', 'decedent-name', 'inheritance-date', 'submission-date',
      'heir-0-name', 'heir-0-relation', 'heir-0-cause',
    ]);
  });

  it('中核項目がそろえば確認事項を出さない', () => {
    const data = emptyData();
    data.common = {
      office: '麹町', name: '被相続人', startEra: '4', startY: '8', startM: '1', startD: '1',
      submitDate_y: '8', submitDate_m: '10', submitDate_d: '1',
    };
    data.heirs[0] = { ...data.heirs[0], name: '相続人', relation: '1', cause1: '1' };
    expect(workspaceIssues(data)).toEqual([]);
  });
});
