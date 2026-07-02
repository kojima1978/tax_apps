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
import type { Policy, FamilyMember } from '@/types';
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

const BeneficiaryCoverageSection: React.FC<BeneficiaryCoverageSectionProps> = ({
  policies,
  familyMembers,
  currentAge,
}) => {
  // 全体グラフと同じ順序・色割当を使い、グラフ間の対応を揃える
  const chartPolicies = useMemo(() => getCoverageChartPolicies(policies), [policies]);
  const policyColors = useMemo(() => buildCoverageColorMap(chartPolicies), [chartPolicies]);

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
    for (let age = currentAge; age <= 90; age++) {
      const row: Record<string, number> = { age };
      groupPolicies.forEach(policy => {
        row[policy.id] = getDeathBenefitAtAge(policy, age) / 10000;
      });
      rows.push(row);
    }
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
          // Recharts は最初の系列が最下段になるため逆順で描画（先頭=最上段）
          const stackPolicies = [...group.policies].reverse();
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
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="age" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={formatAxisTick} width={52} />
                  <Tooltip
                    formatter={(value: any, name: any) => [`${formatAxisTick(value)}万円`, name]}
                    labelFormatter={(label) => `${label}歳`}
                  />
                  {stackPolicies.map(policy => {
                    const color = policyColors.get(policy.id) ?? COVERAGE_CHART_COLORS[0];
                    return (
                      <Area
                        key={policy.id}
                        type="monotone"
                        dataKey={policy.id}
                        name={`${policy.companyName} / ${policy.policyType}`}
                        stackId="1"
                        stroke={color}
                        fill={color}
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
