import React from 'react';
import { Users, UserPlus, Trash2 } from 'lucide-react';
import type { HeirComposition, Heir } from '../types';

interface HeirSettingsProps {
  composition: HeirComposition;
  onChange: (composition: HeirComposition) => void;
}

export const HeirSettings: React.FC<HeirSettingsProps> = ({ composition, onChange }) => {
  const generateId = () => Math.random().toString(36).substring(7);

  // 順位を選択
  const selectRank = (rank: 'none' | 'rank1' | 'rank2' | 'rank3') => {
    onChange({ ...composition, selectedRank: rank });
  };

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

  return (
    <div className="bg-white rounded-lg shadow-md p-6 no-print">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-green-600" />
        <h2 className="text-xl font-bold text-gray-800">相続人の構成</h2>
      </div>

      {/* 配偶者 */}
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

      {/* 順位選択 */}
      <div className="mb-6 p-4 bg-green-50 rounded-lg">
        <h3 className="font-semibold text-gray-700 mb-3">相続人の順位を選択</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="rank"
              checked={composition.selectedRank === 'none'}
              onChange={() => selectRank('none')}
              className="w-4 h-4"
            />
            <span className="text-sm">選択なし（配偶者のみ）</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="rank"
              checked={composition.selectedRank === 'rank1'}
              onChange={() => selectRank('rank1')}
              className="w-4 h-4"
            />
            <span className="text-sm">第1順位：子供（代襲相続：孫）</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="rank"
              checked={composition.selectedRank === 'rank2'}
              onChange={() => selectRank('rank2')}
              className="w-4 h-4"
            />
            <span className="text-sm">第2順位：直系尊属（親・祖父母）</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="rank"
              checked={composition.selectedRank === 'rank3'}
              onChange={() => selectRank('rank3')}
              className="w-4 h-4"
            />
            <span className="text-sm">第3順位：兄弟姉妹（甥姪）※2割加算</span>
          </label>
        </div>
      </div>

      {/* 第1順位：子供 */}
      {composition.selectedRank === 'rank1' && (
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
      )}

      {/* 第2順位：直系尊属 */}
      {composition.selectedRank === 'rank2' && (
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
      )}

      {/* 第3順位：兄弟姉妹 */}
      {composition.selectedRank === 'rank3' && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-700">第3順位：兄弟姉妹（2割加算）</h3>
            <button
              onClick={addSibling}
              className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
            >
              <UserPlus className="w-4 h-4" />
              追加
            </button>
          </div>
          {composition.rank3Siblings.map((sibling, index) => (
            <div key={sibling.id} className="ml-4 mb-3 p-3 bg-gray-50 rounded">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">兄弟姉妹 {index + 1}</span>
                  <label className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={sibling.isDeceased}
                      onChange={() => toggleSiblingDeceased(sibling.id)}
                      className="w-3 h-3"
                    />
                    死亡
                  </label>
                </div>
                <button
                  onClick={() => removeSibling(sibling.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {sibling.isDeceased && (
                <div className="ml-4 mt-2">
                  <button
                    onClick={() => addNephewNiece(sibling.id)}
                    className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 mb-2"
                  >
                    甥姪を追加
                  </button>
                  {(sibling.representatives || []).map((nephewNiece, nIndex) => (
                    <div key={nephewNiece.id} className="flex items-center justify-between text-sm mb-1">
                      <span>甥姪 {nIndex + 1}</span>
                      <button
                        onClick={() => removeNephewNiece(sibling.id, nephewNiece.id)}
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
      )}
    </div>
  );
};
