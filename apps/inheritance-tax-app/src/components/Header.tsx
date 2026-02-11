import React from 'react';
import { Home } from 'lucide-react';
import { COMPANY_INFO } from '../constants';

export const Header: React.FC = () => {
  return (
    <header className="bg-gradient-to-r from-green-600 to-green-800 text-white py-6 px-8 shadow-lg no-print">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" title="ポータルに戻る" className="opacity-70 hover:opacity-100 transition-opacity">
              <Home className="w-6 h-6" />
            </a>
            <div>
              <h1 className="text-3xl font-bold mb-2">相続税早見表</h1>
              <p className="text-green-100 text-sm">Inheritance Tax Quick Reference Table</p>
            </div>
          </div>
          <address className="text-right text-sm not-italic">
            <p className="font-bold text-lg mb-1">{COMPANY_INFO.name}</p>
            <p className="text-green-100">{COMPANY_INFO.postalCode}</p>
            <p className="text-green-100">{COMPANY_INFO.address}</p>
            <p className="text-green-100 mt-1">TEL: {COMPANY_INFO.phone}</p>
          </address>
        </div>
      </div>
    </header>
  );
};
