'use client';

import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Users, AlertTriangle } from 'lucide-react';
import { isIncomeProtectionPolicyType, type Policy, type FamilyMember } from '@/types';
import {
  COVERAGE_CHART_COLORS,
  buildCoverageColorMap,
  getCoverageChartPolicies,
  getDeathBenefitAtAge,
} from '@/utils/analysisUtils';

interface BeneficiaryCoverageSectionProps {
  policies: Policy[];
  familyMembers: FamilyMember[];
  currentAge: number;
}

interface BeneficiaryGroup {
  key: string;
  label: string;
  isUnspecified: boolean;
  policies: Policy[];
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

const BeneficiaryTooltip = ({ active, label, payload }: any) => {
  if (!active || !payload?.length) return null;
  const items = payload.filter((item: any) => Number(item.value) > 0);
  if (items.length === 0) return null;

  return (
    <div className="coverage-tooltip coverage-tooltip-compact">
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

const BeneficiaryCoverageSection: React.FC<BeneficiaryCoverageSectionProps> = ({
  policies,
  familyMembers,
  currentAge,
}) => {
  const endAge = 90;
  // 全体グラフと同じ順序・色割当を使い、グラフ間の対応を揃える
  const chartPolicies = useMemo(() => getCoverageChartPolicies(policies), [policies]);
  const policyColors = useMemo(() => buildCoverageColorMap(chartPolicies), [chartPolicies]);
  const ageTicks = useMemo(() => buildAgeTicks(currentAge, endAge), [currentAge, endAge]);

  const groups = useMemo<BeneficiaryGroup[]>(() => {
    const byBeneficiary = new Map<string, Policy[]>();
    chartPolicies.forEach(policy => {
      const key = policy.beneficiaryId || '';
      byBeneficiary.set(key, [...(byBeneficiary.get(key) ?? []), policy]);
    });

    const ordered: BeneficiaryGroup[] = [];
    familyMembers.forEach(member => {
      const list = byBeneficiary.get(member.id);
      if (!list) return;
      ordered.push({
        key: member.id,
        label: `${member.relationship || '続柄未入力'}: ${member.name || '氏名未入力'}`,
        isUnspecified: false,
        policies: list,
      });
    });

    const knownIds = new Set(familyMembers.map(member => member.id));
    const unspecified = [...byBeneficiary.entries()]
      .filter(([key]) => !key || !knownIds.has(key))
      .flatMap(([, list]) => list);
    if (unspecified.length > 0) {
      ordered.push({
        key: '__unspecified__',
        label: '受取人未指定',
        isUnspecified: true,
        policies: unspecified,
      });
    }
    return ordered;
  }, [chartPolicies, familyMembers]);

  if (groups.length === 0) return null;

  const buildGroupData = (groupPolicies: Policy[]) => {
    const rows: Record<string, number>[] = [];
    const agePoints = buildCoverageAgePoints(groupPolicies, currentAge, endAge);
    agePoints.forEach((age) => {
      const row: Record<string, number> = { age };
      groupPolicies.forEach(policy => {
        row[policy.id] = getDeathBenefitAtAge(policy, age) / 10000;
      });
      rows.push(row);
    });
    return rows;
  };

  return (
    <div className="beneficiary-coverage-section">
      <h3 className="analysis-section-title">
        <Users size={20} />
        受取人ごとの死亡保障推移
      </h3>
      <p className="bcs-subtitle">万一の際に各受取人が受け取れる死亡保障の合計と、年齢による推移</p>

      <div className="bcs-grid">
        {groups.map(group => {
          const data = buildGroupData(group.policies);
          const currentTotal = group.policies.reduce(
            (sum, policy) => sum + getDeathBenefitAtAge(policy, currentAge),
            0,
          );

          return (
            <div key={group.key} className={`bcs-card ${group.isUnspecified ? 'bcs-card-unspecified' : ''}`}>
              <div className="bcs-card-header">
                <span className="bcs-card-name">
                  {group.isUnspecified && <AlertTriangle size={14} />}
                  {group.label}
                </span>
                <span className="bcs-card-count">{group.policies.length}件</span>
              </div>
              <div className="bcs-amount">
                {Math.round(currentTotal / 10000).toLocaleString()}
                <span className="bcs-amount-unit">万円（現在）</span>
              </div>

              <ResponsiveContainer width="100%" height={180}>
                <AreaChart
                  key={group.policies.map(policy => policy.id).join('|')}
                  data={data}
                  margin={{ top: 4, right: 8, left: -4, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="4 6" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="age"
                    type="number"
                    domain={[currentAge, endAge]}
                    ticks={ageTicks}
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickFormatter={formatAxisTick}
                    width={52}
                  />
                  <Tooltip
                    content={<BeneficiaryTooltip />}
                    cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  {group.policies.map(policy => {
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
                        activeDot={{ r: 3, stroke: '#ffffff', strokeWidth: 2 }}
                        isAnimationActive={false}
                      />
                    );
                  })}
                </AreaChart>
              </ResponsiveContainer>

              <ul className="bcs-legend">
                {group.policies.map(policy => (
                  <li key={policy.id}>
                    <span style={{ backgroundColor: policyColors.get(policy.id) ?? COVERAGE_CHART_COLORS[0] }} />
                    {policy.companyName} / {policy.policyType}
                  </li>
                ))}
              </ul>
              {group.isUnspecified && (
                <p className="bcs-unspecified-note">受取人が指定されていません。証券編集で受取人の設定をご検討ください。</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BeneficiaryCoverageSection;
