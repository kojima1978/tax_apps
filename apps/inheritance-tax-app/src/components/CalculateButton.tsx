import React from 'react';
import Calculator from 'lucide-react/icons/calculator';

interface CalculateButtonProps {
  onClick: () => void;
}

export const CalculateButton: React.FC<CalculateButtonProps> = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full min-h-14 flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-lg font-bold transition-colors duration-200 cursor-pointer bg-green-700 text-white shadow-lg shadow-green-700/20 hover:bg-green-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-300 active:bg-green-900"
  >
    <Calculator className="w-5 h-5" aria-hidden="true" />
    計算する
  </button>
);
