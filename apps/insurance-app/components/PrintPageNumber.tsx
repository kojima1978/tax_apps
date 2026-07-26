import React from 'react';
import { usePrintPage } from '@/components/PrintPageContext';
import type { PrintPageKey } from '@/utils/printPages';

interface PrintPageNumberProps {
  pageKey: PrintPageKey;
}

const PrintPageNumber: React.FC<PrintPageNumberProps> = ({ pageKey }) => {
  const page = usePrintPage(pageKey);
  if (!page) return null;

  return (
    <div className="print-only print-page-number" aria-hidden="true">
      {page.currentPage} / {page.totalPages}
    </div>
  );
};

export default PrintPageNumber;
