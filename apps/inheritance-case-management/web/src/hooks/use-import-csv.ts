import { useState, useCallback, useRef } from 'react';
import { parseAndValidateCSV, buildResolverMaps, MAX_IMPORT_FILE_SIZE } from '@/lib/import';
import type { ImportParseResult, ResolverMaps } from '@/lib/import';
import { createCase, updateCase, getAllCases } from '@/lib/api/cases';
import { DEFAULT_PROGRESS_STEPS } from '@/lib/progress-utils';
import { getAssignees, createAssignee } from '@/lib/api/assignees';
import { getReferrers, createReferrer } from '@/lib/api/referrers';
import { getDepartments, createDepartment } from '@/lib/api/departments';
import { getCompanies, createCompany } from '@/lib/api/companies';
import type { PendingReferrer, PendingAssignee } from '@/lib/import';
import type { InheritanceCase, Department, Company } from '@/types/shared';

export type ImportStep = 'select' | 'preview' | 'importing' | 'done';

export interface ImportResult {
  success: number;
  failed: number;
  skipped: number;
  failedRows: { index: number; deceasedName: string; error: string }[];
  createdCount: number;
  updatedCount: number;
}

/** Generic resolve-or-create for simple name-based master data (Department, Company) */
async function resolveOrCreateByName<T extends { id: number; name: string }>(
  name: string,
  items: T[],
  cache: Map<string, number>,
  createFn: (payload: { name: string }) => Promise<T>
): Promise<number> {
  const cached = cache.get(name);
  if (cached) return cached;

  const existing = items.find((item) => item.name === name);
  if (existing) {
    cache.set(name, existing.id);
    return existing.id;
  }

  const created = await createFn({ name });
  cache.set(name, created.id);
  return created.id;
}

async function resolveOrCreateAssignee(
  pending: PendingAssignee,
  departments: Department[],
  assigneeCache: Map<string, number>,
  departmentCache: Map<string, number>
): Promise<number> {
  const cacheKey = pending.name;
  const cached = assigneeCache.get(cacheKey);
  if (cached) return cached;

  let departmentId: number | null = null;
  if (pending.department) {
    departmentId = await resolveOrCreateByName(pending.department, departments, departmentCache, (p) => createDepartment({ ...p, sortOrder: 0 }));
  }

  const created = await createAssignee({
    name: pending.name,
    departmentId,
  });
  assigneeCache.set(cacheKey, created.id);
  return created.id;
}

async function resolveOrCreateReferrer(
  pending: PendingReferrer,
  companies: Company[],
  referrerCache: Map<string, number>,
  companyCache: Map<string, number>
): Promise<number> {
  const cacheKey = `${pending.company}\0${pending.name ?? ''}`;
  const cached = referrerCache.get(cacheKey);
  if (cached) return cached;

  const companyId = await resolveOrCreateByName(pending.company, companies, companyCache, createCompany);

  const created = await createReferrer({
    companyId,
    name: pending.name || undefined,
    department: pending.department,
  });
  referrerCache.set(cacheKey, created.id);
  return created.id;
}

/** Detect encoding and decode CSV file (UTF-8 BOM → UTF-8, otherwise try Shift-JIS) */
async function decodeCSVFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // UTF-8 BOM detection
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(buffer);
  }

  // Try UTF-8 first — if it decodes cleanly (no replacement chars), use it
  const utf8Text = new TextDecoder('utf-8', { fatal: true });
  try {
    return utf8Text.decode(buffer);
  } catch {
    // Not valid UTF-8 → decode as Shift-JIS (CP932)
    return new TextDecoder('shift-jis').decode(buffer);
  }
}

export function useImportCSV() {
  const [step, setStep] = useState<ImportStep>('select');
  const [parseResult, setParseResult] = useState<ImportParseResult | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [resolvers, setResolvers] = useState<ResolverMaps | null>(null);
  const [existingCases, setExistingCases] = useState<InheritanceCase[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
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
        // マスターデータと既存案件を最新に更新してからパース
        const [freshAssignees, freshReferrers, freshCases, freshDepts, freshComps] = await Promise.all([
          getAssignees(), getReferrers(), getAllCases(), getDepartments(), getCompanies(),
        ]);
        const freshResolvers = buildResolverMaps(freshAssignees, freshReferrers);
        setResolvers(freshResolvers);
        setExistingCases(freshCases);
        setDepartments(freshDepts);
        setCompanies(freshComps);

        const text = await decodeCSVFile(file);
        const result = parseAndValidateCSV(text, freshResolvers, freshCases);
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
    let success = 0;
    let failed = 0;
    let skipped = 0;
    let createdCount = 0;
    let updatedCount = 0;
    const failedRows: ImportResult['failedRows'] = [];

    // Caches for auto-created master data (avoid duplicate API calls)
    const departmentCache = new Map<string, number>();
    const companyCache = new Map<string, number>();
    const assigneeCache = new Map<string, number>();
    const referrerCache = new Map<string, number>();

    for (let i = 0; i < rows.length; i++) {
      if (abortRef.current) {
        skipped = rows.length - i;
        break;
      }

      const row = rows[i];
      try {
        // Auto-create assignee if pending
        if (row.pendingAssignee) {
          const asgId = await resolveOrCreateAssignee(row.pendingAssignee, departments, assigneeCache, departmentCache);
          row.data.assigneeId = asgId;
        }

        // Auto-create referrer if pending
        if (row.pendingReferrer) {
          const refId = await resolveOrCreateReferrer(row.pendingReferrer, companies, referrerCache, companyCache);
          row.data.referrerId = refId;
        }

        if (row.mode === 'update' && row.id) {
          await updateCase(row.id, row.data);
          updatedCount++;
        } else {
          // 進捗データがなければデフォルトステップを自動セット
          if (!row.data.progress || row.data.progress.length === 0) {
            row.data.progress = [...DEFAULT_PROGRESS_STEPS];
          }
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
  }, [parseResult, departments, companies]);

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
