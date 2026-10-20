import { useRef, useState, type FormEvent } from 'react';
import { api } from '../api';
import { ErrorBanner, Field, Modal, btn, inputClass } from './ui';
import type { AffiliationForm, Company, Department, Staff, StaffForm } from '../types';

type Props = {
  staff: Staff | null; // null = 新規
  companies: Company[];
  departments: Department[];
  onClose: () => void;
  onSaved: () => void;
};

const emptyAffiliation = (companyId: string, isPrimary: boolean): AffiliationForm => ({
  companyId,
  departmentId: '',
  employeeNo: '',
  isPrimary,
});

function toForm(s: Staff | null, companies: Company[]): StaffForm {
  return {
    familyName: s?.familyName ?? '',
    givenName: s?.givenName ?? '',
    familyKana: s?.familyKana ?? '',
    givenKana: s?.givenKana ?? '',
    mobilePhone: s?.mobilePhone ?? '',
    retiredOn: s?.retiredOn ?? '',
    affiliations: s
      ? s.affiliations.map((a) => ({
          companyId: String(a.companyId),
          departmentId: a.departmentId === null ? '' : String(a.departmentId),
          employeeNo: a.employeeNo ?? '',
          isPrimary: a.isPrimary,
        }))
      : // 新規は先頭の会社の所属を1つ置いておく（会社が1つなら選ばずに済む）
        companies.slice(0, 1).map((c) => emptyAffiliation(String(c.id), true)),
  };
}

const NAME_FIELDS = [
  { key: 'familyName', label: '姓', required: true },
  { key: 'givenName', label: '名' },
  { key: 'familyKana', label: 'セイ', hint: 'ひらがなでも可（カタカナで保存）' },
  { key: 'givenKana', label: 'メイ' },
] as const;

// 社員の追加・編集。削除は無い（台帳IDは他アプリが参照しているので消さず、退職日を入れる）。
export default function StaffDialog({ staff, companies, departments, onClose, onSaved }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState<StaffForm>(() => toForm(staff, companies));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (key: Exclude<keyof StaffForm, 'affiliations'>) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const setAffiliations = (update: (list: AffiliationForm[]) => AffiliationForm[]) =>
    setForm((f) => ({ ...f, affiliations: update(f.affiliations) }));
  const editAffiliation = (i: number, patch: Partial<AffiliationForm>) =>
    setAffiliations((list) => list.map((a, j) => (j === i ? { ...a, ...patch } : a)));
  const makePrimary = (i: number) => setAffiliations((list) => list.map((a, j) => ({ ...a, isPrimary: j === i })));
  const removeAffiliation = (i: number) =>
    setAffiliations((list) => {
      const rest = list.filter((_, j) => j !== i);
      // 主所属を外したら残りの先頭を主所属にする（主所属の無い人を作らない）
      if (rest.length > 0 && !rest.some((a) => a.isPrimary)) rest[0] = { ...rest[0], isPrimary: true };
      return rest;
    });
  // 追加する所属は、まだ所属していない会社の先頭を既定にする
  const unusedCompany = companies.find((c) => !form.affiliations.some((a) => a.companyId === String(c.id)));
  const addAffiliation = () =>
    setAffiliations((list) => [...list, emptyAffiliation(unusedCompany ? String(unusedCompany.id) : '', list.length === 0)]);

  // 部署の選択肢はその会社のものだけ。使用停止の部署は出さないが、今の所属先なら残す（黙って未所属にしない）
  const departmentOptions = (a: AffiliationForm) =>
    departments.filter((d) => String(d.companyId) === a.companyId && (d.active || String(d.id) === a.departmentId));

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
    <Modal
      title={staff ? '社員の編集' : '社員の追加'}
      aside={staff && `台帳ID ${staff.id}`}
      onClose={onClose}
      dialogRef={ref}
      wide
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          {NAME_FIELDS.map((f, i) => (
            <Field key={f.key} label={f.label} hint={'hint' in f ? f.hint : undefined}>
              <input
                className={inputClass}
                value={form[f.key]}
                onChange={set(f.key)}
                required={'required' in f}
                autoFocus={i === 0}
              />
            </Field>
          ))}
        </div>

        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-medium text-slate-700">所属</legend>
          {form.affiliations.length > 0 && (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-slate-500">
                <tr>
                  <th className="w-14 pb-1 font-normal">主所属</th>
                  <th className="pb-1 font-normal">会社</th>
                  <th className="pb-1 font-normal">部署</th>
                  <th className="w-32 pb-1 font-normal">社員番号</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {form.affiliations.map((a, i) => (
                  <tr key={i}>
                    <td className="py-1 text-center">
                      <input
                        type="radio"
                        name="primary-affiliation"
                        checked={a.isPrimary}
                        onChange={() => makePrimary(i)}
                        aria-label="主所属"
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <select
                        className={inputClass}
                        value={a.companyId}
                        onChange={(e) => editAffiliation(i, { companyId: e.target.value, departmentId: '' })}
                        aria-label="会社"
                        required
                      >
                        <option value="">（選んでください）</option>
                        {companies.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1 pr-2">
                      <select
                        className={inputClass}
                        value={a.departmentId}
                        onChange={(e) => editAffiliation(i, { departmentId: e.target.value })}
                        aria-label="部署"
                      >
                        <option value="">（未所属）</option>
                        {departmentOptions(a).map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                            {d.active ? '' : '（使用停止）'}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        className={inputClass}
                        value={a.employeeNo}
                        onChange={(e) => editAffiliation(i, { employeeNo: e.target.value })}
                        aria-label="社員番号"
                      />
                    </td>
                    <td className="py-1 text-right">
                      <button type="button" className={btn.danger} onClick={() => removeAffiliation(i)}>
                        外す
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="flex items-center gap-3">
            <button type="button" className={btn.secondary} onClick={addAffiliation} disabled={!unusedCompany}>
              ＋ 所属を追加
            </button>
            <span className="text-xs text-slate-500">
              社員番号は会社ごと（仮の番号でも可）。他アプリへは主所属の社員番号・部署を渡します
            </span>
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-4">
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
    </Modal>
  );
}
