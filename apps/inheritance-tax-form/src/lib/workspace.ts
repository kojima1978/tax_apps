import type { FormData } from './storedData';

export type WorkspaceIssueKind = 'error' | 'incomplete';

export interface WorkspaceIssue {
  id: string;
  formId: string;
  kind: WorkspaceIssueKind;
  message: string;
  field?: string;
  personIndex?: number;
}

const blank = (value: string | undefined): boolean => (value ?? '').trim() === '';

/**
 * 申告の作業状況として常時知らせる、中核項目だけの確認事項。
 * 法令上の要否が個別事情で変わる欄は、空欄だけを理由に問題へ含めない。
 */
export function workspaceIssues(data: FormData): WorkspaceIssue[] {
  const issues: WorkspaceIssue[] = [];
  const add = (id: string, message: string, field: string) => {
    issues.push({ id, formId: 'table1', kind: 'incomplete', message, field });
  };

  if (blank(data.common.office)) add('office', '提出先税務署が未選択です。', 'c.office');
  if (blank(data.common.name)) add('decedent-name', '被相続人の氏名が未入力です。', 'c.name');
  if ([data.common.startEra, data.common.startY, data.common.startM, data.common.startD].some(blank)) {
    add('inheritance-date', '相続開始年月日がそろっていません。', 'c.startEra');
  }
  if ([data.common.submitDate_y, data.common.submitDate_m, data.common.submitDate_d].some(blank)) {
    add('submission-date', '申告書の提出年月日がそろっていません。', 'c.submitDate_y');
  }

  data.heirs.forEach((heir, personIndex) => {
    if (blank(heir.name)) {
      issues.push({
        id: `heir-${personIndex}-name`, formId: personIndex === 0 ? 'table1' : 'table1cont',
        kind: 'incomplete', message: `${personIndex + 1}人目の財産を取得した人の氏名が未入力です。`, personIndex,
      });
    }
    if (blank(heir.relation)) {
      issues.push({
        id: `heir-${personIndex}-relation`, formId: personIndex === 0 ? 'table1' : 'table1cont',
        kind: 'incomplete', message: `${personIndex + 1}人目の被相続人との続柄が未選択です。`, personIndex,
      });
    }
    if ([heir.cause1, heir.cause2, heir.cause3].every(blank)) {
      issues.push({
        id: `heir-${personIndex}-cause`, formId: personIndex === 0 ? 'table1' : 'table1cont',
        kind: 'incomplete', message: `${personIndex + 1}人目の財産の取得原因が未選択です。`, personIndex,
      });
    }
  });

  return issues;
}
