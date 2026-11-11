import { useMemo, useRef, useState, type FormEvent, type HTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useLoad } from '../hooks/useLoad';
import { useLeaveGuard } from '../hooks/useLeaveGuard';
import { useReorder } from '../hooks/useReorder';
import { AddressFields } from '../components/AddressFields';
import { DialogFooter, DragHandle, ErrorBanner, Field, Modal, PageHeader, ReorderBar, Section, btn, inputClass } from '../components/ui';
import { RetiringLink, UnreachableNote, WorkloadSummary, useOrgWorkload } from '../components/OrgStats';
import { companyStats, emptyStats, type GroupStats } from '../orgStats';
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

const EMPTY: CompanyForm = {
  name: '',
  shortName: '',
  postalCode: '',
  address: '',
  phone: '',
  representative: '',
};

// 帳票（委任状・見積書・請求書のレターヘッドなど）に刷る項目。空ならカードに「未入力」と出す。
// 略称は空なら会社名を刷るので数えない
const PRINTED: { key: keyof CompanyForm; label: string }[] = [
  { key: 'postalCode', label: '郵便番号' },
  { key: 'address', label: '所在地' },
  { key: 'phone', label: '代表電話' },
  { key: 'representative', label: '代表者' },
];
const missingPrinted = (c: Company) => PRINTED.filter((f) => c[f.key].trim() === '');

const MISSING_PILL = 'rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800 ring-1 ring-amber-200';

// 関連会社の一覧。帳票に刷る会社の情報もここに持つ。会社は1〜数社なので表ではなくカードで並べ、
// 刷る項目の未入力をカードごとに見せる。会社名・在籍の人数からその会社で絞った社員一覧へ、部署の数から部署の画面へ飛ぶ。
// 部署や所属の残っている会社は消せない（サーバが理由つきで断る）。
// 並びは ⠿ をドラッグして「並び順を保存」で確定する（先頭の会社が案件管理からの取込先）。
export default function CompaniesPage() {
  const companies = useLoad(api.listCompanies);
  const reorder = useReorder(companies.data ?? []);
  const org = useOrgWorkload();
  const stats = useMemo(() => companyStats(org.staff, org.index), [org.staff, org.index]);
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
    <div className="space-y-6">
      <PageHeader
        title="会社"
        description={
          <>
            帳票に刷る会社の情報（所在地・代表電話・代表者）をここに持ちます。会社名・在籍の人数を押すと、その会社で絞った社員一覧を開きます。
            {sortable && '⠿ をドラッグして並べ替えられます。先頭の会社が案件管理からの取込先です。'}
          </>
        }
        actions={
          <button type="button" className={btn.primary} onClick={() => setEditing(null)}>
            ＋ 会社を追加
          </button>
        }
      />
      <ErrorBanner message={error ?? companies.error ?? org.error} />
      <UnreachableNote index={org.index} loading={org.loading} />
      <ReorderBar dirty={reorder.dirty} saving={saving} onSave={() => void saveOrder()} onReset={reorder.reset} />
      <div className={`grid gap-4 ${sortable ? 'lg:grid-cols-2' : ''}`}>
        {reorder.sorted.map((c, i) => (
          <CompanyCard
            key={c.id}
            company={c}
            stats={stats.get(c.id) ?? emptyStats(org.index)}
            workloadLoading={org.loading}
            importTarget={sortable && i === 0}
            dragging={reorder.draggingId === c.id}
            rowProps={reorder.rowProps(c.id)}
            handle={sortable ? <DragHandle {...reorder.handleProps(c.id, c.name)} /> : null}
            onEdit={() => setEditing(c)}
          />
        ))}
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

function CompanyCard({
  company: c,
  stats,
  workloadLoading,
  importTarget,
  dragging,
  rowProps,
  handle,
  onEdit,
}: {
  company: Company;
  stats: GroupStats;
  workloadLoading: boolean;
  importTarget: boolean;
  dragging: boolean;
  rowProps: HTMLAttributes<HTMLElement>;
  handle: ReactNode;
  onEdit: () => void;
}) {
  const missing = missingPrinted(c);
  const value = (v: string) => (v.trim() === '' ? <span className={MISSING_PILL}>未入力</span> : v);

  return (
    <article
      data-reorder-item
      {...rowProps}
      className={`flex flex-col rounded-lg border border-slate-200 shadow-sm ${dragging ? 'bg-teal-50 opacity-60' : 'bg-white'}`}
    >
      <header className="flex items-start gap-3 border-b border-slate-200 px-4 py-3">
        {handle}
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-slate-800">
            <Link to={`/?company=${c.id}`} className="hover:text-teal-700 hover:underline" title="この会社で絞った社員一覧を開く">
              {c.name}
            </Link>
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            略称 {c.shortName.trim() === '' ? '（空なので狭い欄にも会社名を刷ります）' : c.shortName}
            {importTarget && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">案件管理からの取込先</span>}
          </p>
        </div>
        <button type="button" className={btn.secondary} onClick={onEdit}>
          編集
        </button>
      </header>

      <div className="flex-1 space-y-3 px-4 py-3 text-sm">
        <p
          className={`rounded-md px-2.5 py-1 text-xs ring-1 ${
            missing.length > 0 ? 'bg-amber-50 text-amber-800 ring-amber-200' : 'bg-teal-50 text-teal-700 ring-teal-200'
          }`}
        >
          {missing.length > 0
            ? `帳票に刷る項目に未入力があります（${missing.map((f) => f.label).join('・')}）。「編集」から入れてください`
            : '帳票に刷る項目はそろっています'}
        </p>
        <dl className="grid grid-cols-[5rem_1fr] gap-x-4 gap-y-2">
          <dt className="text-slate-500">所在地</dt>
          <dd className="min-w-0 break-words">
            <span className="block tabular-nums">{c.postalCode.trim() === '' ? value('') : `〒${c.postalCode}`}</span>
            <span className="block">{value(c.address)}</span>
          </dd>
          <dt className="text-slate-500">代表電話</dt>
          <dd className="tabular-nums">{value(c.phone)}</dd>
          <dt className="text-slate-500">代表者</dt>
          <dd className="min-w-0 break-words">{value(c.representative)}</dd>
        </dl>
      </div>

      {/* 担当の注記（「ほかに退職者の担当 N件」）がいちばん長いので、部署・在籍は中身の幅にして残りを担当へ回す。
          2社並びのカード（幅およそ 480px）でも収まる。スマホ幅では3列に収まらないので縦に積む */}
      <dl className="grid divide-y divide-slate-100 border-t border-slate-200 text-sm sm:grid-cols-[auto_auto_1fr] sm:divide-x sm:divide-y-0">
        <div className="px-4 py-2.5">
          <dt className="text-xs text-slate-500">部署</dt>
          <dd className="tabular-nums">
            <Link to={`/departments#company-${c.id}`} className="text-teal-700 hover:underline" title="部署の画面でこの会社の部署を見る">
              {c.departmentCount}
            </Link>
          </dd>
        </div>
        <div className="px-4 py-2.5">
          <dt className="text-xs text-slate-500">在籍</dt>
          <dd className="tabular-nums">
            <Link to={`/?company=${c.id}`} className="text-teal-700 hover:underline" title="この会社の在籍者を社員一覧で見る">
              {c.staffCount}名
            </Link>
            <RetiringLink count={stats.retiring} to={`/?company=${c.id}&retiring=1`} />
          </dd>
        </div>
        <div className="px-4 py-2.5">
          <dt className="text-xs text-slate-500">担当（進行中）</dt>
          <dd className="tabular-nums">
            <WorkloadSummary workload={stats.workload} loading={workloadLoading} retiredTo={`/?status=retired&assigned=1&company=${c.id}`} />
          </dd>
        </div>
      </dl>
    </article>
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
