import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api';
import { useLoad } from '../hooks/useLoad';
import { ErrorBanner, Field, btn, inputClass } from '../components/ui';
import type { Office } from '../types';

type Form = Omit<Office, 'updatedAt'>;

const FIELDS: { key: keyof Form; label: string; hint?: string; wide?: boolean }[] = [
  { key: 'name', label: '事務所名', wide: true },
  { key: 'postalCode', label: '郵便番号', hint: '123-4567 の形（〒は付けない）' },
  { key: 'address', label: '住所', wide: true },
  { key: 'phone', label: '代表電話' },
  { key: 'fax', label: 'FAX' },
];

// 各アプリの帳票に刷る事務所の情報（いまは各アプリに直書き。段階2でここを読む）
export default function OfficePage() {
  const office = useLoad(api.getOffice);
  const [form, setForm] = useState<Form | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (office.data) setForm(office.data);
  }, [office.data]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    try {
      setForm(await api.updateOffice(form));
      setError(null);
      setSaved(true);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (!form) return <ErrorBanner message={office.error} />;

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-4 rounded-lg border border-slate-200 bg-white p-6">
      <div className="grid grid-cols-2 gap-4">
        {FIELDS.map((f) => (
          <div key={f.key} className={f.wide ? 'col-span-2' : ''}>
            <Field label={f.label} hint={f.hint}>
              <input
                className={inputClass}
                value={form[f.key]}
                onChange={(e) => {
                  setForm({ ...form, [f.key]: e.target.value });
                  setSaved(false);
                }}
              />
            </Field>
          </div>
        ))}
      </div>
      <ErrorBanner message={error} />
      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-sm text-teal-700">保存しました</span>}
        <button type="submit" className={btn.primary}>
          保存
        </button>
      </div>
    </form>
  );
}
