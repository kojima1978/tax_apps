import { useCallback, useMemo, useState } from 'react';
import { api } from '../api';
import { useLoad } from '../hooks/useLoad';
import { normalizeQuery } from '../lib';
import { ErrorBanner, btn, inputClass } from '../components/ui';
import StaffDialog from '../components/StaffDialog';
import type { Staff, StaffStatus } from '../types';

const STATUS_TABS: { value: StaffStatus; label: string }[] = [
  { value: 'active', label: '在籍' },
  { value: 'retired', label: '退職' },
  { value: 'all', label: 'すべて' },
];

// 部署の絞り込み: '' = すべて、'none' = 未所属、それ以外は部署 id
const NO_DEPARTMENT = 'none';

const COLUMNS = ['台帳ID', '社員番号', '氏名', 'フリガナ', '部署', '携帯電話', '退職日'] as const;

export default function StaffPage() {
  const [status, setStatus] = useState<StaffStatus>('active');
  const [department, setDepartment] = useState('');
  const [query, setQuery] = useState('');
  // undefined = 閉じている、null = 新規、Staff = 編集
  const [editing, setEditing] = useState<Staff | null | undefined>(undefined);

  const loadStaff = useCallback(() => api.listStaff(status), [status]);
  const staff = useLoad(loadStaff);
  const departments = useLoad(api.listDepartments);

  const rows = useMemo(() => {
    const q = normalizeQuery(query);
    return (staff.data ?? []).filter((s) => {
      const inDepartment =
        department === ''
          ? true
          : department === NO_DEPARTMENT
            ? s.departmentId === null
            : String(s.departmentId) === department;
      if (!inDepartment) return false;
      if (!q) return true;
      return [s.name, s.nameKana, s.employeeNo ?? '', s.mobilePhone].some((v) => normalizeQuery(v).includes(q));
    });
  }, [staff.data, department, query]);

  const missingKana = rows.filter((s) => s.nameKana === '').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-md border border-slate-300 bg-white p-0.5" role="group" aria-label="在籍状況">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              aria-pressed={status === t.value}
              onClick={() => setStatus(t.value)}
              className={`rounded px-3 py-1.5 text-sm ${
                status === t.value ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className={`${inputClass} w-auto`}
          aria-label="部署で絞り込み"
        >
          <option value="">すべての部署</option>
          {departments.data?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
              {d.active ? '' : '（使用停止）'}
            </option>
          ))}
          <option value={NO_DEPARTMENT}>未所属</option>
        </select>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="氏名・フリガナ・社員番号・電話で検索"
          className={`${inputClass} w-72`}
        />
        <button type="button" className={`${btn.primary} ml-auto`} onClick={() => setEditing(null)}>
          ＋ 社員を追加
        </button>
      </div>

      <ErrorBanner message={staff.error ?? departments.error} />

      <p className="text-sm text-slate-500">
        {rows.length}名
        {missingKana > 0 && <span className="ml-3 text-amber-700">フリガナ未入力 {missingKana}名（一覧の末尾）</span>}
      </p>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              {COLUMNS.map((c) => (
                <th key={c} className="whitespace-nowrap px-4 py-2 font-medium">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((s) => (
              <tr
                key={s.id}
                onClick={() => setEditing(s)}
                className={`cursor-pointer hover:bg-teal-50/50 ${s.retiredOn ? 'text-slate-400' : ''}`}
              >
                <td className="px-4 py-2 tabular-nums text-slate-500">{s.id}</td>
                <td className="px-4 py-2 tabular-nums">{s.employeeNo ?? ''}</td>
                <td className="px-4 py-2 font-medium">
                  <button type="button" className="text-left hover:underline" onClick={() => setEditing(s)}>
                    {s.name}
                  </button>
                </td>
                <td className="px-4 py-2">{s.nameKana}</td>
                <td className="px-4 py-2">{s.departmentName ?? ''}</td>
                <td className="px-4 py-2 tabular-nums">{s.mobilePhone}</td>
                <td className="px-4 py-2 tabular-nums">{s.retiredOn ?? ''}</td>
              </tr>
            ))}
            {staff.data && rows.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="px-4 py-8 text-center text-slate-500">
                  該当する社員がいません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing !== undefined && (
        <StaffDialog
          staff={editing}
          departments={departments.data ?? []}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            void staff.reload();
            void departments.reload();
          }}
        />
      )}
    </div>
  );
}
