// 取引の行で使う小物（基準日の印・金額の見せ方・口座の表示・右クリックのメニュー）。
// 取引一覧・未分類・質問候補のタブで共通

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Bookmark, BookmarkX, CalendarDays, ChevronRight, Coins, Pencil, Tags, Trash2 } from 'lucide-react';
import { num } from '../../lib/format';
import type { SameKey } from './FilterPanel';
import type { TxRow } from './types';

// 基準日（相続開始日）より前・当日・後
export function RefDateBadge({ date, referenceDate }: { date: string | null; referenceDate: string | null }) {
  if (!date || !referenceDate) return null;
  const [label, tone, title] =
    date < referenceDate
      ? ['前', 'bg-blue-100 text-blue-800', '基準日より前']
      : date === referenceDate
        ? ['当', 'bg-amber-200 text-amber-900', '基準日当日']
        : ['後', 'bg-red-100 text-red-800', '基準日より後'];
  return (
    <span className={`ml-1 rounded px-1 text-[10px] font-semibold ${tone}`} title={title}>
      {label}
    </span>
  );
}

// 払戻・お預りの欄。0 は空欄、ただし両方 0 の行は払戻に 0 と出す（何も無い行と見分けるため）
export function amountCell(t: Pick<TxRow, 'amountOut' | 'amountIn'>, which: 'out' | 'in'): string {
  const v = which === 'out' ? t.amountOut : t.amountIn;
  if (v > 0) return num(v);
  if (which === 'out' && t.amountOut === 0 && t.amountIn === 0) return '0';
  return v < 0 ? num(v) : '';
}

export function AccountCell({ t, compact }: { t: TxRow; compact?: boolean }) {
  const top = [t.bankName, t.branchName].filter(Boolean).join(' ');
  const bottom = [t.accountType, t.accountNumber].filter(Boolean).join('・');
  if (compact) return <span className="text-xs whitespace-nowrap">{[top, bottom].filter(Boolean).join(' ') || '－'}</span>;
  return (
    <span className="block text-xs leading-tight whitespace-nowrap">
      <span className="block">{top || '－'}</span>
      <span className="block text-slate-500">{bottom}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// 右クリックのメニュー
// ---------------------------------------------------------------------------

export type RowMenuActions = {
  edit: (t: TxRow) => void;
  flag: (t: TxRow) => void;
  pattern: (t: TxRow) => void;
  category: (t: TxRow, category: string) => void;
  remove: (t: TxRow) => void;
  // その日・その金額の取引だけを取引一覧に出す（日付・金額の無い行では出さない）
  showSame: (key: SameKey, value: string) => void;
};

export function RowContextMenu({
  at,
  tx,
  categories,
  actions,
  onClose,
}: {
  at: { x: number; y: number };
  tx: TxRow;
  categories: string[];
  actions: RowMenuActions;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(at);
  const [sub, setSub] = useState(false);

  // 画面の端からはみ出さないよう、実際の大きさを測ってから寄せる
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ x: Math.max(4, Math.min(at.x, window.innerWidth - r.width - 4)), y: Math.max(4, Math.min(at.y, window.innerHeight - r.height - 4)) });
  }, [at, sub]);

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[role=menuitem]')?.focus();
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && onClose();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onClose, true);
    window.addEventListener('resize', onClose);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onClose, true);
      window.removeEventListener('resize', onClose);
    };
  }, [onClose]);

  const item = (label: string, Icon: typeof Pencil, fn: () => void, danger = false) => (
    <button
      type="button"
      role="menuitem"
      className={`menu-item ${danger ? 'text-red-700' : ''}`}
      onClick={() => {
        onClose();
        fn();
      }}
    >
      <Icon size={14} aria-hidden="true" />
      {label}
    </button>
  );
  // 払戻・お預りのどちらか入っている方（両方 0 の行では出さない）
  const amount = tx.amountOut || tx.amountIn;
  const title = tx.description.length > 20 ? `${tx.description.slice(0, 20)}…` : tx.description || '（摘要なし）';

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={`${title} の操作`}
      className="fixed z-40 max-h-[80vh] min-w-48 overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg"
      style={{ left: pos.x, top: pos.y }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="truncate border-b border-slate-100 px-3 pb-1 text-xs text-slate-500">{title}</div>
      {item('編集', Pencil, () => actions.edit(tx))}
      {item(tx.isFlagged ? '付箋を外す' : '付箋を付ける', tx.isFlagged ? BookmarkX : Bookmark, () => actions.flag(tx))}
      {item('パターン追加', Tags, () => actions.pattern(tx))}
      {tx.date && item('この日の取引だけ表示', CalendarDays, () => actions.showSame('date', tx.date!))}
      {amount > 0 && item('この金額の取引だけ表示', Coins, () => actions.showSame('amount', String(amount)))}
      <button type="button" role="menuitem" aria-expanded={sub} className="menu-item" onClick={() => setSub((v) => !v)}>
        <ChevronRight size={14} aria-hidden="true" className={sub ? 'rotate-90' : ''} />
        分類変更
      </button>
      {sub && (
        <div role="group" aria-label="分類変更" className="border-y border-slate-100 bg-slate-50 py-1">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              role="menuitemradio"
              aria-checked={c === tx.category}
              className={`menu-item pl-8 ${c === tx.category ? 'font-semibold text-blue-800' : ''}`}
              onClick={() => {
                onClose();
                if (c !== tx.category) actions.category(tx, c);
              }}
            >
              {c}
            </button>
          ))}
        </div>
      )}
      {item('削除', Trash2, () => actions.remove(tx), true)}
    </div>
  );
}
