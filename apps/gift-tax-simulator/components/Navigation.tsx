'use client';

import Link from 'next/link';

type Page = 'gift-tax' | 'table' | 'real-estate';

type NavigationProps = {
    title: string;
    activePage: Page;
};

const NAV_ITEMS: { page: Page; href: string; label: string }[] = [
    { page: 'gift-tax', href: '/', label: '贈与税' },
    { page: 'table', href: '/table', label: '早見表' },
    { page: 'real-estate', href: '/real-estate', label: '間接税' },
];

const Navigation = ({ title, activePage }: NavigationProps) => (
    <header className="header-custom">
        <h1>{title}</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
            {NAV_ITEMS.map(({ page, href, label }) =>
                page === activePage ? (
                    <span key={page} className="btn-nav active">{label}</span>
                ) : (
                    <Link key={page} href={href} className="btn-nav">{label}</Link>
                )
            )}
            <button className="btn-print" style={{ marginLeft: '1rem' }} onClick={() => window.print()}>
                印刷
            </button>
        </div>
    </header>
);

export default Navigation;
