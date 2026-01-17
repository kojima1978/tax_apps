'use client';

import { Plus, X, Shield } from 'lucide-react';
import { useState } from 'react';

interface InsuranceCompanyInputProps {
  lifeInsuranceCompanies: string[];
  onLifeInsuranceCompaniesChange: (names: string[]) => void;
  earthquakeInsuranceCompanies: string[];
  onEarthquakeInsuranceCompaniesChange: (names: string[]) => void;
}

export default function InsuranceCompanyInput({
  lifeInsuranceCompanies,
  onLifeInsuranceCompaniesChange,
  earthquakeInsuranceCompanies,
  onEarthquakeInsuranceCompaniesChange,
}: InsuranceCompanyInputProps) {
  const [lifeInputValue, setLifeInputValue] = useState('');
  const [earthquakeInputValue, setEarthquakeInputValue] = useState('');

  const handleAddLife = () => {
    if (lifeInputValue.trim() && !lifeInsuranceCompanies.includes(lifeInputValue.trim())) {
      onLifeInsuranceCompaniesChange([...lifeInsuranceCompanies, lifeInputValue.trim()]);
      setLifeInputValue('');
    }
  };

  const handleRemoveLife = (index: number) => {
    onLifeInsuranceCompaniesChange(lifeInsuranceCompanies.filter((_, i) => i !== index));
  };

  const handleAddEarthquake = () => {
    if (earthquakeInputValue.trim() && !earthquakeInsuranceCompanies.includes(earthquakeInputValue.trim())) {
      onEarthquakeInsuranceCompaniesChange([...earthquakeInsuranceCompanies, earthquakeInputValue.trim()]);
      setEarthquakeInputValue('');
    }
  };

  const handleRemoveEarthquake = (index: number) => {
    onEarthquakeInsuranceCompaniesChange(earthquakeInsuranceCompanies.filter((_, i) => i !== index));
  };

  const handleLifeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddLife();
    }
  };

  const handleEarthquakeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddEarthquake();
    }
  };

  return (
    <div className="bg-green-50 p-4 rounded-lg border border-green-200 space-y-6">
      <div className="flex items-center gap-2 mb-1">
        <Shield className="w-5 h-5 text-green-600" />
        <h4 className="font-bold text-slate-700">保険会社名の入力</h4>
      </div>

      {/* 生命保険 */}
      <div>
        <p className="text-sm text-slate-600 font-medium mb-2">生命保険料控除証明書の発行元</p>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={lifeInputValue}
            onChange={(e) => setLifeInputValue(e.target.value)}
            onKeyDown={handleLifeKeyDown}
            placeholder="例: ○○生命保険"
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
          <button
            onClick={handleAddLife}
            disabled={!lifeInputValue.trim()}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            追加
          </button>
        </div>
        {lifeInsuranceCompanies.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {lifeInsuranceCompanies.map((name, index) => (
              <div
                key={index}
                className="flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-green-300 text-sm"
              >
                <span className="text-slate-700">{name}</span>
                <button
                  onClick={() => handleRemoveLife(index)}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 地震保険 */}
      <div>
        <p className="text-sm text-slate-600 font-medium mb-2">地震（損害）保険料控除証明書の発行元</p>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={earthquakeInputValue}
            onChange={(e) => setEarthquakeInputValue(e.target.value)}
            onKeyDown={handleEarthquakeKeyDown}
            placeholder="例: △△損害保険"
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
          <button
            onClick={handleAddEarthquake}
            disabled={!earthquakeInputValue.trim()}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            追加
          </button>
        </div>
        {earthquakeInsuranceCompanies.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {earthquakeInsuranceCompanies.map((name, index) => (
              <div
                key={index}
                className="flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-green-300 text-sm"
              >
                <span className="text-slate-700">{name}</span>
                <button
                  onClick={() => handleRemoveEarthquake(index)}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
