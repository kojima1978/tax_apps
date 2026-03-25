import React from 'react';
import AlertTriangle from 'lucide-react/icons/alert-triangle';

interface CautionBoxProps {
  items: readonly string[];
  className?: string;
}

export const CautionBox: React.FC<CautionBoxProps> = ({ items, className = '' }) => (
  <div className={`bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg p-4 alert-fade-in ${className}`.trim()}>
    <div className="flex items-center gap-2 mb-2">
      <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
      <h3 className="font-bold text-yellow-800">ご注意</h3>
    </div>
    <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  </div>
);
