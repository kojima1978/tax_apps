import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useLoad } from '../hooks/useLoad';
import { useLeaveGuard } from '../hooks/useLeaveGuard';
import { useReorder } from '../hooks/useReorder';
import { DragHandle, ErrorBanner, ReorderBar, btn, controlClass, inputClass } from '../components/ui';
import type { Company, Department } from '../types';

type Draft = Pick<Department, 'name' | 'active'>;

// 直した行だけ持つ。元と同じ値に戻したら変更なしとみなす（打って消しただけで「変更あり」にしない）
const isChanged = (d: Department, draft: Draft | undefined) =>
  draft !== undefined && (draft.name !== d.name || draft.active !== d.active);

// 部署の一覧を表のまま直し、上の帯の「変更を保存」でまとめて確定する。
// 部署は会社にぶら下がる（A社の会計部とB社の会計部は別物）ので、会社ごとに表を分け、
// 並べ替え（⠿ をドラッグして「並び順を保存」）も追加もその会社の中で行う。
// 会社は作るときに決め、後から変えない（所属している人の会社と食い違うため。
// 移すなら新しい会社に部署を作って人を付け替える）。
// 所属のある部署は消せない（退職者の記録も含む）ので、使わなくなったら使用停止にする。
export default function DepartmentsPage() {
  const departments = useLoad(api.listDepartments);
  const companies = useLoad(api.listCompanies);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [savingDrafts, setSavingDrafts] = useState(false);
  // 会社ごとの「並びを動かしたまま保存していない」
  const [orderDirty, setOrderDirty] = useState<Record<number, boolean>>({});

  const multiCompany = (companies.data?.length ?? 0) > 1;
  const all = departments.data ?? [];
  const changed = all.filter((d) => isChanged(d, drafts[d.id]));
  const sortableAny = (companies.data ?? []).some((c) => all.filter((d) => d.companyId === c.id).length > 1);

  useLeaveGuard(changed.length > 0 || Object.values(orderDirty).some(Boolean));

  const reportOrderDirty = useCallback(
    (companyId: number, dirty: boolean) => setOrderDirty((m) => (m[companyId] === dirty ? m : { ...m, [companyId]: dirty })),
    [],
  );

  const draftOf = (d: Department): Draft => drafts[d.id] ?? { name: d.name, active: d.active };
  const edit = (d: Department, patch: Partial<Draft>) => setDrafts((m) => ({ ...m, [d.id]: { ...draftOf(d), ...patch } }));

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

  // 1件ずつ順に送り、通った行の下書きだけ消す。途中で断られたら、そこから先は手元に残して理由を出す
  async function saveDrafts() {
    setSavingDrafts(true);
    const saved: number[] = [];
    try {
      for (const d of changed) {
        const draft = drafts[d.id];
        await api.updateDepartment(d.id, { ...draft, companyId: d.companyId });
        saved.push(d.id);
      }
      setError(null);
    } catch (err) {
      const failed = changed[saved.length];
      setError(`部署「${drafts[failed.id].name || failed.name}」: ${(err as Error).message}`);
    } finally {
      setDrafts((m) => {
        const next = { ...m };
        for (const id of saved) delete next[id];
        return next;
      });
      await departments.reload();
      setSavingDrafts(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <p className="text-sm text-slate-500">
        {sortableAny && '⠿ をドラッグして並べ替えられます。'}
        所属している人がいる部署は削除できないので、使わなくなったら「使用」を外してください。
      </p>
      <ErrorBanner message={error ?? departments.error ?? companies.error} />
      {changed.length > 0 && (
        <div className="sticky top-0 z-10 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 shadow-sm">
          <span>{changed.length}件の部署を直しました。保存するまで反映されません。</span>
          <button type="button" className={`${btn.secondary} ml-auto`} onClick={() => setDrafts({})} disabled={savingDrafts}>
            元に戻す
          </button>
          <button type="button" className={btn.primary} onClick={() => void saveDrafts()} disabled={savingDrafts}>
            {savingDrafts ? '保存中…' : '変更を保存'}
          </button>
        </div>
      )}
      {companies.data?.map((c) => (
        <CompanySection
          key={c.id}
          company={c}
          showHeading={multiCompany}
          departments={all.filter((d) => d.companyId === c.id)}
          draftOf={draftOf}
          isChanged={(d) => isChanged(d, drafts[d.id])}
          edit={edit}
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
  draftOf,
  isChanged,
  edit,
  run,
  onOrderDirty,
}: {
  company: Company;
  showHeading: boolean;
  departments: Department[];
  draftOf: (d: Department) => Draft;
  isChanged: (d: Department) => boolean;
  edit: (d: Department, patch: Partial<Draft>) => void;
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
              <th className="w-24 px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reorder.sorted.map((d) => {
              const draft = draftOf(d);
              const changed = isChanged(d);
              return (
                <tr
                  key={d.id}
                  {...reorder.rowProps(d.id)}
                  className={`${draft.active ? '' : 'text-slate-400'} ${changed ? 'bg-amber-50' : ''} ${
                    reorder.draggingId === d.id ? 'bg-teal-50 opacity-60' : ''
                  }`}
                >
                  {sortable && (
                    <td className="px-2 py-2 text-center">
                      <DragHandle {...reorder.handleProps(d.id, d.name)} />
                    </td>
                  )}
                  <td className="px-4 py-2">
                    <input
                      className={inputClass}
                      value={draft.name}
                      onChange={(e) => edit(d, { name: e.target.value })}
                      aria-label="部署名"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={draft.active} onChange={(e) => edit(d, { active: e.target.checked })} />
                      {draft.active ? '使用中' : '停止'}
                    </label>
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
                    <button
                      type="button"
                      className={btn.danger}
                      disabled={d.staffCount > 0}
                      title={d.staffCount > 0 ? '在籍者がいる部署は削除できません（使用を外してください）' : undefined}
                      onClick={() => {
                        if (confirm(`部署「${d.name}」を削除しますか？`)) void run(() => api.deleteDepartment(d.id));
                      }}
                    >
                      削除
                    </button>
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
