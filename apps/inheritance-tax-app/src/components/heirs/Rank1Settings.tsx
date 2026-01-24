import React from 'react';
import { UserPlus, Trash2 } from 'lucide-react';
import type { HeirComposition, Heir } from '../../types';

interface Rank1SettingsProps {
    composition: HeirComposition;
    onChange: (composition: HeirComposition) => void;
    generateId: () => string;
}

export const Rank1Settings: React.FC<Rank1SettingsProps> = ({ composition, onChange, generateId }) => {
    // 第1順位：子供を追加
    const addChild = () => {
        const newChild: Heir = {
            id: generateId(),
            type: 'child',
            isDeceased: false,
            representatives: [],
        };
        onChange({
            ...composition,
            selectedRank: 'rank1',
            rank1Children: [...composition.rank1Children, newChild],
        });
    };

    // 第1順位：子供を削除
    const removeChild = (id: string) => {
        onChange({
            ...composition,
            rank1Children: composition.rank1Children.filter(c => c.id !== id),
        });
    };

    // 第1順位：子供の死亡状態を切り替え
    const toggleChildDeceased = (id: string) => {
        onChange({
            ...composition,
            rank1Children: composition.rank1Children.map(c =>
                c.id === id ? { ...c, isDeceased: !c.isDeceased } : c
            ),
        });
    };

    // 第1順位：孫（代襲相続人）を追加
    const addGrandchild = (childId: string) => {
        onChange({
            ...composition,
            rank1Children: composition.rank1Children.map(c => {
                if (c.id === childId) {
                    const newGrandchild: Heir = {
                        id: generateId(),
                        type: 'grandchild',
                    };
                    return {
                        ...c,
                        representatives: [...(c.representatives || []), newGrandchild],
                    };
                }
                return c;
            }),
        });
    };

    // 第1順位：孫を削除
    const removeGrandchild = (childId: string, grandchildId: string) => {
        onChange({
            ...composition,
            rank1Children: composition.rank1Children.map(c => {
                if (c.id === childId) {
                    return {
                        ...c,
                        representatives: (c.representatives || []).filter(g => g.id !== grandchildId),
                    };
                }
                return c;
            }),
        });
    };

    if (composition.selectedRank !== 'rank1') return null;

    return (
        <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-700">第1順位：子供</h3>
                <button
                    onClick={addChild}
                    className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                >
                    <UserPlus className="w-4 h-4" />
                    追加
                </button>
            </div>
            {composition.rank1Children.map((child, index) => (
                <div key={child.id} className="ml-4 mb-3 p-3 bg-gray-50 rounded">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium">子 {index + 1}</span>
                            <label className="flex items-center gap-1 text-sm">
                                <input
                                    type="checkbox"
                                    checked={child.isDeceased}
                                    onChange={() => toggleChildDeceased(child.id)}
                                    className="w-3 h-3"
                                />
                                死亡
                            </label>
                        </div>
                        <button
                            onClick={() => removeChild(child.id)}
                            className="text-red-500 hover:text-red-700"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                    {child.isDeceased && (
                        <div className="ml-4 mt-2">
                            <button
                                onClick={() => addGrandchild(child.id)}
                                className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 mb-2"
                            >
                                孫を追加
                            </button>
                            {(child.representatives || []).map((grandchild, gIndex) => (
                                <div key={grandchild.id} className="flex items-center justify-between text-sm mb-1">
                                    <span>孫 {gIndex + 1}</span>
                                    <button
                                        onClick={() => removeGrandchild(child.id, grandchild.id)}
                                        className="text-red-500 hover:text-red-700"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};
