import { useState, useCallback } from 'react';

export function useExcelExport(exportFn: () => Promise<void>) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async () => {
    try {
      setIsExporting(true);
      await exportFn();
    } catch (err) {
      console.error('Excel export error:', err);
    } finally {
      setIsExporting(false);
    }
  }, [exportFn]);

  return { isExporting, handleExport };
}
