import React, { memo } from 'react';
import type { HeirComposition } from '../../types';

interface SpouseSettingsProps {
    composition: HeirComposition;
    onChange: (composition: HeirComposition) => void;
}

const SPOUSE_OPTIONS = [
    { value: true, label: '配偶者あり', id: 'spouse-yes-desc' },
    { value: false, label: '配偶者なし', id: 'spouse-no-desc' },
] as const;

export const SpouseSettings: React.FC<SpouseSettingsProps> = memo(({ composition, onChange }) => {
    return (
        <fieldset className="mb-6 p-4 bg-gray-50 rounded-lg border-0">
            <legend className="font-semibold text-gray-700 mb-3">配偶者の有無</legend>
            <div className="space-y-2" role="radiogroup" aria-label="配偶者の有無">
                {SPOUSE_OPTIONS.map((opt) => (
                    <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name="spouse"
                            checked={composition.hasSpouse === opt.value}
                            onChange={() => onChange({ ...composition, hasSpouse: opt.value })}
                            className="w-4 h-4 accent-green-600"
                            aria-describedby={opt.id}
                        />
                        <span className="text-sm" id={opt.id}>{opt.label}</span>
                    </label>
                ))}
            </div>
        </fieldset>
    );
});

SpouseSettings.displayName = 'SpouseSettings';
