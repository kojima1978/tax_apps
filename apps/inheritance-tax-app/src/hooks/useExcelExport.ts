import { useState, useCallback } from 'react';

export function useExcelExport(exportFn: () => Promise<void>) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setError(null);
    try {
      await exportFn();
    } catch (err) {
      console.error('Excel export error:', err);
      setError('Excelファイルの生成に失敗しました。もう一度お試しください。');
    } finally {
      setIsExporting(false);
    }
  }, [exportFn]);

  return { isExporting, error, handleExport };
}
