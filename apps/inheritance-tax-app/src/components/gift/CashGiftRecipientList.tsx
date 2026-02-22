import React from 'react';
import Plus from 'lucide-react/icons/plus';
import Trash2 from 'lucide-react/icons/trash-2';
import Gift from 'lucide-react/icons/gift';
import { SectionHeader } from '../SectionHeader';
import { CurrencyInput } from '../CurrencyInput';
import type { GiftRecipient } from '../../types';
import { generateId, formatCurrency, calculateGiftTaxPerYear } from '../../utils';
import { useUniqueOptions } from '../../hooks/useUniqueOptions';

interface CashGiftRecipientListProps {
  recipients: GiftRecipient[];
  recipientOptions: { id: string; label: string }[];
  onChange: (recipients: GiftRecipient[]) => void;
}

export const CashGiftRecipientList: React.FC<CashGiftRecipientListProps> = ({
  recipients,
  recipientOptions,
  onChange,
}) => {
  const { nextAvailable, canAdd, getAvailableFor } = useUniqueOptions(recipients, recipientOptions, r => r.heirId);

  const addRecipient = () => {
    if (!nextAvailable) return;
    onChange([
      ...recipients,
      {
        id: generateId(),
        heirId: nextAvailable.id,
        heirLabel: nextAvailable.label,
        annualAmount: 0,
        years: 0,
      },
    ]);
  };

  const removeRecipient = (id: string) => {
    onChange(recipients.filter(r => r.id !== id));
  };

  const updateRecipient = (id: string, updates: Partial<GiftRecipient>) => {
    onChange(recipients.map(r => {
      if (r.id !== id) return r;
      if (updates.heirId) {
        const opt = recipientOptions.find(o => o.id === updates.heirId);
        if (opt) updates.heirLabel = opt.label;
      }
      return { ...r, ...updates };
    }));
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <SectionHeader icon={Gift} title="贈与受取人" />

      {recipients.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">受取人なし</p>
      ) : (
        <div className="space-y-4">
          {recipients.map((recipient, index) => {
            const availableOptions = getAvailableFor(recipient.id);
            const giftTaxPerYear = calculateGiftTaxPerYear(recipient.annualAmount);
            const totalGift = recipient.annualAmount * recipient.years;
            const totalGiftTax = giftTaxPerYear * recipient.years;

            return (
              <div
                key={recipient.id}
                className="border border-green-200 bg-green-50/30 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">
                    受取人 {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeRecipient(recipient.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    aria-label={`受取人${index + 1}を削除`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  {/* 受取人 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">受贈者</label>
                    <select
                      value={recipient.heirId}
                      onChange={e => updateRecipient(recipient.id, { heirId: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-right text-lg"
                    >
                      {availableOptions.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* 年間贈与額 */}
                  <CurrencyInput
                    label="年間贈与額"
                    value={recipient.annualAmount}
                    onChange={v => updateRecipient(recipient.id, { annualAmount: v })}
                    placeholder="例: 500"
                  />

                  {/* 贈与年数 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">贈与年数</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={1}
                        max={30}
                        step={1}
                        value={recipient.years || ''}
                        onChange={e => updateRecipient(recipient.id, { years: Math.min(30, Math.max(0, parseInt(e.target.value) || 0)) })}
                        onWheel={e => e.currentTarget.blur()}
                        placeholder="例: 10"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-right text-lg"
                      />
                      <span className="text-gray-600 whitespace-nowrap font-medium">年</span>
                    </div>
                  </div>

                  {/* プレビュー行 */}
                  {recipient.annualAmount > 0 && (
                    <div className="bg-white rounded px-3 py-2 text-xs text-gray-600 space-y-0.5">
                      <div className="flex justify-between">
                        <span>総贈与額（{recipient.years}年）</span>
                        <span className="font-medium">{formatCurrency(totalGift)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>年間贈与税</span>
                        <span className="font-medium">{giftTaxPerYear > 0 ? formatCurrency(giftTaxPerYear) : '非課税'}</span>
                      </div>
                      {totalGiftTax > 0 && (
                        <div className="flex justify-between text-red-600">
                          <span>総贈与税（{recipient.years}年）</span>
                          <span className="font-medium">{formatCurrency(totalGiftTax)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={addRecipient}
        disabled={!canAdd}
        className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border-2 border-dashed border-green-300 text-green-600 hover:bg-green-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Plus className="w-4 h-4" />
        受取人を追加
      </button>
    </div>
  );
};
