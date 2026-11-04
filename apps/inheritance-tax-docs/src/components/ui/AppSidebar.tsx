import { CircleHelp, ClipboardList, FileText, Home, Settings, Stamp } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

const NAV_ITEMS: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: '/', label: '書類', icon: ClipboardList, end: true },
  { to: '/resources', label: '資料', icon: FileText },
  { to: '/power-of-attorney', label: '委任状', icon: Stamp },
  { to: '/masters', label: 'マスタ', icon: Settings },
  { to: '/help', label: '使い方', icon: CircleHelp },
];

const itemClass = 'flex min-h-14 w-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500';

/** PCでは主要画面への入口を固定し、各画面のヘッダーを軽くする。 */
export const AppSidebar = () => (
  <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-[4.5rem] flex-col items-center border-r border-slate-200 bg-white py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900 lg:flex" aria-label="主要メニュー">
    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-700 text-white" title="必要書類管理">
      <ClipboardList className="h-6 w-6" aria-hidden="true" />
    </div>
    <nav className="flex flex-1 flex-col items-center gap-1" aria-label="アプリ内メニュー">
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          aria-label={label}
          className={({ isActive }) => `${itemClass} ${isActive ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'}`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
    <a href="/" aria-label="ポータルへ戻る" className={`${itemClass} text-slate-500 hover:bg-slate-100 hover:text-emerald-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-emerald-400`}>
      <Home className="h-5 w-5" aria-hidden="true" />
      <span>ポータル</span>
    </a>
  </aside>
);
