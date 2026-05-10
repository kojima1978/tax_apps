'use client';

import { Printer } from 'lucide-react';

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-100 bg-emerald-700/50 border border-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors no-print cursor-pointer"
    >
      <Printer className="w-4 h-4" />
      印刷
    </button>
  );
}
