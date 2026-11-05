import { useState } from 'react';
import { api } from '../api';
import { useLoad } from '../hooks/useLoad';
import { useReorder } from '../hooks/useReorder';
import { DragHandle, ErrorBanner, ReorderBar, btn, controlClass, inputClass } from '../components/ui';
import type { Company, Department } from '../types';

type Draft = Pick<Department, 'name' | 'active'>;

// 部署の一覧を表のまま直す。行ごとに「保存」。
// 部署は会社にぶら下がる（A社の会計部とB社の会計部は別物）ので、会社ごとに表を分け、
// 並べ替え（⠿ をドラッグして「並び順を保存」）も追加もその会社の中で行う。
// 会社は作るときに決め、後から変えない（所属している人の会社と食い違うため。
// 移すなら新しい会社に部署を作って人を付け替える）。
// 所属のある部署は消せない（退職者の記録も含む）ので、使わなくなったら使用停止にする。
export default function DepartmentsPage() {
  const departments = useLoad(api.listDepartments);
  const companies = useLoad(api.listCompanies);
  const [error, setError] = useState<string | null>(null);

  const multiCompany = (companies.data?.length ?? 0) > 1;

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

  return (
    <div className="max-w-3xl space-y-6">
      <p className="text-sm text-slate-500">⠿ をドラッグして並べ替えられます。所属している人がいる部署は削除できないので、使わなくなったら「使用」を外してください。</p>
      <ErrorBanner message={error ?? departments.error ?? companies.error} />
      {companies.data?.map((c) => (
        <CompanySection
          key={c.id}
          company={c}
          showHeading={multiCompany}
          departments={departments.data?.filter((d) => d.companyId === c.id) ?? []}
          run={run}
        />
      ))}
    </div>
  );
}

function CompanySection({
  company,
  showHeading,
  departments,
  run,
}: {
  company: Company;
  showHeading: boolean;
  departments: Department[];
  run: (action: () => Promise<unknown>) => Promise<boolean>;
}) {
  const reorder = useReorder(departments);
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  // 表示順は持たせない（送ると並び替えで振り直した値を古い値で上書きする）
  const draftOf = (d: Department): Draft => drafts[d.id] ?? { name: d.name, active: d.active };
  const edit = (d: Department, patch: Partial<Draft>) =>
    setDrafts((all) => ({ ...all, [d.id]: { ...draftOf(d), ...patch } }));
  const discardDraft = (id: number) =>
    setDrafts((all) => {
      const next = { ...all };
      delete next[id];
      return next;
    });

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
              <th className="w-10 px-2 py-2" aria-label="並べ替え" />
              <th className="px-4 py-2 font-medium">部署名</th>
              <th className="w-28 px-4 py-2 font-medium">使用</th>
              <th className="w-20 px-4 py-2 text-right font-medium">在籍</th>
              <th className="w-40 px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reorder.sorted.map((d) => {
              const draft = draftOf(d);
              const changed = d.id in drafts;
              return (
                <tr
                  key={d.id}
                  {...reorder.rowProps(d.id)}
                  className={`${draft.active ? '' : 'text-slate-400'} ${reorder.draggingId === d.id ? 'bg-teal-50 opacity-60' : ''}`}
                >
                  <td className="px-2 py-2 text-center">
                    <DragHandle {...reorder.handleProps(d.id, d.name)} />
                  </td>
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
                  <td className="px-4 py-2 text-right tabular-nums">{d.staffCount}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-right">
                    <button
                      type="button"
                      className={changed ? btn.primary : btn.secondary}
                      disabled={!changed}
                      onClick={async () => {
                        if (await run(() => api.updateDepartment(d.id, { ...draft, companyId: d.companyId }))) discardDraft(d.id);
                      }}
                    >
                      保存
                    </button>
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
                <td colSpan={5} className="px-4 py-3 text-slate-400">
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
