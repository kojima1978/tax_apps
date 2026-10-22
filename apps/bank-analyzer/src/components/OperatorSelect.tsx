// ヘッダーの操作者の選択。選んだ人は全アプリ共通（shared/staff-directory/operator.ts）で、
// 分類の変更履歴に名前が残る。台帳が止まっているときは出さない（選べる人がいない）

import { UserRound } from 'lucide-react';
import { useOperator } from '@/shared/staff-directory/operator';

export function OperatorSelect() {
  const { selected, operators, status, selectOperator } = useOperator();
  if (status !== 'ok') return null;
  return (
    <label className="mr-1 flex items-center gap-1 text-sm text-slate-200" title="操作者（分類の変更履歴に名前が残ります）">
      <UserRound size={16} aria-hidden="true" />
      <span className="sr-only">操作者</span>
      <select
        value={selected?.id ?? ''}
        onChange={(e) => e.target.value && selectOperator(Number(e.target.value))}
        className="max-w-36 cursor-pointer rounded-md border border-white/20 bg-slate-700 px-2 py-1 text-sm text-white"
      >
        {!selected && <option value="">操作者を選ぶ</option>}
        {operators.map((o) => (
          <option key={o.id} value={o.id ?? ''}>
            {o.fullName}
          </option>
        ))}
      </select>
    </label>
  );
}
