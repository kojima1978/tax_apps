"use client";

import Link from 'next/link';

const Header = () => {
    const handlePrint = () => {
        window.print();
    };

    return (
        <header className="header-custom">
            <h1>贈与税 比較Webアプリ</h1>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Link href="/table" className="btn-nav">
                    早見表
                </Link>
                <button className="btn-print" onClick={handlePrint}>🖨 印刷</button>
            </div>
        </header>
    );
};

export default Header;
