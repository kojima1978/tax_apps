// 案件の担当者を選ぶ。選ぶ部品は全アプリ共通（社員台帳の在籍者から検索・部署別・自分・最近）で、
// ここは押した瞬間に保存するだけ。台帳ID と、その時点の氏名の写しを保存する

import { useNotice } from '../components/Notice';
import { api, errorMessage } from '../lib/api';
import type { CaseAssignee, CaseSummary } from '../types';
import { AssigneePicker } from '@/shared/staff-directory/AssigneePicker';

export function CaseAssigneeDialog({ target, onClose, onSaved }: { target: CaseSummary | null; onClose: () => void; onSaved: () => void }) {
  const notice = useNotice();

  const save = async (assignee: CaseAssignee | null) => {
    if (!target) return;
    try {
      const res = await api.put<{ message: string }>(`/cases/${target.id}/assignee`, assignee ?? { staffId: null });
      notice.success(res.message);
      onSaved();
    } catch (e) {
      throw new Error(errorMessage(e));
    }
  };

  return (
    <AssigneePicker
      open={target !== null}
      onClose={onClose}
      current={target?.assignee ?? null}
      onPick={save}
      title="担当者の設定"
      subject={target && <>案件「{target.name}」</>}
    />
  );
}
