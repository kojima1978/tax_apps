// ヘッダーの操作者の選択。選んだ人は全アプリ共通（shared/staff-directory/operator.ts）で、
// 会社一覧の「自分の担当」がこの人で絞る。台帳が止まっているときは出さない（選べる人がいない）。

import { useOperator } from '@/shared/staff-directory/operator';

export function OperatorSelect() {
  const { selected, operators, status, selectOperator } = useOperator();
  if (status !== 'ok') return null;
  return (
    <label className="operator-select" title="操作者（会社一覧の「自分の担当」がこの人で絞ります）">
      操作者
      <select
        id="operator-select"
        name="operator"
        value={selected?.id ?? ''}
        onChange={(e) => e.target.value && selectOperator(Number(e.target.value))}
      >
        {!selected && <option value="">選んでください</option>}
        {operators.map((o) => (
          <option key={o.id} value={o.id ?? ''}>{o.fullName}</option>
        ))}
      </select>
    </label>
  );
}
