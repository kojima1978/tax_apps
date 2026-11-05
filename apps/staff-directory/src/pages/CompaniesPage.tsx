import { useRef, useState, type FormEvent } from 'react';
import { api } from '../api';
import { useLoad } from '../hooks/useLoad';
import { useReorder } from '../hooks/useReorder';
import { DragHandle, ErrorBanner, Field, Modal, ReorderBar, btn, inputClass } from '../components/ui';
import type { Company, CompanyForm } from '../types';

const FIELDS: { key: keyof CompanyForm; label: string; hint?: string; wide?: boolean }[] = [
  { key: 'name', label: '会社名', wide: true },
  { key: 'shortName', label: '略称', hint: '狭い欄で使う短い名前（空なら会社名）' },
  { key: 'postalCode', label: '郵便番号', hint: '123-4567 の形（〒は付けない）' },
  { key: 'address', label: '住所', wide: true },
  { key: 'phone', label: '代表電話' },
  { key: 'fax', label: 'FAX' },
  { key: 'representative', label: '代表者', hint: '役職と氏名（例: 代表社員 山田太郎）。委任状の受任者欄に刷る', wide: true },
];

const EMPTY: CompanyForm = {
  name: '',
  shortName: '',
  postalCode: '',
  address: '',
  phone: '',
  fax: '',
  representative: '',
};

const COLUMNS = ['会社名', '略称', '代表電話', '部署', '在籍'] as const;

// 関連会社の一覧。帳票に刷る会社の情報もここに持つ。
// 部署や所属の残っている会社は消せない（サーバが理由つきで断る）。
// 並びは ⠿ をドラッグして「並び順を保存」で確定する（先頭の会社が案件管理からの取込先）。
export default function CompaniesPage() {
  const companies = useLoad(api.listCompanies);
  const reorder = useReorder(companies.data ?? []);
  // undefined = 閉じている、null = 新規、Company = 編集
  const [editing, setEditing] = useState<Company | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function saveOrder() {
    setSaving(true);
    try {
      await api.reorderCompanies(reorder.ids);
      setError(null);
      await companies.reload();
      reorder.reset();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-slate-500">⠿ をドラッグして並べ替えられます。先頭の会社が案件管理からの取込先です。</p>
        <button type="button" className={btn.primary} onClick={() => setEditing(null)}>
          ＋ 会社を追加
        </button>
      </div>
      <ErrorBanner message={error ?? companies.error} />
      <ReorderBar dirty={reorder.dirty} saving={saving} onSave={() => void saveOrder()} onReset={reorder.reset} />
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="w-10 px-2 py-2" aria-label="並べ替え" />
              {COLUMNS.map((c) => (
                <th key={c} className="whitespace-nowrap px-4 py-2 font-medium">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reorder.sorted.map((c) => (
              <tr
                key={c.id}
                {...reorder.rowProps(c.id)}
                onClick={() => setEditing(c)}
                className={`cursor-pointer hover:bg-teal-50/50 ${reorder.draggingId === c.id ? 'bg-teal-50 opacity-60' : ''}`}
              >
                <td className="px-2 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                  <DragHandle {...reorder.handleProps(c.id, c.name)} />
                </td>
                <td className="px-4 py-2 font-medium">
                  <button type="button" className="text-left hover:underline" onClick={() => setEditing(c)}>
                    {c.name}
                  </button>
                </td>
                <td className="px-4 py-2">{c.shortName}</td>
                <td className="px-4 py-2 tabular-nums">{c.phone}</td>
                <td className="px-4 py-2 tabular-nums">{c.departmentCount}</td>
                <td className="px-4 py-2 tabular-nums">{c.staffCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing !== undefined && (
        <CompanyDialog
          company={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            void companies.reload();
          }}
        />
      )}
    </div>
  );
}

function CompanyDialog({
  company,
  onClose,
  onSaved,
}: {
  company: Company | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState<CompanyForm>(() => {
    if (!company) return EMPTY;
    const { name, shortName, postalCode, address, phone, fax, representative } = company;
    return { name, shortName, postalCode, address, phone, fax, representative };
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function run(action: () => Promise<unknown>) {
    setSaving(true);
    try {
      await action();
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void run(() => (company ? api.updateCompany(company.id, form) : api.createCompany(form)));
  }

  return (
    <Modal title={company ? '会社の編集' : '会社の追加'} onClose={onClose} dialogRef={ref}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {FIELDS.map((f, i) => (
            <div key={f.key} className={f.wide ? 'col-span-2' : ''}>
              <Field label={f.label} hint={f.hint}>
                <input
                  className={inputClass}
                  value={form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  required={f.key === 'name'}
                  autoFocus={i === 0}
                />
              </Field>
            </div>
          ))}
        </div>

        <ErrorBanner message={error} />

        <div className="flex items-center gap-2">
          {company && (
            <button
              type="button"
              className={btn.danger}
              disabled={saving}
              onClick={() => {
                if (confirm(`会社「${company.name}」を削除しますか？`)) void run(() => api.deleteCompany(company.id));
              }}
            >
              削除
            </button>
          )}
          <button type="button" className={`${btn.secondary} ml-auto`} onClick={() => ref.current?.close()}>
            キャンセル
          </button>
          <button type="submit" className={btn.primary} disabled={saving}>
            保存
          </button>
        </div>
      </form>
    </Modal>
  );
}
