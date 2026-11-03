import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// 行ごとの「…」メニュー。
// カテゴリのカードは overflow-hidden なので、カードの中に絶対配置すると最後の行のメニューが
// 切れる。popover（最前面のレイヤ）に出し、開いた瞬間にボタンの位置から座標を決める。
// 外側のクリックと Escape で閉じるのは popover の標準動作に任せている。

export type RowMenuItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
};

type RowActionMenuProps = {
  /** 読み上げ用。例: 「戸籍謄本の操作」 */
  label: string;
  items: RowMenuItem[];
  /** ボタンの大きさ（タップ領域）を呼び出し側にそろえる */
  buttonClassName?: string;
};

const MENU_GAP = 4;
const VIEWPORT_MARGIN = 8;

export function RowActionMenu({ label, items, buttonClassName = '' }: RowActionMenuProps) {
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const close = useCallback(() => {
    if (menuRef.current?.matches(':popover-open')) menuRef.current.hidePopover();
  }, []);

  // ボタンの下（入らなければ上）に、右端をそろえて置く
  const place = () => {
    const button = buttonRef.current;
    const menu = menuRef.current;
    if (!button || !menu) return;
    const rect = button.getBoundingClientRect();
    const { offsetWidth: width, offsetHeight: height } = menu;
    let top = rect.bottom + MENU_GAP;
    if (top + height > window.innerHeight - VIEWPORT_MARGIN) top = rect.top - height - MENU_GAP;
    const left = Math.min(
      Math.max(VIEWPORT_MARGIN, rect.right - width),
      window.innerWidth - width - VIEWPORT_MARGIN,
    );
    menu.style.top = `${Math.max(VIEWPORT_MARGIN, top)}px`;
    menu.style.left = `${left}px`;
    menu.style.visibility = 'visible';
  };

  const menuItems = () => Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []);

  const handleToggle = (event: React.ToggleEvent<HTMLDivElement>) => {
    const isOpen = event.newState === 'open';
    setOpen(isOpen);
    if (isOpen) {
      place();
      menuItems()[0]?.focus();
    } else if (menuRef.current) {
      menuRef.current.style.visibility = 'hidden';
    }
  };

  // 座標は開いた瞬間のもの。スクロールや幅の変化でボタンから離れるので、そのときは閉じる
  useEffect(() => {
    if (!open) return;
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open, close]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const list = menuItems();
    const index = list.indexOf(document.activeElement as HTMLButtonElement);
    const focusAt = (next: number) => list[(next + list.length) % list.length]?.focus();
    switch (event.key) {
      case 'ArrowDown': event.preventDefault(); focusAt(index + 1); break;
      case 'ArrowUp': event.preventDefault(); focusAt(index - 1); break;
      case 'Home': event.preventDefault(); focusAt(0); break;
      case 'End': event.preventDefault(); focusAt(list.length - 1); break;
      case 'Tab': close(); break;
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        popoverTarget={menuId}
        className={`p-1.5 rounded text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${open ? 'bg-slate-100 dark:bg-slate-700' : ''} ${buttonClassName}`}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        title="その他の操作"
      >
        <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
      </button>
      <div
        ref={menuRef}
        id={menuId}
        popover="auto"
        role="menu"
        aria-label={label}
        onToggle={handleToggle}
        onKeyDown={handleKeyDown}
        style={{ inset: 'auto', visibility: 'hidden' }}
        className="no-print m-0 min-w-44 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 shadow-xl"
      >
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            // popover は閉じるときにフォーカスを「…」ボタンへ戻す。同じ瞬間に開いた入力欄
            // （個別名を追加）の autoFocus がそれに負けるので、選んだ操作は閉じた次の描画で走らせる
            onClick={() => { close(); requestAnimationFrame(item.onSelect); }}
            className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm min-h-11 sm:min-h-0 focus:outline-none ${
              item.danger
                ? 'text-red-600 dark:text-red-400 hover:bg-red-50 focus:bg-red-50 dark:hover:bg-red-900/40 dark:focus:bg-red-900/40'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 focus:bg-slate-100 dark:hover:bg-slate-700 dark:focus:bg-slate-700'
            }`}
          >
            <item.icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            {item.label}
          </button>
        ))}
      </div>
    </>
  );
}
