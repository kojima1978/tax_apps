import { useCallback, useMemo, useState } from 'react';
import { api } from '../api';
import { useLoad } from '../hooks/useLoad';
import { normalizeQuery } from '../lib';
import { ErrorBanner, btn, controlClass } from '../components/ui';
import StaffDialog from '../components/StaffDialog';
import ShortNameCell from '../components/ShortNameCell';
import type { Affiliation, Staff, StaffStatus } from '../types';

const STATUS_TABS: { value: StaffStatus; label: string }[] = [
  { value: 'active', label: '在籍' },
  { value: 'retired', label: '退職' },
  { value: 'all', label: 'すべて' },
];

// 部署の絞り込み: '' = すべて、'none' = 未所属（会社を選んでいればその会社の中で）、それ以外は部署 id
const NO_DEPARTMENT = 'none';

const COLUMNS = ['台帳ID', '社員番号', '氏名', '略称', 'フリガナ', '所属', '携帯電話'] as const;

// 会社・部署の絞り込みは主所属に限らず、どれか1つの所属が当たれば出す（兼務先からも探せるように）
function matchesAffiliation(s: Staff, company: string, department: string): boolean {
  const inCompany = (a: Affiliation) => company === '' || String(a.companyId) === company;
  if (department === '') return company === '' || s.affiliations.some(inCompany);
  if (department === NO_DEPARTMENT) {
    return company === '' ? s.affiliations.every((a) => a.departmentId === null) : s.affiliations.some((a) => inCompany(a) && a.departmentId === null);
  }
  return s.affiliations.some((a) => String(a.departmentId) === department);
}

export default function StaffPage() {
  const [status, setStatus] = useState<StaffStatus>('active');
  const [company, setCompany] = useState('');
  const [department, setDepartment] = useState('');
  const [query, setQuery] = useState('');
  // undefined = 閉じている、null = 新規、Staff = 編集
  const [editing, setEditing] = useState<Staff | null | undefined>(undefined);

  const loadStaff = useCallback(() => api.listStaff(status), [status]);
  const staff = useLoad(loadStaff);
  const departments = useLoad(api.listDepartments);
  const companies = useLoad(api.listCompanies);

  // 会社が1つだけなら会社名は出さない（全員同じで情報にならない）
  const multiCompany = (companies.data?.length ?? 0) > 1;

  const departmentOptions = useMemo(
    () => (departments.data ?? []).filter((d) => company === '' || String(d.companyId) === company),
    [departments.data, company],
  );

  const rows = useMemo(() => {
    const q = normalizeQuery(query);
    return (staff.data ?? []).filter((s) => {
      if (!matchesAffiliation(s, company, department)) return false;
      if (!q) return true;
      return [s.fullName, s.shortName, s.nameKana, s.mobilePhone, ...s.affiliations.map((a) => a.employeeNo ?? '')].some((v) =>
        normalizeQuery(v).includes(q),
      );
    });
  }, [staff.data, company, department, query]);

  const missingKana = rows.filter((s) => s.familyKana === '').length;

  const affiliationText = (a: Affiliation) =>
    [multiCompany ? a.companyName : '', a.departmentName ?? ''].filter(Boolean).join(' ');

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
        {multiCompany && (
          <select
            value={company}
            onChange={(e) => {
              setCompany(e.target.value);
              setDepartment('');
            }}
            className={`${controlClass} w-48`}
            aria-label="会社で絞り込み"
          >
            <option value="">すべての会社</option>
            {companies.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className={`${controlClass} w-48`}
          aria-label="部署で絞り込み"
        >
          <option value="">すべての部署</option>
          {departmentOptions.map((d) => (
            <option key={d.id} value={d.id}>
              {multiCompany && company === '' ? `${d.companyName} ` : ''}
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
          placeholder="氏名・フリガナ・番号などで検索"
          title="氏名・略称・フリガナ・社員番号・電話で検索"
          className={`${controlClass} w-64`}
        />
        <button type="button" className={`${btn.primary} ml-auto`} onClick={() => setEditing(null)}>
          ＋ 社員を追加
        </button>
      </div>

      <ErrorBanner message={staff.error ?? departments.error ?? companies.error} />

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
            {rows.map((s) => {
              const [primary, ...others] = s.affiliations;
              return (
                <tr
                  key={s.id}
                  onClick={() => setEditing(s)}
                  className={`cursor-pointer hover:bg-teal-50/50 ${s.retiredOn ? 'text-slate-400' : ''}`}
                >
                  <td className="px-4 py-2 tabular-nums text-slate-500">{s.id}</td>
                  <td className="px-4 py-2 tabular-nums">{s.employeeNo ?? ''}</td>
                  <td className="whitespace-nowrap px-4 py-2 font-medium">
                    <button type="button" className="text-left hover:underline" onClick={() => setEditing(s)}>
                      {s.fullName}
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2">
                    <ShortNameCell staff={s} onSaved={() => void staff.reload()} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-2">{s.nameKana}</td>
                  <td className="px-4 py-2">
                    {primary && affiliationText(primary)}
                    {others.length > 0 && (
                      <span
                        className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600"
                        title={others.map(affiliationText).join('\n')}
                      >
                        ほか{others.length}社
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 tabular-nums">{s.mobilePhone}</td>
                </tr>
              );
            })}
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

      {editing !== undefined && companies.data && (
        <StaffDialog
          staff={editing}
          companies={companies.data}
          departments={departments.data ?? []}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            void staff.reload();
            void departments.reload();
            void companies.reload();
          }}
        />
      )}
    </div>
  );
}
