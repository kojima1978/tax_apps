"use client";

import React from 'react';

const Header: React.FC = () => {
    const handlePrint = () => {
        if (typeof window !== 'undefined') {
            window.print();
        }
    };

    return (
        <header className="header-custom">
            <h1>贈与税 比較Webアプリ</h1>
            <button className="btn-print" onClick={handlePrint}>🖨 印刷</button>
        </header>
    );
};

export default Header;
