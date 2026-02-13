import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Table, Calculator } from 'lucide-react';
import { COMPANY_INFO } from '../constants';

const NAV_ITEMS = [
  { to: '/', label: '早見表', icon: Table },
  { to: '/calculator', label: '相続税計算', icon: Calculator },
] as const;

export const Header: React.FC = () => {
  return (
    <header className="bg-gradient-to-r from-green-600 to-green-800 text-white shadow-lg no-print">
      <div className="max-w-7xl mx-auto py-6 px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" title="ポータルに戻る" className="opacity-70 hover:opacity-100 transition-opacity">
              <Home className="w-6 h-6" />
            </a>
            <div>
              <h1 className="text-3xl font-bold mb-2">相続税シミュレーター</h1>
              <p className="text-green-100 text-sm">Inheritance Tax Simulator</p>
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

      <nav className="max-w-7xl mx-auto px-8 pb-0">
        <div className="flex gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white text-green-700'
                    : 'text-green-100 hover:bg-green-700'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </header>
  );
};
