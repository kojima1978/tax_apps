import React from 'react';
import { Header } from './Header';
import { ValidationErrorPanel } from './ValidationErrorPanel';
import { CalculateButton } from './CalculateButton';

interface PageLayoutProps {
  printClassName?: string;
  leftSection: React.ReactNode;
  rightSection: React.ReactNode;
  middleSection?: React.ReactNode;
  validationErrors?: string[];
  hasAttempted?: boolean;
  onCalculate: () => void;
  belowButton?: React.ReactNode;
  resultRef: React.RefObject<HTMLDivElement | null>;
  resultSection: React.ReactNode;
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  printClassName = '',
  leftSection,
  rightSection,
  middleSection,
  validationErrors = [],
  hasAttempted = false,
  onCalculate,
  belowButton,
  resultRef,
  resultSection,
}) => {
  const handleCalculateClick = () => {
    onCalculate();
    window.setTimeout(() => {
      const target = document.querySelector<HTMLElement>(
        '[aria-invalid="true"], .ring-red-400 input:not(:disabled), .ring-red-400 select:not(:disabled)',
      );
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  return (
    <div className="inheritance-shell">
      <Header />
      <main
        id="main-content"
        className={`inheritance-main max-w-7xl w-full mx-auto px-3 md:px-4 py-4 md:py-8 ${printClassName}`.trim()}
      >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8 no-print">
        <div className="space-y-4 md:space-y-6">{leftSection}</div>
        <div className="space-y-4 md:space-y-6">{rightSection}</div>
      </div>

      {middleSection}

      <div className="mb-6 md:mb-8 no-print">
        <ValidationErrorPanel show={hasAttempted} errors={validationErrors} />
        <CalculateButton onClick={handleCalculateClick} />
      </div>

      {belowButton}

      <div ref={resultRef} role="region" aria-label="計算結果" aria-live="polite">
        {resultSection}
      </div>
      </main>
    </div>
  );
};
