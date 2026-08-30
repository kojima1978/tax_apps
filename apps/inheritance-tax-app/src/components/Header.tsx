import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import Table from 'lucide-react/icons/table';
import Calculator from 'lucide-react/icons/calculator';
import Scale from 'lucide-react/icons/scale';
import Shield from 'lucide-react/icons/shield';
import Gift from 'lucide-react/icons/gift';
import Sliders from 'lucide-react/icons/sliders-horizontal';
import Clock from 'lucide-react/icons/clock';
import Printer from 'lucide-react/icons/printer';
import Menu from 'lucide-react/icons/menu';
import X from 'lucide-react/icons/x';
import PanelLeftClose from 'lucide-react/icons/panel-left-close';
import PanelLeftOpen from 'lucide-react/icons/panel-left-open';
import CalendarDays from 'lucide-react/icons/calendar-days';
import Landmark from 'lucide-react/icons/landmark';
import Phone from 'lucide-react/icons/phone';
import { useStaffInfo } from '../contexts/useStaffInfo';
import { COMPANY_INFO } from '../constants';

const NAV_ITEMS = [
  { to: '/', label: '相続税計算', pageTitle: '相続税シミュレーション', icon: Calculator, group: 'calculate' },
  { to: '/comparison', label: '一次・二次相続比較', pageTitle: '一次・二次相続比較', icon: Scale, group: 'calculate' },
  { to: '/insurance', label: '生命保険', pageTitle: '生命保険シミュレーション', icon: Shield, group: 'planning' },
  { to: '/cash-gift', label: '現金贈与', pageTitle: '現金贈与シミュレーション', icon: Gift, group: 'planning' },
  { to: '/split', label: '遺産分割', pageTitle: '遺産分割シミュレーション', icon: Sliders, group: 'planning' },
  { to: '/timeline', label: '税務タイムライン', pageTitle: '相続税務タイムライン', icon: Clock, group: 'reference' },
  { to: '/table', label: '税率早見表', pageTitle: '相続税率早見表', icon: Table, group: 'reference' },
] as const;

const NAV_GROUPS = [
  { id: 'calculate', label: '税額計算' },
  { id: 'planning', label: '相続対策' },
  { id: 'reference', label: '資料' },
] as const;

interface HeaderProps {
  actions?: React.ReactNode;
}

const formatDate = (date: Date) =>
  `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;

export const Header = ({ actions }: HeaderProps) => {
  const { staffName, staffPhone, setStaffName, setStaffPhone } = useStaffInfo();
  const location = useLocation();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => window.localStorage.getItem('inheritance-sidebar-collapsed') === 'true',
  );
  const currentItem = NAV_ITEMS.find(item =>
    item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to),
  ) ?? NAV_ITEMS[0];
  const today = formatDate(new Date());

  useEffect(() => {
    document.title = `${currentItem.pageTitle} | ${COMPANY_INFO.name}`;
  }, [currentItem.pageTitle]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isMobileMenuOpen]);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(current => {
      const next = !current;
      window.localStorage.setItem('inheritance-sidebar-collapsed', String(next));
      return next;
    });
  };

  return (
    <>
      <a href="#main-content" className="skip-link no-print">本文へ移動</a>
      <button
        type="button"
        className={`inheritance-sidebar-backdrop no-print ${isMobileMenuOpen ? 'is-visible' : ''}`}
        aria-label="メニューを閉じる"
        tabIndex={isMobileMenuOpen ? 0 : -1}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      <aside className={`inheritance-sidebar no-print ${isSidebarCollapsed ? 'is-collapsed' : ''} ${isMobileMenuOpen ? 'is-open' : ''}`}>
        <div className="inheritance-sidebar-brand">
          <a href="/" className="inheritance-brand-link" title="業務支援ポータルへ戻る">
            <span className="inheritance-brand-icon"><Landmark aria-hidden="true" /></span>
            <span className="inheritance-brand-copy">
              <strong>相続税シミュレーター</strong>
              <small>INHERITANCE TAX TOOLS</small>
            </span>
          </a>
          <button
            ref={closeButtonRef}
            type="button"
            className="inheritance-sidebar-close"
            aria-label="メニューを閉じる"
            onClick={() => {
              setIsMobileMenuOpen(false);
              menuButtonRef.current?.focus();
            }}
          >
            <X aria-hidden="true" />
          </button>
        </div>

        <nav className="inheritance-sidebar-nav" aria-label="メインメニュー">
          {NAV_GROUPS.map(group => (
            <div className="inheritance-nav-group" key={group.id}>
              <p>{group.label}</p>
              {NAV_ITEMS.filter(item => item.group === group.id).map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  title={isSidebarCollapsed ? label : undefined}
                  className={({ isActive }) => `inheritance-nav-link ${isActive ? 'is-active' : ''}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon aria-hidden="true" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="inheritance-mobile-staff">
          <p>担当者情報</p>
          <label>
            <span>担当者名</span>
            <input value={staffName} onChange={e => setStaffName(e.target.value)} placeholder="担当者名" />
          </label>
          <label>
            <span>電話番号</span>
            <input type="tel" value={staffPhone} onChange={e => setStaffPhone(e.target.value)} placeholder="電話番号" />
          </label>
        </div>

        <div className="inheritance-sidebar-footer">
          <div className="inheritance-company">
            <strong>{COMPANY_INFO.name}</strong>
            <span>{COMPANY_INFO.postalCode} {COMPANY_INFO.address}</span>
            <span><Phone aria-hidden="true" />{COMPANY_INFO.phone}</span>
          </div>
        </div>

        <button
          type="button"
          className="inheritance-collapse-button"
          aria-label={isSidebarCollapsed ? 'サイドバーを展開する' : 'サイドバーを折りたたむ'}
          aria-expanded={!isSidebarCollapsed}
          onClick={toggleSidebar}
        >
          {isSidebarCollapsed ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
        </button>
      </aside>

      <header className={`inheritance-topbar no-print ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="inheritance-topbar-title">
          <button
            ref={menuButtonRef}
            type="button"
            className="inheritance-menu-button"
            aria-label="メニューを開く"
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu aria-hidden="true" />
          </button>
          <div>
            <span>相続税シミュレーター</span>
            <strong>{currentItem.pageTitle}</strong>
          </div>
        </div>

        <div className="inheritance-topbar-actions">
          <div className="inheritance-date" title={`作成日: ${today}`}>
            <CalendarDays aria-hidden="true" />
            <span>{today}</span>
          </div>
          <div className="inheritance-topbar-staff">
            <label>
              <span className="sr-only">担当者名</span>
              <input value={staffName} onChange={e => setStaffName(e.target.value)} placeholder="担当者名" />
            </label>
            <label>
              <span className="sr-only">電話番号</span>
              <input type="tel" value={staffPhone} onChange={e => setStaffPhone(e.target.value)} placeholder="電話番号" />
            </label>
          </div>
          {actions}
          <button type="button" onClick={() => window.print()} className="inheritance-print-button" aria-label="印刷">
            <Printer aria-hidden="true" />
            <span>印刷</span>
          </button>
        </div>
      </header>

      <div className="print-header-info">
        <div className="print-header-meta">
          {staffName && <p>担当: {staffName}</p>}
          {staffPhone && <p>TEL: {staffPhone}</p>}
          <p>作成日: {today}</p>
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
