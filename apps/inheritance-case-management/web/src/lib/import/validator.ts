import { createCaseSchema } from '@/types/validation';
import type { Assignee, Referrer, InheritanceCase } from '@/types/shared';
import type { ImportParseResult, ImportRow, ImportError, ImportWarning, ResolverMaps } from './types';
import { DEFAULTABLE_FIELDS } from './types';
import { parseCSVText } from './parser';
import { buildColumnMaps, rowToInput } from './converters';

// ── Resolver builder ──────────────────────────────────

export function buildResolverMaps(assignees: Assignee[], referrers: Referrer[]): ResolverMaps {
  const assigneeNameToId = new Map<string, number>();
  assignees.forEach((a) => assigneeNameToId.set(a.name, a.id));

  const referrerNameToId = new Map<string, number>();
  // 会社ごとの紹介者数をカウント（会社名のみフォールバ��ク用）
  const companyCount = new Map<string, number>();
  referrers.forEach((r) => {
    companyCount.set(r.company.name, (companyCount.get(r.company.name) || 0) + 1);
  });
  referrers.forEach((r) => {
    const co = r.company.name;
    // 最も具体的なキー: company / department / name
    if (r.name && r.department) {
      referrerNameToId.set(`${co}\0${r.department}\0${r.name}`, r.id);
    }
    // 中間キー: company / name
    if (r.name) {
      referrerNameToId.set(`${co}\0\0${r.name}`, r.id);
    }
    // 会社名のみキー: 会社に紹介者が1人だけの場合のみ（曖昧さ回避）
    if (companyCount.get(co) === 1) {
      referrerNameToId.set(`${co}\0\0`, r.id);
    }
  });

  return { assigneeNameToId, referrerNameToId };
}

// ── Main parse & validate ──────────────────────────────────

export function parseAndValidateCSV(
  text: string,
  resolvers?: ResolverMaps,
  existingCases?: InheritanceCase[]
): ImportParseResult {
  const rows = parseCSVText(text);

  if (rows.length === 0) {
    return {
      validRows: [],
      errors: [{ row: 0, message: 'CSVファイルが空です' }],
      warnings: [],
      totalRows: 0,
    };
  }

  const headers = rows[0];
  const colMaps = buildColumnMaps(headers);

  // Check required headers
  const mappedFields = new Set(colMaps.fieldMap.values());
  const missingRequired: string[] = [];
  if (!mappedFields.has('deceasedName')) missingRequired.push('被相続人氏名');
  if (!mappedFields.has('dateOfDeath')) missingRequired.push('死亡日');
  if (!mappedFields.has('fiscalYear')) missingRequired.push('年度');

  if (missingRequired.length > 0) {
    return {
      validRows: [],
      errors: [
        { row: 1, message: `必須ヘッダーが見つかりません: ${missingRequired.join(', ')}` },
      ],
      warnings: [],
      totalRows: 0,
    };
  }

  const dataRows = rows.slice(1);
  if (dataRows.length === 0) {
    return {
      validRows: [],
      errors: [{ row: 0, message: 'データ行がありません' }],
      warnings: [],
      totalRows: 0,
    };
  }

  // Build existing case lookups for duplicate detection & update mode
  const existingById = new Map<number, InheritanceCase>();
  const existingByKey = new Map<string, InheritanceCase>();
  if (existingCases) {
    for (const c of existingCases) {
      existingById.set(c.id, c);
      const key = `${c.deceasedName}|${c.dateOfDeath}|${c.fiscalYear}`;
      existingByKey.set(key, c);
    }
  }

  const validRows: ImportRow[] = [];
  const errors: ImportError[] = [];
  const warnings: ImportWarning[] = [];

  // Pre-compute deceasedName column index for blank row detection
  const deceasedNameCol = [...colMaps.fieldMap.entries()].find(([, f]) => f === 'deceasedName')?.[0];

  for (let i = 0; i < dataRows.length; i++) {
    const csvRowNum = i + 2; // 1-based, header is row 1

    // Skip rows where deceasedName column is empty (blank/summary rows)
    if (deceasedNameCol !== undefined && !(dataRows[i][deceasedNameCol] ?? '').trim()) {
      continue;
    }

    const { obj, rawId, unresolvedAssignee, unresolvedReferrer, pendingReferrer, pendingAssignee } = rowToInput(
      dataRows[i],
      colMaps,
      resolvers
    );

    // Name resolution warnings
    if (unresolvedAssignee) {
      warnings.push({
        row: csvRowNum,
        message: `担当者「${unresolvedAssignee}」がマスタに見つかりません（空欄として取り込みます）`,
      });
    }
    if (unresolvedReferrer) {
      warnings.push({
        row: csvRowNum,
        message: `紹介者「${unresolvedReferrer}」がマスタに見つかりません（空欄として取り込みます）`,
      });
    }

    const result = createCaseSchema.safeParse(obj);

    if (result.success) {
      let mode: 'create' | 'update' = 'create';
      let id: number | undefined;

      if (rawId !== null) {
        if (existingById.has(rawId)) {
          mode = 'update';
          id = rawId;
        } else {
          warnings.push({
            row: csvRowNum,
            message: `ID ${rawId} の案件が見つかりません（新規作成として取り込みます）`,
          });
        }
      } else {
        const key = `${result.data.deceasedName}|${result.data.dateOfDeath}|${result.data.fiscalYear}`;
        const existing = existingByKey.get(key);
        if (existing) {
          mode = 'update';
          id = existing.id;
          warnings.push({
            row: csvRowNum,
            message: `「${result.data.deceasedName} / ${result.data.dateOfDeath} / ${result.data.fiscalYear}年度」は既存案件(ID:${existing.id})の更新として取り込みます`,
          });
        }
      }

      const defaultedFields = Object.keys(DEFAULTABLE_FIELDS).filter(
        (key) => !(key in obj) || obj[key] === undefined
      );

      validRows.push({
        data: result.data,
        mode,
        id,
        deceasedName: result.data.deceasedName,
        defaultedFields,
        ...(pendingReferrer ? { pendingReferrer } : {}),
        ...(pendingAssignee ? { pendingAssignee } : {}),
      });
    } else {
      const messages = result.error.issues.map((issue) => issue.message);
      errors.push({ row: csvRowNum, message: messages.join('; ') });
    }
  }

  return { validRows, errors, warnings, totalRows: dataRows.length };
}
