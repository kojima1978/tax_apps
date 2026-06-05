import { useState, useCallback, useRef } from 'react';
import { parseAndValidateCSV, buildResolverMaps, decodeCSVFile, MAX_IMPORT_FILE_SIZE } from '@/lib/import';
import type { ImportParseResult } from '@/lib/import';
import { getAllCases, bulkUpsertCases } from '@/lib/api/cases';
import type { BulkUpsertPayload } from '@/lib/api/cases';
import { DEFAULT_PROGRESS_STEPS } from '@/lib/progress-utils';
import { getAssignees } from '@/lib/api/assignees';
import { getReferrers } from '@/lib/api/referrers';
import { getDepartments } from '@/lib/api/departments';
import { getCompanies } from '@/lib/api/companies';
import { getCompanyBranches } from '@/lib/api/company-branches';
import { resolveOrCreateAssignee, resolveOrCreateReferrer } from '@/lib/import/master-resolver';
import type { Department, Company, CompanyBranch } from '@/types/shared';

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
  const [departments, setDepartments] = useState<Department[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<CompanyBranch[]>([]);
  const abortRef = useRef(false);

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
        const [freshAssignees, freshReferrers, freshCases, freshDepts, freshComps, freshBranches] = await Promise.all([
          getAssignees(), getReferrers(), getAllCases(), getDepartments(), getCompanies(), getCompanyBranches(),
        ]);
        const freshResolvers = buildResolverMaps(freshAssignees, freshReferrers);
        setDepartments(freshDepts);
        setCompanies(freshComps);
        setBranches(freshBranches);

        const { text, encoding } = await decodeCSVFile(file);
        const result = parseAndValidateCSV(text, freshResolvers, freshCases);
        if (encoding === 'shift-jis') {
          result.warnings.unshift({
            row: 0,
            message: 'Shift-JIS（CP932）として読み込みました。文字化けがある場合はUTF-8で保存し直してください',
          });
        }
        setParseResult(result);
        setStep('preview');
      } catch {
        setFileError('ファイルの読み込みに失敗しました');
      }
    },
    []
  );

  const executeImport = useCallback(async () => {
    if (!parseResult || parseResult.validRows.length === 0) return;

    setStep('importing');
    setProgress(0);
    abortRef.current = false;

    const rows = parseResult.validRows;
    const failedRows: ImportResult['failedRows'] = [];

    // Phase 1: マスタデータの事前解決・作成
    const departmentCache = new Map<string, number>();
    const companyCache = new Map<string, number>();
    const branchCache = new Map<string, number>();
    const assigneeCache = new Map<string, number>();
    const referrerCache = new Map<string, number>();
    const resolvedRows: typeof rows = [];

    for (let i = 0; i < rows.length; i++) {
      if (abortRef.current) break;
      const row = rows[i];
      let data = row.data;
      try {
        if (row.pendingAssignee) {
          data = {
            ...data,
            assigneeId: await resolveOrCreateAssignee(row.pendingAssignee, departments, assigneeCache, departmentCache),
          };
        }
        if (row.pendingInternalReferrer) {
          data = {
            ...data,
            internalReferrerId: await resolveOrCreateAssignee(row.pendingInternalReferrer, departments, assigneeCache, departmentCache),
          };
        }
        if (row.pendingReferrer) {
          data = {
            ...data,
            referrerId: await resolveOrCreateReferrer(row.pendingReferrer, companies, branches, referrerCache, companyCache, branchCache),
          };
        }
      } catch (e) {
        failedRows.push({
          index: i + 1,
          deceasedName: row.deceasedName,
          error: `マスタ作成エラー: ${e instanceof Error ? e.message : '不明なエラー'}`,
        });
      }
      resolvedRows.push({ ...row, data });
    }

    if (abortRef.current) {
      setImportResult({ success: 0, failed: 0, skipped: rows.length, failedRows: [], createdCount: 0, updatedCount: 0 });
      setStep('done');
      return;
    }

    // Phase 2: バッチAPI でケースを一括作成・更新
    const failedIndices = new Set(failedRows.map(r => r.index));
    const batchItems: (BulkUpsertPayload & { originalIndex: number; deceasedName: string })[] = [];

    for (let i = 0; i < resolvedRows.length; i++) {
      if (failedIndices.has(i + 1)) continue;
      const row = resolvedRows[i];
      const data =
        row.mode === 'create' && (!row.data.progress || row.data.progress.length === 0)
          ? { ...row.data, progress: [...DEFAULT_PROGRESS_STEPS] }
          : row.data;
      batchItems.push({
        mode: row.mode,
        id: row.id,
        data,
        originalIndex: i + 1,
        deceasedName: row.deceasedName,
      });
    }

    let createdCount = 0;
    let updatedCount = 0;
    const CHUNK_SIZE = 50;

    for (let start = 0; start < batchItems.length; start += CHUNK_SIZE) {
      if (abortRef.current) break;
      const chunk = batchItems.slice(start, start + CHUNK_SIZE);
      try {
        const result = await bulkUpsertCases(
          chunk.map(({ mode, id, data }) => ({ mode, id, data }))
        );
        createdCount += result.created;
        updatedCount += result.updated;
        for (const r of result.results) {
          if (!r.success) {
            const item = chunk[r.index];
            failedRows.push({
              index: item.originalIndex,
              deceasedName: item.deceasedName,
              error: r.error || '不明なエラー',
            });
          }
        }
      } catch (e) {
        for (const item of chunk) {
          failedRows.push({
            index: item.originalIndex,
            deceasedName: item.deceasedName,
            error: e instanceof Error ? e.message : '不明なエラー',
          });
        }
      }
      setProgress(Math.min(start + CHUNK_SIZE, batchItems.length));
    }

    const success = createdCount + updatedCount;
    const failed = failedRows.length;
    const skipped = abortRef.current ? batchItems.length - (success + failed) : 0;

    setImportResult({ success, failed, skipped, failedRows, createdCount, updatedCount });
    setStep('done');
  }, [parseResult, departments, companies, branches]);

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
