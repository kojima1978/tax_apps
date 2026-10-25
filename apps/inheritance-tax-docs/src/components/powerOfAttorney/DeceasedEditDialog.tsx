import { useState } from 'react';
import { DialogOverlay } from '@/components/ui/ConfirmDialog';
import { BIRTH_PLACEHOLDER, TextField, inputClass } from '@/components/powerOfAttorney/FormFields';
import {
  DeceasedApiError,
  EMPTY_DECEASED_DRAFT,
  createDeceased,
  deceasedDraftOf,
  updateDeceased,
  type DeceasedDraft,
  type PoaDeceased,
} from '@/utils/powerOfAttorney/deceasedApi';
import { parseBirthDate } from '@/utils/powerOfAttorney/wareki';

type Props = {
  /** 直す相手。無ければ新しく登録する */
  deceased?: PoaDeceased;
  onClose: () => void;
  onSaved: (saved: PoaDeceased) => void;
};

/** 被相続人DBの1人ぶんを登録・編集する。必須は氏名だけ。相続人のつなぎ替えは一覧の側で行う */
export const DeceasedEditDialog = ({ deceased, onClose, onSaved }: Props) => {
  const [base, setBase] = useState<PoaDeceased | undefined>(deceased);
  const [draft, setDraft] = useState<DeceasedDraft>(deceased ? deceasedDraftOf(deceased) : EMPTY_DECEASED_DRAFT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState<PoaDeceased | null>(null);

  const set = (patch: Partial<DeceasedDraft>) => setDraft((current) => ({ ...current, ...patch }));
  const birth = parseBirthDate(draft.birthDate);
  const birthError = birth.ok ? undefined : birth.error;
  const nameMissing = !draft.name.trim();

  const save = async () => {
    if (nameMissing || birthError || saving) return;
    setSaving(true);
    setError('');
    try {
      const saved = base ? await updateDeceased(base.id, draft, base.version) : await createDeceased(draft);
      onSaved(saved);
    } catch (e) {
      if (e instanceof DeceasedApiError && e.status === 409 && e.current) {
        setConflict(e.current);
        setError('ほかの画面でこの被相続人が直されました。「読み直す」で今の内容を出してから直してください。');
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
    setDraft(deceasedDraftOf(conflict));
    setConflict(null);
    setError('');
  };

  return (
    <DialogOverlay labelledBy="deceased-edit-title" onClose={onClose} maxWidth="max-w-lg w-full">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <h3 id="deceased-edit-title" className="text-lg font-bold text-slate-800 dark:text-slate-100">
          {deceased ? '被相続人を直す' : '被相続人を登録'}
        </h3>
        <TextField label="氏名（必須）" value={draft.name} onChange={(name) => set({ name })} autoFocus />
        <TextField label="フリガナ（並び順に使います）" value={draft.nameKana} onChange={(nameKana) => set({ nameKana })} />
        <TextField
          label="生年月日"
          value={draft.birthDate}
          placeholder={BIRTH_PLACEHOLDER}
          error={birthError}
          onChange={(birthDate) => set({ birthDate })}
        />
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
