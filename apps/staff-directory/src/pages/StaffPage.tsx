import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useLoad } from '../hooks/useLoad';
import { normalizeQuery } from '../lib';
import { ErrorBanner, btn, controlClass } from '../components/ui';
import StaffDialog from '../components/StaffDialog';
import { formatSort, parseSort, sortStaff, toggleSort, DEFAULT_SORT, type SortKey } from '../staffSort';
import {
  MISSING_KEYS,
  MISSING_LABEL,
  countMissing,
  groupByDepartment,
  isMissing,
  nextStaffId,
  parseMissing,
  type StaffGroup,
} from '../staffList';
import type { Affiliation, Staff, StaffStatus } from '../types';

const STATUS_TABS: { value: StaffStatus; label: string }[] = [
  { value: 'active', label: '在籍' },
  { value: 'retired', label: '退職' },
  { value: 'all', label: 'すべて' },
];

// 部署の絞り込み: '' = すべて、'none' = 未所属（会社を選んでいればその会社の中で）、それ以外は部署 id
const NO_DEPARTMENT = 'none';

// 表はヘッダーと同じ幅のカードに収める。中身の長さが決まっている列は幅を固定し、
// 残りは所属（兼務で長くなる）に回す ── 均等に割ると短い列の間ばかり空いて行を追いにくい
// 見出しを押すと並び替える列は sortKey を持つ（氏名は漢字の文字コード順にしかならないので持たせない）
const COLUMNS: { label: string; width?: string; sortKey?: SortKey }[] = [
  { label: '社員番号', width: 'w-28', sortKey: 'employeeNo' },
  { label: '氏名', width: 'w-40' },
  { label: 'フリガナ', width: 'w-48', sortKey: 'kana' },
  { label: '所属', sortKey: 'affiliation' },
  { label: '携帯電話', width: 'w-36' },
];

const isStatus = (v: string | null): v is StaffStatus => STATUS_TABS.some((t) => t.value === v);

// 会社・部署の絞り込みは主所属に限らず、どれか1つの所属が当たれば出す（兼務先からも探せるように）
function matchesAffiliation(s: Staff, company: string, department: string): boolean {
  const inCompany = (a: Affiliation) => company === '' || String(a.companyId) === company;
  if (department === '') return company === '' || s.affiliations.some(inCompany);
  if (department === NO_DEPARTMENT) {
    return company === '' ? s.affiliations.every((a) => a.departmentId === null) : s.affiliations.some((a) => inCompany(a) && a.departmentId === null);
  }
  return s.affiliations.some((a) => String(a.departmentId) === department);
}

// 絞り込み・検索語・並びは URL に持つ（再読み込みや「戻る」で消さない。部署・会社の在籍数からもここへ飛ぶ）。
// 既定の値は URL に書かない
export default function StaffPage() {
  const [params, setParams] = useSearchParams();
  const statusParam = params.get('status');
  const status: StaffStatus = isStatus(statusParam) ? statusParam : 'active';
  const company = params.get('company') ?? '';
  const department = params.get('department') ?? '';
  // 検索欄は手元の state を正にして URL へ写す。URL の更新は遷移として遅れて届くことがあり、
  // それを入力欄の値にすると日本語入力の変換中に文字が巻き戻る
  const [query, setQueryState] = useState(() => params.get('q') ?? '');
  const sort = parseSort(params.get('sort'));
  // 未入力の人だけに絞る（?missing=kana など。押すたびに切り替え）
  const missing = parseMissing(params.get('missing'));
  // 1文字打つたびに履歴が積まれないよう、置き換えで書く
  const setParam = (patch: Record<string, string>) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(patch)) {
          if (v === '') next.delete(k);
          else next.set(k, v);
        }
        return next;
      },
      { replace: true },
    );
  const setStatus = (v: StaffStatus) => setParam({ status: v === 'active' ? '' : v });
  const setQuery = (v: string) => {
    setQueryState(v);
    setParam({ q: v.trim() === '' ? '' : v });
  };
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

  const sortOrder = useMemo(
    () => ({
      company: new Map((companies.data ?? []).map((c) => [c.id, c.sortOrder])),
      department: new Map((departments.data ?? []).map((d) => [d.id, d.sortOrder])),
    }),
    [companies.data, departments.data],
  );

  // 会社・部署・検索語で絞った人。未入力の数はここから数える（未入力の絞り込みを掛ける前）
  const matched = useMemo(() => {
    const q = normalizeQuery(query);
    return (staff.data ?? []).filter((s) => {
      if (!matchesAffiliation(s, company, department)) return false;
      if (!q) return true;
      return [s.fullName, s.shortName, s.nameKana, s.mobilePhone, ...s.affiliations.map((a) => a.employeeNo ?? '')].some((v) =>
        normalizeQuery(v).includes(q),
      );
    });
  }, [staff.data, company, department, query]);

  const missingCounts = useMemo(() => countMissing(matched), [matched]);

  const rows = useMemo(
    () => sortStaff(missing ? matched.filter((s) => isMissing(s, missing)) : matched, sort, sortOrder),
    [matched, missing, sort.key, sort.desc, sortOrder],
  );

  // 所属で並べているときだけ、部署が変わる行に小見出しを入れる（ほかの並びでは部署が飛び飛びになり、見出しだらけになる）
  const groups = useMemo(
    (): (StaffGroup | { key: ''; staff: Staff[] })[] => (sort.key === 'affiliation' ? groupByDepartment(rows) : [{ key: '', staff: rows }]),
    [rows, sort.key],
  );

  const total = staff.data?.length ?? 0;
  const filtered = company !== '' || department !== '' || query.trim() !== '' || missing !== null;
  const statusLabel = STATUS_TABS.find((t) => t.value === status)!.label;

  // 「保存して次の人へ」: 保存する前の一覧（絞り込み・並び）で次の人を決め、読み直した値で開く ──
  // 未入力で絞っていると、直した人は読み直した一覧から消えるため
  async function handleSaved(next: boolean) {
    const nextId = next && editing ? nextStaffId(rows, editing.id) : null;
    const [fresh] = await Promise.all([staff.reload(), departments.reload(), companies.reload()]);
    setEditing(nextId === null ? undefined : (fresh?.find((s) => s.id === nextId) ?? undefined));
  }
  const editingIndex = editing ? rows.findIndex((s) => s.id === editing.id) : -1;

  const affiliationText = (a: Affiliation) =>
    [multiCompany ? a.companyName : '', a.departmentName ?? ''].filter(Boolean).join(' ');

  // 部署の小見出し（主所属）。会社が1つなら部署名だけ
  const groupLabel = (g: StaffGroup) =>
    g.companyName === null ? '所属なし' : [multiCompany ? g.companyName : '', g.departmentName ?? '未所属'].filter(Boolean).join(' ');

  return (
    <div className="space-y-4">
      <ErrorBanner message={staff.error ?? departments.error ?? companies.error} />

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3">
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
              onChange={(e) => setParam({ company: e.target.value, department: '' })}
              className={`${controlClass} w-44`}
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
            onChange={(e) => setParam({ department: e.target.value })}
            className={`${controlClass} w-44`}
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
            className={`${controlClass} w-56`}
          />
          <button type="button" className={`${btn.primary} ml-auto`} onClick={() => setEditing(null)}>
            ＋ 社員を追加
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-slate-200 px-4 py-2 text-sm">
          <span className="font-medium tabular-nums text-slate-700" aria-live="polite">
            {statusLabel} {total}名{filtered && `中 ${rows.length}名`}
          </span>
          {MISSING_KEYS.map((k) => {
            const active = missing === k;
            // 0人なら出さない。ただし絞り込み中のものは、全員埋め終わっても解除できるように残す
            if (missingCounts[k] === 0 && !active) return null;
            return (
              <button
                key={k}
                type="button"
                aria-pressed={active}
                onClick={() => setParam({ missing: active ? '' : k })}
                title={active ? '押すと絞り込みを解除' : 'この人だけに絞り込む'}
                className={`rounded-full px-2.5 py-0.5 text-xs ring-1 ${
                  active ? 'bg-amber-600 text-white ring-amber-600' : 'bg-amber-50 text-amber-800 ring-amber-200 hover:bg-amber-100'
                }`}
              >
                {MISSING_LABEL[k]} {missingCounts[k]}名{active && ' ✕'}
              </button>
            );
          })}
        </div>

        {/* 幅のある画面はページごとスクロールし、見出しをページの上端に残す。
            狭い画面は表を横にずらすので、表の枠の中で縦にもスクロールさせて見出しを残す */}
        <div className="overflow-x-auto max-lg:max-h-[75dvh] lg:overflow-visible">
          <table className="w-full min-w-[48rem] table-fixed text-sm">
            <thead className="text-left text-xs text-slate-500">
              <tr>
                {COLUMNS.map((c) => {
                  const active = c.sortKey !== undefined && sort.key === c.sortKey;
                  return (
                    <th
                      key={c.label}
                      className={`${c.width ?? ''} sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-4 py-2 font-medium shadow-[inset_0_-1px_0_var(--color-slate-200)]`}
                      aria-sort={active ? (sort.desc ? 'descending' : 'ascending') : undefined}
                    >
                      {c.sortKey ? (
                        <button
                          type="button"
                          className={`inline-flex items-center gap-1 hover:text-slate-800 ${active ? 'text-teal-700' : ''}`}
                          title="押すと並び替え（もう一度押すと逆順）"
                          onClick={() => {
                            const next = toggleSort(sort, c.sortKey!);
                            const isDefault = next.key === DEFAULT_SORT.key && next.desc === DEFAULT_SORT.desc;
                            setParam({ sort: isDefault ? '' : formatSort(next) });
                          }}
                        >
                          {c.label}
                          <span aria-hidden className={active ? '' : 'text-slate-300'}>
                            {active && sort.desc ? '▼' : '▲'}
                          </span>
                        </button>
                      ) : (
                        c.label
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {groups.map((g) => [
                'companyName' in g && (
                  <tr key={`group-${g.key}`} className="bg-slate-100/70">
                    <th colSpan={COLUMNS.length} scope="colgroup" className="px-4 py-1.5 text-left text-xs font-semibold text-slate-600">
                      {groupLabel(g)}
                      <span className="ml-2 font-normal text-slate-500">{g.staff.length}名</span>
                    </th>
                  </tr>
                ),
                ...g.staff.map((s) => {
                const [primary, ...others] = s.affiliations;
                return (
                  <tr
                    key={s.id}
                    onClick={() => setEditing(s)}
                    className={`cursor-pointer hover:bg-teal-50/50 ${s.retiredOn ? 'text-slate-400' : ''}`}
                  >
                    <td className="px-4 py-2.5 tabular-nums">{s.employeeNo ?? ''}</td>
                    <td className="truncate px-4 py-2.5 font-medium" title={s.fullName}>
                      <button type="button" className="text-left hover:underline" onClick={() => setEditing(s)}>
                        {s.fullName}
                      </button>
                    </td>
                    <td className="truncate px-4 py-2" title={s.nameKana}>
                      {s.nameKana}
                    </td>
                    <td className="px-4 py-2.5">
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
                    <td className="px-4 py-2.5 tabular-nums">{s.mobilePhone}</td>
                  </tr>
                );
                }),
              ])}
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
      </div>

      {editing !== undefined && companies.data && (
        <StaffDialog
          // 次の人へ移るときは作り直す（入力欄・変更の有無を前の人から持ち越さない）
          key={editing?.id ?? 'new'}
          staff={editing}
          companies={companies.data}
          departments={departments.data ?? []}
          onClose={() => setEditing(undefined)}
          onSaved={(next) => void handleSaved(next)}
          hasNext={editing !== null && nextStaffId(rows, editing.id) !== null}
          position={editingIndex >= 0 ? `${rows.length}名中 ${editingIndex + 1}人目` : undefined}
        />
      )}
    </div>
  );
}
