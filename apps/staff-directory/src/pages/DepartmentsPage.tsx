import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useLoad } from '../hooks/useLoad';
import { useLeaveGuard } from '../hooks/useLeaveGuard';
import { useReorder } from '../hooks/useReorder';
import { DragHandle, ErrorBanner, ReorderBar, btn, controlClass, inputClass } from '../components/ui';
import type { Company, Department } from '../types';

// 修正中の1行。id で元の部署を引き、値は手元で持つ
type Editing = Pick<Department, 'id' | 'name' | 'active'>;

// 修正中の行に元と違う値があるか（打って消しただけなら変更なし）
const isDirty = (e: Editing | null, all: Department[]) => {
  if (!e) return false;
  const d = all.find((x) => x.id === e.id);
  return d !== undefined && (d.name !== e.name || d.active !== e.active);
};

// 部署の一覧。普段は読むだけで、「修正」を押した1行だけが入力欄に変わる（誤って書き換えないため）。
// 部署は会社にぶら下がる（A社の会計部とB社の会計部は別物）ので、会社ごとに表を分け、
// 並べ替え（⠿ をドラッグして「並び順を保存」）も追加もその会社の中で行う。
// 会社は作るときに決め、後から変えない（所属している人の会社と食い違うため。
// 移すなら新しい会社に部署を作って人を付け替える）。
// 所属のある部署は消せない（退職者の記録も含む）ので、使わなくなったら使用停止にする。
export default function DepartmentsPage() {
  const departments = useLoad(api.listDepartments);
  const companies = useLoad(api.listCompanies);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  // 会社ごとの「並びを動かしたまま保存していない」
  const [orderDirty, setOrderDirty] = useState<Record<number, boolean>>({});

  const multiCompany = (companies.data?.length ?? 0) > 1;
  const all = departments.data ?? [];
  const editDirty = isDirty(editing, all);
  const sortableAny = (companies.data ?? []).some((c) => all.filter((d) => d.companyId === c.id).length > 1);

  useLeaveGuard(editDirty || Object.values(orderDirty).some(Boolean));

  const reportOrderDirty = useCallback(
    (companyId: number, dirty: boolean) => setOrderDirty((m) => (m[companyId] === dirty ? m : { ...m, [companyId]: dirty })),
    [],
  );

  // 修正は一度に1行。直しかけの行があれば、捨ててよいか聞いてから開き直す
  function startEdit(d: Department) {
    if (editDirty && !confirm('修正中の部署に保存していない変更があります。破棄しますか？')) return;
    setError(null);
    setEditing({ id: d.id, name: d.name, active: d.active });
  }

  // 成功したら一覧を読み直す。失敗はページ上部に出す
  async function run(action: () => Promise<unknown>): Promise<boolean> {
    try {
      await action();
      setError(null);
      await departments.reload();
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    }
  }

  async function saveEdit() {
    if (!editing || savingEdit) return;
    const d = all.find((x) => x.id === editing.id);
    if (!d) return;
    // 変えていなければ送らずに閉じる
    if (!editDirty) {
      setEditing(null);
      return;
    }
    setSavingEdit(true);
    const ok = await run(() =>
      api.updateDepartment(d.id, { name: editing.name, active: editing.active, companyId: d.companyId }),
    );
    setSavingEdit(false);
    // 断られたら入力はそのまま残して直せるようにする
    if (ok) setEditing(null);
  }

  return (
    <div className="max-w-3xl space-y-6">
      <p className="text-sm text-slate-500">
        {sortableAny && '⠿ をドラッグして並べ替えられます。'}
        所属している人がいる部署は削除できないので、使わなくなったら「修正」から「使用」を外してください。
      </p>
      <ErrorBanner message={error ?? departments.error ?? companies.error} />
      {companies.data?.map((c) => (
        <CompanySection
          key={c.id}
          company={c}
          showHeading={multiCompany}
          departments={all.filter((d) => d.companyId === c.id)}
          editing={editing}
          savingEdit={savingEdit}
          onStartEdit={startEdit}
          onChangeEdit={(patch) => setEditing((e) => (e ? { ...e, ...patch } : e))}
          onSaveEdit={() => void saveEdit()}
          onCancelEdit={() => setEditing(null)}
          run={run}
          onOrderDirty={reportOrderDirty}
        />
      ))}
    </div>
  );
}

function CompanySection({
  company,
  showHeading,
  departments,
  editing,
  savingEdit,
  onStartEdit,
  onChangeEdit,
  onSaveEdit,
  onCancelEdit,
  run,
  onOrderDirty,
}: {
  company: Company;
  showHeading: boolean;
  departments: Department[];
  editing: Editing | null;
  savingEdit: boolean;
  onStartEdit: (d: Department) => void;
  onChangeEdit: (patch: Partial<Pick<Department, 'name' | 'active'>>) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  run: (action: () => Promise<unknown>) => Promise<boolean>;
  onOrderDirty: (companyId: number, dirty: boolean) => void;
}) {
  const reorder = useReorder(departments);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  // 1件しか無い会社には並べ替えるものが無いので、つまみを出さない
  const sortable = departments.length > 1;
  const columns = sortable ? 5 : 4;

  // 画面を離れるときの確認は親が1つだけ持つ（useBlocker はルーターに1つまで）
  useEffect(() => {
    onOrderDirty(company.id, reorder.dirty);
  }, [company.id, reorder.dirty, onOrderDirty]);

  async function saveOrder() {
    setSaving(true);
    if (await run(() => api.reorderDepartments(company.id, reorder.ids))) reorder.reset();
    setSaving(false);
  }

  return (
    <section className="space-y-2">
      {showHeading && <h2 className="text-base font-bold text-slate-700">{company.name}</h2>}
      <ReorderBar dirty={reorder.dirty} saving={saving} onSave={() => void saveOrder()} onReset={reorder.reset} />
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              {sortable && <th className="w-10 px-2 py-2" aria-label="並べ替え" />}
              <th className="px-4 py-2 font-medium">部署名</th>
              <th className="w-28 px-4 py-2 font-medium">使用</th>
              <th className="w-20 px-4 py-2 text-right font-medium">在籍</th>
              <th className="w-36 px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reorder.sorted.map((d) => {
              const row = editing?.id === d.id ? editing : null;
              const active = row ? row.active : d.active;
              return (
                <tr
                  key={d.id}
                  {...reorder.rowProps(d.id)}
                  className={`${active ? '' : 'text-slate-400'} ${row ? 'bg-amber-50' : ''} ${
                    reorder.draggingId === d.id ? 'bg-teal-50 opacity-60' : ''
                  }`}
                >
                  {sortable && (
                    <td className="px-2 py-2 text-center">
                      <DragHandle {...reorder.handleProps(d.id, d.name)} />
                    </td>
                  )}
                  <td className="px-4 py-2">
                    {row ? (
                      <input
                        className={inputClass}
                        value={row.name}
                        onChange={(e) => onChangeEdit({ name: e.target.value })}
                        onKeyDown={(e) => {
                          // 変換確定の Enter では保存しない
                          if (e.nativeEvent.isComposing) return;
                          if (e.key === 'Enter') onSaveEdit();
                          if (e.key === 'Escape') onCancelEdit();
                        }}
                        aria-label="部署名"
                        autoFocus
                      />
                    ) : (
                      <span className="block py-1.5">{d.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {row ? (
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={row.active} onChange={(e) => onChangeEdit({ active: e.target.checked })} />
                        {row.active ? '使用中' : '停止'}
                      </label>
                    ) : d.active ? (
                      '使用中'
                    ) : (
                      '停止'
                    )}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {d.staffCount > 0 ? (
                      <Link
                        to={`/?department=${d.id}`}
                        className="text-teal-700 hover:underline"
                        title="この部署の在籍者を社員一覧で見る"
                      >
                        {d.staffCount}
                      </Link>
                    ) : (
                      0
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right">
                    {row ? (
                      <div className="flex justify-end gap-2">
                        <button type="button" className={btn.secondary} onClick={onCancelEdit} disabled={savingEdit}>
                          キャンセル
                        </button>
                        <button type="button" className={btn.primary} onClick={onSaveEdit} disabled={savingEdit}>
                          {savingEdit ? '保存中…' : '保存'}
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <button type="button" className={btn.secondary} onClick={() => onStartEdit(d)}>
                          修正
                        </button>
                        <button
                          type="button"
                          className={btn.danger}
                          disabled={d.staffCount > 0}
                          title={d.staffCount > 0 ? '在籍者がいる部署は削除できません（修正から使用を外してください）' : undefined}
                          onClick={() => {
                            if (confirm(`部署「${d.name}」を削除しますか？`)) void run(() => api.deleteDepartment(d.id));
                          }}
                        >
                          削除
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {departments.length === 0 && (
              <tr>
                <td colSpan={columns} className="px-4 py-3 text-slate-400">
                  部署はまだありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <form
        className="flex items-center gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await run(() => api.createDepartment({ companyId: company.id, name: newName, active: true }))) setNewName('');
        }}
      >
        <input
          className={`${controlClass} w-64`}
          placeholder="新しい部署名"
          aria-label={`${company.name}に足す部署名`}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          required
        />
        <button type="submit" className={btn.secondary}>
          ＋ 部署を追加
        </button>
        <span className="text-xs text-slate-500">末尾に追加されます</span>
      </form>
    </section>
  );
}
