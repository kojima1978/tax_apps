'use client';

import { useState, useCallback } from 'react';
import { readJsonFile, validateImportData, type ExportData } from '../utils/jsonDataManager';

export function useJsonImport(onImportJson: (data: ExportData) => void) {
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const handleJsonImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportError(null);

    try {
      const data = await readJsonFile(file);
      const validation = validateImportData(data);

      if (!validation.isValid) {
        setImportError(validation.error || 'データの検証に失敗しました。');
        return;
      }

      onImportJson(data as ExportData);
      alert('データを読み込みました。');
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'ファイルの読み込みに失敗しました。');
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  }, [onImportJson]);

  const clearImportError = useCallback(() => setImportError(null), []);

  return { isImporting, importError, handleJsonImport, clearImportError };
}
