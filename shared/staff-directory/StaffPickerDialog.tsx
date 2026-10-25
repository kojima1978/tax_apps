// 原本は tax_apps/shared/staff-directory/。写しを直さず原本を直して `bash shared/sync.sh` で配る
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { personMatches, readRecentIds, rememberRecent, sectionsByDepartment, sortPeople } from './assignee';
import { reloadOperators, useOperator, type Operator } from './operator';

/** 人を足す・直す場所。名簿はここ1つで、各アプリには持たせない */
export const STAFF_DIRECTORY_PAGE = '/staff-directory/';

export type StaffPickerDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** 一覧の上に出す説明（何のために選ぶか・いま誰か） */
  summary: ReactNode;
  /** 選択中の台帳ID（未設定は null） */
  currentId: number | null;
  /** 押した時点で呼ぶ。null は「外す」。Promise を返せば終わるまで操作を止め、失敗はダイアログの中に出す */
  onPick: (person: Operator | null) => void | Promise<void>;
  /** 「外す」ボタンの文言。選択中のときだけ出す。省略すると出さない */
  clearLabel?: string;
  /** 先頭に「自分（操作者）」と「最近選んだ人」を出し、選んだ人を最近に控える（担当者を選ぶとき） */
  quickSections?: boolean;
  /** 社員台帳に届かないときの知らせ */
  fallbackMessage: string;
  searchLabel: string;
};

/**
 * 社員台帳の在籍者から1人選ぶダイアログ（担当者・操作者の共通部分）。人数が増えても探せるように、
 * 検索欄と部署ごとの一覧を出し、1クリックで決まる。
 *
 * <dialog> の showModal に任せる（フォーカスの閉じ込め・Escape・背景の操作不可がブラウザ標準で付く）。
 * 別のダイアログの中から開けるように body 直下へ出す。
 */
export function StaffPickerDialog({ open, onClose, title, ...body }: StaffPickerDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      el.querySelector<HTMLElement>('input[type=search]')?.focus();
    }
    if (!open && el.open) el.close();
  }, [open]);

  return createPortal(
    <dialog
      ref={ref}
      // React は close を portal ごしに親へ伝えるので、別のダイアログの中から開いたとき
      // 親まで閉じてしまう。ここで止める
      onClose={(e) => {
        e.stopPropagation();
        onClose();
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onClose();
      }}
      aria-label={title}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-lg bg-white p-0 text-slate-800 shadow-xl backdrop:bg-slate-900/40"
    >
      {open && <PickerBody title={title} onClose={onClose} {...body} />}
    </dialog>,
    document.body,
  );
}

function PickerBody({
  title,
  summary,
  currentId,
  onPick,
  onClose,
  clearLabel,
  quickSections = false,
  fallbackMessage,
  searchLabel,
}: Omit<StaffPickerDialogProps, 'open'>) {
  const { operators, status, selected: me } = useOperator();
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentIds] = useState(readRecentIds);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // 台帳を別タブで開いて人を足し、戻ってきたら選択肢に出す
  useEffect(() => {
    const onFocus = () => reloadOperators();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const people = status === 'ok' ? operators : [];

  // showDepartment: 部署の塊の中では部署名が見出しと重なるので、それ以外の塊でだけ行に出す
  const sections = useMemo(() => {
    if (query.trim() !== '') {
      const hits = sortPeople(people.filter((p) => personMatches(p, query)));
      return [{ label: `検索結果（${hits.length}人）`, people: hits, showDepartment: true }];
    }
    const byDepartment = sectionsByDepartment(people).map((s) => ({ ...s, showDepartment: false }));
    if (!quickSections) return byDepartment;
    const recent = recentIds
      .map((id) => people.find((p) => p.id === id))
      .filter((p): p is Operator => p !== undefined && p.id !== me?.id);
    return [
      ...(me ? [{ label: '自分（画面右上の操作者）', people: [me], showDepartment: true }] : []),
      ...(recent.length > 0 ? [{ label: '最近選んだ人', people: recent, showDepartment: true }] : []),
      ...byDepartment,
    ];
  }, [people, query, recentIds, me, quickSections]);
  const firstHit = sections[0]?.people[0];

  const pick = async (person: Operator | null) => {
    setBusy(true);
    setError(null);
    try {
      await onPick(person);
      if (quickSections && person?.id) rememberRecent(person.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  const pickPerson = (p: Operator) => {
    if (p.id !== null) void pick(p);
  };

  // ↑↓で一覧の中を移る（検索欄から↓で先頭へ、先頭から↑で検索欄へ）
  const moveFocus = (e: KeyboardEvent, from: 'search' | 'list') => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const rows = [...(listRef.current?.querySelectorAll<HTMLButtonElement>('button[data-person]') ?? [])];
    if (rows.length === 0) return;
    e.preventDefault();
    const at = from === 'search' ? -1 : rows.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === 'ArrowDown' ? at + 1 : at - 1;
    if (next < 0) searchRef.current?.focus();
    else rows[Math.min(next, rows.length - 1)]!.focus();
  };

  return (
    <div className="flex max-h-[85vh] flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
        <h2 className="text-base font-semibold">{title}</h2>
        <button type="button" onClick={onClose} className="rounded px-2 py-0.5 text-lg leading-none text-slate-500 hover:bg-slate-100" aria-label="閉じる">
          ×
        </button>
      </div>

      <div className="space-y-2 border-b border-slate-200 px-5 py-3">
        {summary}
        {status === 'ok' && (
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.trim() !== '' && firstHit) {
                e.preventDefault();
                pickPerson(firstHit);
              } else moveFocus(e, 'search');
            }}
            placeholder="名前・よみ・部署で探す"
            aria-label={searchLabel}
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
          />
        )}
      </div>

      <div ref={listRef} className="min-h-24 flex-1 overflow-y-auto px-3 py-2" onKeyDown={(e) => moveFocus(e, 'list')}>
        {status === 'loading' && <p className="px-2 py-6 text-center text-sm text-slate-500">社員台帳を読み込み中…</p>}
        {status === 'fallback' && <p className="px-2 py-4 text-sm text-amber-800">{fallbackMessage}</p>}
        {status === 'ok' && query.trim() !== '' && !firstHit && (
          <p className="px-2 py-6 text-center text-sm text-slate-500">
            「{query}」に当たる人はいません。
            <br />
            台帳に居ない人は、下の「社員台帳で登録」から足してください。
          </p>
        )}
        {status === 'ok' &&
          sections.map((section) =>
            section.people.length === 0 ? null : (
              <section key={section.label} className="mb-2">
                <h3 className="sticky top-0 bg-white px-2 py-1 text-xs font-semibold text-slate-500">{section.label}</h3>
                <ul>
                  {section.people.map((p) => {
                    const chosen = currentId === p.id;
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          data-person
                          disabled={busy}
                          aria-pressed={chosen}
                          onClick={() => pickPerson(p)}
                          className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100 focus:bg-blue-50 focus:outline-none disabled:opacity-50 ${chosen ? 'bg-blue-50 font-semibold text-blue-900' : ''}`}
                        >
                          <span>
                            {p.fullName}
                            {chosen && <span className="ml-2 text-xs font-normal text-blue-700">選択中</span>}
                          </span>
                          {section.showDepartment && p.departmentName && (
                            <span className="shrink-0 text-xs text-slate-500">{p.departmentName}</span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ),
          )}
      </div>

      {error && <p className="border-t border-slate-200 px-5 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-5 py-3">
        <a
          href={STAFF_DIRECTORY_PAGE}
          target="_blank"
          rel="noopener"
          className="text-sm text-blue-700 hover:underline"
          title="名簿は社員台帳1か所で管理しています。足した人は、この画面へ戻ると一覧に出ます"
        >
          一覧に居ない人は社員台帳で登録 ↗
        </a>
        <div className="flex gap-2">
          {clearLabel && currentId !== null && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void pick(null)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {clearLabel}
            </button>
          )}
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
