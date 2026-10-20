import { useState } from 'react';
import { api } from '../api';
import { useLoad } from '../hooks/useLoad';
import { ErrorBanner, btn, inputClass } from '../components/ui';
import type { Department } from '../types';

type Draft = Pick<Department, 'name' | 'sortOrder' | 'active'>;

const EMPTY: Draft = { name: '', sortOrder: 0, active: true };

// 部署の一覧を表のまま直す。行ごとに「保存」。
// 所属のある部署は消せない（退職者の記録も含む）ので、使わなくなったら使用停止にする。
export default function DepartmentsPage() {
  const departments = useLoad(api.listDepartments);
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [adding, setAdding] = useState<Draft>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const draftOf = (d: Department): Draft => drafts[d.id] ?? d;
  const edit = (id: number, base: Draft, patch: Partial<Draft>) =>
    setDrafts((all) => ({ ...all, [id]: { ...base, ...patch } }));
  const discardDraft = (id: number) =>
    setDrafts((all) => {
      const next = { ...all };
      delete next[id];
      return next;
    });

  async function run(action: () => Promise<unknown>, after?: () => void) {
    try {
      await action();
      setError(null);
      after?.();
      await departments.reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <ErrorBanner message={error ?? departments.error} />
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-2 font-medium">部署名</th>
              <th className="w-24 px-4 py-2 font-medium">表示順</th>
              <th className="w-28 px-4 py-2 font-medium">使用</th>
              <th className="w-20 px-4 py-2 text-right font-medium">在籍</th>
              <th className="w-40 px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {departments.data?.map((d) => {
              const draft = draftOf(d);
              return (
                <tr key={d.id} className={draft.active ? '' : 'text-slate-400'}>
                  <td className="px-4 py-2">
                    <input
                      className={inputClass}
                      value={draft.name}
                      onChange={(e) => edit(d.id, draft, { name: e.target.value })}
                      aria-label="部署名"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      className={inputClass}
                      value={draft.sortOrder}
                      onChange={(e) => edit(d.id, draft, { sortOrder: Number(e.target.value) })}
                      aria-label="表示順"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={draft.active}
                        onChange={(e) => edit(d.id, draft, { active: e.target.checked })}
                      />
                      {draft.active ? '使用中' : '停止'}
                    </label>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{d.staffCount}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-right">
                    <button
                      type="button"
                      className={btn.secondary}
                      disabled={!(d.id in drafts)}
                      onClick={() => run(() => api.updateDepartment(d.id, draft), () => discardDraft(d.id))}
                    >
                      保存
                    </button>
                    <button
                      type="button"
                      className={btn.danger}
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
          </tbody>
        </table>
      </div>

      <form
        className="flex items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void run(() => api.createDepartment(adding), () => setAdding(EMPTY));
        }}
      >
        <input
          className={`${inputClass} max-w-xs`}
          placeholder="新しい部署名"
          value={adding.name}
          onChange={(e) => setAdding({ ...adding, name: e.target.value })}
          required
        />
        <input
          type="number"
          className={`${inputClass} w-24`}
          aria-label="表示順"
          value={adding.sortOrder}
          onChange={(e) => setAdding({ ...adding, sortOrder: Number(e.target.value) })}
        />
        <button type="submit" className={btn.primary}>
          ＋ 部署を追加
        </button>
      </form>
    </div>
  );
}
