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
import { fetchWorkloads, indexWorkloads, primaryActive, retiredWithWorkload, withWorkload, workloadLines, workloadTitle } from '../workload';
import { formatRetireDate, jstToday, retireCountdown, retirementState, scheduledRetirees, type RetirementState } from '../retirement';

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
// 担当は各アプリの担当件数（進行中）の合計。押すと多い順から
const COLUMNS: { label: string; width?: string; sortKey?: SortKey; right?: boolean }[] = [
  { label: '社員番号', width: 'w-28', sortKey: 'employeeNo' },
  { label: '氏名', width: 'w-40' },
  { label: 'フリガナ', width: 'w-48', sortKey: 'kana' },
  { label: '所属', sortKey: 'affiliation' },
  { label: '担当', width: 'w-24', sortKey: 'workload', right: true },
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
  // 担当（進行中）の残っている人だけに絞る（?assigned=1。「退職者の担当あり」のチップから）
  const assignedOnly = params.get('assigned') === '1';
  // 退職予定（退職日が今日以降でまだ在籍）の人だけに絞る（?retiring=1）
  const retiringOnly = params.get('retiring') === '1';
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
  // 「退職者の担当あり」は退職の一覧、「退職予定」は在籍の一覧のための絞り込みなので、切り替えたら外す
  const setStatus = (v: StaffStatus) => setParam({ status: v === 'active' ? '' : v, assigned: '', retiring: '' });
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
  // 担当件数は各アプリから（読めないアプリは「—」。一覧の表示は待たない）
  const workloads = useLoad(fetchWorkloads);
  const workloadIndex = useMemo(() => indexWorkloads(workloads.data ?? []), [workloads.data]);
  // 「退職者の担当あり」はどのタブでも数えて出す（在籍の一覧を見ているときにも気づけるように）
  const loadRetired = useCallback(() => api.listStaff('retired'), []);
  const retired = useLoad(loadRetired);
  const retiredAssigned = useMemo(() => retiredWithWorkload(retired.data ?? [], workloadIndex), [retired.data, workloadIndex]);

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
      workload: (id: number) => primaryActive(workloadIndex, id),
    }),
    [companies.data, departments.data, workloadIndex],
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
  // 日付が変わったら判定も変わるので、描画のたびに日本時間の今日を取る
  const today = jstToday();
  const retiring = useMemo(() => scheduledRetirees(matched, today), [matched, today]);
  const retiringAssigned = useMemo(() => withWorkload(retiring, workloadIndex), [retiring, workloadIndex]);

  const rows = useMemo(
    () =>
      sortStaff(
        matched.filter(
          (s) =>
            (!missing || isMissing(s, missing)) &&
            (!assignedOnly || (primaryActive(workloadIndex, s.id) ?? 0) > 0) &&
            (!retiringOnly || retirementState(s.retiredOn, today) === 'scheduled'),
        ),
        sort,
        sortOrder,
      ),
    [matched, missing, assignedOnly, retiringOnly, today, workloadIndex, sort.key, sort.desc, sortOrder],
  );

  // 所属で並べているときだけ、部署が変わる行に小見出しを入れる（ほかの並びでは部署が飛び飛びになり、見出しだらけになる）
  const groups = useMemo(
    (): (StaffGroup | { key: ''; staff: Staff[] })[] => (sort.key === 'affiliation' ? groupByDepartment(rows) : [{ key: '', staff: rows }]),
    [rows, sort.key],
  );

  const total = staff.data?.length ?? 0;
  const filtered = company !== '' || department !== '' || query.trim() !== '' || missing !== null || assignedOnly || retiringOnly;
  const retiredChipActive = status === 'retired' && assignedOnly;
  const statusLabel = STATUS_TABS.find((t) => t.value === status)!.label;

  // 「保存して次の人へ」: 保存する前の一覧（絞り込み・並び）で次の人を決め、読み直した値で開く ──
  // 未入力で絞っていると、直した人は読み直した一覧から消えるため
  async function handleSaved(next: boolean) {
    const nextId = next && editing ? nextStaffId(rows, editing.id) : null;
    const [fresh] = await Promise.all([staff.reload(), departments.reload(), companies.reload(), retired.reload()]);
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
      <ErrorBanner message={staff.error ?? departments.error ?? companies.error ?? retired.error} />

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
          {(retiring.length > 0 || retiringOnly) && (
            <button
              type="button"
              aria-pressed={retiringOnly}
              onClick={() => setParam({ retiring: retiringOnly ? '' : '1' })}
              title={
                retiringOnly
                  ? '押すと絞り込みを解除'
                  : '退職日が決まっていて、まだ在籍している人だけを出します（退職日の翌日から退職の一覧へ移ります）'
              }
              className={`rounded-full px-2.5 py-0.5 text-xs ring-1 ${
                retiringOnly ? 'bg-orange-600 text-white ring-orange-600' : 'bg-orange-50 text-orange-800 ring-orange-200 hover:bg-orange-100'
              } ${retiringAssigned.length > 0 ? 'font-medium' : ''}`}
            >
              退職予定 {retiring.length}名{retiringAssigned.length > 0 && `（担当あり ${retiringAssigned.length}名）`}
              {retiringOnly && ' ✕'}
            </button>
          )}
          {(retiredAssigned.length > 0 || retiredChipActive) && (
            <button
              type="button"
              aria-pressed={retiredChipActive}
              onClick={() => setParam(retiredChipActive ? { assigned: '' } : { status: 'retired', assigned: '1' })}
              title={
                retiredChipActive
                  ? '押すと絞り込みを解除'
                  : '退職した人のうち、まだ担当の案件（進行中）が残っている人だけを出します。引き継ぎ先は各アプリで決めてください'
              }
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${
                retiredChipActive ? 'bg-rose-600 text-white ring-rose-600' : 'bg-rose-50 text-rose-800 ring-rose-300 hover:bg-rose-100'
              }`}
            >
              退職者の担当あり {retiredAssigned.length}名{retiredChipActive && ' ✕'}
            </button>
          )}
          {workloadIndex.unreachable.length > 0 && (
            <span className="ml-auto text-xs text-slate-500" title="止まっているか、3秒で返事がありませんでした。担当の数にはこのアプリの分が入っていません">
              担当件数を読めないアプリ: {workloadIndex.unreachable.map((s) => s.label).join('・')}（—）
            </span>
          )}
        </div>

        {/* 幅のある画面はページごとスクロールし、見出しをページの上端に残す。
            狭い画面は表を横にずらすので、表の枠の中で縦にもスクロールさせて見出しを残す */}
        <div className="overflow-x-auto max-lg:max-h-[75dvh] lg:overflow-visible">
          <table className="w-full min-w-[54rem] table-fixed text-sm">
            <thead className="text-left text-xs text-slate-500">
              <tr>
                {COLUMNS.map((c) => {
                  const active = c.sortKey !== undefined && sort.key === c.sortKey;
                  return (
                    <th
                      key={c.label}
                      className={`${c.width ?? ''} ${c.right ? 'text-right' : ''} sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-4 py-2 font-medium shadow-[inset_0_-1px_0_var(--color-slate-200)]`}
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
                const state = retirementState(s.retiredOn, today);
                return (
                  <tr
                    key={s.id}
                    onClick={() => setEditing(s)}
                    className={`cursor-pointer hover:bg-teal-50/50 ${state === 'retired' ? 'text-slate-400' : ''}`}
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
                      {state === 'scheduled' && s.retiredOn && (
                        <span
                          className="ml-2 whitespace-nowrap rounded bg-orange-50 px-1.5 py-0.5 text-xs text-orange-800 ring-1 ring-orange-200"
                          title={`退職日 ${s.retiredOn}（${retireCountdown(s.retiredOn, today)}）。その日までは在籍です`}
                        >
                          {formatRetireDate(s.retiredOn, today)} 退職予定
                        </span>
                      )}
                    </td>
                    <WorkloadCell n={workloads.data ? primaryActive(workloadIndex, s.id) : undefined} state={state} title={workloads.data ? workloadTitle(workloadLines(workloadIndex, s.id)) : '担当件数を読んでいます'} />
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
          workload={editing && workloads.data ? workloadLines(workloadIndex, editing.id) : undefined}
          position={editingIndex >= 0 ? `${rows.length}名中 ${editingIndex + 1}人目` : undefined}
        />
      )}
    </div>
  );
}

// 担当の件数。undefined = 読んでいる途中、null = どのアプリも読めない（「—」）。
// 退職した人に残っている担当は赤（引き継ぎ漏れ）、退職予定の人に残っている担当は橙（引き継ぎの準備）で出す
function WorkloadCell({ n, state, title }: { n: number | null | undefined; state: RetirementState; title: string }) {
  const left = (n ?? 0) > 0;
  const tone =
    left && state === 'retired' ? 'font-semibold text-rose-700' : left && state === 'scheduled' ? 'font-semibold text-orange-700' : n === 0 ? 'text-slate-400' : '';
  return (
    <td className={`px-4 py-2.5 text-right tabular-nums ${tone}`} title={title}>
      {n === undefined ? '' : n === null ? '—' : `${n}件`}
    </td>
  );
}
