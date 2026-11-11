import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useLoad } from '../hooks/useLoad';
import { useLeaveGuard } from '../hooks/useLeaveGuard';
import { useReorder } from '../hooks/useReorder';
import { AddressFields } from '../components/AddressFields';
import { DialogFooter, DragHandle, ErrorBanner, Field, Modal, ReorderBar, Section, btn, inputClass } from '../components/ui';
import type { Company, CompanyForm } from '../types';

type FieldKey = Exclude<keyof CompanyForm, 'postalCode' | 'address'>;
type FieldDef = {
  key: FieldKey;
  label: string;
  span: string;
  placeholder?: string;
  hint?: string;
  inputMode?: 'tel';
};

// 6列の格子に並べる。書き方の例は入力欄の中（placeholder）に置き、欄の下には「どこに刷るか」だけ書く
const COMPANY_FIELDS: FieldDef[] = [
  { key: 'name', label: '会社名', span: 'sm:col-span-4', placeholder: '○○税理士法人' },
  { key: 'shortName', label: '略称', span: 'sm:col-span-2', placeholder: '空なら会社名', hint: '狭い欄に刷る' },
];
const CONTACT_FIELDS: FieldDef[] = [
  { key: 'phone', label: '代表電話', span: 'sm:col-span-2', placeholder: '03-1234-5678', inputMode: 'tel' },
  { key: 'representative', label: '代表者', span: 'sm:col-span-4', placeholder: '代表社員 山田太郎', hint: '役職と氏名。委任状の受任者欄に刷る' },
];

// 一覧の件数から、その会社で絞った画面へ飛ぶ。行のクリック（編集を開く）には伝えない
function CountLink({ to, count, label }: { to: string; count: number; label: string }) {
  return (
    <Link
      to={to}
      onClick={(e) => e.stopPropagation()}
      className="text-teal-700 hover:underline"
      title={label}
    >
      {count}
    </Link>
  );
}

const EMPTY: CompanyForm = {
  name: '',
  shortName: '',
  postalCode: '',
  address: '',
  phone: '',
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
  // 1社しか無いうちは並べ替えるものが無いので、つまみも案内も出さない
  const sortable = (companies.data?.length ?? 0) > 1;
  useLeaveGuard(reorder.dirty);

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
        <p className="text-sm text-slate-500">
          {sortable && '⠿ をドラッグして並べ替えられます。先頭の会社が案件管理からの取込先です。'}
        </p>
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
              {sortable && <th className="w-10 px-2 py-2" aria-label="並べ替え" />}
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
                {sortable && (
                  <td className="px-2 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                    <DragHandle {...reorder.handleProps(c.id, c.name)} />
                  </td>
                )}
                <td className="px-4 py-2 font-medium">
                  <button type="button" className="text-left hover:underline" onClick={() => setEditing(c)}>
                    {c.name}
                  </button>
                </td>
                <td className="px-4 py-2">{c.shortName}</td>
                <td className="px-4 py-2 tabular-nums">{c.phone}</td>
                <td className="px-4 py-2 tabular-nums">
                  <CountLink to="/departments" count={c.departmentCount} label="部署の一覧を開く" />
                </td>
                <td className="px-4 py-2 tabular-nums">
                  <CountLink to={`/?company=${c.id}`} count={c.staffCount} label="この会社の在籍者を社員一覧で見る" />
                </td>
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
    const { name, shortName, postalCode, address, phone, representative } = company;
    return { name, shortName, postalCode, address, phone, representative };
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // 打ちかけのまま Esc・キャンセルで閉じて消えないよう、開いたときの値と比べて確かめる
  const [initial] = useState(() => JSON.stringify(form));
  const dirty = JSON.stringify(form) !== initial;
  const canClose = () => !dirty || window.confirm('変更を保存せずに閉じますか？');

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

  const renderField = (f: FieldDef): ReactNode => (
    <div key={f.key} className={f.span}>
      <Field label={f.label} hint={f.hint} required={f.key === 'name'}>
        <input
          className={inputClass}
          value={form[f.key]}
          onChange={(e) => setForm((v) => ({ ...v, [f.key]: e.target.value }))}
          required={f.key === 'name'}
          autoFocus={f.key === 'name'}
          placeholder={f.placeholder}
          inputMode={f.inputMode}
        />
      </Field>
    </div>
  );

  function submit(e: FormEvent) {
    e.preventDefault();
    void run(() => (company ? api.updateCompany(company.id, form) : api.createCompany(form)));
  }

  return (
    <Modal title={company ? '会社の編集' : '会社の追加'} onClose={onClose} canClose={canClose} dialogRef={ref} wide>
      <form onSubmit={submit} className="space-y-3">
        <Section title="会社" first>
          <div className="grid gap-x-4 gap-y-3 sm:grid-cols-6">{COMPANY_FIELDS.map(renderField)}</div>
        </Section>
        <Section title="所在地">
          <AddressFields
            value={{ postalCode: form.postalCode, address: form.address }}
            onChange={(v) => setForm((f) => ({ ...f, ...v }))}
          />
        </Section>
        <Section title="連絡先・代表者">
          <div className="grid gap-x-4 gap-y-3 sm:grid-cols-6">{CONTACT_FIELDS.map(renderField)}</div>
        </Section>

        <ErrorBanner message={error} />

        <DialogFooter>
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
          <button
            type="button"
            className={`${btn.secondary} ml-auto`}
            onClick={() => {
              if (canClose()) ref.current?.close();
            }}
          >
            キャンセル
          </button>
          <button type="submit" className={btn.primary} disabled={saving}>
            {saving ? '保存中…' : '保存'}
          </button>
        </DialogFooter>
      </form>
    </Modal>
  );
}
