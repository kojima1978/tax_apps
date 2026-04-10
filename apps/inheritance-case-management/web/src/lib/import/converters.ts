import type { Contact, ProgressStep, CaseStatus, AcceptanceStatus } from '@/types/shared';
import type { ColumnMaps, ResolverMaps, RowParseResult, PendingReferrer, PendingAssignee } from './types';
// Note: PendingAssignee is reused for pendingInternalReferrer (same shape: name + optional department)
import {
  CSV_HEADER_MAP, IGNORED_HEADERS, CONTACT_HEADER_RE, CONTACT_FIELD_MAP,
  MAX_CONTACT_COLUMNS, VALID_STATUSES, VALID_HANDLING, VALID_ACCEPTANCE,
} from './types';
import { normalizeDate, parseOptionalNumber } from './parser';

// ── Column map builder ──────────────────────────────────

export function buildColumnMaps(headers: string[]): ColumnMaps {
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

// ── Row converter ──────────────────────────────────

export function rowToInput(
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
  let pendingInternalReferrer: PendingAssignee | undefined;

  let refCompany = '';
  let refDepartment = '';
  let internalReferrerName = '';
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
          // 単一列「紹介者」は会社名として検索
          const id = resolvers.referrerNameToId.get(`${value}\0`);
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
      case 'referrerDepartment':
        refDepartment = value;
        break;
      case 'internalReferrerName':
        internalReferrerName = value;
        break;
      case 'propertyValue':
      case 'taxAmount':
      case 'estimateAmount':
      case 'feeAmount':
      case 'referralFeeAmount':
      case 'referralFeeRate':
      case 'landRosenkaCount':
      case 'landBairitsuCount':
      case 'unlistedStockCount':
      case 'heirCount': {
        const n = parseOptionalNumber(value, fieldName !== 'referralFeeRate');
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

  // Resolve internal referrer by name → assigneeId
  if (internalReferrerName) {
    const id = resolvers?.assigneeNameToId.get(internalReferrerName);
    if (id) {
      obj.internalReferrerId = id;
    } else {
      pendingInternalReferrer = { name: internalReferrerName };
    }
  }

  // Resolve external referrer (company + department)
  if (refCompany) {
    const id =
      (refDepartment ? resolvers?.referrerNameToId.get(`${refCompany}\0${refDepartment}`) : undefined) ??
      resolvers?.referrerNameToId.get(`${refCompany}\0`);
    if (id) {
      obj.referrerId = id;
    } else {
      pendingReferrer = {
        company: refCompany,
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

  return { obj, rawId, unresolvedAssignee, unresolvedReferrer, pendingReferrer, pendingAssignee, pendingInternalReferrer };
}
