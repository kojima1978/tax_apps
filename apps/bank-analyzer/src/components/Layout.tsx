// 全画面共通の枠（Django の base.html のヘッダー）

import { NavLink, Outlet, Link } from 'react-router-dom';
import { FolderOpen, Home, Mail, Plus, Settings } from 'lucide-react';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm ${isActive ? 'bg-white/15 font-semibold text-white' : 'text-slate-200 hover:bg-white/10 hover:text-white'}`;

export function Layout() {
  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-2">
        メインコンテンツへ移動
      </a>
      <header className="sticky top-0 z-40 bg-slate-800 print:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <nav className="flex items-center gap-1" aria-label="主なメニュー">
            <a href="/" className={navClass({ isActive: false })} title="ポータルに戻る">
              <Home size={16} />
              <span className="hidden sm:inline">ポータル</span>
            </a>
            <NavLink to="/" end className={navClass}>
              <FolderOpen size={16} />
              <span>案件一覧</span>
            </NavLink>
            <NavLink to="/settings" className={navClass}>
              <Settings size={16} />
              <span>設定</span>
            </NavLink>
          </nav>
          <div className="flex items-center gap-1">
            <a href={`${import.meta.env.BASE_URL}letter`} target="_blank" rel="noopener" className={navClass({ isActive: false })}>
              <Mail size={16} />
              <span className="hidden md:inline">お客様配布用文書</span>
              <span className="md:hidden">文書</span>
            </a>
            <Link to="/?new=1" className="btn btn-primary ml-1">
              <Plus size={16} />
              <span>新規案件</span>
            </Link>
          </div>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="outline-none">
        <Outlet />
      </main>
    </>
  );
}

// 画面の見出しの並び（パンくず）
export function Breadcrumb({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="パンくずリスト" className="mb-3 text-sm text-slate-500 print:hidden">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 && <span aria-hidden="true">/</span>}
            {item.to ? (
              <Link to={item.to} className="text-blue-700 hover:underline">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
