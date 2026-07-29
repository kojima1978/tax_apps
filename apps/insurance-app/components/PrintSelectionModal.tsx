'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  const dialogRef = useRef<HTMLDivElement>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<PrintPageKey>>(
    () => new Set(availablePageKeys),
  );
  const policyById = useMemo(
    () => new Map(policies.map(policy => [policy.id, policy])),
    [policies],
  );
  const fixedKeys = availablePageKeys.filter(key => !key.startsWith('policy:'));
  const policyKeys = availablePageKeys.filter(key => key.startsWith('policy:'));

  useEffect(() => {
    const dialog = dialogRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusableSelector = [
      'button:not([disabled])',
      'input:not([disabled])',
      '[href]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');

    dialog?.querySelector<HTMLElement>('.print-selection-bulk-toggle')?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !dialog) return;
      const focusableElements = Array.from(
        dialog.querySelectorAll<HTMLElement>(focusableSelector),
      ).filter(element => !element.hasAttribute('disabled'));
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  const toggleKey = (key: PrintPageKey) => {
    setSelectedKeys(current => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectedCount = availablePageKeys.filter(key => selectedKeys.has(key)).length;
  const allSelected = selectedCount === availablePageKeys.length;
  const toggleAll = () => {
    setSelectedKeys(allSelected
      ? new Set<PrintPageKey>()
      : new Set(availablePageKeys));
  };

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
      <div ref={dialogRef} className="form-container print-selection-modal" role="dialog" aria-modal="true" aria-labelledby="print-selection-title">
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
          <span className="print-selection-count">
            {selectedCount} / {availablePageKeys.length} ページ選択中
          </span>
          <button
            type="button"
            className="print-selection-bulk-toggle"
            onClick={toggleAll}
          >
            {allSelected ? 'すべて解除' : 'すべて選択'}
          </button>
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
                  policy
                    ? `${policy.companyName}${policy.policyNumber ? `｜証券番号 ${policy.policyNumber}` : ''}`
                    : undefined,
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
