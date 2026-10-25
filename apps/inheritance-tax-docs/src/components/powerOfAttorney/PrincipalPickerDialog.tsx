import { useState } from 'react';
import { ExternalLink, Search } from 'lucide-react';
import { DialogOverlay } from '@/components/ui/ConfirmDialog';
import { inputClass } from '@/components/powerOfAttorney/FormFields';
import { usePrincipalSearch } from '@/hooks/usePrincipalSearch';
import type { PoaPrincipal } from '@/utils/powerOfAttorney/principalApi';
import type { PrincipalInput } from '@/utils/powerOfAttorney/record';

export const POA_DIRECTORY_URL = '/inheritance-tax-docs/power-of-attorney/principals';

type Props = {
  title: string;
  onClose: () => void;
  onPick: (principal: PoaPrincipal) => void;
  /** 個人だけ・法人だけに絞る（存命の個人・法人の委任状のとき） */
  kind?: PrincipalInput['kind'] | null;
};

/** 委任状の画面から委任者DBの1人を選ぶ。登録や直しは委任者DBの画面で行う */
export const PrincipalPickerDialog = ({ title, onClose, onPick, kind }: Props) => {
  const [query, setQuery] = useState('');
  const { principals: found, status, error } = usePrincipalSearch(query);
  const principals = kind ? found.filter((principal) => principal.kind === kind) : found;

  return (
    <DialogOverlay labelledBy="principal-picker-title" onClose={onClose} maxWidth="max-w-lg w-full">
      <div className="space-y-3">
        <h3 id="principal-picker-title" className="text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h3>
        <label className="relative block">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
          <input
            className={`${inputClass} pl-8`}
            value={query}
            placeholder="氏名・フリガナ・被相続人で探す"
            aria-label="委任者を探す"
            autoFocus
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <ul className="max-h-[50vh] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700 rounded border border-slate-200 dark:border-slate-700">
          {principals.map((principal) => (
            <li key={principal.id}>
              <button
                type="button"
                onClick={() => onPick(principal)}
                className="w-full text-left px-3 py-2 hover:bg-emerald-50 dark:hover:bg-slate-700"
              >
                <span className="font-medium text-sm">{principal.name}</span>
                {principal.kind === 'corporate' && <span className="ml-2 text-xs text-slate-500">法人</span>}
                {principal.nameKana && <span className="ml-2 text-xs text-slate-500">{principal.nameKana}</span>}
                {(principal.deceased.length > 0 || principal.memo) && (
                  <span className="block text-xs text-slate-500 dark:text-slate-400 truncate">
                    {principal.deceased.length > 0 && `被相続人 ${principal.deceased.map((d) => d.name).join('・')}`}
                    {principal.deceased.length > 0 && principal.memo && '　'}
                    {principal.memo}
                  </span>
                )}
              </button>
            </li>
          ))}
          {status === 'loading' && principals.length === 0 && <li className="px-3 py-4 text-center text-sm text-slate-500">読み込み中…</li>}
          {status === 'error' && <li className="px-3 py-4 text-center text-sm text-red-600 dark:text-red-400">{error}</li>}
          {status === 'ok' && principals.length === 0 && (
            <li className="px-3 py-4 text-center text-sm text-slate-500">
              {query || found.length > 0 ? `当てはまる${kind === 'corporate' ? '法人' : kind === 'individual' ? '個人' : '委任者'}がいません。` : 'まだ登録がありません。入力した委任者は「委任者DBに登録」で残せます。'}
            </li>
          )}
        </ul>
        <div className="flex items-center justify-between">
          <a href={`${POA_DIRECTORY_URL}?tab=people`} target="_blank" rel="noopener" className="flex items-center gap-1 text-xs text-slate-500 hover:underline">
            <ExternalLink className="w-3.5 h-3.5" /> 委任者DBを開く（登録・直し）
          </a>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium"
          >
            閉じる
          </button>
        </div>
      </div>
    </DialogOverlay>
  );
};
