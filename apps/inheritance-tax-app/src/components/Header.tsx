import React from 'react';
import { NavLink } from 'react-router-dom';
import Home from 'lucide-react/icons/home';
import Table from 'lucide-react/icons/table';
import Calculator from 'lucide-react/icons/calculator';
import Scale from 'lucide-react/icons/scale';
import Shield from 'lucide-react/icons/shield';
import Gift from 'lucide-react/icons/gift';
import Sliders from 'lucide-react/icons/sliders-horizontal';
import Printer from 'lucide-react/icons/printer';
import { useStaffInfo } from '../contexts/StaffContext';
import { COMPANY_INFO } from '../constants';

const NAV_ITEMS = [
  { to: '/', label: '相続税計算', shortLabel: '計算', icon: Calculator },
  { to: '/comparison', label: '1次2次比較', shortLabel: '比較', icon: Scale },
  { to: '/insurance', label: '保険金', shortLabel: '保険', icon: Shield },
  { to: '/cash-gift', label: '現金贈与', shortLabel: '贈与', icon: Gift },
  { to: '/split', label: '分割シミュレーション', shortLabel: '分割', icon: Sliders },
  { to: '/table', label: '早見表', shortLabel: '早見表', icon: Table },
] as const;

interface HeaderProps {
  actions?: React.ReactNode;
}

const STAFF_INPUT = 'px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-28';

const today = new Date();
const TODAY_STR = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;

export const Header: React.FC<HeaderProps> = ({ actions }) => {
  const { staffName, staffPhone, setStaffName, setStaffPhone } = useStaffInfo();

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 no-print">
        <div className="max-w-7xl mx-auto flex items-center h-14 px-4 gap-2">
          {/* Left: Portal + Nav Links */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <a
              href="/"
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm font-medium text-slate-400 hover:text-emerald-600 transition-colors"
              title="ポータルに戻る"
            >
              <Home className="h-5 w-5" />
              <span className="hidden lg:inline">ポータル</span>
            </a>
          </div>

          {/* Center: Navigation */}
          <nav className="flex items-center gap-0.5 overflow-x-auto flex-1 min-w-0">
            {NAV_ITEMS.map(({ to, label, shortLabel, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-1 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                  }`
                }
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="hidden md:inline">{label}</span>
                <span className="md:hidden text-xs">{shortLabel}</span>
              </NavLink>
            ))}
          </nav>

          {/* Right: Staff inputs + Print */}
          <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
            <input
              type="text"
              value={staffName}
              onChange={e => setStaffName(e.target.value)}
              placeholder="担当者名"
              className={STAFF_INPUT}
              aria-label="担当者名"
            />
            <input
              type="tel"
              value={staffPhone}
              onChange={e => setStaffPhone(e.target.value)}
              placeholder="電話番号"
              className={STAFF_INPUT}
              aria-label="担当者電話番号"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {actions}
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors border border-transparent hover:border-slate-200"
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">印刷</span>
            </button>
          </div>
        </div>
      </header>

      {/* 会社情報・担当者・作成日（画面+印刷で表示） */}
      <div className="print-header-info">
        <div className="print-header-meta">
          {staffName && <p>担当: {staffName}</p>}
          {staffPhone && <p>TEL: {staffPhone}</p>}
          <p>作成日: {TODAY_STR}</p>
        </div>
        <div className="print-header-company">
          <p className="company-name">{COMPANY_INFO.name}</p>
          <p>{COMPANY_INFO.postalCode} {COMPANY_INFO.address}</p>
          <p>TEL: {COMPANY_INFO.phone}</p>
        </div>
      </div>
    </>
  );
};
