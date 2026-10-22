import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { api } from '../api';
import { ErrorBanner, Field, Modal, btn, inputClass } from './ui';
import { toKatakana } from '../lib';
import type { AffiliationForm, Company, Department, Staff, StaffForm, StaffPersonalForm } from '../types';

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

const EMPTY_PERSONAL: StaffPersonalForm = { postalCode: '', address: '', birthDate: '' };

const NAME_FIELDS = [
  { key: 'familyName', label: '姓', required: true },
  { key: 'givenName', label: '名' },
  { key: 'familyKana', label: 'フリガナ（セイ）', kana: true },
  { key: 'givenKana', label: 'フリガナ（メイ）', kana: true },
] as const;

// 見出しつきのまとまり。先頭以外は上に区切り線を引く
function Section({ title, first, children }: { title: string; first?: boolean; children: ReactNode }) {
  return (
    <fieldset className={first ? '' : 'border-t border-slate-200 pt-3'}>
      <legend className="float-left mb-2 w-full text-sm font-bold text-slate-800">{title}</legend>
      <div className="clear-both space-y-2">{children}</div>
    </fieldset>
  );
}

// 社員の追加・編集。削除は無い（台帳IDは他アプリが参照しているので消さず、退職日を入れる）。
export default function StaffDialog({ staff, companies, departments, onClose, onSaved }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState<StaffForm>(() => toForm(staff, companies));
  // 略称は社員の PUT とは別の口で保存する（server/repo.ts の updateStaffShortName）
  const [shortName, setShortName] = useState(staff?.customShortName ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // 住所・生年月日は伏せておき、「表示」を押したときに初めて取りに行く（null = まだ読んでいない）。
  // 新規はまだ何も無いので最初から空の入力欄を出す
  const [personal, setPersonal] = useState<StaffPersonalForm | null>(staff ? null : EMPTY_PERSONAL);
  const [revealing, setRevealing] = useState(false);
  // 「隠す」は画面から消すだけで、読んだ値と入力中の変更は持ったまま（保存にも乗る）
  const [shown, setShown] = useState(!staff);
  // 変更の有無は開いたとき（個人情報は読み込んだとき）の値と比べる。「表示」を押しただけでは変更にしない
  const [initial] = useState(() => JSON.stringify({ form, shortName }));
  const [personalBase, setPersonalBase] = useState<StaffPersonalForm>(EMPTY_PERSONAL);
  const personalDirty = personal !== null && JSON.stringify(personal) !== JSON.stringify(personalBase);
  const dirty = JSON.stringify({ form, shortName }) !== initial || personalDirty;
  const canClose = () => !dirty || window.confirm('変更を保存せずに閉じますか？');
  const requestClose = () => {
    if (canClose()) ref.current?.close();
  };

  async function reveal() {
    if (!staff) return;
    if (personal !== null) {
      setShown(true);
      return;
    }
    setRevealing(true);
    try {
      const p = await api.getStaffPersonal(staff.id);
      const loaded = { postalCode: p.postalCode, address: p.address, birthDate: p.birthDate ?? '' };
      setPersonalBase(loaded);
      setPersonal(loaded);
      setShown(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRevealing(false);
    }
  }

  const setPersonalField = (key: keyof StaffPersonalForm) => (e: { target: { value: string } }) =>
    setPersonal((p) => (p ? { ...p, [key]: e.target.value } : p));

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

  // 空欄のときに入る略称。名前を直していなければサーバの答え（同姓の見分けつき）をそのまま見せる
  const nameUnchanged = staff !== null && form.familyName === staff.familyName && form.givenName === staff.givenName;
  const shortNameHint = nameUnchanged
    ? `空欄なら「${staff.autoShortName}」`
    : '空欄なら姓から自動で作ります（同姓がいれば名の頭を足す）';

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = staff ? await api.updateStaff(staff.id, form) : await api.createStaff(form);
      if (shortName.trim() !== saved.customShortName) await api.updateShortName(saved.id, shortName);
      // 伏せたまま（読んでいない）なら送らない ── 空で上書きしてしまうため
      if (personal && (staff || Object.values(personal).some((v) => v !== ''))) {
        await api.updateStaffPersonal(saved.id, personal);
      }
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
      aside={
        staff && (
          <>
            {staff.retiredOn && (
              <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">退職済み</span>
            )}
            台帳ID {staff.id}
          </>
        )
      }
      onClose={onClose}
      canClose={canClose}
      dialogRef={ref}
      wide
    >
      <form onSubmit={submit} className="space-y-3">
        <Section title="氏名" first>
          <div className="grid grid-cols-4 gap-x-4 gap-y-3">
            {NAME_FIELDS.map((f, i) => (
              <Field key={f.key} label={f.label} required={'required' in f}>
                <input
                  className={inputClass}
                  value={form[f.key]}
                  onChange={set(f.key)}
                  // ひらがなで打っても、欄を出た時点でカタカナに直して見せる（保存されるのもカタカナ）。
                  // 打っている途中で直すと日本語入力の変換を壊すので、blur で行う
                  onBlur={'kana' in f ? (e) => setForm((v) => ({ ...v, [f.key]: toKatakana(e.target.value) })) : undefined}
                  placeholder={'kana' in f ? 'カタカナ' : undefined}
                  required={'required' in f}
                  autoFocus={i === 0}
                />
              </Field>
            ))}
            <div className="col-span-2">
              <Field label="略称" hint={shortNameHint}>
                <input
                  className={inputClass}
                  value={shortName}
                  onChange={(e) => setShortName(e.target.value)}
                  placeholder={nameUnchanged ? staff.autoShortName : form.familyName}
                />
              </Field>
            </div>
          </div>
        </Section>

        <Section title="所属">
          {form.affiliations.length > 0 && (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-slate-500">
                <tr>
                  <th className="w-14 pb-1 font-normal">主所属</th>
                  <th className="pb-1 font-normal">会社</th>
                  <th className="pb-1 font-normal">部署</th>
                  <th className="w-32 pb-1 font-normal">社員番号</th>
                  <th className="w-16" />
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
                      <button type="button" className={`${btn.danger} whitespace-nowrap`} onClick={() => removeAffiliation(i)}>
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
            <span className="text-xs text-slate-500">社員番号は会社ごと（仮の番号でも可）。他アプリへは主所属のものを渡します</span>
          </div>
        </Section>

        <Section title="個人情報">
          {personal && shown ? (
            <div className={`grid ${staff ? 'grid-cols-[8rem_1fr_10rem_auto]' : 'grid-cols-[8rem_1fr_10rem]'} items-end gap-4`}>
              <Field label="郵便番号">
                <input
                  className={inputClass}
                  value={personal.postalCode}
                  onChange={setPersonalField('postalCode')}
                  inputMode="numeric"
                  placeholder="123-4567"
                />
              </Field>
              <Field label="住所">
                <input className={inputClass} value={personal.address} onChange={setPersonalField('address')} />
              </Field>
              <Field label="生年月日">
                <input
                  type="date"
                  className={inputClass}
                  value={personal.birthDate}
                  onChange={setPersonalField('birthDate')}
                />
              </Field>
              {staff && (
                <button type="button" className={btn.secondary} onClick={() => setShown(false)}>
                  隠す
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600">
                郵便番号・住所・生年月日（非表示
                {personalDirty && '・未保存の変更あり'}）
              </span>
              <button type="button" className={btn.secondary} onClick={reveal} disabled={revealing}>
                {revealing ? '読み込み中…' : '表示'}
              </button>
            </div>
          )}
          <p className="text-xs text-slate-500">一覧には出さず、必要なときだけ読みます（他アプリも1人ずつ読みます）</p>
        </Section>

        <div className="grid grid-cols-2 gap-4">
          <Section title="連絡先">
            <Field label="携帯電話">
              <input className={inputClass} value={form.mobilePhone} onChange={set('mobilePhone')} inputMode="tel" />
            </Field>
          </Section>
          <Section title="退職">
            <Field label="退職日" hint="入れると在籍の一覧から外れます">
              <input type="date" className={inputClass} value={form.retiredOn} onChange={set('retiredOn')} />
            </Field>
          </Section>
        </div>

        <ErrorBanner message={error} />

        <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
          <button type="button" className={btn.secondary} onClick={requestClose}>
            キャンセル
          </button>
          <button type="submit" className={btn.primary} disabled={saving}>
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
