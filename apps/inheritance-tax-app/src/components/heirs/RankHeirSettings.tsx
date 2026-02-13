import React, { memo } from 'react';
import UserPlus from 'lucide-react/icons/user-plus';
import Trash2 from 'lucide-react/icons/trash-2';
import type { HeirComposition, Heir } from '../../types';
import { generateId } from '../../utils';

type RankConfig = {
    rankKey: 'rank1Children' | 'rank3Siblings';
    selectedRank: 'rank1' | 'rank3';
    primaryType: string;
    representativeType: string;
    sectionTitle: string;
    primaryLabel: string;
    representativeLabel: string;
};

export const RANK1_CONFIG: RankConfig = {
    rankKey: 'rank1Children',
    selectedRank: 'rank1',
    primaryType: 'child',
    representativeType: 'grandchild',
    sectionTitle: '第1順位：子供',
    primaryLabel: '子',
    representativeLabel: '孫',
};

export const RANK3_CONFIG: RankConfig = {
    rankKey: 'rank3Siblings',
    selectedRank: 'rank3',
    primaryType: 'sibling',
    representativeType: 'nephew_niece',
    sectionTitle: '第3順位：兄弟姉妹（2割加算）',
    primaryLabel: '兄弟姉妹',
    representativeLabel: '甥姪',
};

interface RankHeirSettingsProps {
    composition: HeirComposition;
    onChange: (composition: HeirComposition) => void;
    config: RankConfig;
}

export const RankHeirSettings: React.FC<RankHeirSettingsProps> = memo(({ composition, onChange, config }) => {
    const { rankKey, selectedRank, primaryType, representativeType, sectionTitle, primaryLabel, representativeLabel } = config;
    const heirs = composition[rankKey];

    const updateHeirs = (newHeirs: Heir[]) => onChange({ ...composition, [rankKey]: newHeirs });

    const addPrimary = () => {
        const newHeir: Heir = { id: generateId(), type: primaryType as Heir['type'], isDeceased: false, representatives: [] };
        onChange({ ...composition, selectedRank, [rankKey]: [...heirs, newHeir] });
    };

    const removePrimary = (id: string) => updateHeirs(heirs.filter(h => h.id !== id));

    const toggleDeceased = (id: string) =>
        updateHeirs(heirs.map(h => h.id === id ? { ...h, isDeceased: !h.isDeceased } : h));

    const addRepresentative = (parentId: string) =>
        updateHeirs(heirs.map(h => {
            if (h.id !== parentId) return h;
            const newRep: Heir = { id: generateId(), type: representativeType as Heir['type'] };
            return { ...h, representatives: [...(h.representatives || []), newRep] };
        }));

    const removeRepresentative = (parentId: string, repId: string) =>
        updateHeirs(heirs.map(h => {
            if (h.id !== parentId) return h;
            return { ...h, representatives: (h.representatives || []).filter(r => r.id !== repId) };
        }));

    if (composition.selectedRank !== selectedRank) return null;

    return (
        <section className="mb-6" aria-label={`${sectionTitle}の設定`}>
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-700">{sectionTitle}</h3>
                <button
                    onClick={addPrimary}
                    className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                    aria-label={`${primaryLabel}を追加`}
                >
                    <UserPlus className="w-4 h-4" aria-hidden="true" />
                    追加
                </button>
            </div>
            {heirs.map((heir, index) => (
                <div key={heir.id} className="ml-4 mb-3 p-3 bg-gray-50 rounded" role="group" aria-label={`${primaryLabel} ${index + 1}`}>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium">{primaryLabel} {index + 1}</span>
                            <label className="flex items-center gap-1 text-sm cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={heir.isDeceased}
                                    onChange={() => toggleDeceased(heir.id)}
                                    className="w-3 h-3 accent-green-600"
                                    aria-label={`${primaryLabel} ${index + 1} の死亡状態`}
                                />
                                死亡
                            </label>
                        </div>
                        <button
                            onClick={() => removePrimary(heir.id)}
                            className="text-red-500 hover:text-red-700"
                            aria-label={`${primaryLabel} ${index + 1} を削除`}
                        >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                    </div>
                    {heir.isDeceased && (
                        <div className="ml-4 mt-2">
                            <button
                                onClick={() => addRepresentative(heir.id)}
                                className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 mb-2"
                                aria-label={`${primaryLabel} ${index + 1} の${representativeLabel}を追加`}
                            >
                                {representativeLabel}を追加
                            </button>
                            {(heir.representatives || []).map((rep, rIndex) => (
                                <div key={rep.id} className="flex items-center justify-between text-sm mb-1">
                                    <span>{representativeLabel} {rIndex + 1}</span>
                                    <button
                                        onClick={() => removeRepresentative(heir.id, rep.id)}
                                        className="text-red-500 hover:text-red-700"
                                        aria-label={`${representativeLabel} ${rIndex + 1} を削除`}
                                    >
                                        <Trash2 className="w-3 h-3" aria-hidden="true" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </section>
    );
});

RankHeirSettings.displayName = 'RankHeirSettings';
