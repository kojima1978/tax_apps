import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api } from '../api';
import { ErrorBanner, Field, btn, inputClass } from './ui';
import type { Department, Staff, StaffForm } from '../types';

type Props = {
  staff: Staff | null; // null = 新規
  departments: Department[];
  onClose: () => void;
  onSaved: () => void;
};

function toForm(s: Staff | null): StaffForm {
  return {
    employeeNo: s?.employeeNo ?? '',
    name: s?.name ?? '',
    nameKana: s?.nameKana ?? '',
    departmentId: s?.departmentId == null ? '' : String(s.departmentId),
    mobilePhone: s?.mobilePhone ?? '',
    retiredOn: s?.retiredOn ?? '',
  };
}

// 社員の追加・編集。削除は無い（台帳IDは他アプリが参照しているので消さず、退職日を入れる）。
// <dialog> の showModal() がフォーカスの閉じ込めと Escape を受け持つ。
export default function StaffDialog({ staff, departments, onClose, onSaved }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState<StaffForm>(() => toForm(staff));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const set = (key: keyof StaffForm) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  // 使用停止の部署は選択肢に出さない。ただし今の所属先なら残す（黙って未所属にしない）
  const options = departments.filter((d) => d.active || String(d.id) === form.departmentId);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (staff) await api.updateStaff(staff.id, form);
      else await api.createStaff(form);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-full max-w-lg rounded-lg p-0 shadow-xl"
      aria-labelledby="staff-dialog-title"
    >
      <form onSubmit={submit} className="space-y-4 p-6">
        <div className="flex items-baseline justify-between">
          <h2 id="staff-dialog-title" className="text-lg font-bold text-slate-800">
            {staff ? '社員の編集' : '社員の追加'}
          </h2>
          {staff && <span className="text-sm text-slate-500">台帳ID {staff.id}</span>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="氏名">
            <input className={inputClass} value={form.name} onChange={set('name')} required autoFocus />
          </Field>
          <Field label="フリガナ" hint="ひらがなでも可（カタカナで保存）">
            <input className={inputClass} value={form.nameKana} onChange={set('nameKana')} />
          </Field>
          <Field label="社員番号" hint="仮の番号でも可。あとで書き換えられます">
            <input className={inputClass} value={form.employeeNo} onChange={set('employeeNo')} />
          </Field>
          <Field label="部署">
            <select className={inputClass} value={form.departmentId} onChange={set('departmentId')}>
              <option value="">（未所属）</option>
              {options.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                  {d.active ? '' : '（使用停止）'}
                </option>
              ))}
            </select>
          </Field>
          <Field label="携帯電話">
            <input className={inputClass} value={form.mobilePhone} onChange={set('mobilePhone')} inputMode="tel" />
          </Field>
          <Field label="退職日" hint="入れると在籍の一覧から外れます">
            <input type="date" className={inputClass} value={form.retiredOn} onChange={set('retiredOn')} />
          </Field>
        </div>

        <ErrorBanner message={error} />

        <div className="flex justify-end gap-2">
          <button type="button" className={btn.secondary} onClick={() => ref.current?.close()}>
            キャンセル
          </button>
          <button type="submit" className={btn.primary} disabled={saving}>
            保存
          </button>
        </div>
      </form>
    </dialog>
  );
}
