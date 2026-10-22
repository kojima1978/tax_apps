import { useRef, useState, type KeyboardEvent } from 'react';
import { api } from '../api';
import type { Staff } from '../types';

// 一覧の略称の欄。押すとその場で入力欄になり、Enter か欄を出たら保存、Esc でやめる。
// 空にすると自動の略称（姓だけ・同姓がいれば名の頭を足す）に戻る
export default function ShortNameCell({ staff, onSaved }: { staff: Staff; onSaved: () => void }) {
  const [draft, setDraft] = useState<string | null>(null); // null = 表示中
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Esc で閉じたときに、続いて来る blur で保存しないように
  const cancelled = useRef(false);

  function open() {
    cancelled.current = false;
    setError(null);
    setDraft(staff.customShortName);
  }

  async function save() {
    if (draft === null || cancelled.current) return;
    if (draft.trim() === staff.customShortName) {
      setDraft(null);
      return;
    }
    setSaving(true);
    try {
      await api.updateShortName(staff.id, draft);
      setDraft(null);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    // 日本語入力の確定の Enter では保存しない
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) e.currentTarget.blur();
    if (e.key === 'Escape') {
      cancelled.current = true;
      setDraft(null);
    }
  }

  if (draft === null) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation(); // 行の「編集を開く」に流さない
          open();
        }}
        title={staff.customShortName ? '押して略称を直す（空にすると自動に戻ります）' : '自動の略称。押すと直せます'}
        className="-mx-1 rounded border border-transparent px-1 text-left hover:border-slate-300 hover:bg-white"
      >
        {staff.shortName}
      </button>
    );
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <input
        autoFocus
        onFocus={(e) => e.currentTarget.select()}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={onKeyDown}
        disabled={saving}
        placeholder={staff.autoShortName}
        aria-label="略称"
        className="w-28 rounded border border-teal-500 px-1.5 py-0.5 text-sm"
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
