'use client';

import { Plus, X, Building2 } from 'lucide-react';
import { useState } from 'react';

interface CompanyNameInputProps {
  companyNames: string[];
  onCompanyNamesChange: (names: string[]) => void;
}

export default function CompanyNameInput({
  companyNames,
  onCompanyNamesChange,
}: CompanyNameInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    if (inputValue.trim() && !companyNames.includes(inputValue.trim())) {
      onCompanyNamesChange([...companyNames, inputValue.trim()]);
      setInputValue('');
    }
  };

  const handleRemove = (index: number) => {
    onCompanyNamesChange(companyNames.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
      <div className="flex items-center gap-2 mb-3">
        <Building2 className="w-5 h-5 text-blue-600" />
        <h4 className="font-bold text-slate-700">源泉徴収票の発行元（会社名）</h4>
      </div>
      <p className="text-sm text-slate-500 mb-3">
        給与所得の源泉徴収票を発行した会社名を入力してください。複数ある場合は追加できます。
      </p>

      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="例: 株式会社○○"
          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          onClick={handleAdd}
          disabled={!inputValue.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          追加
        </button>
      </div>

      {companyNames.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {companyNames.map((name, index) => (
            <div
              key={index}
              className="flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-blue-300 text-sm"
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
