import { useRef, useState, type FormEvent } from 'react';
import { api } from '../api';
import { useLoad } from '../hooks/useLoad';
import { ErrorBanner, Field, Modal, btn, inputClass } from '../components/ui';
import type { Company, CompanyForm } from '../types';

const FIELDS: { key: Exclude<keyof CompanyForm, 'sortOrder'>; label: string; hint?: string; wide?: boolean }[] = [
  { key: 'name', label: '会社名', wide: true },
  { key: 'shortName', label: '略称', hint: '狭い欄で使う短い名前（空なら会社名）' },
  { key: 'postalCode', label: '郵便番号', hint: '123-4567 の形（〒は付けない）' },
  { key: 'address', label: '住所', wide: true },
  { key: 'phone', label: '代表電話' },
  { key: 'fax', label: 'FAX' },
];

const EMPTY: CompanyForm = { name: '', shortName: '', postalCode: '', address: '', phone: '', fax: '', sortOrder: 0 };

const COLUMNS = ['表示順', '会社名', '略称', '代表電話', '部署', '在籍'] as const;

// 関連会社の一覧。帳票に刷る会社の情報もここに持つ。
// 部署や所属の残っている会社は消せない（サーバが理由つきで断る）。
export default function CompaniesPage() {
  const companies = useLoad(api.listCompanies);
  // undefined = 閉じている、null = 新規、Company = 編集
  const [editing, setEditing] = useState<Company | null | undefined>(undefined);

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex justify-end">
        <button type="button" className={btn.primary} onClick={() => setEditing(null)}>
          ＋ 会社を追加
        </button>
      </div>
      <ErrorBanner message={companies.error} />
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
            {companies.data?.map((c) => (
              <tr key={c.id} onClick={() => setEditing(c)} className="cursor-pointer hover:bg-teal-50/50">
                <td className="px-4 py-2 tabular-nums text-slate-500">{c.sortOrder}</td>
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
    const { name, shortName, postalCode, address, phone, fax, sortOrder } = company;
    return { name, shortName, postalCode, address, phone, fax, sortOrder };
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
          <Field label="表示順" hint="小さい順に並ぶ。先頭の会社が案件管理からの取込先">
            <input
              type="number"
              className={inputClass}
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
            />
          </Field>
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
