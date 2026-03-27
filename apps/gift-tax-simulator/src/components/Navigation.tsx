import { useRef, useEffect, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import Home from 'lucide-react/icons/home';
import Gift from 'lucide-react/icons/gift';
import Table from 'lucide-react/icons/table';
import Building from 'lucide-react/icons/building';
import FileText from 'lucide-react/icons/file-text';
import BarChart3 from 'lucide-react/icons/bar-chart-3';
import Printer from 'lucide-react/icons/printer';
import { COMPANY_INFO } from '@/lib/company';

const NAV_ITEMS = [
    { to: '/', label: '贈与税', shortLabel: '贈与税', icon: Gift, pageTitle: '贈与税シミュレーター' },
    { to: '/year-comparison', label: '年数比較', shortLabel: '比較', icon: BarChart3, pageTitle: '分割年数別 税額比較' },
    { to: '/table', label: '早見表', shortLabel: '早見表', icon: Table, pageTitle: '贈与税 早見表' },
    { to: '/acquisition-tax', label: '不動産取得税', shortLabel: '取得税', icon: Building, pageTitle: '不動産取得税シミュレーター' },
    { to: '/registration-tax', label: '登録免許税', shortLabel: '登免税', icon: FileText, pageTitle: '登録免許税シミュレーター' },
] as const;

const Navigation = () => {
    const { pathname } = useLocation();
    const pageTitle = NAV_ITEMS.find(item => item.to === pathname)?.pageTitle ?? '';
    const wrapperRef = useRef<HTMLDivElement>(null);

    const checkOverflow = useCallback(() => {
        const el = wrapperRef.current;
        if (!el) return;
        const inner = el.querySelector('.nav-tabs');
        if (!inner) return;
        el.classList.toggle('has-overflow', inner.scrollWidth > el.clientWidth);
    }, []);

    useEffect(() => {
        checkOverflow();
        window.addEventListener('resize', checkOverflow);
        return () => window.removeEventListener('resize', checkOverflow);
    }, [checkOverflow]);

    return (
    <header className="header-custom">
        <div className="header-top">
            <div className="header-left">
                <a href="/" className="btn-portal" title="ポータルに戻る" aria-label="ポータルに戻る">
                    <Home size={24} />
                </a>
                <div>
                    <h1>税額シミュレーター</h1>
                    <p className="header-subtitle">Tax Simulator</p>
                    {pageTitle && <p className="print-page-title">{pageTitle}</p>}
                </div>
            </div>
            <address className="header-company">
                <p className="company-name">{COMPANY_INFO.name}</p>
                <p>{COMPANY_INFO.postalCode}</p>
                <p>{COMPANY_INFO.address}</p>
                <p>TEL: {COMPANY_INFO.phone}</p>
            </address>
        </div>
        <nav className="header-nav" aria-label="メインナビゲーション">
            <div className="nav-tabs-wrapper" ref={wrapperRef}>
                <div className="nav-tabs">
                    {NAV_ITEMS.map(({ to, label, shortLabel, icon: Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={to === '/'}
                            className={({ isActive }) =>
                                `nav-tab ${isActive ? 'active' : ''}`
                            }
                        >
                            <Icon size={16} />
                            <span className="nav-label-short">{shortLabel}</span>
                            <span className="nav-label-full">{label}</span>
                        </NavLink>
                    ))}
                </div>
            </div>
            <button className="btn-print" onClick={() => window.print()} aria-label="印刷">
                <Printer size={16} />
                <span className="print-label">印刷</span>
            </button>
        </nav>
    </header>
    );
};

export default Navigation;
