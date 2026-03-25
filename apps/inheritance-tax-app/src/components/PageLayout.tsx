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
}) => (
  <>
    <Header />
    <main className={`max-w-7xl mx-auto px-4 py-8 ${printClassName}`.trim()}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 no-print">
        <div className="space-y-6">{leftSection}</div>
        <div className="space-y-6">{rightSection}</div>
      </div>

      {middleSection}

      <div className="mb-8 no-print">
        <ValidationErrorPanel show={hasAttempted} errors={validationErrors} />
        <CalculateButton onClick={onCalculate} />
      </div>

      {belowButton}

      <div ref={resultRef}>
        {resultSection}
      </div>
    </main>
  </>
);
