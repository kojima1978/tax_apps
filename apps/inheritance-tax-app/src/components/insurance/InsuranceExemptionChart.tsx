import { memo } from 'react';
import type { InsuranceScenarioResult } from '../../types';
import { formatCurrency } from '../../utils';

interface InsuranceExemptionChartProps {
  scenario: InsuranceScenarioResult;
}

const VIEWBOX_WIDTH = 420;
const VIEWBOX_HEIGHT = 160;
const PLOT = { left: 54, right: 16, top: 22, bottom: 38 } as const;

function getNiceScale(limit: number, benefit: number): { max: number; step: number } {
  const targetMax = Math.max(limit * 2, benefit * 1.2, 1);
  const roughStep = targetMax / 5;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalized = roughStep / magnitude;
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  const step = factor * magnitude;
  return { max: Math.ceil(targetMax / step) * step, step };
}

export const InsuranceExemptionChart = memo(({
  scenario,
}: InsuranceExemptionChartProps) => {
  const limit = scenario.nonTaxableLimit;
  const benefit = scenario.totalBenefit;
  const { max, step } = getNiceScale(limit, benefit);
  const plotWidth = VIEWBOX_WIDTH - PLOT.left - PLOT.right;
  const plotHeight = VIEWBOX_HEIGHT - PLOT.top - PLOT.bottom;
  const plotRight = VIEWBOX_WIDTH - PLOT.right;
  const plotBottom = VIEWBOX_HEIGHT - PLOT.bottom;
  const y = (value: number) => PLOT.top + (1 - value / max) * plotHeight;
  const yLimit = y(limit);
  const yBenefit = y(benefit);
  const differenceLabel = benefit < limit ? '未利用分' : benefit > limit ? '超過分' : '';
  const comparisonSymbol = benefit > limit ? '＞' : benefit < limit ? '＜' : '＝';
  const difference = Math.abs(limit - benefit);
  const arrowX = PLOT.left + plotWidth * 0.62;
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, index) => index * step);
  const limitLabelY = yLimit < PLOT.top + 14 ? yLimit + 13 : yLimit - 5;

  return (
    <figure
      className="insurance-exemption-chart w-full max-w-sm justify-self-end self-center py-1"
      role="img"
      aria-label={`非課税限度額${formatCurrency(limit)}、死亡保険金${formatCurrency(benefit)}${differenceLabel ? `、${differenceLabel}${formatCurrency(difference)}` : ''}`}
    >
      <svg
        className="insurance-exemption-lines block h-32 w-full"
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        aria-hidden="true"
      >
        <defs>
          <marker id="insurance-gap-arrow-start" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
            <path d="M 7 0 L 0 3.5 L 7 7 Z" fill="#e11d48" />
          </marker>
          <marker id="insurance-gap-arrow-end" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
            <path d="M 0 0 L 7 3.5 L 0 7 Z" fill="#e11d48" />
          </marker>
        </defs>

        <text x="3" y="10" className="fill-slate-700 text-[10px] font-semibold">（万円）</text>

        {ticks.map(tick => {
          const tickY = y(tick);
          return (
            <g key={tick}>
              {tick > 0 && tick < max && (
                <line
                  x1={PLOT.left}
                  y1={tickY}
                  x2={plotRight}
                  y2={tickY}
                  stroke="#cbd5e1"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              )}
              <text x={PLOT.left - 8} y={tickY + 3.5} textAnchor="end" className="fill-slate-700 text-[10px]">
                {tick.toLocaleString()}
              </text>
            </g>
          );
        })}

        <line x1={PLOT.left} y1={PLOT.top} x2={plotRight} y2={PLOT.top} stroke="#64748b" strokeWidth="1.2" />
        <line x1={PLOT.left} y1={PLOT.top} x2={PLOT.left} y2={plotBottom} stroke="#64748b" strokeWidth="1.2" />
        <line x1={PLOT.left} y1={plotBottom} x2={plotRight} y2={plotBottom} stroke="#64748b" strokeWidth="1.2" />

        {/* 実際の死亡保険金額（緑の実線） */}
        <line x1={PLOT.left} y1={yBenefit} x2={plotRight} y2={yBenefit} stroke="#16a34a" strokeWidth="2.4" />

        {/* 非課税限度額（赤の破線）。同額時も緑線の上に破線を重ね、両方を判別できるようにする */}
        <line
          x1={PLOT.left}
          y1={yLimit}
          x2={plotRight}
          y2={yLimit}
          stroke="#e11d48"
          strokeWidth="2"
          strokeDasharray="7 5"
        />
        <text x={PLOT.left + 5} y={limitLabelY} className="fill-slate-800 text-[10px] font-semibold">
          非課税限度額 {formatCurrency(limit)}
        </text>

        {differenceLabel && (
          <g>
            <line
              x1={arrowX}
              y1={yLimit}
              x2={arrowX}
              y2={yBenefit}
              stroke="#e11d48"
              strokeWidth="1.6"
              markerStart="url(#insurance-gap-arrow-start)"
              markerEnd="url(#insurance-gap-arrow-end)"
            />
            <text
              x={arrowX + 10}
              y={(yLimit + yBenefit) / 2 + 3}
              className="fill-rose-600 text-[11px] font-semibold"
            >
              {differenceLabel}
            </text>
          </g>
        )}

        <text x={PLOT.left + plotWidth / 2} y={VIEWBOX_HEIGHT - 16} textAnchor="middle" className="fill-slate-800 text-[10px] font-semibold">
          死亡保険金 {formatCurrency(benefit)}{comparisonSymbol}非課税枠{formatCurrency(limit)}
        </text>
        <text x={PLOT.left + plotWidth / 2} y={VIEWBOX_HEIGHT - 4} textAnchor="middle" className="fill-green-700 text-[10px] font-semibold">
          非課税枠適用済み
        </text>
      </svg>
    </figure>
  );
});

InsuranceExemptionChart.displayName = 'InsuranceExemptionChart';
