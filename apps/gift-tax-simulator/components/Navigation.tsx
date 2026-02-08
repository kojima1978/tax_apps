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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <a href="/" className="btn-portal" title="ポータルに戻る">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
                    <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                </svg>
            </a>
            <h1>{title}</h1>
        </div>
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
