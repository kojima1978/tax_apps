import React from 'react';
import type { HeirComposition } from '../../types';

interface SpouseSettingsProps {
    composition: HeirComposition;
    onChange: (composition: HeirComposition) => void;
}

export const SpouseSettings: React.FC<SpouseSettingsProps> = ({ composition, onChange }) => {
    return (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-3">配偶者の有無</h3>
            <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="radio"
                        name="spouse"
                        checked={composition.hasSpouse}
                        onChange={() => onChange({ ...composition, hasSpouse: true })}
                        className="w-4 h-4 text-green-600"
                    />
                    <span className="text-sm">配偶者あり</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="radio"
                        name="spouse"
                        checked={!composition.hasSpouse}
                        onChange={() => onChange({ ...composition, hasSpouse: false })}
                        className="w-4 h-4 text-green-600"
                    />
                    <span className="text-sm">配偶者なし</span>
                </label>
            </div>
        </div>
    );
};
