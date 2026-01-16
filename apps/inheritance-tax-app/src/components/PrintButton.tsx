import React from 'react';
import { Printer } from 'lucide-react';

export const PrintButton: React.FC = () => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="no-print">
      <button
        onClick={handlePrint}
        className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-md transition-colors"
      >
        <Printer className="w-5 h-5" />
        印刷
      </button>
    </div>
  );
};
