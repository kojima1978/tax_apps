import React from 'react';
import Plus from 'lucide-react/icons/plus';
import Shield from 'lucide-react/icons/shield';
import Trash2 from 'lucide-react/icons/trash-2';
import { SectionHeader } from '../SectionHeader';
import type { BeneficiaryOption, DeemedAssetEntry, DeemedAssetKind } from '../../types';
import { INSURANCE_EXEMPT_PER_HEIR } from '../../constants';
import { DEEMED_ASSET_KINDS, DEEMED_ASSET_KIND_LABELS, formatCurrency, generateId } from '../../utils';
import { CARD, INPUT_FOCUS } from '../tableStyles';

interface DeemedAssetInputProps {
  entries: DeemedAssetEntry[];
  beneficiaryOptions: BeneficiaryOption[];
  /** 法定相続人の数（非課税枠の表示に使う） */
  heirCount: number;
  onChange: (entries: DeemedAssetEntry[]) => void;
}

/** 見出し行と入力行で同じ列幅を使う */
const GRID = 'grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,6.5rem)_1.5rem] items-center gap-2';
const FIELD = `w-full px-2 py-2 border border-gray-300 rounded-lg text-sm ${INPUT_FOCUS}`;

const COLUMN_LABELS = ['種別', '受取人', '受取額（万円）'] as const;

/**
 * 生命保険金・死亡退職金の受取額入力。
 *
 * これらは受取人固有の財産で遺産分割の対象外なので、遺産総額とは別に入力してもらい、
 * 課税対象額（非課税枠控除後）を受取人の取得額にだけ加算して税額を按分する。
 */
export const DeemedAssetInput: React.FC<DeemedAssetInputProps> = ({
  entries,
  beneficiaryOptions,
  heirCount,
  onChange,
}) => {
  const nonTaxableLimit = INSURANCE_EXEMPT_PER_HEIR * heirCount;
  const canAdd = beneficiaryOptions.length > 0;
  const total = entries.reduce((sum, entry) => sum + entry.amount, 0);

  const addEntry = () => {
    if (!canAdd) return;
    onChange([
      ...entries,
      { id: generateId(), kind: 'insurance', beneficiaryId: beneficiaryOptions[0].id, amount: 0 },
    ]);
  };

  const updateEntry = (id: string, updates: Partial<DeemedAssetEntry>) => {
    onChange(entries.map(entry => (entry.id === id ? { ...entry, ...updates } : entry)));
  };

  const removeEntry = (id: string) => {
    onChange(entries.filter(entry => entry.id !== id));
  };

  return (
    <div className={CARD}>
      <SectionHeader icon={Shield} title="生命保険金・死亡退職金" />
      <p className="-mt-2 mb-3 text-xs text-gray-500">
        受取人固有の財産のため、遺産総額とは分けて入力します。非課税枠を超える部分だけが受取人の取得額に加算されます。
      </p>

      {entries.length === 0 ? (
        <p className="py-3 text-center text-sm text-gray-400">入力なし（受取が無ければ空のままで構いません）</p>
      ) : (
        <div className="space-y-2">
          <div className={`${GRID} px-1 text-xs font-medium text-gray-500`}>
            {COLUMN_LABELS.map((label, index) => (
              <span key={label} className={index === 2 ? 'text-right' : ''}>{label}</span>
            ))}
            <span />
          </div>

          {entries.map((entry, index) => (
            <div key={entry.id} className={GRID}>
              <select
                value={entry.kind}
                onChange={e => updateEntry(entry.id, { kind: e.target.value as DeemedAssetKind })}
                aria-label={`${index + 1}行目の種別`}
                className={`${FIELD} bg-white`}
              >
                {DEEMED_ASSET_KINDS.map(kind => (
                  <option key={kind} value={kind}>{DEEMED_ASSET_KIND_LABELS[kind]}</option>
                ))}
              </select>

              <select
                value={entry.beneficiaryId}
                onChange={e => updateEntry(entry.id, { beneficiaryId: e.target.value })}
                aria-label={`${index + 1}行目の受取人`}
                className={`${FIELD} bg-white`}
              >
                {beneficiaryOptions.map(option => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>

              <input
                type="number"
                value={entry.amount || ''}
                onChange={e => updateEntry(entry.id, { amount: Number(e.target.value) || 0 })}
                onWheel={e => e.currentTarget.blur()}
                min={0}
                step={100}
                inputMode="numeric"
                aria-label={`${index + 1}行目の受取額（万円）`}
                placeholder="例: 3000"
                className={`${FIELD} text-right`}
              />

              <button
                type="button"
                onClick={() => removeEntry(entry.id)}
                className="text-gray-400 transition-colors hover:text-red-500"
                aria-label={`${index + 1}行目を削除`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={addEntry}
        disabled={!canAdd}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-green-300 px-4 py-2 text-sm font-medium text-green-600 transition-colors hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus className="h-4 w-4" />
        受取額を追加
      </button>

      <p className="mt-3 border-t border-gray-100 pt-2 text-xs text-gray-500">
        非課税枠は生命保険金・死亡退職金それぞれ
        <span className="font-medium text-gray-700">
          {' '}{INSURANCE_EXEMPT_PER_HEIR.toLocaleString()}万円 × {heirCount}人 ＝ {formatCurrency(nonTaxableLimit)}
        </span>
        {total > 0 && <> ／ 受取額合計 <span className="font-medium text-gray-700">{formatCurrency(total)}</span></>}
      </p>
    </div>
  );
};
