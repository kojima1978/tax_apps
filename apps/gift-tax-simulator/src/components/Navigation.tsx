import { NavLink, useLocation } from 'react-router-dom';
import Home from 'lucide-react/icons/home';
import Calculator from 'lucide-react/icons/calculator';
import Scale from 'lucide-react/icons/scale';
import Table from 'lucide-react/icons/table';
import Building from 'lucide-react/icons/building';
import FileText from 'lucide-react/icons/file-text';
import Printer from 'lucide-react/icons/printer';
import { useStaffInfo } from '@/contexts/StaffContext';

const NAV_ITEMS = [
    { to: '/', label: '贈与税', shortLabel: '贈与税', icon: Calculator, pageTitle: '贈与税シミュレーター' },
    { to: '/year-comparison', label: '年数比較', shortLabel: '比較', icon: Scale, pageTitle: '分割年数別 税額比較' },
    { to: '/table', label: '早見表', shortLabel: '早見表', icon: Table, pageTitle: '贈与税 早見表' },
    { to: '/acquisition-tax', label: '不動産取得税', shortLabel: '取得税', icon: Building, pageTitle: '不動産取得税シミュレーター' },
    { to: '/registration-tax', label: '登録免許税', shortLabel: '登免税', icon: FileText, pageTitle: '登録免許税シミュレーター' },
] as const;

const STAFF_INPUT = 'px-2 py-1 text-sm border border-slate-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 w-28';

const Navigation = () => {
    const { pathname } = useLocation();
    const pageTitle = NAV_ITEMS.find(item => item.to === pathname)?.pageTitle ?? '';
    const { staffName, staffPhone, setStaffName, setStaffPhone } = useStaffInfo();

    return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 no-print">
        <div className="max-w-7xl mx-auto flex items-center h-14 px-4 gap-2">
            {/* Left: Portal */}
            <a
                href="/"
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm font-medium text-slate-400 hover:text-emerald-600 transition-colors flex-shrink-0"
                title="ポータルに戻る"
            >
                <Home className="h-5 w-5" />
                <span className="hidden lg:inline">ポータル</span>
            </a>

            {/* Center: Navigation */}
            <nav className="flex items-center gap-0.5 overflow-x-auto flex-1 min-w-0" aria-label="メインナビゲーション">
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
            <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors border border-transparent hover:border-slate-200 flex-shrink-0"
                aria-label="印刷"
            >
                <Printer className="h-4 w-4" />
                <span className="hidden sm:inline">印刷</span>
            </button>
        </div>
        {/* 印刷用ページタイトル（画面非表示） */}
        {pageTitle && <p className="hidden print-page-title">{pageTitle}</p>}
    </header>
    );
};

export default Navigation;
