import React from 'react';
import { Home } from 'lucide-react';

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
            <p className="font-bold text-lg mb-1">税理士法人マスエージェント</p>
            <p className="text-green-100">〒770-0002</p>
            <p className="text-green-100">徳島県徳島市春日２丁目３−３３</p>
            <p className="text-green-100 mt-1">TEL: 088-632-6228</p>
          </address>
        </div>
      </div>
    </header>
  );
};
