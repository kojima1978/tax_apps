import React, { memo } from 'react';
import { UserPlus, Trash2 } from 'lucide-react';
import type { HeirComposition, Heir } from '../../types';
import { generateId } from '../../utils';

interface Rank3SettingsProps {
    composition: HeirComposition;
    onChange: (composition: HeirComposition) => void;
}

export const Rank3Settings: React.FC<Rank3SettingsProps> = memo(({ composition, onChange }) => {
    // 第3順位：兄弟姉妹を追加
    const addSibling = () => {
        const newSibling: Heir = {
            id: generateId(),
            type: 'sibling',
            isDeceased: false,
            representatives: [],
        };
        onChange({
            ...composition,
            selectedRank: 'rank3',
            rank3Siblings: [...composition.rank3Siblings, newSibling],
        });
    };

    // 第3順位：兄弟姉妹を削除
    const removeSibling = (id: string) => {
        onChange({
            ...composition,
            rank3Siblings: composition.rank3Siblings.filter(s => s.id !== id),
        });
    };

    // 第3順位：兄弟姉妹の死亡状態を切り替え
    const toggleSiblingDeceased = (id: string) => {
        onChange({
            ...composition,
            rank3Siblings: composition.rank3Siblings.map(s =>
                s.id === id ? { ...s, isDeceased: !s.isDeceased } : s
            ),
        });
    };

    // 第3順位：甥姪（代襲相続人）を追加
    const addNephewNiece = (siblingId: string) => {
        onChange({
            ...composition,
            rank3Siblings: composition.rank3Siblings.map(s => {
                if (s.id === siblingId) {
                    const newNephewNiece: Heir = {
                        id: generateId(),
                        type: 'nephew_niece',
                        isDeceased: false
                    };
                    return {
                        ...s,
                        representatives: [...(s.representatives || []), newNephewNiece],
                    };
                }
                return s;
            }),
        });
    };

    // 第3順位：甥姪を削除
    const removeNephewNiece = (siblingId: string, nephewNieceId: string) => {
        onChange({
            ...composition,
            rank3Siblings: composition.rank3Siblings.map(s => {
                if (s.id === siblingId) {
                    return {
                        ...s,
                        representatives: (s.representatives || []).filter(n => n.id !== nephewNieceId),
                    };
                }
                return s;
            }),
        });
    };

    if (composition.selectedRank !== 'rank3') return null;

    return (
        <section className="mb-6" aria-label="第3順位：兄弟姉妹の設定">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-700">第3順位：兄弟姉妹（2割加算）</h3>
                <button
                    onClick={addSibling}
                    className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                    aria-label="兄弟姉妹を追加"
                >
                    <UserPlus className="w-4 h-4" aria-hidden="true" />
                    追加
                </button>
            </div>
            {composition.rank3Siblings.map((sibling, index) => (
                <div key={sibling.id} className="ml-4 mb-3 p-3 bg-gray-50 rounded" role="group" aria-label={`兄弟姉妹 ${index + 1}`}>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium">兄弟姉妹 {index + 1}</span>
                            <label className="flex items-center gap-1 text-sm cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={sibling.isDeceased}
                                    onChange={() => toggleSiblingDeceased(sibling.id)}
                                    className="w-3 h-3 accent-green-600"
                                    aria-label={`兄弟姉妹 ${index + 1} の死亡状態`}
                                />
                                死亡
                            </label>
                        </div>
                        <button
                            onClick={() => removeSibling(sibling.id)}
                            className="text-red-500 hover:text-red-700"
                            aria-label={`兄弟姉妹 ${index + 1} を削除`}
                        >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                    </div>
                    {sibling.isDeceased && (
                        <div className="ml-4 mt-2">
                            <button
                                onClick={() => addNephewNiece(sibling.id)}
                                className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 mb-2"
                                aria-label={`兄弟姉妹 ${index + 1} の甥姪を追加`}
                            >
                                甥姪を追加
                            </button>
                            {(sibling.representatives || []).map((nephewNiece, nIndex) => (
                                <div key={nephewNiece.id} className="flex items-center justify-between text-sm mb-1">
                                    <span>甥姪 {nIndex + 1}</span>
                                    <button
                                        onClick={() => removeNephewNiece(sibling.id, nephewNiece.id)}
                                        className="text-red-500 hover:text-red-700"
                                        aria-label={`甥姪 ${nIndex + 1} を削除`}
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

Rank3Settings.displayName = 'Rank3Settings';
