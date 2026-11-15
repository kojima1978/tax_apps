import { ClipboardList, Home } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { APP_PAGES, REGISTER_LINKS } from '@/constants/navigation';

const itemClass = 'flex min-h-14 w-14 shrink-0 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500';
const idleClass = 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100';

/** PCでは主要画面への入口を固定し、各画面のヘッダーを軽くする。下に登録先（従業員・お客様・会社）をまとめる。 */
export const AppSidebar = () => (
  <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-[4.5rem] flex-col items-center overflow-y-auto border-r border-slate-200 bg-white py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900 lg:flex" aria-label="主要メニュー">
    <div className="mb-3 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white" title="必要書類管理">
      <ClipboardList className="h-6 w-6" aria-hidden="true" />
    </div>
    <nav className="flex flex-col items-center gap-1" aria-label="アプリ内メニュー">
      {APP_PAGES.map(({ to, shortLabel, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          aria-label={label}
          className={({ isActive }) => `${itemClass} ${isActive ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : idleClass}`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
          <span>{shortLabel}</span>
        </NavLink>
      ))}
    </nav>
    <nav className="mt-2 flex flex-col items-center gap-1 border-t border-slate-200 pt-2 dark:border-slate-700" aria-label="登録">
      {REGISTER_LINKS.map(({ href, label, title, icon: Icon }) => (
        <a key={href} href={href} target="_blank" rel="noopener" title={title} aria-label={title} className={`${itemClass} ${idleClass}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
          <span>{label}</span>
        </a>
      ))}
    </nav>
    <a href="/" aria-label="ポータルへ戻る" className={`${itemClass} mt-auto ${idleClass} hover:text-emerald-700 dark:hover:text-emerald-400`}>
      <Home className="h-5 w-5" aria-hidden="true" />
      <span>ポータル</span>
    </a>
  </aside>
);
