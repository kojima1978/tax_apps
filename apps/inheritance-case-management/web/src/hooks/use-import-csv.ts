import { useState, useCallback, useEffect } from 'react';
import { parseAndValidateCSV, buildResolverMaps, MAX_IMPORT_FILE_SIZE } from '@/lib/import-csv';
import type { ImportParseResult, ResolverMaps } from '@/lib/import-csv';
import { createCase } from '@/lib/api/cases';
import { getAssignees } from '@/lib/api/assignees';
import { getReferrers } from '@/lib/api/referrers';

export type ImportStep = 'select' | 'preview' | 'importing' | 'done';

export interface ImportResult {
  success: number;
  failed: number;
  failedRows: { index: number; deceasedName: string; error: string }[];
}

export function useImportCSV() {
  const [step, setStep] = useState<ImportStep>('select');
  const [parseResult, setParseResult] = useState<ImportParseResult | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [resolvers, setResolvers] = useState<ResolverMaps | null>(null);

  // Load master data for name→ID resolution
  useEffect(() => {
    Promise.all([getAssignees(), getReferrers()])
      .then(([assignees, referrers]) => setResolvers(buildResolverMaps(assignees, referrers)))
      .catch(() => {});
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    setFileError(null);
    setParseResult(null);

    if (!file.name.endsWith('.csv')) {
      setFileError('CSVファイル(.csv)を選択してください');
      return;
    }

    if (file.size > MAX_IMPORT_FILE_SIZE) {
      setFileError('ファイルサイズが5MBを超えています');
      return;
    }

    if (file.size === 0) {
      setFileError('空のファイルです');
      return;
    }

    try {
      const text = await file.text();
      const result = parseAndValidateCSV(text, resolvers ?? undefined);
      setParseResult(result);
      setStep('preview');
    } catch {
      setFileError('ファイルの読み込みに失敗しました');
    }
  }, [resolvers]);

  const executeImport = useCallback(async () => {
    if (!parseResult || parseResult.validRows.length === 0) return;

    setStep('importing');
    setProgress(0);

    const rows = parseResult.validRows;
    let success = 0;
    let failed = 0;
    const failedRows: ImportResult['failedRows'] = [];

    for (let i = 0; i < rows.length; i++) {
      try {
        await createCase(rows[i]);
        success++;
      } catch (e) {
        failed++;
        failedRows.push({
          index: i + 1,
          deceasedName: rows[i].deceasedName,
          error: e instanceof Error ? e.message : '不明なエラー',
        });
      }
      setProgress(i + 1);
    }

    setImportResult({ success, failed, failedRows });
    setStep('done');
  }, [parseResult]);

  const reset = useCallback(() => {
    setStep('select');
    setParseResult(null);
    setFileError(null);
    setImportResult(null);
    setProgress(0);
  }, []);

  return {
    step,
    parseResult,
    fileError,
    importResult,
    progress,
    handleFileSelect,
    executeImport,
    reset,
  };
}
