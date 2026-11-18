import { NavLink } from 'react-router-dom';
import BackupMenu from './BackupMenu';
import { ArchiveIcon, ContactIcon, HomeIcon } from './icons';
import { APP_PAGES, APP_TITLE, FOCUS_RING, PORTAL_HREF } from '../navigation';

// ほかのアプリ（必要書類管理・案件管理など）と同じ入口の形。
// 広い画面（lg 以上）は左の固定サイドバー、狭い画面は上の帯1本（縦を帯2本に使わない）。
// 置くのは画面の切り替え・ポータル・台帳全体の控えだけで、画面ごとの操作は各画面に置く

const SIDE_ITEM = `flex min-h-14 w-14 shrink-0 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold transition-colors ${FOCUS_RING}`;
const SIDE_IDLE = 'text-slate-600 hover:bg-slate-100 hover:text-slate-900';
const ACTIVE = 'bg-teal-50 text-teal-800';

export function AppSidebar() {
  return (
    <aside
      aria-label="アプリ内メニュー"
      className="print:hidden! fixed inset-y-0 left-0 z-30 hidden w-[4.5rem] flex-col items-center overflow-y-auto border-r border-slate-200 bg-white py-3 shadow-sm lg:flex"
    >
      <div className="mb-3 flex w-14 flex-col items-center gap-1 text-[10px] font-bold text-slate-700">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-700 text-white" aria-hidden="true">
          <ContactIcon className="h-5 w-5" />
        </span>
        <h1>{APP_TITLE}</h1>
      </div>
      <nav aria-label="メインナビゲーション" className="flex flex-col items-center gap-1">
        {APP_PAGES.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end className={({ isActive }) => `${SIDE_ITEM} ${isActive ? ACTIVE : SIDE_IDLE}`}>
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto flex flex-col items-center gap-1 border-t border-slate-200 pt-2">
        <BackupMenu className={`${SIDE_ITEM} ${SIDE_IDLE}`}>
          <ArchiveIcon className="h-5 w-5" />
          <span>控え</span>
        </BackupMenu>
        <a href={PORTAL_HREF} aria-label="ポータルへ戻る" className={`${SIDE_ITEM} ${SIDE_IDLE} hover:text-teal-700`}>
          <HomeIcon className="h-5 w-5" />
          <span>ポータル</span>
        </a>
      </div>
    </aside>
  );
}

const BAR_ITEM = `flex h-11 min-w-11 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg px-1.5 text-[11px] font-medium transition-colors sm:flex-row sm:gap-2 sm:px-3 sm:text-sm ${FOCUS_RING}`;

export function AppHeader() {
  return (
    <header className="print:hidden! sticky top-0 z-30 border-b border-slate-200 bg-white shadow-sm lg:hidden">
      <div className="flex h-14 items-center gap-1.5 px-3 sm:gap-3">
        <a
          href={PORTAL_HREF}
          aria-label="ポータルへ戻る"
          title="ポータルへ戻る"
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 ${FOCUS_RING}`}
        >
          <HomeIcon className="h-5 w-5" />
        </a>
        <h1 className="shrink-0 whitespace-nowrap text-xs font-bold text-slate-800 sm:border-l sm:border-slate-200 sm:pl-3 sm:text-sm">
          {APP_TITLE}
        </h1>
        <nav aria-label="メインナビゲーション" className="ml-auto flex min-w-0 items-center gap-0.5 sm:gap-1">
          {APP_PAGES.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) => `${BAR_ITEM} ${isActive ? `${ACTIVE} font-semibold` : SIDE_IDLE}`}
            >
              <Icon className="h-4 w-4" />
              <span className="whitespace-nowrap">{label}</span>
            </NavLink>
          ))}
          <BackupMenu className={`${BAR_ITEM} ${SIDE_IDLE}`}>
            <ArchiveIcon className="h-4 w-4" />
            <span className="whitespace-nowrap">控え</span>
          </BackupMenu>
        </nav>
      </div>
    </header>
  );
}
