import { useState } from 'react';
import { ExternalLink, Search } from 'lucide-react';
import { DialogOverlay } from '@/components/ui/ConfirmDialog';
import { inputClass } from '@/components/powerOfAttorney/FormFields';
import { POA_DIRECTORY_URL } from '@/components/powerOfAttorney/PrincipalPickerDialog';
import { useDeceasedSearch } from '@/hooks/useDeceasedSearch';
import type { PoaDeceased } from '@/utils/powerOfAttorney/deceasedApi';

type Props = {
  onClose: () => void;
  onPick: (deceased: PoaDeceased) => void;
};

/** 委任状の画面から被相続人DBの1人を選ぶ。相続人の名前でも探せる */
export const DeceasedPickerDialog = ({ onClose, onPick }: Props) => {
  const [query, setQuery] = useState('');
  const { deceasedList, status, error } = useDeceasedSearch(query);

  return (
    <DialogOverlay labelledBy="deceased-picker-title" onClose={onClose} maxWidth="max-w-lg w-full">
      <div className="space-y-3">
        <h3 id="deceased-picker-title" className="text-lg font-bold text-slate-800 dark:text-slate-100">被相続人DBから選ぶ</h3>
        <label className="relative block">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
          <input
            className={`${inputClass} pl-8`}
            value={query}
            placeholder="氏名・フリガナ・相続人の名前で探す"
            aria-label="被相続人を探す"
            autoFocus
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <ul className="max-h-[50vh] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700 rounded border border-slate-200 dark:border-slate-700">
          {deceasedList.map((deceased) => (
            <li key={deceased.id}>
              <button
                type="button"
                onClick={() => onPick(deceased)}
                className="w-full text-left px-3 py-2 hover:bg-emerald-50 dark:hover:bg-slate-700"
              >
                <span className="font-medium text-sm">{deceased.name}</span>
                {deceased.nameKana && <span className="ml-2 text-xs text-slate-500">{deceased.nameKana}</span>}
                <span className="block text-xs text-slate-500 dark:text-slate-400 truncate">
                  {deceased.heirs.length > 0 ? `相続人 ${deceased.heirs.map((heir) => heir.name).join('・')}` : '相続人のつながりなし'}
                  {deceased.memo && `　${deceased.memo}`}
                </span>
              </button>
            </li>
          ))}
          {status === 'loading' && deceasedList.length === 0 && <li className="px-3 py-4 text-center text-sm text-slate-500">読み込み中…</li>}
          {status === 'error' && <li className="px-3 py-4 text-center text-sm text-red-600 dark:text-red-400">{error}</li>}
          {status === 'ok' && deceasedList.length === 0 && (
            <li className="px-3 py-4 text-center text-sm text-slate-500">
              {query ? '当てはまる被相続人がいません。' : 'まだ登録がありません。入力した被相続人は「被相続人DBに登録」で残せます。'}
            </li>
          )}
        </ul>
        <div className="flex items-center justify-between">
          <a href={POA_DIRECTORY_URL} target="_blank" rel="noopener" className="flex items-center gap-1 text-xs text-slate-500 hover:underline">
            <ExternalLink className="w-3.5 h-3.5" /> 被相続人DBを開く（登録・直し）
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
