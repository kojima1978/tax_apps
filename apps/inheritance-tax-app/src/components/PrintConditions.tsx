import React, { memo } from 'react';
import type { HeirComposition, HeirType } from '../types';

import { getEffectiveHeirShares, getHeirLabel } from '../utils/heirUtils';
import type { EffectiveHeirShare } from '../utils/heirUtils';

interface ConditionSection {
  title: string;
  items: { label: string; value: string }[];
}

interface PrintConditionsProps {
  sections: ConditionSection[];
  composition: HeirComposition;
}

/** 有効相続人を種別ごとに集計して「子2人・孫1人」の形にまとめる（代襲相続対応） */
function summarizeShares(shares: EffectiveHeirShare[]): string {
  const counts = new Map<HeirType, number>();
  for (const share of shares) {
    counts.set(share.type, (counts.get(share.type) ?? 0) + 1);
  }
  return [...counts]
    .map(([type, count]) => `${getHeirLabel(type, 0, 1)}${count}人`)
    .join('・');
}

function buildHeirDescription(composition: HeirComposition): {
  firstHeirs: string;
  secondHeirs: string;
} {
  const summary = summarizeShares(getEffectiveHeirShares(composition));

  const parts: string[] = [];
  if (composition.hasSpouse) parts.push('配偶者');
  if (summary) parts.push(summary);

  return {
    firstHeirs: parts.join('＋') || 'なし',
    secondHeirs: summary || 'なし',
  };
}

export const PrintConditions: React.FC<PrintConditionsProps> = memo(({ sections, composition }) => {
  const { firstHeirs, secondHeirs } = buildHeirDescription(composition);
  // セクション見出し（1次相続/2次相続）は項目名だけで判別できるため、印刷では平坦化して1行にまとめる
  const items = sections.flatMap(section => section.items);

  return (
    <div className="print-only-block print-conditions">
      <dl>
        {items.map(item => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
        <div>
          <dt>相続人</dt>
          <dd>1次 {firstHeirs} → 2次 {secondHeirs}</dd>
        </div>
      </dl>
    </div>
  );
});

PrintConditions.displayName = 'PrintConditions';
