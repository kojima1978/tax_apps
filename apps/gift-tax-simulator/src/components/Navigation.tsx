import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import Calculator from 'lucide-react/icons/calculator';
import Scale from 'lucide-react/icons/scale';
import Table from 'lucide-react/icons/table';
import Building from 'lucide-react/icons/building';
import FileText from 'lucide-react/icons/file-text';
import Printer from 'lucide-react/icons/printer';
import Menu from 'lucide-react/icons/menu';
import X from 'lucide-react/icons/x';
import PanelLeftClose from 'lucide-react/icons/panel-left-close';
import PanelLeftOpen from 'lucide-react/icons/panel-left-open';
import CalendarDays from 'lucide-react/icons/calendar-days';
import Landmark from 'lucide-react/icons/landmark';
import Phone from 'lucide-react/icons/phone';
import { useStaffInfo } from '@/contexts/StaffContext';
import { COMPANY_INFO, getFullAddress } from '@/lib/company';
import { formatDate } from '@/lib/utils';

const NAV_ITEMS = [
    { to: '/', label: '贈与税', icon: Calculator, pageTitle: '贈与税シミュレーター', mobileTitle: '贈与税', group: 'gift' },
    { to: '/year-comparison', label: '年数比較', icon: Scale, pageTitle: '分割年数別 税額比較', mobileTitle: '分割年数別 税額比較', group: 'gift' },
    { to: '/table', label: '贈与税 早見表', icon: Table, pageTitle: '贈与税 早見表', mobileTitle: '贈与税 早見表', group: 'gift' },
    { to: '/acquisition-tax', label: '不動産取得税', icon: Building, pageTitle: '不動産取得税シミュレーター', mobileTitle: '不動産取得税', group: 'realEstate' },
    { to: '/registration-tax', label: '登録免許税', icon: FileText, pageTitle: '登録免許税シミュレーター', mobileTitle: '登録免許税', group: 'realEstate' },
] as const;

const NAV_GROUPS = [
    { id: 'gift', label: '贈与税関連' },
    { id: 'realEstate', label: '不動産関連税' },
] as const;

const STAFF_INPUT = 'sidebar-staff-input';

type Props = {
    isSidebarCollapsed: boolean;
    isMobileMenuOpen: boolean;
    onSidebarToggle: () => void;
    onMobileMenuChange: (isOpen: boolean) => void;
};

const Navigation = ({
    isSidebarCollapsed,
    isMobileMenuOpen,
    onSidebarToggle,
    onMobileMenuChange,
}: Props) => {
    const { staffName, staffPhone, setStaffName, setStaffPhone } = useStaffInfo();
    const location = useLocation();
    const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
    const mobileCloseButtonRef = useRef<HTMLButtonElement>(null);
    const [isMobileViewport, setIsMobileViewport] = useState(
        () => window.matchMedia('(max-width: 900px)').matches,
    );
    const todayStr = formatDate(new Date());
    const currentItem = NAV_ITEMS.find(item =>
        item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to),
    ) ?? NAV_ITEMS[0];

    useEffect(() => {
        onMobileMenuChange(false);
    }, [location.pathname, onMobileMenuChange]);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(max-width: 900px)');
        const onViewportChange = (event: MediaQueryListEvent) => {
            setIsMobileViewport(event.matches);
            if (!event.matches) onMobileMenuChange(false);
        };

        mediaQuery.addEventListener('change', onViewportChange);
        return () => mediaQuery.removeEventListener('change', onViewportChange);
    }, [onMobileMenuChange]);

    useEffect(() => {
        if (!isMobileMenuOpen) return;

        const previousOverflow = document.body.style.overflow;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onMobileMenuChange(false);
                mobileMenuButtonRef.current?.focus();
            }
        };

        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', onKeyDown);
        mobileCloseButtonRef.current?.focus();

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [isMobileMenuOpen, onMobileMenuChange]);

    return (
    <>
    <a href="#main-content" className="skip-link no-print">本文へ移動</a>

    <button
        type="button"
        className={`sidebar-backdrop no-print ${isMobileMenuOpen ? 'is-visible' : ''}`}
        aria-label="メニューを閉じる"
        tabIndex={isMobileMenuOpen ? 0 : -1}
        onClick={() => onMobileMenuChange(false)}
    />

    <aside
        className={`app-sidebar no-print ${isMobileMenuOpen ? 'mobile-open' : ''}`}
        aria-hidden={isMobileViewport && !isMobileMenuOpen}
        inert={isMobileViewport && !isMobileMenuOpen}
    >
        <div className="sidebar-brand">
            <a
                href="/"
                className="sidebar-brand-link"
                title="業務支援ポータルに戻る"
            >
                <span className="sidebar-brand-icon"><Landmark aria-hidden="true" /></span>
                <span className="sidebar-brand-copy">
                    <strong>税務シミュレーター</strong>
                    <small>TAX TOOLS</small>
                </span>
            </a>
            <button
                ref={mobileCloseButtonRef}
                type="button"
                className="mobile-sidebar-close"
                aria-label="メニューを閉じる"
                onClick={() => {
                    onMobileMenuChange(false);
                    mobileMenuButtonRef.current?.focus();
                }}
            >
                <X aria-hidden="true" />
            </button>
        </div>

        <nav className="sidebar-nav" aria-label="メインメニュー">
            {NAV_GROUPS.map(group => (
                <div className="sidebar-nav-group" key={group.id}>
                    <p className="sidebar-group-label">{group.label}</p>
                    {NAV_ITEMS.filter(item => item.group === group.id).map(({ to, label, icon: Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={to === '/'}
                            title={isSidebarCollapsed ? label : undefined}
                            className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}
                        >
                            <Icon aria-hidden="true" />
                            <span>{label}</span>
                        </NavLink>
                    ))}
                </div>
            ))}
        </nav>

        <div className="sidebar-mobile-staff">
            <p className="sidebar-section-label">担当者情報</p>
            <label>
                <span>担当者名</span>
                <input
                    type="text"
                    value={staffName}
                    onChange={e => setStaffName(e.target.value)}
                    placeholder="担当者名を入力"
                    className={STAFF_INPUT}
                />
            </label>
            <label>
                <span>電話番号</span>
                <input
                    type="tel"
                    value={staffPhone}
                    onChange={e => setStaffPhone(e.target.value)}
                    placeholder="電話番号を入力"
                    className={STAFF_INPUT}
                />
            </label>
        </div>

        <div className="sidebar-footer">
            <div className="sidebar-company">
                <strong>{COMPANY_INFO.name}</strong>
                <span>{getFullAddress()}</span>
                <span className="sidebar-company-phone"><Phone aria-hidden="true" />{COMPANY_INFO.phone}</span>
            </div>
        </div>

        <button
            type="button"
            className="sidebar-collapse-button"
            aria-label={isSidebarCollapsed ? 'サイドバーを展開する' : 'サイドバーを折りたたむ'}
            aria-expanded={!isSidebarCollapsed}
            onClick={onSidebarToggle}
        >
            {isSidebarCollapsed
                ? <PanelLeftOpen aria-hidden="true" />
                : <PanelLeftClose aria-hidden="true" />}
        </button>
    </aside>

    <header className="app-topbar no-print">
        <div className="topbar-title-area">
            <button
                ref={mobileMenuButtonRef}
                type="button"
                className="mobile-menu-button"
                aria-label="メニューを開く"
                aria-expanded={isMobileMenuOpen}
                onClick={() => onMobileMenuChange(true)}
            >
                <Menu aria-hidden="true" />
            </button>
            <div className="topbar-title">
                <span>税務シミュレーター</span>
                <strong>
                    <span className="desktop-page-title">{currentItem.pageTitle}</span>
                    <span className="mobile-page-title">{currentItem.mobileTitle}</span>
                </strong>
            </div>
        </div>

        <div className="topbar-actions">
            <div className="topbar-date" title={`作成日: ${todayStr}`}>
                <CalendarDays aria-hidden="true" />
                <span>{todayStr}</span>
            </div>
            <div className="topbar-staff">
                <label>
                    <span className="sr-only">担当者名</span>
                    <input
                        type="text"
                        value={staffName}
                        onChange={e => setStaffName(e.target.value)}
                        placeholder="担当者名"
                        className={STAFF_INPUT}
                    />
                </label>
                <label>
                    <span className="sr-only">電話番号</span>
                    <input
                        type="tel"
                        value={staffPhone}
                        onChange={e => setStaffPhone(e.target.value)}
                        placeholder="電話番号"
                        className={STAFF_INPUT}
                    />
                </label>
            </div>
            <button
                onClick={() => window.print()}
                className="topbar-print-button"
                aria-label="印刷"
            >
                <Printer aria-hidden="true" />
                <span>印刷</span>
            </button>
        </div>
    </header>
    </>
    );
};

export default Navigation;
