import React, { memo } from 'react';
import Users from 'lucide-react/icons/users';
import type { HeirComposition } from '../types';
import { SectionHeader } from './SectionHeader';
import { SpouseSettings } from './heirs/SpouseSettings';
import { Rank2Settings } from './heirs/Rank2Settings';
import { RankHeirSettings, RANK1_CONFIG, RANK3_CONFIG } from './heirs/RankHeirSettings';

const RANK_OPTIONS = [
  { value: 'none', id: 'rank-none-desc', label: '選択なし（配偶者のみ）' },
  { value: 'rank1', id: 'rank-1-desc', label: '第1順位：子供（代襲相続：孫）' },
  { value: 'rank2', id: 'rank-2-desc', label: '第2順位：直系尊属（親・祖父母）' },
  { value: 'rank3', id: 'rank-3-desc', label: '第3順位：兄弟姉妹（甥姪）※2割加算' },
] as const;

interface HeirSettingsProps {
  composition: HeirComposition;
  onChange: (composition: HeirComposition) => void;
}

export const HeirSettings: React.FC<HeirSettingsProps> = memo(({ composition, onChange }) => {
  const selectRank = (rank: 'none' | 'rank1' | 'rank2' | 'rank3') => {
    onChange({ ...composition, selectedRank: rank });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 no-print">
      <SectionHeader icon={Users} title="相続人の構成" />

      {/* 配偶者 */}
      <SpouseSettings composition={composition} onChange={onChange} />

      {/* 順位選択 */}
      <fieldset className="mb-6 p-4 bg-green-50 rounded-lg border-0">
        <legend className="font-semibold text-gray-700 mb-3">相続人の順位を選択</legend>
        <div className="space-y-2" role="radiogroup" aria-label="相続人の順位">
          {RANK_OPTIONS.map(opt => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="rank"
                checked={composition.selectedRank === opt.value}
                onChange={() => selectRank(opt.value)}
                className="w-4 h-4 accent-green-600"
                aria-describedby={opt.id}
              />
              <span className="text-sm" id={opt.id}>{opt.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* 各順位の設定コンポーネント */}
      <RankHeirSettings composition={composition} onChange={onChange} config={RANK1_CONFIG} />
      <Rank2Settings composition={composition} onChange={onChange} />
      <RankHeirSettings composition={composition} onChange={onChange} config={RANK3_CONFIG} />
    </div>
  );
});

HeirSettings.displayName = 'HeirSettings';
