import React, { memo } from 'react';
import type { HeirComposition } from '../../types';

interface SpouseSettingsProps {
    composition: HeirComposition;
    onChange: (composition: HeirComposition) => void;
}

export const SpouseSettings: React.FC<SpouseSettingsProps> = memo(({ composition, onChange }) => {
    return (
        <fieldset className="mb-6 p-4 bg-gray-50 rounded-lg border-0">
            <legend className="font-semibold text-gray-700 mb-3">配偶者の有無</legend>
            <div className="space-y-2" role="radiogroup" aria-label="配偶者の有無">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="radio"
                        name="spouse"
                        checked={composition.hasSpouse}
                        onChange={() => onChange({ ...composition, hasSpouse: true })}
                        className="w-4 h-4 accent-green-600"
                        aria-describedby="spouse-yes-desc"
                    />
                    <span className="text-sm" id="spouse-yes-desc">配偶者あり</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="radio"
                        name="spouse"
                        checked={!composition.hasSpouse}
                        onChange={() => onChange({ ...composition, hasSpouse: false })}
                        className="w-4 h-4 accent-green-600"
                        aria-describedby="spouse-no-desc"
                    />
                    <span className="text-sm" id="spouse-no-desc">配偶者なし</span>
                </label>
            </div>
        </fieldset>
    );
});

SpouseSettings.displayName = 'SpouseSettings';
