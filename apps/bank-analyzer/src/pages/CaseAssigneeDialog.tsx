// 案件の担当者を選ぶ。選べるのは社員台帳の在籍者（ヘッダーの操作者と同じ一覧）で、
// 台帳ID と、その時点の氏名の写しを保存する

import { useState } from 'react';
import { Dialog } from '../components/Dialog';
import { useNotice } from '../components/Notice';
import { api, errorMessage } from '../lib/api';
import type { CaseAssignee, CaseSummary } from '../types';
import { useOperator } from '@/shared/staff-directory/operator';

export function CaseAssigneeDialog({ target, onClose, onSaved }: { target: CaseSummary | null; onClose: () => void; onSaved: () => void }) {
  const notice = useNotice();
  const { operators, status } = useOperator();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [openedFor, setOpenedFor] = useState<CaseSummary | null>(null);
  // 開くたびに今の担当者へ戻す
  if (target !== openedFor) {
    setOpenedFor(target);
    setValue(target?.assignee ? String(target.assignee.staffId) : '');
    setError(null);
  }

  // 今の担当者が在籍一覧に居ない（退職・台帳の停止）ときも選択肢から消さない
  const current = target?.assignee ?? null;
  const missing = current && !operators.some((o) => o.id === current.staffId) ? current : null;

  const submit = async () => {
    if (!target) return;
    const staffId = value ? Number(value) : null;
    const name = operators.find((o) => o.id === staffId)?.fullName ?? (staffId === missing?.staffId ? missing.name : '');
    setBusy(true);
    setError(null);
    try {
      const res = await api.put<{ assignee: CaseAssignee | null; message: string }>(`/cases/${target.id}/assignee`, staffId === null ? { staffId } : { staffId, name });
      notice.success(res.message);
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={target !== null}
      onClose={onClose}
      title="担当者の設定"
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            キャンセル
          </button>
          <button type="submit" form="case-assignee-form" className="btn btn-primary" disabled={busy || status === 'loading'}>
            保存する
          </button>
        </>
      }
    >
      <form
        id="case-assignee-form"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <p className="mb-3 text-sm text-slate-600">案件「{target?.name}」</p>
        <label className="label" htmlFor="case-assignee">
          担当者
        </label>
        <select id="case-assignee" className="input" value={value} onChange={(e) => setValue(e.target.value)}>
          <option value="">担当者なし</option>
          {missing && <option value={missing.staffId}>{missing.name}（台帳の在籍一覧に居ません）</option>}
          {status === 'ok' &&
            operators.map((o) => (
              <option key={o.id} value={o.id ?? ''}>
                {o.fullName}
                {o.departmentName && `（${o.departmentName}）`}
              </option>
            ))}
        </select>
        {status === 'fallback' && <p className="mt-2 text-sm text-amber-800">社員台帳に接続できないため、担当者を選べません（外すことはできます）。</p>}
        {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      </form>
    </Dialog>
  );
}
