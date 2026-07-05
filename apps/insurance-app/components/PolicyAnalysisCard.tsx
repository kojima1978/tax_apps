'use client';

import React, { useState } from 'react';
import { isIncomeProtectionPolicyType } from '@/types';
import type { Policy, FamilyMember, EvaluationOverride } from '@/types';
import { Calculator, MessageSquare, Landmark, ClipboardList, Check, Plus, X } from 'lucide-react';
import {
  analyzePolicy,
  INSURANCE_TYPE_INFO,
  EVALUATION_LABELS,
  RATING_LABELS,
  getPensionPayoutSummary,
  getIncomeProtectionDeathBenefitTotal,
  getMonthlyPremium,
  isLikelyIncomeProtectionGrossAmount,
  type EvaluationResult,
} from '@/utils/analysisUtils';
import EvaluationBadge from '@/components/EvaluationBadge';
import PolicyMiniChart from '@/components/PolicyMiniChart';

interface PolicyAnalysisCardProps {
  policy: Policy;
  currentAge: number;
  familyMembers: FamilyMember[];
  onUpdateNote: (policyId: string, note: string) => void;
  onUpdateEvaluations: (policyId: string, overrides: EvaluationOverride[]) => void;
}

const PolicyAnalysisCard: React.FC<PolicyAnalysisCardProps> = ({ policy, currentAge, familyMembers, onUpdateNote, onUpdateEvaluations }) => {
  const analysis = analyzePolicy(policy, currentAge);
  const typeInfo = INSURANCE_TYPE_INFO[policy.policyType];
  const isIncomeProtection = isIncomeProtectionPolicyType(policy.policyType);

  // 個別評価（保障期間/払込状況/保障充足度）の手動編集
  const overrides = policy.evaluationOverrides ?? [];
  const evaluationSlots = EVALUATION_LABELS.map(label => {
    const auto = analysis.evaluations.find(ev => ev.label === label) ?? null;
    const override = overrides.find(o => o.label === label) ?? null;
    return { label, auto, override, display: (override ?? auto) as EvaluationResult | null };
  });

  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [editRating, setEditRating] = useState<EvaluationResult['rating']>('good');
  const [editText, setEditText] = useState('');

  const startEditEvaluation = (label: string, display: EvaluationResult | null) => {
    setEditingLabel(label);
    setEditRating(display?.rating ?? 'caution');
    setEditText(display?.text ?? '');
  };

  const saveEvaluation = () => {
    if (!editingLabel) return;
    const text = editText.trim();
    if (text) {
      const next = [
        ...overrides.filter(o => o.label !== editingLabel),
        { label: editingLabel, rating: editRating, text },
      ];
      onUpdateEvaluations(policy.id, next);
    }
    setEditingLabel(null);
  };

  const resetEvaluation = (label: string) => {
    onUpdateEvaluations(policy.id, overrides.filter(o => o.label !== label));
  };

  const getMemberName = (id: string) => {
    const member = familyMembers.find(m => m.id === id);
    return member ? member.name : '未設定';
  };

  const formatYen = (amount: number) => {
    if (amount >= 10000) return `${(amount / 10000).toLocaleString()}万円`;
    return `${amount.toLocaleString()}円`;
  };
  const formatPolicyMoney = (yenAmount: number, foreignAmount?: number) => {
    if (policy.currency === 'USD' && foreignAmount && foreignAmount > 0) {
      return `$${foreignAmount.toLocaleString()}（円換算 ${formatYen(yenAmount)}）`;
    }
    return formatYen(yenAmount);
  };

  const monthly = getMonthlyPremium(policy);
  const pensionSummary = policy.policyType === '個人年金保険' && policy.maturityBenefit > 0
    ? getPensionPayoutSummary(policy)
    : null;
  const insuredBirthDate = familyMembers.find(member => member.id === policy.insuredId)?.birthDate ?? '';
  const incomeProtectionCurrentTotal = isIncomeProtection
    ? getIncomeProtectionDeathBenefitTotal(policy, insuredBirthDate)
    : null;
  const incomeProtectionAmountWarning = isLikelyIncomeProtectionGrossAmount(policy);

  return (
    <div className={`policy-analysis-card ${analysis.isExpired ? 'expired-card' : ''}`}>
      <h3 className="pac-print-section-title">
        <ClipboardList size={20} />
        個々の保険の分析
      </h3>
      <div className="pac-header">
        <div className="pac-header-left">
          <span
            className="policy-type-badge"
            style={{ background: typeInfo.bgColor, color: typeInfo.color, borderColor: typeInfo.borderColor }}
          >
            {policy.policyType}
          </span>
          <span className="pac-company">{policy.companyName}</span>
          {analysis.isExpired && <span className="expired-badge">保障終了</span>}
        </div>
        <div className="pac-header-meta">
          <span>証券番号: {policy.policyNumber}</span>
          <span>被保険者: {getMemberName(policy.insuredId)}</span>
        </div>
      </div>

      <div className="pac-body">
        <div className="pac-left">
          {(policy.deathBenefitDisease > 0 || policy.deathBenefitAccident > 0 || policy.hospDayDisease > 0 || policy.diagnosisBenefit > 0) && (
            <div className="pac-section">
              <h5>保障内容</h5>
              <div className="pac-data-grid">
                {policy.deathBenefitDisease > 0 && (
                  <div className="pac-data-row">
                    <span className="pac-data-label">{isIncomeProtection ? '死亡保険金月額' : '死亡保障（疾病）'}</span>
                    <span className="pac-data-value">{formatPolicyMoney(policy.deathBenefitDisease, policy.foreignDeathBenefitDisease)}</span>
                  </div>
                )}
                {policy.deathBenefitAccident > 0 && policy.deathBenefitAccident !== policy.deathBenefitDisease && (
                  <div className="pac-data-row">
                    <span className="pac-data-label">死亡保障（災害）</span>
                    <span className="pac-data-value">{formatPolicyMoney(policy.deathBenefitAccident, policy.foreignDeathBenefitAccident)}</span>
                  </div>
                )}
                {isIncomeProtection && incomeProtectionCurrentTotal !== null && incomeProtectionCurrentTotal > 0 && (
                  <div className="pac-data-row highlight-row">
                    <span className="pac-data-label">現在の受取総額（今日死亡時）</span>
                    <span className="pac-data-value">{formatYen(Math.round(incomeProtectionCurrentTotal))}</span>
                  </div>
                )}
                {incomeProtectionAmountWarning && (
                  <div className="pac-data-row highlight-row">
                    <span className="pac-data-label">金額確認</span>
                    <span className="pac-data-value">死亡保険金月額に総額が入っている可能性があります</span>
                  </div>
                )}
                {policy.hospDayDisease > 0 && (
                  <div className="pac-data-row">
                    <span className="pac-data-label">入院日額（疾病）</span>
                    <span className="pac-data-value">{formatPolicyMoney(policy.hospDayDisease, policy.foreignHospDayDisease)}</span>
                  </div>
                )}
                {policy.hospDayAccident > 0 && policy.hospDayAccident !== policy.hospDayDisease && (
                  <div className="pac-data-row">
                    <span className="pac-data-label">入院日額（災害）</span>
                    <span className="pac-data-value">{formatPolicyMoney(policy.hospDayAccident, policy.foreignHospDayAccident)}</span>
                  </div>
                )}
                {policy.diagnosisBenefit > 0 && (
                  <div className="pac-data-row">
                    <span className="pac-data-label">診断一時金</span>
                    <span className="pac-data-value">{formatPolicyMoney(policy.diagnosisBenefit, policy.foreignDiagnosisBenefit)}</span>
                  </div>
                )}
                {policy.maturityBenefit > 0 && (
                  <div className="pac-data-row">
                    <span className="pac-data-label">{policy.policyType === '個人年金保険' ? '年金原資（受取総額）' : '満期保険金'}</span>
                    <span className="pac-data-value">{formatPolicyMoney(policy.maturityBenefit, policy.foreignMaturityBenefit)}</span>
                  </div>
                )}
              </div>
              <div className="pac-coverage-period">
                保障期間: {policy.policyEndAge === 999 ? '終身' : `${policy.policyEndAge}歳まで`}
              </div>
            </div>
          )}

          {pensionSummary && (
            <div className="pac-section">
              <h5><Landmark size={14} /> 年金受取</h5>
              <div className="pac-data-grid">
                <div className="pac-data-row">
                  <span className="pac-data-label">年金受取開始</span>
                  <span className="pac-data-value">{pensionSummary.startAge}歳</span>
                </div>
                <div className="pac-data-row">
                  <span className="pac-data-label">受取期間</span>
                  <span className="pac-data-value">{policy.policyEndAge === 999 ? '終身' : `${pensionSummary.periodYears}年間`}</span>
                </div>
                <div className="pac-data-row">
                  <span className="pac-data-label">年間年金額</span>
                  <span className="pac-data-value">{formatYen(Math.round(pensionSummary.annualPayout))}</span>
                </div>
                <div className="pac-data-row">
                  <span className="pac-data-label">年金受取総額</span>
                  <span className="pac-data-value">{formatPolicyMoney(policy.maturityBenefit, policy.foreignMaturityBenefit)}</span>
                </div>
              </div>
              <div className="pac-coverage-period">
                年金原資 ÷ {policy.policyEndAge === 999 ? '20年（仮置き）' : `${pensionSummary.periodYears}年`}で年間年金額を概算
              </div>
            </div>
          )}

          <div className="pac-section">
            <h5><Calculator size={14} /> 今後の保険料</h5>
            <div className="pac-data-grid">
              <div className="pac-data-row">
                <span className="pac-data-label">月額保険料</span>
                <span className="pac-data-value">
                  {policy.paymentFrequency === 'single'
                    ? '一時払'
                    : policy.currency === 'USD' && policy.foreignPremiumAmount
                  ? `$${Math.round(policy.foreignPremiumAmount / (policy.paymentFrequency === 'annual' ? 12 : 1)).toLocaleString()}（円換算 ${Math.round(monthly).toLocaleString()}円）`
                      : `${Math.round(monthly).toLocaleString()}円`}
                </span>
              </div>
              {analysis.remainingPremiums > 0 && (
                <div className="pac-data-row">
                  <span className="pac-data-label">残り支払額</span>
                  <span className="pac-data-value">{formatYen(Math.round(analysis.remainingPremiums))}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pac-right">
          <PolicyMiniChart policy={policy} currentAge={currentAge} />

          <div className="pac-evaluations">
            {evaluationSlots.map(slot => {
              if (editingLabel === slot.label) {
                return (
                  <div key={slot.label} className="eval-badge eval-badge-editing">
                    <div className="eval-badge-header">
                      <span className="eval-badge-label">{slot.label}</span>
                      <select
                        className="insight-type-select"
                        value={editRating}
                        onChange={e => setEditRating(e.target.value as EvaluationResult['rating'])}
                      >
                        {Object.entries(RATING_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="eval-edit-row">
                      <input
                        className="insight-edit-input"
                        value={editText}
                        autoFocus
                        onChange={e => setEditText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveEvaluation(); }}
                        placeholder="評価コメントを入力..."
                      />
                      <button className="insight-icon-btn" onClick={saveEvaluation} title="保存">
                        <Check size={14} />
                      </button>
                      <button className="insight-icon-btn" onClick={() => setEditingLabel(null)} title="キャンセル">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                );
              }
              if (slot.display) {
                return (
                  <EvaluationBadge
                    key={slot.label}
                    evaluation={slot.display}
                    onEdit={() => startEditEvaluation(slot.label, slot.display)}
                    onReset={slot.override ? () => resetEvaluation(slot.label) : undefined}
                  />
                );
              }
              return (
                <button
                  key={slot.label}
                  className="insight-action-btn eval-add-btn no-print"
                  onClick={() => startEditEvaluation(slot.label, null)}
                >
                  <Plus size={14} /> {slot.label}を追加
                </button>
              );
            })}
          </div>

          <div className="pac-consultant-note">
            <h5><MessageSquare size={14} /> コンサルタントメモ</h5>
            <textarea
              className="consultant-note-input"
              value={policy.consultantNote ?? analysis.consultantNote}
              onChange={(e) => onUpdateNote(policy.id, e.target.value)}
              rows={4}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PolicyAnalysisCard;
