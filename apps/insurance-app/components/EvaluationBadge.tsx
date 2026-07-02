import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Pencil, RotateCcw } from 'lucide-react';
import type { EvaluationResult } from '@/utils/analysisUtils';

const ratingConfig = {
  good: { icon: CheckCircle2, color: '#166534', bgColor: '#dcfce7', borderColor: '#86efac' },
  caution: { icon: AlertTriangle, color: '#92400e', bgColor: '#fef3c7', borderColor: '#fcd34d' },
  warning: { icon: AlertCircle, color: '#991b1b', bgColor: '#fee2e2', borderColor: '#fca5a5' },
};

interface EvaluationBadgeProps {
  evaluation: EvaluationResult;
  onEdit?: () => void;
  onReset?: () => void;
}

const EvaluationBadge: React.FC<EvaluationBadgeProps> = ({ evaluation, onEdit, onReset }) => {
  const config = ratingConfig[evaluation.rating];
  const Icon = config.icon;

  return (
    <div className="eval-badge" style={{ background: config.bgColor, borderColor: config.borderColor, color: config.color }}>
      <div className="eval-badge-header">
        <Icon size={16} />
        <span className="eval-badge-label">{evaluation.label}</span>
        {(onEdit || onReset) && (
          <div className="eval-badge-actions no-print">
            {onEdit && (
              <button className="insight-icon-btn" onClick={onEdit} title="編集">
                <Pencil size={13} />
              </button>
            )}
            {onReset && (
              <button className="insight-icon-btn" onClick={onReset} title="自動評価に戻す">
                <RotateCcw size={13} />
              </button>
            )}
          </div>
        )}
      </div>
      <span className="eval-badge-text">{evaluation.text}</span>
    </div>
  );
};

export default EvaluationBadge;
