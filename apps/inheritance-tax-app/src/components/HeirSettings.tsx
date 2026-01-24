import React from 'react';
import { Users } from 'lucide-react';
import type { HeirComposition } from '../types';
import { SpouseSettings } from './heirs/SpouseSettings';
import { Rank1Settings } from './heirs/Rank1Settings';
import { Rank2Settings } from './heirs/Rank2Settings';
import { Rank3Settings } from './heirs/Rank3Settings';

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

  return (
    <div className="bg-white rounded-lg shadow-md p-6 no-print">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-green-600" />
        <h2 className="text-xl font-bold text-gray-800">相続人の構成</h2>
      </div>

      {/* 配偶者 */}
      <SpouseSettings composition={composition} onChange={onChange} />

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

      {/* 各順位の設定コンポーネント */}
      <Rank1Settings composition={composition} onChange={onChange} generateId={generateId} />
      <Rank2Settings composition={composition} onChange={onChange} generateId={generateId} />
      <Rank3Settings composition={composition} onChange={onChange} generateId={generateId} />
    </div>
  );
};
