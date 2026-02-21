import React, { memo } from 'react';
import type { HeirComposition } from '../../types';
import { RadioGroup } from '../RadioGroup';

interface SpouseSettingsProps {
    composition: HeirComposition;
    onChange: (composition: HeirComposition) => void;
}

const SPOUSE_OPTIONS = [
    { value: true as const, label: '配偶者あり', id: 'spouse-yes-desc' },
    { value: false as const, label: '配偶者なし', id: 'spouse-no-desc' },
] as const;

export const SpouseSettings: React.FC<SpouseSettingsProps> = memo(({ composition, onChange }) => (
    <RadioGroup
        name="spouse"
        legend="配偶者の有無"
        options={SPOUSE_OPTIONS}
        selected={composition.hasSpouse}
        onSelect={(value) => onChange({ ...composition, hasSpouse: value })}
    />
));

SpouseSettings.displayName = 'SpouseSettings';
