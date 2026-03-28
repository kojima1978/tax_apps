import { createCaseSchema } from '@/types/validation';
import type { CreateCaseInput } from '@/types/validation';
import type {
  Assignee,
  Referrer,
  InheritanceCase,
  Contact,
  ProgressStep,
  CaseStatus,
  AcceptanceStatus,
} from '@/types/shared';
import { CASE_STATUS_OPTIONS, HANDLING_STATUS_OPTIONS, ACCEPTANCE_STATUS_OPTIONS } from '@/types/constants';

// ── Header → field mapping ──────────────────────────────────
const CSV_HEADER_MAP: Record<string, string> = {
  '被相続人氏名': 'deceasedName',
  '死亡日': 'dateOfDeath',
  '年度': 'fiscalYear',
  '進み具合': 'status',
  '対応状況': 'handlingStatus',
  '受託状況': 'acceptanceStatus',
  '担当者': 'assigneeName',
  '担当者_氏名': 'assigneePersonName',
  '担当者_部署名': 'assigneeDepartment',
  '紹介者': 'referrerName',
  '紹介者_会社名': 'referrerCompany',
  '紹介者_氏名': 'referrerPersonName',
  '紹介者_部署名': 'referrerDepartment',
  '財産評価額': 'propertyValue',
  '相続税額': 'taxAmount',
  '見積額': 'estimateAmount',
  '報酬額': 'feeAmount',
  '紹介料率(%)': 'referralFeeRate',
  '紹介料': 'referralFeeAmount',
  '特記事項': 'summary',
  'メモ': 'memo',
};

const IGNORED_HEADERS = new Set(['作成日', '更新日']);

const VALID_STATUSES = CASE_STATUS_OPTIONS as readonly string[];
const VALID_HANDLING = HANDLING_STATUS_OPTIONS as readonly string[];
const VALID_ACCEPTANCE = ACCEPTANCE_STATUS_OPTIONS as readonly string[];

export const MAX_CONTACT_COLUMNS = 10;
export const MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024;

// ── Contact column detection ──────────────────────────────────
const CONTACT_HEADER_RE = /^連絡先(\d+)_(氏名|電話|メール)$/;
const CONTACT_FIELD_MAP: Record<string, 'name' | 'phone' | 'email'> = {
  '氏名': 'name',
  '電話': 'phone',
  'メール': 'email',
};

// ── Types ──────────────────────────────────
export interface ImportIssue {
  row: number;
  message: string;
}

export type ImportError = ImportIssue;
export type ImportWarning = ImportIssue;

export interface PendingReferrer {
  company: string;
  name?: string;
  department?: string;
}

export interface PendingAssignee {
  name: string;
  department?: string;
}

export interface ImportRow {
  data: CreateCaseInput;
  mode: 'create' | 'update';
  id?: number;
  deceasedName: string;
  defaultedFields: string[];
  pendingReferrer?: PendingReferrer;
  pendingAssignee?: PendingAssignee;
}

// Fields that receive Zod defaults when empty
export const DEFAULTABLE_FIELDS: Record<string, string> = {
  status: '進み具合→未着手',
  handlingStatus: '対応状況→対応中',
  acceptanceStatus: '受託状況→未判定',
  taxAmount: '相続税額→0',
  feeAmount: '報酬額→0',
  estimateAmount: '見積額→0',
  propertyValue: '財産評価額→0',
};

export interface ImportParseResult {
  validRows: ImportRow[];
  errors: ImportError[];
  warnings: ImportWarning[];
  totalRows: number;
}

export interface ResolverMaps {
  assigneeNameToId: Map<string, number>;
  referrerNameToId: Map<string, number>;
}

interface ColumnMaps {
  fieldMap: Map<number, string>;
  contactCols: Map<number, { index: number; field: 'name' | 'phone' | 'email' }>;
  progressCol: number | null;
  idCol: number | null;
}

// ── Helpers ──────────────────────────────────

export function buildResolverMaps(assignees: Assignee[], referrers: Referrer[]): ResolverMaps {
  const assigneeNameToId = new Map<string, number>();
  assignees.forEach((a) => assigneeNameToId.set(a.name, a.id));

  const referrerNameToId = new Map<string, number>();
  referrers.forEach((r) => {
    if (r.name) {
      referrerNameToId.set(`${r.company.name} / ${r.name}`, r.id);
    }
    referrerNameToId.set(r.company.name, r.id);
  });

  return { assigneeNameToId, referrerNameToId };
}

/** Normalize date string to YYYY-MM-DD (handles Excel's YYYY/M/D conversion) */
function normalizeDate(value: string): string {
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  // YYYY/M/D or YYYY/MM/DD (Excel auto-conversion)
  const match = value.match(/^(\d{4})[/.](\d{1,2})[/.](\d{1,2})$/);
  if (match) {
    return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
  }
  return value;
}

function parseOptionalInt(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === '') return undefined;
  const n = Number(trimmed);
  if (isNaN(n)) return undefined;
  return Math.round(n);
}

function parseOptionalFloat(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === '') return undefined;
  const n = Number(trimmed);
  if (isNaN(n)) return undefined;
  return n;
}

// ── CSV parser ──────────────────────────────────

export function parseCSVText(text: string): string[][] {
  const cleaned = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let current = '';
  let inQuotes = false;
  let fields: string[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < cleaned.length && cleaned[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
      } else if (ch === '\n' || (ch === '\r' && cleaned[i + 1] === '\n')) {
        fields.push(current);
        current = '';
        if (fields.some((f) => f.trim() !== '')) {
          rows.push(fields);
        }
        fields = [];
        if (ch === '\r') i++;
      } else if (ch === '\r') {
        fields.push(current);
        current = '';
        if (fields.some((f) => f.trim() !== '')) {
          rows.push(fields);
        }
        fields = [];
      } else {
        current += ch;
      }
    }
  }

  if (current !== '' || fields.length > 0) {
    fields.push(current);
    if (fields.some((f) => f.trim() !== '')) {
      rows.push(fields);
    }
  }

  return rows;
}

// ── Column map builder ──────────────────────────────────

function buildColumnMaps(headers: string[]): ColumnMaps {
  const fieldMap = new Map<number, string>();
  const contactCols = new Map<number, { index: number; field: 'name' | 'phone' | 'email' }>();
  let progressCol: number | null = null;
  let idCol: number | null = null;

  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].trim();

    if (h === 'ID') {
      idCol = i;
      continue;
    }

    if (h === '進捗データ') {
      progressCol = i;
      continue;
    }

    if (IGNORED_HEADERS.has(h)) continue;

    const contactMatch = CONTACT_HEADER_RE.exec(h);
    if (contactMatch) {
      const contactIndex = parseInt(contactMatch[1], 10);
      const field = CONTACT_FIELD_MAP[contactMatch[2]];
      if (field && contactIndex >= 1 && contactIndex <= MAX_CONTACT_COLUMNS) {
        contactCols.set(i, { index: contactIndex, field });
      }
      continue;
    }

    const field = CSV_HEADER_MAP[h];
    if (field) {
      fieldMap.set(i, field);
    }
  }

  return { fieldMap, contactCols, progressCol, idCol };
}

// ── Row parser ──────────────────────────────────

interface RowParseResult {
  obj: Record<string, unknown>;
  rawId: number | null;
  unresolvedAssignee?: string;
  unresolvedReferrer?: string;
  pendingReferrer?: PendingReferrer;
  pendingAssignee?: PendingAssignee;
}

function rowToInput(
  row: string[],
  colMaps: ColumnMaps,
  resolvers?: ResolverMaps
): RowParseResult {
  const obj: Record<string, unknown> = {};
  let rawId: number | null = null;
  let unresolvedAssignee: string | undefined;
  let unresolvedReferrer: string | undefined;
  let pendingReferrer: PendingReferrer | undefined;
  let pendingAssignee: PendingAssignee | undefined;

  // Accumulate multi-column fields
  let refCompany = '';
  let refPersonName = '';
  let refDepartment = '';
  let asgPersonName = '';
  let asgDepartment = '';

  // Parse ID
  if (colMaps.idCol !== null) {
    const idStr = (row[colMaps.idCol] ?? '').trim();
    if (idStr) {
      const parsed = parseInt(idStr, 10);
      if (!isNaN(parsed) && parsed > 0) {
        rawId = parsed;
      }
    }
  }

  // Parse regular fields
  for (const [colIndex, fieldName] of colMaps.fieldMap) {
    const value = (row[colIndex] ?? '').trim();

    switch (fieldName) {
      case 'deceasedName':
        obj[fieldName] = value;
        break;
      case 'dateOfDeath':
        obj[fieldName] = normalizeDate(value);
        break;
      case 'fiscalYear':
        obj[fieldName] = value ? Number(value) : undefined;
        break;
      case 'status':
        obj[fieldName] =
          value && VALID_STATUSES.includes(value as CaseStatus) ? value : undefined;
        break;
      case 'handlingStatus':
        obj[fieldName] =
          value && VALID_HANDLING.includes(value) ? value : undefined;
        break;
      case 'acceptanceStatus':
        obj[fieldName] =
          value && VALID_ACCEPTANCE.includes(value as AcceptanceStatus) ? value : undefined;
        break;
      case 'assigneeName':
        if (value && resolvers) {
          const id = resolvers.assigneeNameToId.get(value);
          if (id) {
            obj.assigneeId = id;
          } else {
            obj.assigneeId = null;
            unresolvedAssignee = value;
          }
        }
        break;
      case 'referrerName':
        if (value && resolvers) {
          const id = resolvers.referrerNameToId.get(value);
          if (id) {
            obj.referrerId = id;
          } else {
            obj.referrerId = null;
            unresolvedReferrer = value;
          }
        }
        break;
      case 'assigneePersonName':
        asgPersonName = value;
        break;
      case 'assigneeDepartment':
        asgDepartment = value;
        break;
      case 'referrerCompany':
        refCompany = value;
        break;
      case 'referrerPersonName':
        refPersonName = value;
        break;
      case 'referrerDepartment':
        refDepartment = value;
        break;
      case 'propertyValue':
      case 'taxAmount':
      case 'estimateAmount':
      case 'feeAmount':
      case 'referralFeeAmount': {
        const n = parseOptionalInt(value);
        if (n !== undefined) obj[fieldName] = n;
        break;
      }
      case 'referralFeeRate': {
        const n = parseOptionalFloat(value);
        if (n !== undefined) obj[fieldName] = n;
        break;
      }
      case 'summary':
        if (value) obj[fieldName] = value.slice(0, 10);
        break;
      case 'memo':
        if (value) obj[fieldName] = value;
        break;
    }
  }

  // Resolve 2-column assignee (takes precedence over legacy 担当者 column)
  if (asgPersonName) {
    const id = resolvers?.assigneeNameToId.get(asgPersonName);
    if (id) {
      obj.assigneeId = id;
    } else {
      pendingAssignee = {
        name: asgPersonName,
        ...(asgDepartment ? { department: asgDepartment } : {}),
      };
    }
  }

  // Resolve 3-column referrer (takes precedence over legacy 紹介者 column)
  if (refCompany) {
    const key = refPersonName ? `${refCompany} / ${refPersonName}` : null;
    const id = (key ? resolvers?.referrerNameToId.get(key) : undefined) ?? resolvers?.referrerNameToId.get(refCompany);
    if (id) {
      obj.referrerId = id;
    } else {
      pendingReferrer = {
        company: refCompany,
        ...(refPersonName ? { name: refPersonName } : {}),
        ...(refDepartment ? { department: refDepartment } : {}),
      };
    }
  }

  // Parse contacts
  if (colMaps.contactCols.size > 0) {
    const contactMap = new Map<number, Partial<Contact>>();
    for (const [colIndex, { index, field }] of colMaps.contactCols) {
      const value = (row[colIndex] ?? '').trim();
      if (value) {
        if (!contactMap.has(index)) contactMap.set(index, {});
        contactMap.get(index)![field] = value;
      }
    }

    const contacts: Contact[] = [];
    for (let i = 1; i <= MAX_CONTACT_COLUMNS; i++) {
      const c = contactMap.get(i);
      if (c && (c.name || c.phone || c.email)) {
        contacts.push({
          name: c.name || '',
          phone: c.phone || '',
          email: c.email || '',
        });
      }
    }

    if (contacts.length > 0) {
      obj.contacts = contacts;
    }
  }

  // Parse progress JSON
  if (colMaps.progressCol !== null) {
    const progressStr = (row[colMaps.progressCol] ?? '').trim();
    if (progressStr) {
      try {
        const parsed = JSON.parse(progressStr);
        if (Array.isArray(parsed)) {
          const progress: ProgressStep[] = parsed.map(
            (p: Record<string, unknown>) => ({
              id: String(p.id ?? ''),
              name: String(p.name ?? ''),
              date: p.date ? String(p.date) : null,
              ...(p.memo ? { memo: String(p.memo) } : {}),
              ...(p.isDynamic ? { isDynamic: true } : {}),
            })
          );
          obj.progress = progress;
        }
      } catch {
        // Invalid JSON — skip progress
      }
    }
  }

  return { obj, rawId, unresolvedAssignee, unresolvedReferrer, pendingReferrer, pendingAssignee };
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

  for (let i = 0; i < dataRows.length; i++) {
    const csvRowNum = i + 2; // 1-based, header is row 1
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
          // ID exists → update mode
          mode = 'update';
          id = rawId;
        } else {
          // ID not found → fallback to create mode
          warnings.push({
            row: csvRowNum,
            message: `ID ${rawId} の案件が見つかりません（新規作成として取り込みます）`,
          });
        }
      } else {
        // No ID → check for duplicates
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

      // Track fields that received Zod defaults (not explicitly provided in CSV)
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
