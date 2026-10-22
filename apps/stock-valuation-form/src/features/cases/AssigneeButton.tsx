// 年分の行の担当者。押すと全アプリ共通の選び方（社員台帳の在籍者から検索・部署別・自分・最近）が開き、
// 選んだ時点で保存する（担当の付け替えは帳票の入力と違って一度きりの操作）。
//
// いまの担当者が在籍一覧に居なくても（退職・台帳の復元）写しの名前のまま出す
// ── 消すと、触っていないのに「担当者なし」に見えてしまう。

import { useState } from 'react';
import { AssigneePicker } from '@/shared/staff-directory/AssigneePicker';
import type { CaseAssignee } from './api';

interface AssigneeButtonProps {
  assignee: CaseAssignee | null;
  /** 表示名（台帳の今の氏名、居なければ写し）。未設定は null */
  label: string | null;
  /** 何の担当者か（ダイアログに出す） */
  subject: string;
  disabled: boolean;
  /** 保存できなければ false を返す（ダイアログを開いたままにする） */
  onChange: (assignee: CaseAssignee | null) => Promise<boolean>;
}

export function AssigneeButton({ assignee, label, subject, disabled, onChange }: AssigneeButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="case-row-assignee"
        disabled={disabled}
        title="この年分の担当者を選びます（社員台帳から）"
        onClick={() => setOpen(true)}
      >
        担当 <span className={label === null ? 'is-empty' : ''}>{label ?? 'なし'}</span>
      </button>
      <AssigneePicker
        open={open}
        onClose={() => setOpen(false)}
        current={assignee}
        subject={subject}
        onPick={async (next) => {
          if (!(await onChange(next))) throw new Error('担当者を保存できませんでした。');
          setOpen(false);
        }}
      />
    </>
  );
}
