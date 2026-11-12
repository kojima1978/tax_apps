// 原本は tax_apps/shared/staff-directory/。写しを直さず原本を直して `bash shared/sync.sh` で配る
import type { ReactNode } from 'react';
import type { Assignee } from './assignee';
import { useOperator } from './operator';
import { StaffPickerDialog } from './StaffPickerDialog';

type Props = {
  open: boolean;
  onClose: () => void;
  /** いまの担当者（未設定は null） */
  current: Assignee | null;
  /** 押した時点で呼ぶ。Promise を返せば終わるまで操作を止め、失敗はダイアログの中に出す */
  onPick: (assignee: Assignee | null) => void | Promise<void>;
  title?: string;
  /** 何の担当者か（案件名など） */
  subject?: ReactNode;
};

/**
 * 担当者を社員台帳から選ぶダイアログ。検索・部署別の一覧に加えて、
 * 先頭に「自分（右上の操作者）」と「最近選んだ人」を出す。
 */
export function AssigneePicker({ open, onClose, current, onPick, title = '担当者を選ぶ', subject }: Props) {
  const { operators, status } = useOperator();
  const missing = current !== null && status === 'ok' && !operators.some((p) => p.id === current.staffId);

  return (
    <StaffPickerDialog
      open={open}
      onClose={onClose}
      title={title}
      currentId={current?.staffId ?? null}
      onPick={(person) => onPick(person && person.id !== null ? { staffId: person.id, name: person.fullName } : null)}
      clearLabel="担当者を外す"
      quickSections
      fallbackMessage="社員台帳に接続できないため、担当者を選べません（外すことはできます）。"
      searchLabel="担当者を名前・よみ・部署で探す"
      summary={
        <>
          {subject && <p className="text-sm text-slate-600">{subject}</p>}
          <p className="text-sm">
            いまの担当：
            {current ? (
              <span className="font-semibold">
                {operators.find((p) => p.id === current.staffId)?.fullName ?? current.name}
                {missing && <span className="ml-1 text-xs font-normal text-amber-800">（台帳の在籍一覧に居ません）</span>}
              </span>
            ) : (
              <span className="text-slate-400">未設定</span>
            )}
          </p>
        </>
      }
    />
  );
}
