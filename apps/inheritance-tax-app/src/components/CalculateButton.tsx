import React from 'react';
import Calculator from 'lucide-react/icons/calculator';

interface CalculateButtonProps {
  onClick: () => void;
}

export const CalculateButton: React.FC<CalculateButtonProps> = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl text-lg font-bold transition-all duration-200 bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg shadow-green-600/30 hover:from-green-700 hover:to-green-800 hover:shadow-xl hover:shadow-green-700/30 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md"
  >
    <Calculator className="w-5 h-5" />
    計算する
  </button>
);
