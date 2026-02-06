"use client";

import Link from 'next/link';

const Header = () => {
    const handlePrint = () => {
        window.print();
    };

    return (
        <header className="header-custom">
            <h1>贈与税シミュレーター</h1>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span className="btn-nav active">贈与税</span>
                <Link href="/table" className="btn-nav">早見表</Link>
                <Link href="/real-estate" className="btn-nav">間接税</Link>
                <button className="btn-print" style={{ marginLeft: '1rem' }} onClick={handlePrint}>印刷</button>
            </div>
        </header>
    );
};

export default Header;
