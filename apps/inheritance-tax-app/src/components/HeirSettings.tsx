import React, { memo } from 'react';
import Users from 'lucide-react/icons/users';
import type { HeirComposition } from '../types';
import { SectionHeader } from './SectionHeader';
import { RadioGroup } from './RadioGroup';
import { SpouseSettings } from './heirs/SpouseSettings';
import { Rank2Settings } from './heirs/Rank2Settings';
import { RankHeirSettings, RANK1_CONFIG, RANK3_CONFIG } from './heirs/RankHeirSettings';

const RANK_OPTIONS = [
  { value: 'none' as const, id: 'rank-none-desc', label: '選択なし（配偶者のみ）' },
  { value: 'rank1' as const, id: 'rank-1-desc', label: '第1順位：子供（代襲相続：孫）' },
  { value: 'rank2' as const, id: 'rank-2-desc', label: '第2順位：直系尊属（親・祖父母）' },
  { value: 'rank3' as const, id: 'rank-3-desc', label: '第3順位：兄弟姉妹（甥姪）※2割加算' },
] as const;

interface HeirSettingsProps {
  composition: HeirComposition;
  onChange: (composition: HeirComposition) => void;
}

export const HeirSettings: React.FC<HeirSettingsProps> = memo(({ composition, onChange }) => (
  <div className="bg-white rounded-lg shadow-md p-6 no-print">
    <SectionHeader icon={Users} title="相続人の構成" />

    <SpouseSettings composition={composition} onChange={onChange} />

    <RadioGroup
      name="rank"
      legend="相続人の順位を選択"
      options={RANK_OPTIONS}
      selected={composition.selectedRank}
      onSelect={(rank) => onChange({ ...composition, selectedRank: rank })}
      bgClass="bg-green-50"
    />

    <RankHeirSettings composition={composition} onChange={onChange} config={RANK1_CONFIG} />
    <Rank2Settings composition={composition} onChange={onChange} />
    <RankHeirSettings composition={composition} onChange={onChange} config={RANK3_CONFIG} />
  </div>
));

HeirSettings.displayName = 'HeirSettings';
