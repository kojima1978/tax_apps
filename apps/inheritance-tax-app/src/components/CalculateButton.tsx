import React from 'react';
import Calculator from 'lucide-react/icons/calculator';

interface CalculateButtonProps {
  onClick: () => void;
}

export const CalculateButton: React.FC<CalculateButtonProps> = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-base font-bold transition-colors bg-green-600 text-white hover:bg-green-700"
  >
    <Calculator className="w-5 h-5" />
    計算する
  </button>
);
