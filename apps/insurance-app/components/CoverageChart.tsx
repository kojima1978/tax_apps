'use client';

import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import ChartContainer from './ChartContainer';
import { isIncomeProtectionPolicyType, type Policy } from '@/types';
import {
  COVERAGE_CHART_COLORS,
  buildCoverageColorMap,
  getCoverageChartPolicies,
  getDeathBenefitAtAge,
} from '@/utils/analysisUtils';

interface CoverageChartProps {
  policies: Policy[];
  currentAge: number;
}

const formatAxisTick = (value: number | string) =>
  Number(value).toLocaleString('ja-JP', { maximumFractionDigits: 0 });

const formatAgeLabel = (value: number | string) => {
  const age = Number(value);
  if (!Number.isFinite(age)) return `${value}歳`;
  if (Number.isInteger(age)) return `${age}歳`;
  return `${Math.ceil(age)}歳直前`;
};

const buildAgeTicks = (startAge: number, endAge: number, interval = 5) => {
  const ticks = [startAge];
  const firstTick = Math.ceil(startAge / interval) * interval;
  for (let age = firstTick; age < endAge; age += interval) {
    if (age !== startAge) ticks.push(age);
  }
  if (!ticks.includes(endAge)) ticks.push(endAge);
  return ticks;
};

const getCoverageAreaType = (policy: Policy): 'linear' =>
  isIncomeProtectionPolicyType(policy.policyType) ? 'linear' : 'linear';

const buildCoverageAgePoints = (policies: Policy[], currentAge: number, endAge: number) => {
  const points = new Set<number>();
  for (let age = currentAge; age <= endAge; age++) points.add(age);

  policies.forEach(policy => {
    if (
      !isIncomeProtectionPolicyType(policy.policyType) &&
      policy.policyEndAge !== 999 &&
      policy.policyEndAge > currentAge &&
      policy.policyEndAge <= endAge
    ) {
      points.add(Number((policy.policyEndAge - 0.001).toFixed(3)));
    }
  });

  return [...points].sort((a, b) => a - b);
};

const CoverageTooltip = ({ active, label, payload }: any) => {
  if (!active || !payload?.length) return null;

  const items = payload.filter((item: any) => Number(item.value) > 0);

  if (items.length === 0) return null;

  return (
    <div className="coverage-tooltip">
      <div className="coverage-tooltip-age">{formatAgeLabel(label)}</div>
      <div className="coverage-tooltip-list">
        {items.map((item: any) => (
          <div key={item.dataKey} className="coverage-tooltip-row">
            <span className="coverage-tooltip-dot" style={{ backgroundColor: item.color }} />
            <span className="coverage-tooltip-name">
              {item.name}
            </span>
            <strong>{formatAxisTick(item.value)}万円</strong>
          </div>
        ))}
      </div>
    </div>
  );
};

const CoverageChart: React.FC<CoverageChartProps> = ({ policies, currentAge }) => {
  const chartPolicies = useMemo(() => getCoverageChartPolicies(policies), [policies]);
  const endAge = 90;

  const chartOrderKey = useMemo(
    () => chartPolicies.map(policy => policy.id).join('|'),
    [chartPolicies],
  );

  const policyColors = useMemo(
    () => buildCoverageColorMap(chartPolicies),
    [chartPolicies],
  );

  const data = useMemo(() => {
    const rows: Record<string, number>[] = [];
    const agePoints = buildCoverageAgePoints(chartPolicies, currentAge, endAge);
    agePoints.forEach((age) => {
      const dataPoint: Record<string, number> = { age };
      chartPolicies.forEach((policy) => {
        dataPoint[policy.id] = getDeathBenefitAtAge(policy, age) / 10000;
      });
      rows.push(dataPoint);
    });
    return rows;
  }, [chartPolicies, currentAge, endAge]);

  const ageTicks = useMemo(() => buildAgeTicks(currentAge, endAge), [currentAge, endAge]);

  const legendItems = chartPolicies.map((policy, index) => ({
    id: policy.id,
    color: policyColors.get(policy.id) ?? COVERAGE_CHART_COLORS[index % COVERAGE_CHART_COLORS.length],
    label: `${policy.companyName} / ${policy.policyType}`,
  }));

  return (
    <div className="coverage-chart">
      <div className="coverage-chart-header">
        <div>
          <h3>死亡保障推移</h3>
          <p>現在から将来の死亡保障額。収入保障は三角形、定期保険など一定額の保障は四角形で積み上げ表示します。</p>
        </div>
      </div>
      <ChartContainer height={320}>
        {(width, height) => (
          <AreaChart
            key={chartOrderKey}
            width={width}
            height={height}
            data={data}
            margin={{ top: 8, right: 24, left: 30, bottom: 12 }}
          >
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 6" vertical={false} />
            <XAxis
              dataKey="age"
              type="number"
              domain={[currentAge, endAge]}
              ticks={ageTicks}
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
            />
            <YAxis
              label={{ value: '保障額（万円）', angle: -90, position: 'insideLeft', offset: -18, fill: '#64748b' }}
              tickFormatter={formatAxisTick}
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              width={72}
            />
            <Tooltip
              content={<CoverageTooltip />}
              cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <Legend
              verticalAlign="top"
              content={() => (
                <ul className="coverage-chart-legend">
                  {legendItems.map(item => (
                    <li key={item.id}>
                      <span style={{ backgroundColor: item.color }} />
                      {item.label}
                    </li>
                  ))}
                </ul>
              )}
            />
            {chartPolicies.map((policy) => {
              const color = policyColors.get(policy.id) ?? COVERAGE_CHART_COLORS[0];
              return (
                <Area
                  key={policy.id}
                  type={getCoverageAreaType(policy)}
                  dataKey={policy.id}
                  name={`${policy.companyName} / ${policy.policyType}`}
                  stackId="1"
                  stroke={color}
                  fill={color}
                  fillOpacity={0.42}
                  strokeWidth={2}
                  activeDot={{ r: 4, stroke: '#ffffff', strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              );
            })}
          </AreaChart>
        )}
      </ChartContainer>
    </div>
  );
};

export default CoverageChart;
