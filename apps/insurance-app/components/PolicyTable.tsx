'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { isIncomeProtectionPolicyType } from '@/types';
import type { Policy, FamilyMember, ValuationSettings } from '@/types';
import { Edit2, GripVertical, Trash, Search, X } from 'lucide-react';
import { getActiveMonthlyPremium, getIncomeProtectionDeathBenefitTotal, getMonthlyPremium, getPensionPayoutSummary, isExpired, isLikelyIncomeProtectionGrossAmount, isPaidUp } from '@/utils/analysisUtils';
import { formatWholeManYen } from '@/utils/currencyUtils';
import { getBeneficiaryAllocations } from '@/utils/beneficiaryUtils';

type DropPosition = 'before' | 'after';

const formatDeathBenefitYen = (amount: number) => formatWholeManYen(amount, '-');

const formatUsdWhole = (amount: number) =>
  `$${Math.trunc(Math.max(0, amount)).toLocaleString('ja-JP')}`;

interface PolicyTableProps {
  policies: Policy[];
  familyMembers: FamilyMember[];
  currentAge: number | null;
  valuationSettings: ValuationSettings;
  onDelete: (id: string) => void;
  onEdit: (policy: Policy) => void;
  onAddNew: () => void;
  onReorder: (draggedId: string, targetId: string, position: DropPosition) => void;
}

const PolicyTable: React.FC<PolicyTableProps> = ({
  policies,
  familyMembers,
  currentAge,
  valuationSettings,
  onDelete,
  onEdit,
  onAddNew,
  onReorder,
}) => {
  const [draggedPolicyId, setDraggedPolicyId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; position: DropPosition } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const getMemberName = useCallback((id: string) => {
    const member = familyMembers.find(m => m.id === id);
    return member ? `${member.relationship} (${member.name})` : '未設定';
  }, [familyMembers]);

  const getBeneficiaryLabel = useCallback((policy: Policy) => {
    const allocations = getBeneficiaryAllocations(policy);
    if (allocations.length === 0) return '未設定';
    return allocations
      .map(allocation => `${getMemberName(allocation.beneficiaryId)} ${allocation.percentage.toLocaleString('ja-JP')}%`)
      .join('、');
  }, [getMemberName]);

  const currentMonthlyBurden = policies.reduce((sum, p) => sum + getActiveMonthlyPremium(p, currentAge), 0);
  const isIncomeProtection = (policy: Policy) => isIncomeProtectionPolicyType(policy.policyType);
  const getIncomeProtectionTotal = (policy: Policy) => {
    const insured = familyMembers.find(member => member.id === policy.insuredId);
    return getIncomeProtectionDeathBenefitTotal(policy, insured?.birthDate ?? '');
  };
  const totalDeathBenefit = policies.reduce((sum, p) => sum + (isIncomeProtection(p) ? getIncomeProtectionTotal(p) ?? 0 : p.deathBenefitDisease), 0);
  const totalHospDay = policies.reduce((sum, p) => sum + p.hospDayDisease, 0);
  const monthlyBurdenTotalNote = currentAge === null
    ? '一時払を除外。払込終了判定には生年月日が必要'
    : '対象: 月払・年払（払込中）';
  const hasUsdPolicies = policies.some(policy => policy.currency === 'USD');

  const freqLabel = (f: string) => f === 'monthly' ? '月払' : f === 'annual' ? '年払' : '一時払';
  const formatPrimaryAmount = (policy: Policy, yenAmount: number, foreignAmount?: number) => {
    if (policy.currency === 'USD' && foreignAmount && foreignAmount > 0) {
      return formatUsdWhole(foreignAmount);
    }
    return `${yenAmount.toLocaleString()}円`;
  };

  const formatDeathBenefitCell = (policy: Policy) => {
    if (policy.deathBenefitDisease <= 0) return '-';
    if (isIncomeProtection(policy)) {
      if (isLikelyIncomeProtectionGrossAmount(policy)) {
        return (
          <div className="benefit-cell benefit-warning">
            <div className="benefit-main">金額要確認</div>
            <div className="benefit-meta">月額欄に総額らしい金額: {formatDeathBenefitYen(policy.deathBenefitDisease)}</div>
          </div>
        );
      }
      const currentTotal = getIncomeProtectionTotal(policy);
      return (
        <div className="benefit-cell benefit-income-protection">
          <div className="benefit-line">
            <span className="benefit-label">月額保障</span>
            <span className="benefit-value">{formatDeathBenefitYen(policy.deathBenefitDisease)}</span>
          </div>
          {policy.currency === 'USD' && policy.foreignDeathBenefitDisease ? (
            <div className="benefit-original">{formatUsdWhole(policy.foreignDeathBenefitDisease)}</div>
          ) : null}
          {currentTotal !== null && (
            <div className="benefit-line">
              <span className="benefit-label">累計保障</span>
              <span className="benefit-value">{formatDeathBenefitYen(currentTotal)}</span>
            </div>
          )}
        </div>
      );
    }
    return (
      <div className="benefit-cell">
        <div className="benefit-main">{formatDeathBenefitYen(policy.deathBenefitDisease)}</div>
        {policy.currency === 'USD' && policy.foreignDeathBenefitDisease ? (
          <div className="benefit-original">元額 {formatUsdWhole(policy.foreignDeathBenefitDisease)}</div>
        ) : null}
      </div>
    );
  };

  const getPaymentEndLabel = (policy: Policy) =>
    policy.paymentEndAge === 999 ? '終身払い' : `${policy.paymentEndAge}歳まで`;

  const getPremiumMeta = (policy: Policy) => {
    if (policy.paymentFrequency === 'single') {
      if (policy.paymentCurrency === 'JPY' && policy.actualPremiumPaidJpy) {
        return `一時払・実支払${policy.actualPremiumPaidJpy.toLocaleString()}円`;
      }
      return '一時払・月額負担対象外';
    }
    if (policy.premiumPaymentCompleted) return '払込終了済み・月額負担対象外';
    if (policy.paymentFrequency === 'annual') {
      return `年払・月換算${Math.round(getMonthlyPremium(policy)).toLocaleString()}円`;
    }
    return `月払・${getPaymentEndLabel(policy)}`;
  };

  const getPensionPremiumMeta = (policy: Policy) => {
    if (policy.policyType !== '個人年金保険' || policy.maturityBenefit <= 0) return null;
    const pension = getPensionPayoutSummary(policy);
    const paymentLabel = policy.paymentFrequency === 'single'
      ? '一時払済'
      : policy.premiumPaymentCompleted || (currentAge !== null && isPaidUp(policy, currentAge))
        ? '払込済'
        : getPaymentEndLabel(policy);
    if (pension.periodYears <= 0) return `${paymentLabel}／受取年数を確認`;
    const startLabel = policy.pensionStartMode === 'fiscalYear' && policy.pensionStartFiscalYear
      ? `${policy.pensionStartFiscalYear}年度`
      : `${pension.startAge}歳`;
    return `${paymentLabel}／${startLabel}から${pension.periodYears}年受取`;
  };

  const getStatusBadges = (policy: Policy) => {
    const badges: Array<{ label: string; className: string }> = [
      { label: freqLabel(policy.paymentFrequency), className: `is-${policy.paymentFrequency}` },
    ];
    if (
      policy.paymentFrequency !== 'single'
      && (policy.premiumPaymentCompleted || (currentAge !== null && isPaidUp(policy, currentAge)))
    ) {
      badges.push({ label: '払込済', className: 'is-paid-up' });
    }
    if (currentAge !== null && isExpired(policy, currentAge)) {
      badges.push({ label: '保障終了', className: 'is-expired' });
    }
    return badges;
  };

  const filteredPolicies = useMemo(() => {
    if (!searchQuery.trim()) return policies;
    const q = searchQuery.trim().toLowerCase();
    return policies.filter(p =>
      p.companyName.toLowerCase().includes(q) ||
      p.policyType.toLowerCase().includes(q) ||
      (p.policyNumber && p.policyNumber.toLowerCase().includes(q)) ||
      getMemberName(p.insuredId).toLowerCase().includes(q) ||
      getBeneficiaryLabel(p).toLowerCase().includes(q) ||
      getMemberName(p.pensionRecipientId || '').toLowerCase().includes(q) ||
      getMemberName(p.pensionSuccessorRecipientId || '').toLowerCase().includes(q)
    );
  }, [policies, searchQuery, getMemberName, getBeneficiaryLabel]);

  const handleDragStart = (event: React.DragEvent<HTMLButtonElement>, policyId: string) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', policyId);
    setDraggedPolicyId(policyId);
  };

  const handleDragOver = (event: React.DragEvent<HTMLTableRowElement>, policyId: string) => {
    if (!draggedPolicyId || draggedPolicyId === policyId) {
      setDropTarget(null);
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    const { top, height } = event.currentTarget.getBoundingClientRect();
    const position: DropPosition = event.clientY < top + height / 2 ? 'before' : 'after';
    setDropTarget(current => (
      current?.id === policyId && current.position === position
        ? current
        : { id: policyId, position }
    ));
  };

  const handleDrop = (event: React.DragEvent<HTMLTableRowElement>, targetId: string) => {
    event.preventDefault();
    const draggedId = event.dataTransfer.getData('text/plain') || draggedPolicyId;

    if (draggedId && draggedId !== targetId && dropTarget?.id === targetId) {
      onReorder(draggedId, targetId, dropTarget.position);
    }

    setDraggedPolicyId(null);
    setDropTarget(null);
  };

  const handleDragEnd = () => {
    setDraggedPolicyId(null);
    setDropTarget(null);
  };

  return (
    <div className="table-container">
      <div className="table-header-row">
        <h3>証券一覧</h3>
        <div className="table-header-actions no-print">
          {policies.length > 3 && (
            <div className="policy-search">
              <Search size={14} />
              <input
                type="text"
                placeholder="会社名・種類・番号で検索..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="policy-search-clear" onClick={() => setSearchQuery('')}>
                  <X size={14} />
                </button>
              )}
            </div>
          )}
          <button onClick={onAddNew} className="add-button">+ 新しい保険証券を登録</button>
        </div>
      </div>
      {hasUsdPolicies && valuationSettings.usdJpyRate > 0 && (
        <div className="policy-exchange-summary">
          <span>現在評価用の共通レート{valuationSettings.fxRateDate ? `（${valuationSettings.fxRateDate}）` : ''}</span>
          <strong>
            1 USD = {valuationSettings.usdJpyRate.toLocaleString('ja-JP', { maximumFractionDigits: 2 })}円
          </strong>
        </div>
      )}
      <table className="policy-table">
        <thead>
          <tr>
            <th className="order-col">No.</th>
            <th className="drag-col"><span className="sr-only">並び替え</span></th>
            <th className="policy-info-col">証券</th>
            <th className="death-benefit-col">死亡保障（円換算）<br /><span className="th-note">収入保障は月額</span></th>
            <th className="hospital-col">入院日額</th>
            <th className="beneficiary-col">受取人</th>
            <th className="premium-col">保険料</th>
            <th className="actions-col">操作</th>
          </tr>
        </thead>
        <tbody>
          {filteredPolicies.map((policy) => {
            const originalIndex = policies.indexOf(policy);
            const pensionPremiumMeta = getPensionPremiumMeta(policy);
            const isPension = policy.policyType === '個人年金保険';
            const statusBadges = getStatusBadges(policy);
            const [paymentFrequencyBadge, ...otherStatusBadges] = statusBadges;
            return (
            <tr
              key={policy.id}
              className={[
                'policy-row',
                draggedPolicyId === policy.id ? 'is-dragging' : '',
                dropTarget?.id === policy.id ? `is-drag-over-${dropTarget.position}` : '',
              ].filter(Boolean).join(' ')}
              onDragOver={(event) => handleDragOver(event, policy.id)}
              onDragLeave={() => {
                setDropTarget(current => current?.id === policy.id ? null : current);
              }}
              onDrop={(event) => handleDrop(event, policy.id)}
            >
              <td className="order-cell" data-label="No.">{originalIndex + 1}</td>
              <td className="drag-cell no-print">
                <button
                  type="button"
                  className="drag-handle"
                  draggable
                  aria-label={`${policy.companyName} ${policy.policyType}を並び替え`}
                  title="ドラッグして並び替え"
                  onDragStart={(event) => handleDragStart(event, policy.id)}
                  onDragEnd={handleDragEnd}
                >
                  <GripVertical size={16} aria-hidden="true" />
                </button>
              </td>
              <td className="policy-info-cell" data-label="証券">
                <strong>{policy.policyType}</strong>
                <span>{policy.companyName}</span>
                <small>{policy.policyNumber || '証券番号未登録'}</small>
              </td>
              <td data-label="死亡保障">{formatDeathBenefitCell(policy)}</td>
              <td data-label="入院日額">{policy.hospDayDisease > 0 ? formatPrimaryAmount(policy, policy.hospDayDisease, policy.foreignHospDayDisease) : '-'}</td>
              <td data-label="受取人">
                {policy.policyType === '個人年金保険'
                  ? getMemberName(policy.pensionRecipientId || policy.insuredId)
                  : getBeneficiaryLabel(policy)}
              </td>
              <td data-label="保険料">
                <div className={`premium-cell${isPension ? ' pension-premium-cell' : ''}`}>
                  <div className="premium-primary-row">
                    {paymentFrequencyBadge && (
                      <span className={`policy-status-badge premium-frequency-badge ${paymentFrequencyBadge.className}`}>
                        {paymentFrequencyBadge.label}
                      </span>
                    )}
                    <div className="premium-amount-stack">
                      <div className="premium-main">{formatPrimaryAmount(policy, policy.premiumAmount, policy.foreignPremiumAmount)}</div>
                    </div>
                  </div>
                  {isPension ? (
                    pensionPremiumMeta && (
                      <div className="premium-meta pension-meta" title={pensionPremiumMeta}>
                        {pensionPremiumMeta}
                      </div>
                    )
                  ) : (
                    <div className="premium-meta">{getPremiumMeta(policy)}</div>
                  )}
                  {!isPension && otherStatusBadges.length > 0 && (
                    <div className="policy-status-badges">
                      {otherStatusBadges.map(badge => (
                        <span
                          key={`${policy.id}-${badge.className}`}
                          className={`policy-status-badge ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </td>
              <td className="actions-cell" data-label="操作">
                <button onClick={() => onEdit(policy)} className="edit-icon-btn" title="編集"><Edit2 size={16} /></button>
                <button onClick={() => onDelete(policy.id)} className="delete-icon-btn" title="削除"><Trash size={16} /></button>
              </td>
            </tr>
          );
          })}
        </tbody>
        <tfoot>
          <tr className="total-row">
            <td className="order-cell"></td>
            <td className="drag-cell"></td>
            <td className="total-caption">合計</td>
            <td style={{ fontWeight: 700 }}>{formatDeathBenefitYen(totalDeathBenefit)}</td>
            <td style={{ fontWeight: 700 }}>{totalHospDay > 0 ? `${totalHospDay.toLocaleString()}円` : '-'}</td>
            <td style={{ textAlign: 'right', fontWeight: 700 }}>
              <div className="total-label">
                <strong>現在月額負担計</strong>
                <span>{monthlyBurdenTotalNote}</span>
              </div>
            </td>
            <td style={{ fontWeight: 700 }}>{currentMonthlyBurden > 0 ? `${Math.round(currentMonthlyBurden).toLocaleString()}円/月` : '-'}</td>
            <td className="actions-cell"></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default PolicyTable;
