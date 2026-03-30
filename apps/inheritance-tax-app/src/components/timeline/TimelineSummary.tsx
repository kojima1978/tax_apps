import React, { memo } from 'react';
import type { TimelineYearSummary } from '../../types';
import { formatCurrency, formatSignedCurrency } from '../../utils';
import { CARD } from '../tableStyles';

interface TimelineSummaryProps {
  summaries: TimelineYearSummary[];
  annualChange: number;
}

export const TimelineSummary: React.FC<TimelineSummaryProps> = memo(({ summaries, annualChange }) => (
  <div className={CARD}>
    <h2 className="text-lg font-bold text-gray-800 mb-3">
      経過年数別 最適解サマリー
    </h2>
    <p className="text-xs text-gray-500 mb-3">
      年間収支: {formatSignedCurrency(annualChange)}/年
      {annualChange < 0 ? '（資産減少）' : annualChange > 0 ? '（資産増加）' : ''}
    </p>
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {summaries.map(s => (
        <div
          key={s.years}
          className="bg-green-50 border border-green-200 rounded-lg p-3 text-center"
        >
          <div className="text-xs text-gray-500 mb-1">{s.years}年後</div>
          <div className="text-lg font-bold text-green-800">
            {s.optimalRatio}%
          </div>
          <div className="text-xs text-gray-600 mt-1">
            合計 {formatCurrency(s.optimalTotalTax)}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            2次遺産 {formatSignedCurrency(s.secondEstateReduction)}
          </div>
        </div>
      ))}
    </div>
  </div>
));

TimelineSummary.displayName = 'TimelineSummary';
