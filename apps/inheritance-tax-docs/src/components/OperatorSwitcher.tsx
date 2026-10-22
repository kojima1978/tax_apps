import { UserRound } from 'lucide-react';
import { useOperator } from '@/shared/staff-directory/operator';

export default function OperatorSwitcher() {
  const { operator, operators, status, selectOperator } = useOperator();
  const selectable = operators.filter((item): item is typeof item & { id: number } => item.id !== null);

  return (
    <div className="grid gap-1 text-sm">
      <label className="flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300" htmlFor="master-operator">
        <UserRound className="h-4 w-4" />操作者
      </label>
      {selectable.length > 0 ? (
        <select
          id="master-operator"
          value={operator.id ?? selectable[0].id}
          onChange={(event) => selectOperator(Number(event.target.value))}
          className="min-h-11 cursor-pointer rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        >
          {selectable.map((item) => (
            <option key={item.id} value={item.id}>
              {item.fullName}{item.departmentName ? `（${item.departmentName}）` : ''}
            </option>
          ))}
        </select>
      ) : (
        <div id="master-operator" className="flex min-h-11 items-center rounded-lg border border-slate-300 bg-slate-50 px-3 dark:border-slate-600 dark:bg-slate-800">
          {operator.fullName}
        </div>
      )}
      {status === 'fallback' ? <span className="text-xs text-amber-700 dark:text-amber-300">社員台帳に未接続（控えの操作者）</span> : null}
    </div>
  );
}
