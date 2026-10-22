// 年分の行の担当者の選択。選んだ時点で保存する（担当の付け替えは帳票の入力と違って一度きりの操作）。
//
// 台帳の在籍者から選ぶ。いまの担当者が在籍一覧に居なければ（退職・台帳の復元）、
// 写しの名前のまま選択肢に残す ── 消すと、触っていないのに「担当者なし」に見えてしまう。

import type { Operator } from '@/shared/staff-directory/operator';
import type { CaseAssignee } from './api';

interface AssigneeSelectProps {
  caseId: number;
  assignee: CaseAssignee | null;
  operators: readonly Operator[];
  disabled: boolean;
  onChange: (assignee: CaseAssignee | null) => void;
}

export function AssigneeSelect({ caseId, assignee, operators, disabled, onChange }: AssigneeSelectProps) {
  const missing = assignee !== null && !operators.some((o) => o.id === assignee.staffId);
  return (
    <label className="case-row-assignee" title="この年分の担当者（社員台帳から選びます）">
      担当
      <select
        id={`case-assignee-${caseId}`}
        name={`case.assignee.${caseId}`}
        value={assignee?.staffId ?? ''}
        disabled={disabled}
        onChange={(e) => {
          if (e.target.value === '') return onChange(null);
          const person = operators.find((o) => o.id === Number(e.target.value));
          if (person?.id != null) onChange({ staffId: person.id, name: person.fullName });
        }}
      >
        <option value="">なし</option>
        {missing && <option value={assignee.staffId}>{assignee.name}（台帳に居ません）</option>}
        {operators.map((o) => (
          <option key={o.id} value={o.id ?? ''}>{o.fullName}</option>
        ))}
      </select>
    </label>
  );
}
