import { prisma } from '@/lib/prisma';
import { migrateLegacyPersonAddress } from '@/lib/person-address';
import { toDateStr } from '@/lib/prisma-includes';
import { normalizeNameKanaForStorage, normalizePersonNameForStorage, normalizePersonSearchText } from '@/lib/person-search';
import type { BackupTableCounts } from '@/types/backup';

type TxClient = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>;

function toDateOnly(s: string): Date {
  const dateStr = s.includes('T') ? s.split('T')[0] : s;
  return new Date(dateStr + 'T00:00:00.000Z');
}

type Rec = Record<string, unknown>;

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function toNumOr(v: unknown, fallback: number): number {
  const n = toNum(v);
  return n === null ? fallback : n;
}

const NEW_STATUSES = ['見積前', '見積中', '見送り', '受託', '手続中', '最終確認', '申告済', '請求済', '入金済'];

/** バックアップ復元時のステータス正規化（旧3フィールド形式のバックアップを統合ステータスへ変換） */
function normalizeBackupStatus(c: Rec): { status: string; isUndivided: boolean } {
  const isUndivided = typeof c.isUndivided === 'boolean' ? c.isUndivided : c.handlingStatus === '対応終了（未分割）';
  const s = (c.status as string) ?? '';
  if (NEW_STATUSES.includes(s)) return { status: s, isUndivided };
  // レガシーバックアップ（旧 acceptanceStatus + status）の変換
  const acc = c.acceptanceStatus as string;
  if (acc === '見送り' || acc === '受託不可') return { status: '見送り', isUndivided };
  if (s === '未着手' && acc === '受託') return { status: '受託', isUndivided };
  if (s === '未着手' || s === '') return { status: '見積中', isUndivided };
  return { status: s, isUndivided };
}

// 社員台帳から再生成できる同期実行記録は、業務データのバックアップ対象外。
export const BACKUP_EXCLUDED_MODELS = ['StaffDirectorySyncRun'] as const;

export const TABLE_DEFS = [
  {
    key: 'administrativeFeeItems' as const,
    model: (tx: TxClient) => tx.administrativeFeeItem,
    map: (r: Rec) => ({
      id: r.id as number,
      category: r.category as string,
      categoryOrder: toNumOr(r.categoryOrder, 0),
      name: r.name as string,
      unitPrice: toNumOr(r.unitPrice, 0),
      note: (r.note as string) ?? null,
      sortOrder: toNumOr(r.sortOrder, 0),
      active: (r.active as boolean) ?? true,
      createdAt: new Date(r.createdAt as string),
      updatedAt: new Date(r.updatedAt as string),
    }),
    seqTable: 'AdministrativeFeeItem',
  },
  {
    key: 'departments' as const,
    model: (tx: TxClient) => tx.department,
    map: (d: Rec) => ({
      id: d.id as number,
      name: d.name as string,
      sortOrder: (d.sortOrder as number) ?? 0,
      active: (d.active as boolean) ?? true,
      staffDirectoryId: (d.staffDirectoryId as number) ?? null,
      createdAt: new Date(d.createdAt as string),
      updatedAt: new Date(d.updatedAt as string),
    }),
    seqTable: 'Department',
  },
  {
    key: 'companies' as const,
    model: (tx: TxClient) => tx.company,
    map: (c: Rec) => ({
      id: c.id as number,
      name: c.name as string,
      active: (c.active as boolean) ?? true,
      createdAt: new Date(c.createdAt as string),
      updatedAt: new Date(c.updatedAt as string),
    }),
    seqTable: 'Company',
  },
  {
    key: 'assignees' as const,
    model: (tx: TxClient) => tx.assignee,
    map: (a: Rec) => ({
      id: a.id as number,
      name: a.name as string,
      // フリガナの列より前のバックアップには無い（空で戻し、次の写しで台帳から入る）
      nameKana: typeof a.nameKana === 'string' ? a.nameKana : '',
      employeeId: (a.employeeId as string) ?? null,
      departmentId: (a.departmentId as number) ?? null,
      active: (a.active as boolean) ?? true,
      staffDirectoryId: (a.staffDirectoryId as number) ?? null,
      createdAt: new Date(a.createdAt as string),
      updatedAt: new Date(a.updatedAt as string),
    }),
    seqTable: 'Assignee',
  },
  {
    key: 'companyBranches' as const,
    model: (tx: TxClient) => tx.companyBranch,
    map: (b: Rec) => ({
      id: b.id as number,
      companyId: b.companyId as number,
      name: b.name as string,
      active: (b.active as boolean) ?? true,
      createdAt: new Date(b.createdAt as string),
      updatedAt: new Date(b.updatedAt as string),
    }),
    seqTable: 'CompanyBranch',
  },
  {
    key: 'referrers' as const,
    model: (tx: TxClient) => tx.referrer,
    map: (r: Rec) => ({
      id: r.id as number,
      companyId: r.companyId as number,
      branchId: (r.branchId as number) ?? null,
      active: (r.active as boolean) ?? true,
      createdAt: new Date(r.createdAt as string),
      updatedAt: new Date(r.updatedAt as string),
    }),
    seqTable: 'Referrer',
  },
  {
    key: 'cases' as const,
    model: (tx: TxClient) => tx.inheritanceCase,
    map: (c: Rec) => {
      const deceasedNameKana = normalizeNameKanaForStorage((c.deceasedNameKana as string) ?? '');
      const deceasedNameKanaNormalized = typeof c.deceasedNameKanaNormalized === 'string' && c.deceasedNameKanaNormalized
        ? c.deceasedNameKanaNormalized
        : normalizePersonSearchText(deceasedNameKana);
      const statusData = normalizeBackupStatus(c);
      const fallbackDate = toDateOnly((c.updatedAt ?? c.createdAt) as string);
      const caseAddedDate = statusData.status === '受託' || ['手続中', '最終確認', '申告済', '請求済', '入金済'].includes(statusData.status)
        ? c.caseAddedDate ? toDateOnly(c.caseAddedDate as string) : fallbackDate
        : null;
      const caseCompletedDate = ['申告済', '請求済', '入金済'].includes(statusData.status)
        ? c.caseCompletedDate ? toDateOnly(c.caseCompletedDate as string) : fallbackDate
        : null;
      const billedDate = ['請求済', '入金済'].includes(statusData.status)
        ? c.billedDate ? toDateOnly(c.billedDate as string) : fallbackDate
        : null;
      const paidDate = statusData.status === '入金済'
        ? c.paidDate ? toDateOnly(c.paidDate as string) : billedDate ?? fallbackDate
        : null;
      return {
      id: c.id as number,
      deceasedName: normalizePersonNameForStorage((c.deceasedName as string) ?? ''),
      deceasedNameKana,
      deceasedNameKanaNormalized,
      dateOfDeath: toDateOnly(c.dateOfDeath as string),
      ...statusData,
      taxAmount: toNumOr(c.taxAmount, 0),
      feeAmount: toNumOr(c.feeAmount, 0),
      fiscalYear: toNumOr(c.fiscalYear, new Date().getFullYear()),
      estimateAmount: toNumOr(c.estimateAmount, 0),
      propertyValue: toNumOr(c.propertyValue, 0),
      referralFeeRate: toNum(c.referralFeeRate),
      referralFeeAmount: toNumOr(c.referralFeeAmount, 0),
      estimateReferralFeeAmount: toNumOr(c.estimateReferralFeeAmount, 0),
      isReferralFeeManual: Boolean(c.isReferralFeeManual),
      isEstimateReferralFeeManual: Boolean(c.isEstimateReferralFeeManual),
      landRosenkaCount: toNumOr(c.landRosenkaCount, 0),
      landBairitsuCount: toNumOr(c.landBairitsuCount, 0),
      unlistedStockCount: toNumOr(c.unlistedStockCount, 0),
      feeCalculationHeirCount: toNumOr(c.feeCalculationHeirCount ?? c.heirCount, 0),
      discountAmount: toNumOr(c.discountAmount, 0),
      administrativeDiscountEnabled: Boolean(c.administrativeDiscountEnabled),
      administrativeDiscountAmount: toNum(c.administrativeDiscountAmount),
      feeCalcSnapshot: (c.feeCalcSnapshot as Record<string, unknown>) ?? null,
      caseAddedDate,
      caseCompletedDate,
      billedDate,
      paidDate,
      summary: (c.summary as string) ?? null,
      memo: (c.memo as string) ?? null,
      assigneeId: (c.assigneeId as number) ?? null,
      internalReferrerId: (c.internalReferrerId as number) ?? null,
      referrerId: (c.referrerId as number) ?? null,
      createdBy: (c.createdBy as string) ?? null,
      updatedBy: (c.updatedBy as string) ?? null,
      createdAt: new Date(c.createdAt as string),
      updatedAt: new Date(c.updatedAt as string),
      };
    },
    seqTable: 'InheritanceCase',
  },
  {
    key: 'heirPersons' as const,
    model: (tx: TxClient) => tx.heirPerson,
    map: (p: Rec) => {
      const nameKana = normalizeNameKanaForStorage((p.nameKana as string) ?? '');
      const nameKanaNormalized = typeof p.nameKanaNormalized === 'string' && p.nameKanaNormalized
        ? p.nameKanaNormalized
        : normalizePersonSearchText(nameKana);
      const addressParts = migrateLegacyPersonAddress({
        address: (p.address as string) ?? '',
        addressFromPostalCode: (p.addressFromPostalCode as string) ?? '',
        addressManual: (p.addressManual as string) ?? '',
      });
      return {
        id: p.id as number,
        name: normalizePersonNameForStorage((p.name as string) ?? ''),
        nameKana,
        nameKanaNormalized,
        dateOfBirth: p.dateOfBirth ? toDateOnly(p.dateOfBirth as string) : null,
        phone: (p.phone as string) ?? '',
        postalCode: (p.postalCode as string) ?? '',
        address: addressParts.address,
        addressFromPostalCode: addressParts.addressFromPostalCode,
        addressManual: addressParts.addressManual,
        memo: (p.memo as string) ?? '',
        active: (p.active as boolean) ?? true,
        createdAt: new Date(p.createdAt as string),
        updatedAt: new Date(p.updatedAt as string),
      };
    },
    seqTable: 'HeirPerson',
  },
  {
    key: 'relatedPartyPersons' as const,
    model: (tx: TxClient) => tx.relatedPartyPerson,
    map: (p: Rec) => {
      const nameKana = normalizeNameKanaForStorage((p.nameKana as string) ?? '');
      const nameKanaNormalized = typeof p.nameKanaNormalized === 'string' && p.nameKanaNormalized
        ? p.nameKanaNormalized
        : normalizePersonSearchText(nameKana);
      const addressParts = migrateLegacyPersonAddress({
        address: (p.address as string) ?? '',
        addressFromPostalCode: (p.addressFromPostalCode as string) ?? '',
        addressManual: (p.addressManual as string) ?? '',
      });
      return {
        id: p.id as number,
        name: normalizePersonNameForStorage((p.name as string) ?? ''),
        nameKana,
        nameKanaNormalized,
        profession: (p.profession as string) ?? '',
        phone: (p.phone as string) ?? '',
        postalCode: (p.postalCode as string) ?? '',
        address: addressParts.address,
        addressFromPostalCode: addressParts.addressFromPostalCode,
        addressManual: addressParts.addressManual,
        memo: (p.memo as string) ?? '',
        active: (p.active as boolean) ?? true,
        createdAt: new Date(p.createdAt as string),
        updatedAt: new Date(p.updatedAt as string),
      };
    },
    seqTable: 'RelatedPartyPerson',
  },
  {
    key: 'caseHeirs' as const,
    model: (tx: TxClient) => tx.caseHeir,
    map: (c: Rec) => ({
      id: c.id as number,
      caseId: c.caseId as number,
      personId: c.personId as number,
      relationship: (c.relationship as string) ?? '',
      relationshipSortOrder: (c.relationshipSortOrder as number) ?? 999,
      sortOrder: (c.sortOrder as number) ?? 0,
      memo: (c.memo as string) ?? '',
    }),
    seqTable: 'CaseHeir',
  },
  {
    key: 'caseRelatedParties' as const,
    model: (tx: TxClient) => tx.caseRelatedParty,
    map: (c: Rec) => ({
      id: c.id as number,
      caseId: c.caseId as number,
      personId: c.personId as number,
      sortOrder: (c.sortOrder as number) ?? 0,
      memo: (c.memo as string) ?? '',
    }),
    seqTable: 'CaseRelatedParty',
  },
  {
    key: 'caseProgress' as const,
    model: (tx: TxClient) => tx.caseProgress,
    map: (p: Rec) => ({
      id: p.id as number,
      caseId: p.caseId as number,
      stepId: p.stepId as string,
      name: p.name as string,
      sortOrder: (p.sortOrder as number) ?? 0,
      date: (p.date as string) ? toDateOnly(p.date as string) : null,
      memo: (p.memo as string) ?? null,
      isDynamic: (p.isDynamic as boolean) ?? false,
    }),
    seqTable: 'CaseProgress',
  },
  {
    key: 'caseExpenses' as const,
    model: (tx: TxClient) => tx.caseExpense,
    map: (e: Rec) => ({
      id: e.id as number,
      caseId: e.caseId as number,
      sortOrder: (e.sortOrder as number) ?? 0,
      date: toDateOnly(e.date as string),
      description: e.description as string,
      amount: (e.amount as number) ?? 0,
      memo: (e.memo as string) ?? null,
    }),
    seqTable: 'CaseExpense',
  },
  {
    key: 'caseSpecialAdditions' as const,
    model: (tx: TxClient) => tx.caseSpecialAddition,
    map: (a: Rec) => ({
      id: a.id as number,
      caseId: a.caseId as number,
      sortOrder: (a.sortOrder as number) ?? 0,
      description: a.description as string,
      amount: (a.amount as number) ?? 0,
    }),
    seqTable: 'CaseSpecialAddition',
  },
  {
    key: 'caseAdministrativeFees' as const,
    model: (tx: TxClient) => tx.caseAdministrativeFee,
    map: (r: Rec) => ({
      id: r.id as number,
      caseId: r.caseId as number,
      feeItemId: (r.feeItemId as number) ?? null,
      sortOrder: toNumOr(r.sortOrder, 0),
      category: r.category as string,
      name: r.name as string,
      quantity: toNumOr(r.quantity, 1),
      unitPrice: toNumOr(r.unitPrice, 0),
      memo: (r.memo as string) ?? null,
    }),
    seqTable: 'CaseAdministrativeFee',
  },
  {
    key: 'auditLogs' as const,
    model: (tx: TxClient) => tx.auditLog,
    map: (a: Rec) => ({
      id: a.id as number,
      entity: a.entity as string,
      entityId: a.entityId as number,
      action: a.action as string,
      changes: (a.changes as Record<string, unknown>) ?? null,
      changedBy: (a.changedBy as string) ?? null,
      changedAt: new Date(a.changedAt as string),
    }),
    seqTable: 'AuditLog',
  },
];

interface TableDef {
  key: string;
  model: (tx: TxClient) => { createMany: (args: { data: Rec[] }) => Promise<unknown> };
  map: (row: Rec) => Rec;
  seqTable: string;
}

export async function exportBackup() {
  const [administrativeFeeItems, caseAdministrativeFees] = await Promise.all([
    prisma.administrativeFeeItem.findMany(),
    prisma.caseAdministrativeFee.findMany(),
  ]);
  const [departments, companies, companyBranches, assignees, referrers, heirPersons, relatedPartyPersons, cases, caseHeirs, caseRelatedParties, caseProgress, caseExpenses, caseSpecialAdditions, auditLogs] = await Promise.all([
    prisma.department.findMany(),
    prisma.company.findMany(),
    prisma.companyBranch.findMany(),
    prisma.assignee.findMany(),
    prisma.referrer.findMany(),
    prisma.heirPerson.findMany(),
    prisma.relatedPartyPerson.findMany(),
    prisma.inheritanceCase.findMany(),
    prisma.caseHeir.findMany(),
    prisma.caseRelatedParty.findMany(),
    prisma.caseProgress.findMany(),
    prisma.caseExpense.findMany(),
    prisma.caseSpecialAddition.findMany(),
    prisma.auditLog.findMany(),
  ]);

  const serializeTimestamps = <T extends { createdAt: Date; updatedAt: Date }>(item: T) => ({
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  });

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      administrativeFeeItems: administrativeFeeItems.map(serializeTimestamps),
      caseAdministrativeFees,
      departments: departments.map(serializeTimestamps),
      companies: companies.map(serializeTimestamps),
      companyBranches: companyBranches.map(serializeTimestamps),
      assignees: assignees.map(serializeTimestamps),
      referrers: referrers.map(serializeTimestamps),
      heirPersons: heirPersons.map(p => ({
        ...serializeTimestamps(p),
        dateOfBirth: toDateStr(p.dateOfBirth),
      })),
      relatedPartyPersons: relatedPartyPersons.map(serializeTimestamps),
      cases: cases.map(c => ({
        ...serializeTimestamps(c),
        dateOfDeath: toDateStr(c.dateOfDeath) ?? '',
        caseAddedDate: toDateStr(c.caseAddedDate),
        caseCompletedDate: toDateStr(c.caseCompletedDate),
        billedDate: toDateStr(c.billedDate),
        paidDate: toDateStr(c.paidDate),
      })),
      caseHeirs,
      caseRelatedParties,
      caseProgress: caseProgress.map(p => ({
        ...p,
        date: toDateStr(p.date),
      })),
      caseExpenses: caseExpenses.map(e => ({
        ...e,
        date: toDateStr(e.date),
      })),
      caseSpecialAdditions,
      auditLogs: auditLogs.map(a => ({
        ...a,
        changedAt: a.changedAt.toISOString(),
      })),
    },
  };
}

/**
 * 遺産整理の料金表・明細が無い旧形式のバックアップ（2026-11 より前）は、その2つを今の DB から引き継ぐ。
 * 料金表はそのまま残し、明細は復元後にも同じ ID の案件があるものだけ入れ直す（案件の削除で Cascade されるため）。
 * 料金表を入れ替えた結果、参照先が無くなった明細は料金表に無い自由行（feeItemId = null）として残す。
 */
async function resolveAdministrativeFees(tx: TxClient, data: Record<string, Rec[] | undefined>) {
  const keepFeeItems = data.administrativeFeeItems === undefined;
  const feeItems: Rec[] = data.administrativeFeeItems ?? await tx.administrativeFeeItem.findMany();
  const feeItemIds = new Set(feeItems.map(row => row.id));
  const caseIds = new Set((data.cases ?? []).map(row => row.id));
  const fees: Rec[] = data.caseAdministrativeFees
    ?? (await tx.caseAdministrativeFee.findMany()).filter(row => caseIds.has(row.caseId));
  return {
    keepFeeItems,
    feeItems,
    fees: fees.map(row => ({ ...row, feeItemId: feeItemIds.has(row.feeItemId) ? row.feeItemId : null })),
  };
}

export async function restoreBackup(data: Record<string, Rec[] | undefined>) {
  return prisma.$transaction(
    async (tx: TxClient) => {
      const { keepFeeItems, feeItems, fees } = await resolveAdministrativeFees(tx, data);
      const restoreData: Record<string, Rec[] | undefined> = {
        ...data,
        administrativeFeeItems: feeItems,
        caseAdministrativeFees: fees,
      };
      await tx.caseAdministrativeFee.deleteMany();
      await tx.auditLog.deleteMany();
      await tx.caseSpecialAddition.deleteMany();
      await tx.caseExpense.deleteMany();
      await tx.caseProgress.deleteMany();
      await tx.caseRelatedParty.deleteMany();
      await tx.caseHeir.deleteMany();
      await tx.inheritanceCase.deleteMany();
      if (!keepFeeItems) await tx.administrativeFeeItem.deleteMany();
      await tx.relatedPartyPerson.deleteMany();
      await tx.heirPerson.deleteMany();
      await tx.referrer.deleteMany();
      await tx.companyBranch.deleteMany();
      await tx.assignee.deleteMany();
      await tx.company.deleteMany();
      await tx.department.deleteMany();

      for (const def of TABLE_DEFS as unknown as TableDef[]) {
        if (def.key === 'administrativeFeeItems' && keepFeeItems) continue;
        const rows = restoreData[def.key] ?? [];
        if (rows.length > 0) {
          await def.model(tx).createMany({ data: rows.map(def.map) });
        }
        await tx.$executeRawUnsafe(
          `SELECT setval(pg_get_serial_sequence('"${def.seqTable}"', 'id'), COALESCE((SELECT MAX("id") FROM "${def.seqTable}"), 0) + 1, false)`
        );
      }
      return Object.fromEntries(TABLE_DEFS.map(def =>
        [def.key, (restoreData[def.key] ?? []).length]
      )) as BackupTableCounts;
    },
    { timeout: 60000 }
  );
}
