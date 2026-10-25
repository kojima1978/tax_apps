import { useState } from 'react';
import { DialogOverlay } from '@/components/ui/ConfirmDialog';
import { KIND_OPTIONS, RadioGroup, TextField, WarekiDateField, inputClass } from '@/components/powerOfAttorney/FormFields';
import {
  EMPTY_PRINCIPAL_DRAFT,
  PrincipalApiError,
  createPrincipal,
  draftOf,
  updatePrincipal,
  type PoaPrincipal,
  type PrincipalDraft,
} from '@/utils/powerOfAttorney/principalApi';
import { parseBirthDate } from '@/utils/powerOfAttorney/wareki';

type Props = {
  /** 直す相手。無ければ新しく登録する */
  principal?: PoaPrincipal;
  onClose: () => void;
  onSaved: (saved: PoaPrincipal) => void;
};

/** 委任者DBの1人ぶんを登録・編集する。必須は氏名だけ */
export const PrincipalEditDialog = ({ principal, onClose, onSaved }: Props) => {
  const [base, setBase] = useState<PoaPrincipal | undefined>(principal);
  const [draft, setDraft] = useState<PrincipalDraft>(principal ? draftOf(principal) : EMPTY_PRINCIPAL_DRAFT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState<PoaPrincipal | null>(null);

  const set = (patch: Partial<PrincipalDraft>) => setDraft((current) => ({ ...current, ...patch }));
  const birth = draft.kind === 'individual' ? parseBirthDate(draft.birthDate) : '';
  const birthError = birth && !birth.ok ? birth.error : undefined;
  const nameMissing = !draft.name.trim();

  const save = async () => {
    if (nameMissing || birthError || saving) return;
    setSaving(true);
    setError('');
    try {
      const saved = base ? await updatePrincipal(base.id, draft, base.version) : await createPrincipal(draft);
      onSaved(saved);
    } catch (e) {
      if (e instanceof PrincipalApiError && e.status === 409 && e.current) {
        setConflict(e.current);
        setError('ほかの画面でこの委任者が直されました。「読み直す」で今の内容を出してから直してください。');
      } else {
        setError(e instanceof Error ? e.message : '保存できませんでした');
      }
    } finally {
      setSaving(false);
    }
  };

  const reloadConflict = () => {
    if (!conflict) return;
    setBase(conflict);
    setDraft(draftOf(conflict));
    setConflict(null);
    setError('');
  };

  return (
    <DialogOverlay labelledBy="principal-edit-title" onClose={onClose} maxWidth="max-w-lg w-full">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <h3 id="principal-edit-title" className="text-lg font-bold text-slate-800 dark:text-slate-100">
          {principal ? '委任者を直す' : '委任者を登録'}
        </h3>
        <RadioGroup label="区分" name="principal-kind" options={KIND_OPTIONS} value={draft.kind} onChange={(kind) => set({ kind })} />
        <TextField
          label={draft.kind === 'corporate' ? '法人名（必須）' : '氏名（必須）'}
          value={draft.name}
          onChange={(name) => set({ name })}
          autoFocus
        />
        <TextField label="フリガナ（並び順に使います）" value={draft.nameKana} onChange={(nameKana) => set({ nameKana })} />
        <TextField label="住所" value={draft.address} onChange={(address) => set({ address })} />
        {draft.kind === 'corporate' ? (
          <TextField
            label="代表者（役職と氏名）"
            value={draft.representative}
            placeholder="代表取締役 山田太郎"
            onChange={(representative) => set({ representative })}
          />
        ) : (
          <WarekiDateField label="生年月日" value={draft.birthDate} error={birthError} onChange={(birthDate) => set({ birthDate })} />
        )}
        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">メモ</span>
          <textarea className={inputClass} rows={2} value={draft.memo} onChange={(e) => set({ memo: e.target.value })} />
        </label>

        {error && (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">
            {error}
            {conflict && (
              <button type="button" onClick={reloadConflict} className="ml-2 font-medium underline">
                読み直す
              </button>
            )}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={nameMissing || Boolean(birthError) || saving || Boolean(conflict)}
            className="px-4 py-1.5 text-sm bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-400 text-white rounded-lg font-bold"
          >
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </form>
    </DialogOverlay>
  );
};
