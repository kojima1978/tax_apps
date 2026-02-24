import React from 'react';

interface CautionBoxProps {
  items: readonly string[];
  className?: string;
}

export const CautionBox: React.FC<CautionBoxProps> = ({ items, className = '' }) => (
  <div className={`bg-yellow-50 border-l-4 border-yellow-400 p-4 ${className}`.trim()}>
    <h3 className="font-bold text-yellow-800 mb-2">ご注意</h3>
    <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  </div>
);
