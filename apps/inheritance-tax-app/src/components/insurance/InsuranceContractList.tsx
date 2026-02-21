import React from 'react';
import Plus from 'lucide-react/icons/plus';
import Trash2 from 'lucide-react/icons/trash-2';
import FileText from 'lucide-react/icons/file-text';
import FilePlus from 'lucide-react/icons/file-plus';
import { SectionHeader } from '../SectionHeader';
import { CurrencyInput } from '../CurrencyInput';
import type { InsuranceContract, BeneficiaryOption } from '../../types';
import { generateId } from '../../utils';

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

  const addContract = () => {
    const defaultBeneficiary = beneficiaryOptions[0];
    if (!defaultBeneficiary) return;
    onChange([
      ...contracts,
      {
        id: generateId(),
        category,
        beneficiaryId: defaultBeneficiary.id,
        beneficiaryLabel: defaultBeneficiary.label,
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

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <SectionHeader icon={config.icon} title={config.title} />

      {contracts.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">契約なし</p>
      ) : (
        <div className="space-y-4">
          {contracts.map((contract, index) => (
            <div
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
                    {beneficiaryOptions.map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* 支払保険料 */}
                <CurrencyInput
                  label="支払保険料"
                  value={contract.premium}
                  onChange={v => updateContract(contract.id, { premium: v })}
                  placeholder="例: 800"
                />

                {/* 受取保険金額 */}
                <CurrencyInput
                  label="受取保険金額"
                  value={contract.benefit}
                  onChange={v => updateContract(contract.id, { benefit: v })}
                  placeholder="例: 1000"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={addContract}
        disabled={beneficiaryOptions.length === 0}
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
