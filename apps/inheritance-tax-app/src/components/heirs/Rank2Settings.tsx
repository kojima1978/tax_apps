import React from 'react';
import { Trash2 } from 'lucide-react';
import type { HeirComposition, Heir } from '../../types';

interface Rank2SettingsProps {
    composition: HeirComposition;
    onChange: (composition: HeirComposition) => void;
    generateId: () => string;
}

export const Rank2Settings: React.FC<Rank2SettingsProps> = ({ composition, onChange, generateId }) => {
    // 第2順位：直系尊属を追加
    const addAscendant = (type: 'parent' | 'grandparent') => {
        const newAscendant: Heir = {
            id: generateId(),
            type,
        };
        onChange({
            ...composition,
            selectedRank: 'rank2',
            rank2Ascendants: [...composition.rank2Ascendants, newAscendant],
        });
    };

    // 第2順位：直系尊属を削除
    const removeAscendant = (id: string) => {
        onChange({
            ...composition,
            rank2Ascendants: composition.rank2Ascendants.filter(a => a.id !== id),
        });
    };

    if (composition.selectedRank !== 'rank2') return null;

    return (
        <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-700">第2順位：直系尊属</h3>
                <div className="flex gap-2">
                    <button
                        onClick={() => addAscendant('parent')}
                        className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                        親を追加
                    </button>
                    <button
                        onClick={() => addAscendant('grandparent')}
                        className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                        祖父母を追加
                    </button>
                </div>
            </div>
            {composition.rank2Ascendants.map((ascendant, index) => (
                <div key={ascendant.id} className="ml-4 mb-2 p-2 bg-gray-50 rounded flex items-center justify-between">
                    <span className="text-sm">
                        {ascendant.type === 'parent' ? '親' : '祖父母'} {index + 1}
                    </span>
                    <button
                        onClick={() => removeAscendant(ascendant.id)}
                        className="text-red-500 hover:text-red-700"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ))}
        </div>
    );
};
