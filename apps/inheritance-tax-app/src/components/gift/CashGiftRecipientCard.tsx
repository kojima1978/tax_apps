import { memo } from 'react';
import Trash2 from 'lucide-react/icons/trash-2';
import type { GiftRecipient } from '../../types';
import { calculateGiftTaxPerYear, formatCurrency } from '../../utils';
import { INPUT_FOCUS } from '../tableStyles';

export type RecipientOption = {
  id: string;
  label: string;
};

interface CashGiftRecipientCardProps {
  recipient: GiftRecipient;
  index: number;
  availableOptions: RecipientOption[];
  recipientOptions: RecipientOption[];
  selectedSourceId: string;
  onRemove: (id: string) => void;
  onSelectSource: (id: string, sourceId: string) => void;
  onUpdate: (id: string, updates: Partial<GiftRecipient>) => void;
}

const YEAR_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1);
const TAX_TYPE_OPTIONS: GiftRecipient['taxType'][] = ['general', 'special'];
const CONTROL_CLASS = `h-11 w-full border border-gray-300 rounded-lg ${INPUT_FOCUS} bg-white text-base transition-colors hover:border-green-400`;

export const CashGiftRecipientCard = memo(function CashGiftRecipientCard({
  recipient,
  index,
  availableOptions,
  recipientOptions,
  selectedSourceId,
  onRemove,
  onSelectSource,
  onUpdate,
}: CashGiftRecipientCardProps) {
  const giftTaxPerYear = calculateGiftTaxPerYear(recipient.annualAmount, recipient.taxType);
  const totalGift = recipient.annualAmount * recipient.years;
  const totalGiftTax = giftTaxPerYear * recipient.years;

  return (
    <div className="border border-green-200 bg-green-50/30 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">
            受取人 {index + 1}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            recipient.isHeir
              ? 'bg-green-100 text-green-700'
              : 'bg-orange-100 text-orange-700'
          }`}>
            {recipient.isHeir ? '相続人' : '関係者'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onRemove(recipient.id)}
          className="text-gray-400 hover:text-red-500 transition-colors"
          aria-label={`受取人${index + 1}を削除`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        <div
          className={
            recipient.isHeir
              ? 'grid grid-cols-1 md:grid-cols-[160px_220px_140px] gap-3 items-start justify-start'
              : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[210px_220px_180px_190px_140px] gap-3 items-start justify-start'
          }
        >
          {/* 受贈者 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">受贈者</label>
            {recipient.isHeir ? (
              <select
                value={recipient.heirId}
                onChange={e => onUpdate(recipient.id, { heirId: e.target.value })}
                className={`${CONTROL_CLASS} px-3 text-right font-medium`}
              >
                {availableOptions.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={recipient.heirLabel}
                onChange={e => onUpdate(recipient.id, { heirLabel: e.target.value })}
                placeholder="例: 長男の配偶者"
                className={`${CONTROL_CLASS} px-3`}
              />
            )}
          </div>

          {/* 財源相続人（相続人以外のみ） */}
          {!recipient.isHeir && recipientOptions.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">財源相続人</label>
              <select
                value={selectedSourceId}
                onChange={e => onSelectSource(recipient.id, e.target.value)}
                className={`${CONTROL_CLASS} px-3 text-right`}
              >
                {recipientOptions.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.label}の相続分から</option>
                ))}
              </select>
            </div>
          )}

          {/* 贈与税率区分（相続人以外のみ選択可） */}
          {!recipient.isHeir && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">贈与税率</label>
              <div className="grid h-11 grid-cols-2 gap-1 rounded-lg border border-gray-300 bg-white p-1">
                {TAX_TYPE_OPTIONS.map(type => (
                  <label
                    key={type}
                    className={`flex cursor-pointer items-center justify-center rounded-md px-2 text-sm font-medium transition-colors ${
                      recipient.taxType === type
                        ? 'bg-green-600 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-green-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`taxType-${recipient.id}`}
                      value={type}
                      checked={recipient.taxType === type}
                      onChange={() => onUpdate(recipient.id, { taxType: type })}
                      className="sr-only"
                    />
                    <span>
                      {type === 'general' ? '一般' : '特例'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* 年間贈与額 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">年間贈与額</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={recipient.annualAmount || ''}
                onChange={e => onUpdate(recipient.id, { annualAmount: Number(e.target.value) || 0 })}
                onWheel={e => e.currentTarget.blur()}
                min={0}
                step={100}
                inputMode="numeric"
                placeholder="例: 500"
                className={`${CONTROL_CLASS} px-3 text-right font-medium`}
              />
              <span className="text-gray-600 whitespace-nowrap font-medium">万円</span>
            </div>
          </div>

          {/* 贈与年数 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">贈与年数</label>
            <div className="flex items-center gap-2">
              <select
                value={recipient.years || ''}
                onChange={e => onUpdate(recipient.id, { years: Number(e.target.value) || 0 })}
                className={`${CONTROL_CLASS} px-3 text-right font-medium`}
              >
                <option value="">選択</option>
                {YEAR_OPTIONS.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <span className="text-gray-600 whitespace-nowrap font-medium">年</span>
            </div>
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
              <span>年間贈与税（{recipient.taxType === 'general' ? '一般' : '特例'}）</span>
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
});
