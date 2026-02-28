import React, { useState } from 'react';
import Plus from 'lucide-react/icons/plus';
import Trash2 from 'lucide-react/icons/trash-2';
import FileText from 'lucide-react/icons/file-text';
import FilePlus from 'lucide-react/icons/file-plus';
import { SectionHeader } from '../SectionHeader';
import { CurrencyInput } from '../CurrencyInput';
import type { InsuranceContract, BeneficiaryOption } from '../../types';
import { generateId } from '../../utils';
import { useUniqueOptions } from '../../hooks/useUniqueOptions';

interface InsuranceContractListProps {
  contracts: InsuranceContract[];
  category: 'existing' | 'new';
  beneficiaryOptions: BeneficiaryOption[];
  onChange: (contracts: InsuranceContract[]) => void;
}

const CATEGORY_CONFIG = {
  existing: { title: '既存保険契約', icon: FileText, color: 'green' },
  new: { title: '新規検討契約', icon: FilePlus, color: 'blue' },
} as const;

export const InsuranceContractList: React.FC<InsuranceContractListProps> = ({
  contracts,
  category,
  beneficiaryOptions,
  onChange,
}) => {
  const config = CATEGORY_CONFIG[category];
  const { nextAvailable, canAdd, getAvailableFor } = useUniqueOptions(contracts, beneficiaryOptions, c => c.beneficiaryId);

  const addContract = () => {
    if (!nextAvailable) return;
    onChange([
      ...contracts,
      {
        id: generateId(),
        category,
        beneficiaryId: nextAvailable.id,
        beneficiaryLabel: nextAvailable.label,
        benefit: 0,
        premium: 0,
      },
    ]);
  };

  const removeContract = (id: string) => {
    onChange(contracts.filter(c => c.id !== id));
  };

  const updateContract = (id: string, updates: Partial<InsuranceContract>) => {
    onChange(contracts.map(c => {
      if (c.id !== id) return c;
      // 受取人変更時はラベルも更新
      if (updates.beneficiaryId) {
        const opt = beneficiaryOptions.find(o => o.id === updates.beneficiaryId);
        if (opt) updates.beneficiaryLabel = opt.label;
      }
      return { ...c, ...updates };
    }));
  };

  // ── 倍率 ⇔ 保険金 双方向同期 ──
  const [stickyRatios, setStickyRatios] = useState<Record<string, number>>({});

  const handlePremiumChange = (id: string, newPremium: number) => {
    const ratio = stickyRatios[id];
    if (ratio > 0) {
      updateContract(id, { premium: newPremium, benefit: Math.round(newPremium * ratio / 100) });
    } else {
      updateContract(id, { premium: newPremium });
    }
  };

  const handleRatioChange = (id: string, ratio: number, premium: number) => {
    setStickyRatios(prev => ({ ...prev, [id]: ratio }));
    updateContract(id, { benefit: Math.round(premium * ratio / 100) });
  };

  const handleBenefitChange = (id: string, benefit: number) => {
    setStickyRatios(prev => ({ ...prev, [id]: 0 }));
    updateContract(id, { benefit });
  };

  const computeRatio = (c: InsuranceContract) =>
    c.premium > 0 && c.benefit > 0 ? Math.round(c.benefit / c.premium * 100) : 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <SectionHeader icon={config.icon} title={config.title} />

      {contracts.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">契約なし</p>
      ) : (
        <div className="space-y-4">
          {contracts.map((contract, index) => {
            const availableOptions = getAvailableFor(contract.id);

            return (<div
              key={contract.id}
              className={`border rounded-lg p-4 ${category === 'new' ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200'}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">
                  契約 {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeContract(contract.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  aria-label={`契約${index + 1}を削除`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {/* 受取人 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">受取人</label>
                  <select
                    value={contract.beneficiaryId}
                    onChange={e => updateContract(contract.id, { beneficiaryId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                  >
                    {availableOptions.map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* 支払保険料（新規契約のみ） */}
                {category === 'new' && (
                  <CurrencyInput
                    label="支払保険料"
                    value={contract.premium}
                    onChange={v => handlePremiumChange(contract.id, v)}
                    placeholder="例: 800"
                  />
                )}

                {/* 倍率（新規契約 & 保険料入力済みの場合） */}
                {category === 'new' && contract.premium > 0 && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700 whitespace-nowrap">倍率</label>
                    <input
                      type="number"
                      value={computeRatio(contract) || ''}
                      onChange={e => handleRatioChange(contract.id, Number(e.target.value) || 0, contract.premium)}
                      onWheel={e => e.currentTarget.blur()}
                      min={0}
                      step={10}
                      className="w-24 px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right text-sm"
                      placeholder="240"
                    />
                    <span className="text-sm text-gray-600">%</span>
                  </div>
                )}

                {/* 受取保険金額 */}
                <CurrencyInput
                  label="受取保険金額"
                  value={contract.benefit}
                  onChange={v => category === 'new' ? handleBenefitChange(contract.id, v) : updateContract(contract.id, { benefit: v })}
                  placeholder="例: 1000"
                />
              </div>
            </div>
          );})}
        </div>
      )}

      <button
        type="button"
        onClick={addContract}
        disabled={!canAdd}
        className={`mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          category === 'new'
            ? 'border-2 border-dashed border-blue-300 text-blue-600 hover:bg-blue-50'
            : 'border-2 border-dashed border-green-300 text-green-600 hover:bg-green-50'
        } disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        <Plus className="w-4 h-4" />
        契約を追加
      </button>
    </div>
  );
};
