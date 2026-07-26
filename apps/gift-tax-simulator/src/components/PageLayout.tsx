import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Navigation from './Navigation';
import PrintHeader from './PrintHeader';
import TaxBasisNotice from './TaxBasisNotice';

type Props = {
    className?: string;
    printTitle?: string;
    children: React.ReactNode;
};

const PageLayout = ({ className, printTitle: providedPrintTitle, children }: Props) => {
    const { pathname } = useLocation();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
        () => window.localStorage.getItem('gift-tax-sidebar-collapsed') === 'true',
    );
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const toggleSidebar = () => {
        setIsSidebarCollapsed(current => {
            const next = !current;
            window.localStorage.setItem('gift-tax-sidebar-collapsed', String(next));
            return next;
        });
    };

    const printTitle = providedPrintTitle ?? (pathname.includes('/year-comparison')
        ? '分割年数別 税額比較'
        : pathname.includes('/table')
            ? '贈与税 早見表'
            : pathname.includes('/acquisition-tax')
                ? '不動産取得税シミュレーション'
                : pathname.includes('/registration-tax')
                    ? '登録免許税シミュレーション'
                    : '贈与税シミュレーション');

    return (
        <div
            className={`container-custom app-shell ${isSidebarCollapsed ? 'sidebar-collapsed' : ''} ${className ?? ''}`}
        >
            <Navigation
                isSidebarCollapsed={isSidebarCollapsed}
                isMobileMenuOpen={isMobileMenuOpen}
                onSidebarToggle={toggleSidebar}
                onMobileMenuChange={setIsMobileMenuOpen}
            />
            <main id="main-content" className="app-main">
                <PrintHeader title={printTitle} />
                <TaxBasisNotice />
                {children}
            </main>
        </div>
    );
};

export default PageLayout;
