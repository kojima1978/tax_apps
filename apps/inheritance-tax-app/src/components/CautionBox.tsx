import React, { useId, useState } from 'react';
import AlertTriangle from 'lucide-react/icons/alert-triangle';
import ChevronDown from 'lucide-react/icons/chevron-down';

interface CautionBoxProps {
  items: readonly string[];
  className?: string;
  collapsible?: boolean;
}

const CautionItems: React.FC<{ items: readonly string[]; className?: string; id?: string }> = ({ items, className = '', id }) => (
  <ul id={id} className={`text-sm text-yellow-700 space-y-1 list-disc list-inside ${className}`.trim()}>
    {items.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
);

export const CautionBox: React.FC<CautionBoxProps> = ({ items, className = '', collapsible = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const contentId = useId();
  const boxClassName = `bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg p-4 alert-fade-in ${className}`.trim();

  if (collapsible) {
    return (
      <div className={`${boxClassName} collapsible-caution`} data-expanded={isExpanded}>
        <button
          type="button"
          className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-600 focus-visible:ring-offset-2 focus-visible:ring-offset-yellow-50"
          aria-expanded={isExpanded}
          aria-controls={contentId}
          onClick={() => setIsExpanded(current => !current)}
        >
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-yellow-600" aria-hidden="true" />
          <span className="font-bold text-yellow-800">ご注意</span>
          <small className="ml-auto text-xs font-medium text-yellow-700">
            <span className="collapsible-caution-closed-label">{items.length}項目を見る</span>
            <span className="collapsible-caution-open-label">閉じる</span>
          </small>
          <span className="collapsible-caution-chevron flex h-4 w-4 flex-shrink-0 items-center justify-center" aria-hidden="true">
            <ChevronDown className="h-4 w-4 text-yellow-700" />
          </span>
        </button>
        <CautionItems items={items} id={contentId} className="collapsible-caution-content mt-2" />
      </div>
    );
  }

  return (
    <div className={boxClassName}>
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
        <h3 className="font-bold text-yellow-800">ご注意</h3>
      </div>
      <CautionItems items={items} />
    </div>
  );
};
