'use client';

import React, { useState } from 'react';
import { CheckSquare, FileText, Printer, Square, X } from 'lucide-react';
import type { Policy } from '@/types';
import type { PrintPageKey } from '@/utils/printPages';

interface PrintSelectionModalProps {
  availablePageKeys: PrintPageKey[];
  policies: Policy[];
  onConfirm: (pageKeys: PrintPageKey[]) => void;
  onClose: () => void;
}

const FIXED_PAGE_LABELS: Partial<Record<PrintPageKey, string>> = {
  cover: '表紙',
  toc: '目次',
  summary: 'サマリー・証券一覧',
  charts: '保障額・保険料負担の推移',
  beneficiary: '受取人ごとの死亡保障',
  overview: '保険種類の総合説明',
};

const PrintSelectionModal: React.FC<PrintSelectionModalProps> = ({
  availablePageKeys,
  policies,
  onConfirm,
  onClose,
}) => {
  const [selectedKeys, setSelectedKeys] = useState<Set<PrintPageKey>>(
    () => new Set(availablePageKeys),
  );
  const policyById = new Map(policies.map(policy => [policy.id, policy]));
  const fixedKeys = availablePageKeys.filter(key => !key.startsWith('policy:'));
  const policyKeys = availablePageKeys.filter(key => key.startsWith('policy:'));

  const toggleKey = (key: PrintPageKey) => {
    setSelectedKeys(current => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAll = () => setSelectedKeys(new Set(availablePageKeys));
  const clearAll = () => setSelectedKeys(new Set<PrintPageKey>());
  const selectedCount = availablePageKeys.filter(key => selectedKeys.has(key)).length;

  const renderOption = (key: PrintPageKey, label: string, detail?: string) => {
    const checked = selectedKeys.has(key);
    return (
      <label key={key} className={`print-selection-option${checked ? ' is-selected' : ''}`}>
        <input
          type="checkbox"
          checked={checked}
          onChange={() => toggleKey(key)}
        />
        <span className="print-selection-check" aria-hidden="true">
          {checked ? <CheckSquare size={18} /> : <Square size={18} />}
        </span>
        <span className="print-selection-option-text">
          <strong>{label}</strong>
          {detail && <small>{detail}</small>}
        </span>
      </label>
    );
  };

  return (
    <div className="form-overlay no-print">
      <div className="form-container print-selection-modal" role="dialog" aria-modal="true" aria-labelledby="print-selection-title">
        <div className="modal-header">
          <div className="title-with-icon">
            <Printer className="icon" />
            <h3 id="print-selection-title">印刷する帳票を選択</h3>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="閉じる">
            <X size={20} />
          </button>
        </div>

        <div className="print-selection-toolbar">
          <span>{selectedCount} / {availablePageKeys.length} ページ選択中</span>
          <div>
            <button type="button" onClick={selectAll}>すべて選択</button>
            <button type="button" onClick={clearAll}>すべて解除</button>
          </div>
        </div>

        <div className="print-selection-list">
          {fixedKeys.map(key => renderOption(key, FIXED_PAGE_LABELS[key] || key))}

          {policyKeys.length > 0 && (
            <div className="print-selection-policy-group">
              <div className="print-selection-group-title">
                <FileText size={16} />
                個々の保険の分析
              </div>
              {policyKeys.map(key => {
                const policy = policyById.get(key.slice('policy:'.length));
                return renderOption(
                  key,
                  policy?.policyType || '保険証券',
                  policy ? `${policy.companyName}${policy.policyNumber ? `・${policy.policyNumber}` : ''}` : undefined,
                );
              })}
            </div>
          )}
        </div>

        <div className="form-actions print-selection-actions">
          <button
            type="button"
            className="save-btn"
            disabled={selectedCount === 0}
            onClick={() => onConfirm(availablePageKeys.filter(key => selectedKeys.has(key)))}
          >
            <Printer size={17} /> 選択した帳票を印刷
          </button>
          <button type="button" className="cancel-btn" onClick={onClose}>キャンセル</button>
        </div>
      </div>
    </div>
  );
};

export default PrintSelectionModal;
