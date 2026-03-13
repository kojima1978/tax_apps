import { useState, useCallback, useEffect, useRef } from 'react';
import { parseAndValidateCSV, buildResolverMaps, MAX_IMPORT_FILE_SIZE } from '@/lib/import-csv';
import type { ImportParseResult, ResolverMaps } from '@/lib/import-csv';
import { createCase, updateCase, getAllCases } from '@/lib/api/cases';
import { getAssignees } from '@/lib/api/assignees';
import { getReferrers } from '@/lib/api/referrers';
import type { InheritanceCase } from '@/types/shared';

export type ImportStep = 'select' | 'preview' | 'importing' | 'done';

export interface ImportResult {
  success: number;
  failed: number;
  skipped: number;
  failedRows: { index: number; deceasedName: string; error: string }[];
  createdCount: number;
  updatedCount: number;
}

export function useImportCSV() {
  const [step, setStep] = useState<ImportStep>('select');
  const [parseResult, setParseResult] = useState<ImportParseResult | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [resolvers, setResolvers] = useState<ResolverMaps | null>(null);
  const [existingCases, setExistingCases] = useState<InheritanceCase[]>([]);
  const abortRef = useRef(false);

  // Load master data + existing cases for name resolution & duplicate detection
  useEffect(() => {
    Promise.all([getAssignees(), getReferrers(), getAllCases()])
      .then(([assignees, referrers, cases]) => {
        setResolvers(buildResolverMaps(assignees, referrers));
        setExistingCases(cases);
      })
      .catch(() => {});
  }, []);

  const handleFileSelect = useCallback(
    async (file: File) => {
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
        const result = parseAndValidateCSV(text, resolvers ?? undefined, existingCases);
        setParseResult(result);
        setStep('preview');
      } catch {
        setFileError('ファイルの読み込みに失敗しました');
      }
    },
    [resolvers, existingCases]
  );

  const executeImport = useCallback(async () => {
    if (!parseResult || parseResult.validRows.length === 0) return;

    setStep('importing');
    setProgress(0);
    abortRef.current = false;

    const rows = parseResult.validRows;
    let success = 0;
    let failed = 0;
    let skipped = 0;
    let createdCount = 0;
    let updatedCount = 0;
    const failedRows: ImportResult['failedRows'] = [];

    for (let i = 0; i < rows.length; i++) {
      if (abortRef.current) {
        skipped = rows.length - i;
        break;
      }

      const row = rows[i];
      try {
        if (row.mode === 'update' && row.id) {
          await updateCase(row.id, row.data);
          updatedCount++;
        } else {
          await createCase(row.data);
          createdCount++;
        }
        success++;
      } catch (e) {
        failed++;
        failedRows.push({
          index: i + 1,
          deceasedName: row.deceasedName,
          error: e instanceof Error ? e.message : '不明なエラー',
        });
      }
      setProgress(i + 1);
    }

    setImportResult({ success, failed, skipped, failedRows, createdCount, updatedCount });
    setStep('done');
  }, [parseResult]);

  const abortImport = useCallback(() => {
    abortRef.current = true;
  }, []);

  const reset = useCallback(() => {
    setStep('select');
    setParseResult(null);
    setFileError(null);
    setImportResult(null);
    setProgress(0);
    abortRef.current = false;
  }, []);

  return {
    step,
    parseResult,
    fileError,
    importResult,
    progress,
    handleFileSelect,
    executeImport,
    abortImport,
    reset,
  };
}
