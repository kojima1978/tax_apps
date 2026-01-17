'use client';

import { Plus, X, Landmark } from 'lucide-react';
import { useState } from 'react';

interface BankNameInputProps {
  bankNames: string[];
  onBankNamesChange: (names: string[]) => void;
  label?: string;
}

export default function BankNameInput({
  bankNames,
  onBankNamesChange,
  label = '通帳コピーの金融機関名',
}: BankNameInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    if (inputValue.trim() && !bankNames.includes(inputValue.trim())) {
      onBankNamesChange([...bankNames, inputValue.trim()]);
      setInputValue('');
    }
  };

  const handleRemove = (index: number) => {
    onBankNamesChange(bankNames.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
      <div className="flex items-center gap-2 mb-3">
        <Landmark className="w-5 h-5 text-amber-600" />
        <h4 className="font-bold text-slate-700">{label}</h4>
      </div>
      <p className="text-sm text-slate-500 mb-3">
        通帳コピーが必要な金融機関名を入力してください。複数ある場合は追加できます。
      </p>

      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="例: ○○銀行"
          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
        />
        <button
          onClick={handleAdd}
          disabled={!inputValue.trim()}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          追加
        </button>
      </div>

      {bankNames.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {bankNames.map((name, index) => (
            <div
              key={index}
              className="flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-amber-300 text-sm"
            >
              <span className="text-slate-700">{name}</span>
              <button
                onClick={() => handleRemove(index)}
                className="text-slate-400 hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
