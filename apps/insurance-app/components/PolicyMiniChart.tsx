'use client';

import React from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { isIncomeProtectionPolicyType, type Policy, type SurrenderValuePoint } from '@/types';
import { formatWholeManYen } from '@/utils/currencyUtils';
import {
  INSURANCE_TYPE_INFO,
  calculateProjectedTotalPremiums,
  calculateTotalPremiumsPaid,
  getCumulativePremiumsAtAge,
  getDeathBenefitAtAge,
  getSurrenderBreakEvenAge,
  getSurrenderProjectionAnnualRate,
  getSurrenderValueAtAge,
  getSurrenderValues,
} from '@/utils/analysisUtils';

interface PolicyMiniChartProps {
  policy: Policy;
  currentAge: number;
}

// 解約返戻金・払込累計のライン色（凡例と共通）
const SURRENDER_COLOR = '#805ad5';
const PAID_COLOR = '#f59e0b';

const SERIES_LABELS: Record<string, string> = {
  value: '保障額',
  surrender: '解約返戻金',
  paid: '払込累計',
  accumulation: '保険料支払累計',
  payout: '年金受取額',
};

// 解約返戻金を「入力範囲内（実線）」と「範囲外の推定（点線）」の2系列に分ける。
// 契約〜最初の入力点は0からの補間、最後の入力点以降は横ばいという仮定の部分を実データと区別するため
function buildSurrenderSeries(
  policy: Policy,
  age: number,
  points: SurrenderValuePoint[],
): { surrender: number | null; surrenderEstimate: number | null } {
  const surrenderYen = getSurrenderValueAtAge(policy, age);
  if (surrenderYen === null) return { surrender: null, surrenderEstimate: null };

  const manYen = surrenderYen / 10000;
  const firstAge = points[0].age;
  const lastAge = points[points.length - 1].age;
  return {
    surrender: age >= firstAge && age <= lastAge ? manYen : null,
    // 境界の年齢は両系列に入れて実線と点線をつなぐ
    surrenderEstimate: age <= firstAge || age >= lastAge ? manYen : null,
  };
}

interface EnteredPointDotProps {
  cx?: number;
  cy?: number;
  key?: React.Key | null;
  payload?: { age?: number };
}

// 入力された年齢にだけドットを打ち、補間された年齢との区別をつける
function createEnteredPointDot(points: SurrenderValuePoint[]) {
  const enteredAges = new Set(points.map(point => point.age));
  const EnteredPointDot = (props: EnteredPointDotProps) => {
    const { cx, cy, key, payload } = props;
    if (cx === undefined || cy === undefined || payload?.age === undefined || !enteredAges.has(payload.age)) {
      return <g key={key} />;
    }
    return <circle key={key} cx={cx} cy={cy} r={2.5} fill={SURRENDER_COLOR} stroke="#fff" strokeWidth={1} />;
  };
  EnteredPointDot.displayName = 'EnteredPointDot';
  return EnteredPointDot;
}

const PolicyMiniChart: React.FC<PolicyMiniChartProps> = ({ policy, currentAge }) => {
  const isPension = policy.policyType === '個人年金保険';
  const hasCoverage = policy.deathBenefitDisease > 0 || policy.hospDayDisease > 0;
  const surrenderPoints = getSurrenderValues(policy);
  if (!isPension && !hasCoverage && policy.maturityBenefit <= 0 && surrenderPoints.length === 0) return null;

  const typeInfo = INSURANCE_TYPE_INFO[policy.policyType];

  if (isPension) {
    return <PensionMiniChart policy={policy} currentAge={currentAge} typeInfo={typeInfo} />;
  }

  const isHosp = policy.deathBenefitDisease <= 0 && policy.hospDayDisease > 0;
  const unit = isHosp ? '円/日' : '万円';
  const showSurrender = surrenderPoints.length > 0;
  const surrenderProjectionRate = showSurrender ? getSurrenderProjectionAnnualRate(policy) : null;
  // 入院日額とは単位が違うので、返戻金は右側の第2軸（万円）に描く
  const surrenderAxisId = isHosp ? 'right' : 'left';
  const breakEvenAge = showSurrender ? getSurrenderBreakEvenAge(policy, currentAge) : null;

  const startAge = currentAge;
  const baseEndAge = policy.policyEndAge === 999 ? Math.max(90, currentAge + 20) : Math.max(policy.policyEndAge + 5, currentAge + 5);
  const endAge = showSurrender
    ? Math.max(baseEndAge, surrenderPoints[surrenderPoints.length - 1].age)
    : baseEndAge;

  const data = [];
  for (let age = startAge; age <= endAge; age++) {
    const inCoverage = policy.policyEndAge === 999 || age < policy.policyEndAge;
    let value = 0;

    if (policy.deathBenefitDisease > 0) {
      value = getDeathBenefitAtAge(policy, age) / 10000;
    } else if (inCoverage && policy.hospDayDisease > 0) {
      value = policy.hospDayDisease;
    }

    const { surrender, surrenderEstimate } = showSurrender
      ? buildSurrenderSeries(policy, age, surrenderPoints)
      : { surrender: null, surrenderEstimate: null };

    data.push({
      age,
      value,
      surrender,
      surrenderEstimate,
      paid: showSurrender && (surrender !== null || surrenderEstimate !== null)
        ? getCumulativePremiumsAtAge(policy, age, currentAge) / 10000
        : null,
    });
  }

  const hasEstimatedRange = data.some(point => point.surrenderEstimate !== null && point.surrender === null);
  const renderEnteredDot = createEnteredPointDot(surrenderPoints);
  const areaType = isIncomeProtectionPolicyType(policy.policyType) ? 'linear' : 'stepAfter';

  return (
    <div className="mini-chart-container">
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="age"
            tick={{ fontSize: 11 }}
            label={{ value: '年齢', position: 'insideBottomRight', offset: -5, fontSize: 11 }}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => Number(v).toLocaleString()}
            width={55}
            label={{ value: unit, angle: -90, position: 'insideLeft', offset: 5, fontSize: 11 }}
          />
          {isHosp && showSurrender && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => Number(v).toLocaleString()}
              width={55}
              label={{ value: '万円', angle: 90, position: 'insideRight', offset: 5, fontSize: 11 }}
            />
          )}
 <Tooltip
  formatter={(value, name) => [
    // 入院日額だけは円/日。それ以外は万円系列なので億/万円に丸めて要約表示
    isHosp && name === '保障額'
      ? `${Number(value ?? 0).toLocaleString()}${unit}`
      : policy.currency === 'USD'
        && String(name).startsWith('解約返戻金')
        && (policy.exchangeRate ?? 0) > 0
      ? `$${Math.round((Number(value ?? 0) * 10000) / (policy.exchangeRate ?? 1)).toLocaleString('ja-JP')}（円換算 ${formatWholeManYen(Number(value ?? 0) * 10000)}）`
      : formatWholeManYen(Number(value ?? 0) * 10000),
    SERIES_LABELS[String(name)] ?? String(name),
  ]}
  labelFormatter={(label) => `${label}歳`}
/>
          <Area
            yAxisId="left"
            type={areaType}
            dataKey="value"
            name="保障額"
            stroke={typeInfo.borderColor}
            fill={typeInfo.bgColor}
            strokeWidth={2}
          />
          {showSurrender && (
            <>
              <Line
                yAxisId={surrenderAxisId}
                type="linear"
                dataKey="paid"
                name="払込累計"
                stroke={PAID_COLOR}
                strokeWidth={1.5}
                strokeDasharray="5 3"
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
              <Line
                yAxisId={surrenderAxisId}
                type="linear"
                dataKey="surrenderEstimate"
                name="解約返戻金（推定）"
                stroke={SURRENDER_COLOR}
                strokeWidth={2}
                strokeDasharray="3 3"
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
              <Line
                yAxisId={surrenderAxisId}
                type="linear"
                dataKey="surrender"
                name="解約返戻金"
                stroke={SURRENDER_COLOR}
                strokeWidth={2}
                dot={renderEnteredDot}
                connectNulls
                isAnimationActive={false}
              />
            </>
          )}
          <ReferenceLine
            yAxisId="left"
            x={currentAge}
            stroke="#e53e3e"
            strokeWidth={2}
            strokeDasharray="4 4"
          />
          {policy.paymentEndAge !== 999 && (
            <ReferenceLine
              yAxisId="left"
              x={policy.paymentEndAge}
              stroke="#38a169"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      <div className="mini-chart-legend">
        <span className="mini-chart-legend-item">
          <span className="mini-chart-legend-line" style={{ borderColor: '#e53e3e' }} />
          現在（{currentAge}歳）
        </span>
        {policy.paymentEndAge !== 999 && (
          <span className="mini-chart-legend-item">
            <span className="mini-chart-legend-line" style={{ borderColor: '#38a169' }} />
            払込完了（{policy.paymentEndAge}歳）
          </span>
        )}
        {showSurrender && (
          <>
            <span className="mini-chart-legend-item">
              <span className="mini-chart-legend-line is-solid" style={{ borderColor: SURRENDER_COLOR }} />
              解約返戻金{isHosp ? '（右軸・万円）' : ''}
            </span>
            <span className="mini-chart-legend-item">
              <span className="mini-chart-legend-line" style={{ borderColor: PAID_COLOR }} />
              払込累計
            </span>
            {breakEvenAge !== null && (
              <span className="mini-chart-legend-item">損益分岐: {breakEvenAge}歳</span>
            )}
            {hasEstimatedRange && (
              <span className="mini-chart-legend-note">
                {surrenderProjectionRate !== null
                  ? `${surrenderPoints[surrenderPoints.length - 1].age}歳以降の点線は、過去データの年平均増加率${(surrenderProjectionRate * 100).toFixed(1)}%による推定`
                  : '点線・ドットなしの区間は入力値からの推定'}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const PensionMiniChart: React.FC<{
  policy: Policy;
  currentAge: number;
  typeInfo: (typeof INSURANCE_TYPE_INFO)[keyof typeof INSURANCE_TYPE_INFO];
}> = ({ policy, currentAge }) => {
  const startAge = currentAge;
  const annuityStartAge = policy.paymentEndAge;
  const endAge = Math.max(
    currentAge,
    policy.policyEndAge === 999 ? annuityStartAge + 20 : policy.policyEndAge,
  );
  const chartEndAge = endAge + 1;
  const payoutPeriod = endAge - annuityStartAge;
  const annualPayout = payoutPeriod > 0 ? policy.maturityBenefit / payoutPeriod : 0;
  const paidAtCurrentAge = calculateTotalPremiumsPaid(policy, currentAge);
  const projectedTotalPremiums = calculateProjectedTotalPremiums(policy);
  const surrenderPoints = getSurrenderValues(policy);
  const showSurrender = surrenderPoints.length > 0;
  const breakEvenAge = showSurrender ? getSurrenderBreakEvenAge(policy, currentAge) : null;
  const renderEnteredDot = createEnteredPointDot(surrenderPoints);

  const data = [];
  for (let age = startAge; age <= chartEndAge; age++) {
    let accumulation: number | null = null;
    let payout: number | null = null;

    if (age <= annuityStartAge) {
      if (policy.paymentFrequency === 'single') {
        accumulation = paidAtCurrentAge / 10000;
      } else {
        const years = age - startAge;
        accumulation = Math.min(paidAtCurrentAge + policy.annualPremium * years, projectedTotalPremiums) / 10000;
      }
    }

    if (age >= annuityStartAge && age <= endAge) {
      payout = annualPayout / 10000;
    } else if (age === chartEndAge) {
      payout = 0;
    }

    const { surrender, surrenderEstimate } = showSurrender
      ? buildSurrenderSeries(policy, age, surrenderPoints)
      : { surrender: null, surrenderEstimate: null };

    data.push({
      age,
      accumulation,
      payout,
      surrender,
      surrenderEstimate,
    });
  }

  const hasEstimatedRange = data.some(point => point.surrenderEstimate !== null && point.surrender === null);

  return (
    <div className="mini-chart-container">
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="age"
            tick={{ fontSize: 11 }}
            label={{ value: '年齢', position: 'insideBottomRight', offset: -5, fontSize: 11 }}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => Number(v).toLocaleString()}
            width={55}
            label={{ value: '万円', angle: -90, position: 'insideLeft', offset: 5, fontSize: 11 }}
          />
          <Tooltip
  formatter={(value, name) => [
    formatWholeManYen(Number(value ?? 0) * 10000),
    SERIES_LABELS[String(name)] ?? String(name),
  ]}
  labelFormatter={(label) => `${label}歳`}
/>
          <Area
            type="linear"
            dataKey="accumulation"
            name="保険料支払累計"
            stroke="#f59e0b"
            fill="#fef3c7"
            fillOpacity={0.62}
            strokeWidth={2}
          />
          <Area
            type="stepAfter"
            dataKey="payout"
            name="年金受取額"
            stroke="#6b8e23"
            fill="#e8f5e0"
            fillOpacity={0.72}
            strokeWidth={2}
          />
          {showSurrender && (
            <>
              <Line
                type="linear"
                dataKey="surrenderEstimate"
                name="解約返戻金（推定）"
                stroke={SURRENDER_COLOR}
                strokeWidth={2}
                strokeDasharray="3 3"
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
              <Line
                type="linear"
                dataKey="surrender"
                name="解約返戻金"
                stroke={SURRENDER_COLOR}
                strokeWidth={2}
                dot={renderEnteredDot}
                connectNulls
                isAnimationActive={false}
              />
            </>
          )}
          <ReferenceLine
            x={currentAge}
            stroke="#e53e3e"
            strokeWidth={2}
            strokeDasharray="4 4"
          />
          <ReferenceLine
            x={annuityStartAge}
            stroke="#38a169"
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="mini-chart-legend">
        <span className="mini-chart-legend-item">
          <span className="mini-chart-legend-line" style={{ borderColor: '#e53e3e' }} />
          現在（{currentAge}歳）
        </span>
        <span className="mini-chart-legend-item">
          <span className="mini-chart-legend-line" style={{ borderColor: '#38a169' }} />
          受取開始（{annuityStartAge}歳）
        </span>
        {showSurrender && (
          <>
            <span className="mini-chart-legend-item">
              <span className="mini-chart-legend-line is-solid" style={{ borderColor: SURRENDER_COLOR }} />
              解約返戻金
            </span>
            {breakEvenAge !== null && (
              <span className="mini-chart-legend-item">損益分岐: {breakEvenAge}歳</span>
            )}
            {hasEstimatedRange && (
              <span className="mini-chart-legend-note">点線・ドットなしの区間は入力値からの推定</span>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PolicyMiniChart;
