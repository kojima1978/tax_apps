import React, { memo } from 'react';
import type { HeirComposition } from '../types';
import { formatCurrency } from '../utils';
import { getHeirInfo, getEffectiveHeirShares } from '../utils/heirUtils';
import { RANK_LABELS } from '../constants';

interface ConditionSection {
  title: string;
  items: { label: string; value: string }[];
}

interface PrintConditionsProps {
  sections: ConditionSection[];
  composition: HeirComposition;
}

function buildHeirDescription(composition: HeirComposition): {
  firstHeirs: string;
  secondHeirs: string;
} {
  const { rank, rankHeirsCount } = getHeirInfo(composition);
  const shares = getEffectiveHeirShares(composition);
  const shareLabels = shares.map(s => s.label).join(', ');

  const parts: string[] = [];
  if (composition.hasSpouse) parts.push('配偶者');
  if (rank > 0 && rankHeirsCount > 0) {
    parts.push(`${RANK_LABELS[rank]}${rankHeirsCount}人（${shareLabels}）`);
  }

  return {
    firstHeirs: parts.join(' / ') || 'なし',
    secondHeirs: shareLabels || 'なし',
  };
}

export const PrintConditions: React.FC<PrintConditionsProps> = memo(({ sections, composition }) => {
  const { firstHeirs, secondHeirs } = buildHeirDescription(composition);

  return (
    <div className="print-only-block">
      <div className="border border-gray-300 rounded-lg p-4 mb-4 text-sm">
        <h3 className="font-bold text-gray-800 mb-3 text-base">【前提条件】</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sections.map(section => (
            <div key={section.title}>
              <h4 className="font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-green-600" />
                {section.title}
              </h4>
              <dl className="space-y-0.5 pl-3.5">
                {section.items.map(item => (
                  <div key={item.label} className="flex gap-1">
                    <dt className="text-gray-500 whitespace-nowrap">{item.label}:</dt>
                    <dd className="text-gray-800">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
          <div>
            <h4 className="font-bold text-gray-700 mb-1 flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-green-600" />
              相続人構成
            </h4>
            <dl className="space-y-0.5 pl-3.5">
              <div className="flex gap-1">
                <dt className="text-gray-500 whitespace-nowrap">1次相続:</dt>
                <dd className="text-gray-800">{firstHeirs}</dd>
              </div>
              <div className="flex gap-1">
                <dt className="text-gray-500 whitespace-nowrap">2次相続:</dt>
                <dd className="text-gray-800">{secondHeirs}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
});

PrintConditions.displayName = 'PrintConditions';
