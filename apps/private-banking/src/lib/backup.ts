import { Prisma } from "@prisma/client";
import type { ActivityLog, FamilyMember, Household, PlanningScenario, Position, PositionAllocation, Snapshot } from "@prisma/client";
import { z } from "zod";
import { parseFxRates } from "@/lib/fx-rates";
import { normalizedValuationMethod } from "@/lib/position-input";
import { prisma } from "@/lib/prisma";
import { parseDateOnlyUtc } from "@/lib/snapshot-date";
import { syncStaffDirectory } from "@/lib/staff-directory/sync";

export const BACKUP_SCHEMA_VERSION = 2;

/** 復元処理が利用者向けの日本語メッセージ付きで中断したことを表す。 */
export class BackupError extends Error {}

// ---------------------------------------------------------------- 書き出し

// Decimal は精度を落とさないよう文字列のまま保持する。
const decimalText = (value: Prisma.Decimal) => value.toString();
const decimalTextOrNull = (value: Prisma.Decimal | null) => value === null ? null : value.toString();
const dateOnly = (value: Date) => value.toISOString().slice(0, 10);
const backupStaffSelect = { staffCode: true, name: true, nameKana: true, department: true, isActive: true, staffDirectoryId: true } as const;

function serializeStaffAssignment(row: { staffCode: string; staffName: string; startedAt: Date; endedAt: Date | null; createdAt: Date }) {
  return { staffCode: row.staffCode, staffName: row.staffName, startedAt: row.startedAt.toISOString(), endedAt: row.endedAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString() };
}

/** 顧客単位の書き出しでは、取り込み先で採番し直す列（ID・作成日時）を落とす。 */
function omit<T extends Record<string, unknown>, K extends keyof T & string>(source: T, keys: readonly K[]): Omit<T, K> {
  return Object.fromEntries(Object.entries(source).filter(([key]) => !keys.includes(key as K))) as Omit<T, K>;
}

/**
 * 担当者コードで環境をまたいで識別する。内部IDは持ち出さない。
 */
function serializeHousehold(household: Household & { staff: { name: string; staffCode: string; nameKana: string; department: string; isActive: boolean; staffDirectoryId: number | null } | null }) {
  return {
    id: household.id,
    clientCode: household.clientCode,
    name: household.name,
    nameKana: household.nameKana,
    birthDate: household.birthDate ? dateOnly(household.birthDate) : null,
    assignedStaff: household.staff?.name ?? "",
    assignedStaffCode: household.staff?.staffCode ?? "",
    assignedStaffDetails: household.staff ? { ...household.staff } : null,
    relatedCompany: household.relatedCompany,
    currency: household.currency,
    hasSpouse: household.hasSpouse,
    heirRank: household.heirRank,
    heirCount: household.heirCount,
    createdAt: household.createdAt.toISOString(),
    updatedAt: household.updatedAt.toISOString(),
  };
}

function serializeSnapshot(snapshot: Snapshot) {
  return {
    id: snapshot.id,
    householdId: snapshot.householdId,
    label: snapshot.label,
    asOfDate: dateOnly(snapshot.asOfDate),
    fiscalYear: snapshot.fiscalYear,
    isCurrent: snapshot.isCurrent,
    estimatedInheritanceTax: decimalText(snapshot.estimatedInheritanceTax),
    inheritanceTaxCalculation: snapshot.inheritanceTaxCalculation,
    otherTaxes: decimalText(snapshot.otherTaxes),
    successionCosts: decimalText(snapshot.successionCosts),
    inheritanceTaxUpdatedAt: snapshot.inheritanceTaxUpdatedAt?.toISOString() ?? null,
    fxRates: parseFxRates(snapshot.fxRates),
    createdAt: snapshot.createdAt.toISOString(),
    updatedAt: snapshot.updatedAt.toISOString(),
  };
}

function serializePosition(position: Position) {
  return {
    id: position.id,
    snapshotId: position.snapshotId,
    side: position.side,
    category: position.category,
    name: position.name,
    institution: position.institution,
    currency: position.currency,
    originalAmount: decimalText(position.originalAmount),
    fxRate: decimalText(position.fxRate),
    valueJpy: decimalText(position.valueJpy),
    liquidity: position.liquidity,
    includedInNetWorth: position.includedInNetWorth,
    valuationMethod: position.valuationMethod,
    valuationFormula: position.valuationFormula,
    valuationQuantity: decimalTextOrNull(position.valuationQuantity),
    valuationUnitPrice: decimalTextOrNull(position.valuationUnitPrice),
    adjustmentRate: decimalTextOrNull(position.adjustmentRate),
    landArea: decimalTextOrNull(position.landArea),
    roadsideValue: decimalTextOrNull(position.roadsideValue),
    fixedAssetTaxValue: decimalTextOrNull(position.fixedAssetTaxValue),
    valuationMultiplier: decimalTextOrNull(position.valuationMultiplier),
    ownershipShare: decimalTextOrNull(position.ownershipShare),
    ownershipNumerator: position.ownershipNumerator,
    ownershipDenominator: position.ownershipDenominator,
    assetDetails: position.assetDetails ?? null,
    note: position.note,
    sortOrder: position.sortOrder,
    createdAt: position.createdAt.toISOString(),
    updatedAt: position.updatedAt.toISOString(),
  };
}

function serializeFamilyMember(member: FamilyMember) {
  return {
    id: member.id,
    householdId: member.householdId,
    name: member.name,
    nameKana: member.nameKana,
    relationship: member.relationship,
    acquisitionReason: member.acquisitionReason,
    civilShareNumerator: member.civilShareNumerator,
    civilShareDenominator: member.civilShareDenominator,
    taxShareNumerator: member.taxShareNumerator,
    taxShareDenominator: member.taxShareDenominator,
    specialTaxAddition: member.specialTaxAddition,
    disabilityCategory: member.disabilityCategory,
    birthDate: member.birthDate ? dateOnly(member.birthDate) : null,
    note: member.note,
    sortOrder: member.sortOrder,
    createdAt: member.createdAt.toISOString(),
    updatedAt: member.updatedAt.toISOString(),
  };
}

function serializePositionAllocation(allocation: PositionAllocation) {
  return {
    id: allocation.id,
    positionId: allocation.positionId,
    familyMemberId: allocation.familyMemberId,
    role: allocation.role,
    numerator: allocation.numerator,
    denominator: allocation.denominator,
    createdAt: allocation.createdAt.toISOString(),
    updatedAt: allocation.updatedAt.toISOString(),
  };
}

function serializePlanningScenario(scenario: PlanningScenario) {
  return {
    id: scenario.id,
    householdId: scenario.householdId,
    name: scenario.name,
    assetChangePercent: decimalText(scenario.assetChangePercent),
    liabilityChangePercent: decimalText(scenario.liabilityChangePercent),
    inheritanceTaxJpy: decimalText(scenario.inheritanceTaxJpy),
    successionCostsJpy: decimalText(scenario.successionCostsJpy),
    note: scenario.note,
    createdAt: scenario.createdAt.toISOString(),
    updatedAt: scenario.updatedAt.toISOString(),
  };
}

function serializeActivityLog(log: ActivityLog) {
  return {
    id: log.id,
    householdId: log.householdId,
    householdName: log.householdName,
    clientCode: log.clientCode,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    summary: log.summary,
    actor: log.actor,
    details: log.details ?? null,
    createdAt: log.createdAt.toISOString(),
  };
}

/** 全顧客ぶんをテーブル単位で書き出す（ID・シーケンスまで含めた完全復元用）。 */
export async function exportAll() {
  const [households, snapshots, positions, familyMembers, positionAllocations, planningScenarios, activityLogs, staff, staffAssignments] = await Promise.all([
    prisma.household.findMany({ orderBy: { id: "asc" }, include: { staff: { select: backupStaffSelect } } }),
    prisma.snapshot.findMany({ orderBy: { id: "asc" } }),
    prisma.position.findMany({ orderBy: { id: "asc" } }),
    prisma.familyMember.findMany({ orderBy: { id: "asc" } }),
    prisma.positionAllocation.findMany({ orderBy: { id: "asc" } }),
    prisma.planningScenario.findMany({ orderBy: { id: "asc" } }),
    prisma.activityLog.findMany({ orderBy: { id: "asc" } }),
    prisma.staff.findMany({ orderBy: { staffCode: "asc" }, select: backupStaffSelect }),
    prisma.staffAssignment.findMany({ orderBy: { id: "asc" } }),
  ]);

  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    kind: "full" as const,
    source: "private-banking",
    exportedAt: new Date().toISOString(),
    data: {
      households: households.map(serializeHousehold),
      snapshots: snapshots.map(serializeSnapshot),
      positions: positions.map(serializePosition),
      familyMembers: familyMembers.map(serializeFamilyMember),
      positionAllocations: positionAllocations.map(serializePositionAllocation),
      planningScenarios: planningScenarios.map(serializePlanningScenario),
      activityLogs: activityLogs.map(serializeActivityLog),
      staff,
      staffAssignments: staffAssignments.map((row) => ({ householdId: row.householdId, ...serializeStaffAssignment(row) })),
    },
  };
}

/** 顧客1件ぶんを入れ子構造で書き出す（他の環境へ新規顧客として取り込む用）。 */
export async function exportHousehold(householdId: number) {
  const household = await prisma.household.findUnique({
    where: { id: householdId },
    include: {
      staff: { select: backupStaffSelect },
      staffAssignments: { orderBy: [{ startedAt: "asc" }, { id: "asc" }] },
      familyMembers: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
      planningScenarios: { orderBy: [{ updatedAt: "desc" }, { id: "desc" }] },
      activityLogs: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
      snapshots: {
        orderBy: { fiscalYear: "asc" },
        include: { positions: { include: { allocations: { orderBy: { id: "asc" } } }, orderBy: [{ side: "asc" }, { sortOrder: "asc" }] } },
      },
    },
  });
  if (!household) throw new BackupError("顧客が見つかりません。");

  const familyMemberIndex = new Map(household.familyMembers.map((member, index) => [member.id, index]));
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    kind: "household" as const,
    source: "private-banking",
    exportedAt: new Date().toISOString(),
    household: omit(serializeHousehold(household), ["id", "createdAt", "updatedAt"]),
    staffAssignments: household.staffAssignments.map(serializeStaffAssignment),
    familyMembers: household.familyMembers.map((member) => omit(serializeFamilyMember(member), ["id", "householdId", "createdAt", "updatedAt"])),
    planningScenarios: household.planningScenarios.map((scenario) => omit(serializePlanningScenario(scenario), ["id", "householdId", "createdAt", "updatedAt"])),
    activityLogs: household.activityLogs.map((log) => omit(serializeActivityLog(log), ["id", "householdId", "householdName", "clientCode"])),
    snapshots: household.snapshots.map((snapshot) => ({
      ...omit(serializeSnapshot(snapshot), ["id", "householdId", "createdAt", "updatedAt"]),
      positions: snapshot.positions.map(({ allocations, ...position }) => ({
        ...omit(serializePosition(position), ["id", "snapshotId", "createdAt", "updatedAt"]),
        allocations: allocations.map((allocation) => ({
          familyMemberIndex: familyMemberIndex.get(allocation.familyMemberId),
          role: allocation.role,
          numerator: allocation.numerator,
          denominator: allocation.denominator,
        })),
      })),
    })),
  };
}

// ---------------------------------------------------------------- 検証

const decimalLike = z.union([z.string(), z.number()]);
const nullableDecimalLike = decimalLike.nullable().optional();
const timestamp = z.string().min(1);

/**
 * 取り込むファイルの `YYYY-MM-DD`。実在しない日付はここで弾く。
 *
 * 通すと `new Date("2026-02-31T00:00:00.000Z")` が 3月3日 として保存され、
 * 取り込んだ時点で元のファイルと中身が違う（どこで変わったのか後から辿れない）。
 */
const dateOnlyText = z.string()
  // 旧いファイルは日時（`2026-01-01T00:00:00.000Z`）で書かれていることがあるので日付の部分だけ見る
  .transform((value) => value.slice(0, 10))
  .refine((value) => parseDateOnlyUtc(value) !== null, "日付は YYYY-MM-DD で、実在する日付にしてください。");

const householdFieldsSchema = z.object({
  clientCode: z.string().trim().min(1).max(30),
  name: z.string().trim().min(1).max(100),
  // かなは後から追加した項目のため、旧バックアップファイルでも取り込めるよう既定値を持たせる。
  nameKana: z.string().max(100).default(""),
  birthDate: dateOnlyText.nullable().default(null),
  assignedStaff: z.string().max(100).default(""),
  assignedStaffCode: z.string().trim().max(30).regex(/^[A-Za-z0-9_-]*$/).transform((value) => value.toUpperCase()).default(""),
  assignedStaffDetails: z.object({
    staffCode: z.string().trim().min(1).max(30).regex(/^[A-Za-z0-9_-]+$/).transform((value) => value.toUpperCase()),
    name: z.string().trim().min(1).max(100), nameKana: z.string().max(100).default(""),
    department: z.string().max(100).default(""), isActive: z.boolean().default(true),
    // 社員台帳の台帳ID。2026-10-21 より前のバックアップには無い
    staffDirectoryId: z.number().int().positive().nullable().default(null),
  }).nullable().default(null),
  // 関連法人も後から追加した項目のため既定値を持たせる。
  relatedCompany: z.string().max(100).default(""),
  currency: z.string().max(10).default("JPY"),
  // 承継関連費用と計算時刻は 2026-10-27 より前は顧客側にあった。読み取りだけ続け、
  // 取り込み時に年度側へ移す（相続税額・その他税金は当時も年度側に同じ値があるので読まない）。
  successionCosts: decimalLike.default(0),
  inheritanceTaxUpdatedAt: z.string().nullable().default(null),
  hasSpouse: z.boolean().default(false),
  heirRank: z.string().default("rank1"),
  heirCount: z.number().int().min(0).default(1),
});

const snapshotFieldsSchema = z.object({
  label: z.string().max(100),
  asOfDate: dateOnlyText,
  fiscalYear: z.number().int().min(1900).max(2200),
  isCurrent: z.boolean().default(false),
  estimatedInheritanceTax: decimalLike.default(0),
  inheritanceTaxCalculation: z.unknown().nullable().default(null),
  otherTaxes: decimalLike.default(0),
  // 承継関連費用・計算時刻は 2026-10-27 に年度側へ移した。無ければ顧客側の値を使う。
  successionCosts: decimalLike.optional(),
  inheritanceTaxUpdatedAt: z.string().nullable().optional(),
  // 円換算レートは後から追加した項目のため、旧バックアップファイルでも取り込めるようにしておく。
  fxRates: z.unknown().optional(),
});

const positionFieldsSchema = z.object({
  side: z.enum(["ASSET", "LIABILITY"]),
  category: z.string().min(1),
  name: z.string(),
  institution: z.string().default(""),
  currency: z.string().default("JPY"),
  originalAmount: decimalLike,
  fxRate: decimalLike.default(1),
  valueJpy: decimalLike,
  liquidity: z.string().default("MEDIUM"),
  includedInNetWorth: z.boolean().default(true),
  // 列を持たない旧バックアップでも取り込めるようにしておく。既定値をここに書くと
  // 評価方法の文字列がサーバ側1箇所という前提が崩れるので、無ければ下の
  // positionData で算式と科目から引き直す。
  valuationMethod: z.string().optional(),
  valuationFormula: z.string().default("MANUAL"),
  valuationQuantity: nullableDecimalLike,
  valuationUnitPrice: nullableDecimalLike,
  adjustmentRate: nullableDecimalLike,
  landArea: nullableDecimalLike,
  roadsideValue: nullableDecimalLike,
  fixedAssetTaxValue: nullableDecimalLike,
  valuationMultiplier: nullableDecimalLike,
  ownershipShare: nullableDecimalLike,
  ownershipNumerator: z.number().int().nullable().optional(),
  ownershipDenominator: z.number().int().nullable().optional(),
  assetDetails: z.record(z.unknown()).nullable().optional(),
  note: z.string().default(""),
  sortOrder: z.number().int().default(0),
});

const familyMemberFieldsSchema = z.object({
  name: z.string().trim().min(1).max(100),
  nameKana: z.string().max(100).default(""),
  relationship: z.string().min(1),
  acquisitionReason: z.string().default("INHERITANCE"),
  civilShareNumerator: z.number().int().min(0).nullable().optional(),
  civilShareDenominator: z.number().int().positive().nullable().optional(),
  taxShareNumerator: z.number().int().min(0).nullable().optional(),
  taxShareDenominator: z.number().int().positive().nullable().optional(),
  specialTaxAddition: z.boolean().default(false),
  disabilityCategory: z.string().default("NONE"),
  birthDate: dateOnlyText.nullable().optional(),
  note: z.string().default(""),
  sortOrder: z.number().int().default(0),
});

const planningScenarioFieldsSchema = z.object({
  name: z.string().trim().min(1).max(100),
  assetChangePercent: decimalLike.default(0),
  liabilityChangePercent: decimalLike.default(0),
  inheritanceTaxJpy: decimalLike.default(0),
  successionCostsJpy: decimalLike.default(0),
  note: z.string().default(""),
});

const activityLogFieldsSchema = z.object({
  householdName: z.string().default(""),
  clientCode: z.string().default(""),
  action: z.string().min(1),
  entityType: z.string().min(1),
  entityId: z.string().nullable().default(null),
  summary: z.string().min(1),
  actor: z.string().default("ローカル利用者"),
  details: z.record(z.unknown()).nullable().optional(),
  createdAt: timestamp,
});

const timestampsSchema = z.object({ createdAt: timestamp, updatedAt: timestamp });
const fullPositionAllocationSchema = z.object({
  id: z.number().int().positive(), positionId: z.number().int().positive(), familyMemberId: z.number().int().positive(),
  role: z.enum(["ACQUIRER", "DEBT_BEARER"]), numerator: z.number().int().positive(), denominator: z.number().int().positive(),
}).merge(timestampsSchema);
const portablePositionAllocationSchema = z.object({
  familyMemberIndex: z.number().int().min(0), role: z.enum(["ACQUIRER", "DEBT_BEARER"]),
  numerator: z.number().int().positive(), denominator: z.number().int().positive(),
});

const staffBackupSchema = householdFieldsSchema.shape.assignedStaffDetails.removeDefault().unwrap();
const staffAssignmentSchema = z.object({
  staffCode: z.string().max(30), staffName: z.string().max(100),
  startedAt: z.string().datetime(), endedAt: z.string().datetime().nullable(), createdAt: z.string().datetime(),
}).refine((row) => row.endedAt === null || row.endedAt >= row.startedAt, "担当終了日は開始日以降にしてください。");

export const fullBackupSchema = z.object({
  schemaVersion: z.union([z.literal(1), z.literal(BACKUP_SCHEMA_VERSION)]),
  kind: z.literal("full"),
  exportedAt: z.string().optional(),
  data: z.object({
    staff: z.array(staffBackupSchema).default([]),
    staffAssignments: z.array(z.object({ householdId: z.number().int().positive() }).and(staffAssignmentSchema)).default([]),
    households: z.array(householdFieldsSchema.extend({ id: z.number().int().positive() }).merge(timestampsSchema)),
    snapshots: z.array(snapshotFieldsSchema.extend({ id: z.number().int().positive(), householdId: z.number().int().positive() }).merge(timestampsSchema)),
    positions: z.array(positionFieldsSchema.extend({ id: z.number().int().positive(), snapshotId: z.number().int().positive() }).merge(timestampsSchema)),
    familyMembers: z.array(familyMemberFieldsSchema.extend({ id: z.number().int().positive(), householdId: z.number().int().positive() }).merge(timestampsSchema)).default([]),
    positionAllocations: z.array(fullPositionAllocationSchema).default([]),
    planningScenarios: z.array(planningScenarioFieldsSchema.extend({ id: z.number().int().positive(), householdId: z.number().int().positive() }).merge(timestampsSchema)).default([]),
    activityLogs: z.array(activityLogFieldsSchema.extend({ id: z.number().int().positive(), householdId: z.number().int().positive().nullable() })).default([]),
  }),
});

export const householdBackupSchema = z.object({
  schemaVersion: z.union([z.literal(1), z.literal(BACKUP_SCHEMA_VERSION)]),
  kind: z.literal("household"),
  exportedAt: z.string().optional(),
  household: householdFieldsSchema,
  staffAssignments: z.array(staffAssignmentSchema).default([]),
  familyMembers: z.array(familyMemberFieldsSchema).default([]),
  planningScenarios: z.array(planningScenarioFieldsSchema).default([]),
  activityLogs: z.array(activityLogFieldsSchema.omit({ householdName: true, clientCode: true })).default([]),
  snapshots: z.array(snapshotFieldsSchema.extend({ positions: z.array(positionFieldsSchema.extend({ allocations: z.array(portablePositionAllocationSchema).default([]) })).default([]) })),
});

export type FullBackup = z.infer<typeof fullBackupSchema>;
export type HouseholdBackup = z.infer<typeof householdBackupSchema>;
export type BackupCounts = {
  households: number;
  snapshots: number;
  positions: number;
  familyMembers: number;
  planningScenarios: number;
  activityLogs: number;
};

// ---------------------------------------------------------------- 復元

const toDecimal = (value: string | number) => new Prisma.Decimal(value);
const toDecimalOrNull = (value: string | number | null | undefined) => value === null || value === undefined || value === "" ? null : new Prisma.Decimal(value);
/** 取り込み用の日付。スキーマ（`dateOnlyText`）を通った値だけが来る。 */
const toDateOnly = (value: string) => {
  const parsed = parseDateOnlyUtc(value);
  if (parsed === null) throw new BackupError(`日付「${value}」は実在しません。`);
  return parsed;
};
const toJson = (value: Record<string, unknown> | null | undefined) =>
  value === null || value === undefined ? Prisma.DbNull : value as Prisma.InputJsonValue;

type HouseholdFields = z.infer<typeof householdFieldsSchema>;
type SnapshotFields = z.infer<typeof snapshotFieldsSchema>;
type PositionFields = z.infer<typeof positionFieldsSchema>;
type FamilyMemberFields = z.infer<typeof familyMemberFieldsSchema>;
type PlanningScenarioFields = z.infer<typeof planningScenarioFieldsSchema>;
type ActivityLogFields = z.infer<typeof activityLogFieldsSchema>;

/**
 * 担当者は社員台帳の写しなので、復元で作ることはしない。台帳ID → コードの順で今の写しから探し、
 * v1（名前しか持たない）だけは氏名が一意のときに結び付ける。見つからなければ取り込まない。
 */
async function resolveStaffIds(tx: Prisma.TransactionClient, rows: readonly HouseholdFields[]) {
  const ids = new Map<HouseholdFields, number | null>();
  for (const row of rows) {
    const code = row.assignedStaffCode;
    const name = row.assignedStaff.trim();
    const details = row.assignedStaffDetails;
    if (details && code && details.staffCode !== code) throw new BackupError("担当者コードと担当者情報が一致しません。");
    if (!code && !name) {
      ids.set(row, null);
      continue;
    }
    let staff: { id: number } | null = null;
    if (details?.staffDirectoryId) staff = await tx.staff.findUnique({ where: { staffDirectoryId: details.staffDirectoryId }, select: { id: true } });
    if (!staff && code) staff = await tx.staff.findUnique({ where: { staffCode: code }, select: { id: true } });
    if (!staff && !code) {
      // v1 は名前しか持たない。同姓同名がある場合は勝手にどちらかへ紐付けない。
      const matches = await tx.staff.findMany({ where: { name }, select: { id: true }, take: 2 });
      if (matches.length > 1) throw new BackupError(`旧バックアップの担当者「${name}」は同姓同名があるため特定できません。担当者コード付きで書き出し直してください。`);
      staff = matches[0] ?? null;
    }
    if (!staff) {
      const label = [details?.name ?? name, code].filter(Boolean).join("・");
      throw new BackupError(`担当者「${label}」が担当者の一覧にありません。担当者は社員台帳から写すため、社員台帳に登録してから取り込み直すか、バックアップの担当者を外してください。`);
    }
    ids.set(row, staff.id);
  }
  return (row: HouseholdFields) => ids.get(row) ?? null;
}

function householdData(row: HouseholdFields, staffId: number | null) {
  return {
    clientCode: row.clientCode,
    name: row.name,
    nameKana: row.nameKana,
    birthDate: row.birthDate === null ? null : toDateOnly(row.birthDate),
    staffId,
    relatedCompany: row.relatedCompany,
    currency: row.currency,
    hasSpouse: row.hasSpouse,
    heirRank: row.heirRank,
    heirCount: row.heirCount,
  };
}

/**
 * 現在年度として扱う年度を1つ選ぶ。DB は顧客ごとに1件しか現在年度を持てないので、
 * 現在扱いが複数あるバックアップ・1件も無いバックアップはどちらも最新年度へ寄せる。
 */
function currentFiscalYearOf(snapshots: { fiscalYear: number; isCurrent: boolean }[]): number | null {
  if (snapshots.length === 0) return null;
  const declaredCurrent = snapshots.filter((snapshot) => snapshot.isCurrent);
  if (declaredCurrent.length === 1) return declaredCurrent[0]!.fiscalYear;
  return Math.max(...snapshots.map((snapshot) => snapshot.fiscalYear));
}

/** 旧バックアップは承継関連費用・計算時刻を顧客側に持つので、年度に無ければそこから引く。 */
function snapshotData(row: SnapshotFields, household: HouseholdFields) {
  const inheritanceTaxUpdatedAt = row.inheritanceTaxUpdatedAt ?? household.inheritanceTaxUpdatedAt;
  return {
    label: row.label,
    asOfDate: toDateOnly(row.asOfDate),
    fiscalYear: row.fiscalYear,
    isCurrent: row.isCurrent,
    estimatedInheritanceTax: toDecimal(row.estimatedInheritanceTax),
    inheritanceTaxCalculation: row.inheritanceTaxCalculation === null
      ? Prisma.DbNull
      : row.inheritanceTaxCalculation as Prisma.InputJsonValue,
    otherTaxes: toDecimal(row.otherTaxes),
    successionCosts: toDecimal(row.successionCosts ?? household.successionCosts),
    inheritanceTaxUpdatedAt: inheritanceTaxUpdatedAt === null ? null : new Date(inheritanceTaxUpdatedAt),
    fxRates: parseFxRates(row.fxRates),
  };
}

// 評価方法の引き直しを単体で確かめられるよう export している（lib/__tests__/backup.test.ts）。
export function positionData(row: PositionFields) {
  return {
    side: row.side,
    category: row.category,
    name: row.name,
    institution: row.institution,
    currency: row.currency,
    originalAmount: toDecimal(row.originalAmount),
    fxRate: toDecimal(row.fxRate),
    valueJpy: toDecimal(row.valueJpy),
    liquidity: row.liquidity,
    includedInNetWorth: row.includedInNetWorth,
    // 持っている値はそのまま戻す（復元は書き出した内容を再現するもので、
    // ここで作り直すとバックアップと復元後で中身が変わる）。欠けている旧バックアップだけ引き直す。
    valuationMethod: row.valuationMethod ?? normalizedValuationMethod(row),
    valuationFormula: row.valuationFormula,
    valuationQuantity: toDecimalOrNull(row.valuationQuantity),
    valuationUnitPrice: toDecimalOrNull(row.valuationUnitPrice),
    adjustmentRate: toDecimalOrNull(row.adjustmentRate),
    landArea: toDecimalOrNull(row.landArea),
    roadsideValue: toDecimalOrNull(row.roadsideValue),
    fixedAssetTaxValue: toDecimalOrNull(row.fixedAssetTaxValue),
    valuationMultiplier: toDecimalOrNull(row.valuationMultiplier),
    ownershipShare: toDecimalOrNull(row.ownershipShare),
    ownershipNumerator: row.ownershipNumerator ?? null,
    ownershipDenominator: row.ownershipDenominator ?? null,
    assetDetails: toJson(row.assetDetails),
    note: row.note,
    sortOrder: row.sortOrder,
  };
}

function familyMemberData(row: FamilyMemberFields) {
  return {
    name: row.name,
    nameKana: row.nameKana,
    relationship: row.relationship,
    acquisitionReason: row.acquisitionReason,
    civilShareNumerator: row.civilShareNumerator ?? null,
    civilShareDenominator: row.civilShareDenominator ?? null,
    taxShareNumerator: row.taxShareNumerator ?? null,
    taxShareDenominator: row.taxShareDenominator ?? null,
    specialTaxAddition: row.specialTaxAddition,
    disabilityCategory: row.disabilityCategory,
    birthDate: row.birthDate ? toDateOnly(row.birthDate) : null,
    note: row.note,
    sortOrder: row.sortOrder,
  };
}

function planningScenarioData(row: PlanningScenarioFields) {
  return {
    name: row.name,
    assetChangePercent: toDecimal(row.assetChangePercent),
    liabilityChangePercent: toDecimal(row.liabilityChangePercent),
    inheritanceTaxJpy: toDecimal(row.inheritanceTaxJpy),
    successionCostsJpy: toDecimal(row.successionCostsJpy),
    note: row.note,
  };
}

function activityLogData(row: Pick<ActivityLogFields, "action" | "entityType" | "entityId" | "summary" | "actor" | "details" | "createdAt">) {
  return {
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    summary: row.summary,
    actor: row.actor,
    details: toJson(row.details),
    createdAt: new Date(row.createdAt),
  };
}

const SEQUENCE_TABLES = ["Household", "Snapshot", "Position", "FamilyMember", "PositionAllocation", "PlanningScenario", "ActivityLog"] as const;

async function restoreStaffAssignments(tx: Prisma.TransactionClient, householdId: number, currentStaffId: number | null, rows: z.infer<typeof staffAssignmentSchema>[]) {
  const activeRows = rows.filter((row) => row.endedAt === null);
  if (activeRows.length > 1) throw new BackupError("同じ顧客に終了していない担当履歴が複数あります。");
  const currentStaff = currentStaffId === null ? null : await tx.staff.findUniqueOrThrow({ where: { id: currentStaffId }, select: { id: true, staffCode: true, name: true } });
  if (activeRows.length && (!currentStaff || activeRows[0].staffCode !== currentStaff.staffCode)) {
    // 改名・コード変更の前の履歴スナップショットは保持し、現在担当者へ紐付ける。
    if (!currentStaff) throw new BackupError("現在担当者が未設定ですが、終了していない担当履歴があります。");
  }
  for (const row of rows) {
    const linked = row.endedAt === null ? currentStaff : await tx.staff.findUnique({ where: { staffCode: row.staffCode }, select: { id: true } });
    await tx.staffAssignment.create({ data: {
      householdId, staffId: linked?.id ?? null, staffCode: row.staffCode, staffName: row.staffName,
      startedAt: new Date(row.startedAt), endedAt: row.endedAt ? new Date(row.endedAt) : null, createdAt: new Date(row.createdAt),
    } });
  }
  if (currentStaff && activeRows.length === 0) await tx.staffAssignment.create({ data: { householdId, staffId: currentStaff.id, staffCode: currentStaff.staffCode, staffName: currentStaff.name } });
}

/** 既存データをすべて破棄し、バックアップの内容へ置き換える。 */
export async function restoreAll(backup: FullBackup): Promise<BackupCounts> {
  const { households, snapshots, positions, familyMembers, positionAllocations, planningScenarios, activityLogs } = backup.data;
  if (households.length === 0) throw new BackupError("バックアップに顧客が1件も含まれていません。");

  const householdIds = new Set(households.map((household) => household.id));
  const snapshotIds = new Set(snapshots.map((snapshot) => snapshot.id));
  const orphanSnapshot = snapshots.find((snapshot) => !householdIds.has(snapshot.householdId));
  if (orphanSnapshot) throw new BackupError(`年度データ（ID ${orphanSnapshot.id}）の顧客が見つかりません。バックアップが壊れている可能性があります。`);
  const orphanPosition = positions.find((position) => !snapshotIds.has(position.snapshotId));
  if (orphanPosition) throw new BackupError(`明細（ID ${orphanPosition.id}）の年度データが見つかりません。バックアップが壊れている可能性があります。`);
  const orphanFamilyMember = familyMembers.find((member) => !householdIds.has(member.householdId));
  if (orphanFamilyMember) throw new BackupError(`家族（ID ${orphanFamilyMember.id}）の顧客が見つかりません。バックアップが壊れている可能性があります。`);
  const positionIds = new Set(positions.map((position) => position.id));
  const familyMemberIds = new Set(familyMembers.map((member) => member.id));
  const orphanAllocation = positionAllocations.find((allocation) => !positionIds.has(allocation.positionId) || !familyMemberIds.has(allocation.familyMemberId));
  if (orphanAllocation) throw new BackupError(`取得者・負担者（ID ${orphanAllocation.id}）の明細または家族が見つかりません。バックアップが壊れている可能性があります。`);
  const orphanScenario = planningScenarios.find((scenario) => !householdIds.has(scenario.householdId));
  if (orphanScenario) throw new BackupError(`シナリオ（ID ${orphanScenario.id}）の顧客が見つかりません。バックアップが壊れている可能性があります。`);
  const orphanActivityLog = activityLogs.find((log) => log.householdId !== null && !householdIds.has(log.householdId));
  if (orphanActivityLog) throw new BackupError(`操作履歴（ID ${orphanActivityLog.id}）の顧客が見つかりません。バックアップが壊れている可能性があります。`);
  if (backup.data.staffAssignments.some((row) => !householdIds.has(row.householdId))) throw new BackupError("担当履歴の顧客が見つかりません。");
  const codes = backup.data.staff.map((row) => row.staffCode);
  if (new Set(codes).size !== codes.length) throw new BackupError("担当者台帳に重複コードがあります。");

  // 結び付け先を最新にしてから照合する（台帳が止まっていれば今の写しのまま）
  await syncStaffDirectory({ force: true });
  await prisma.$transaction(async (tx) => {
    await tx.activityLog.deleteMany();
    await tx.planningScenario.deleteMany();
    await tx.position.deleteMany();
    await tx.snapshot.deleteMany();
    await tx.household.deleteMany();

    // 担当者の一覧は社員台帳の写しなので、バックアップの担当者では書き換えない（顧客の結び付けにだけ使う）。
    if (households.length > 0) {
      const staffIdOf = await resolveStaffIds(tx, households);
      await tx.household.createMany({
        data: households.map((row) => ({ id: row.id, ...householdData(row, staffIdOf(row)), createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) })),
      });
      for (const row of households) await restoreStaffAssignments(tx, row.id, staffIdOf(row), backup.data.staffAssignments.filter((history) => history.householdId === row.id));
    }
    if (snapshots.length > 0) {
      // 現在年度は顧客ごとに1件（DB の部分ユニーク索引）。古いバックアップには複数や
      // 0件のものがあるので、取り込む前に同じ規則でそろえる。
      const householdById = new Map(households.map((row) => [row.id, row]));
      const currentByHousehold = new Map(households.map((row) => [
        row.id,
        currentFiscalYearOf(snapshots.filter((snapshot) => snapshot.householdId === row.id)),
      ]));
      await tx.snapshot.createMany({
        data: snapshots.map((row) => ({
          id: row.id,
          householdId: row.householdId,
          ...snapshotData(row, householdById.get(row.householdId)!),
          isCurrent: row.fiscalYear === currentByHousehold.get(row.householdId),
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt),
        })),
      });
    }
    if (positions.length > 0) {
      await tx.position.createMany({
        data: positions.map((row) => ({ id: row.id, snapshotId: row.snapshotId, ...positionData(row), createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) })),
      });
    }
    if (familyMembers.length > 0) {
      await tx.familyMember.createMany({
        data: familyMembers.map((row) => ({ id: row.id, householdId: row.householdId, ...familyMemberData(row), createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) })),
      });
    }
    if (positionAllocations.length > 0) {
      await tx.positionAllocation.createMany({
        data: positionAllocations.map((row) => ({ id: row.id, positionId: row.positionId, familyMemberId: row.familyMemberId, role: row.role, numerator: row.numerator, denominator: row.denominator, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) })),
      });
    }
    if (planningScenarios.length > 0) {
      await tx.planningScenario.createMany({
        data: planningScenarios.map((row) => ({ id: row.id, householdId: row.householdId, ...planningScenarioData(row), createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) })),
      });
    }
    if (activityLogs.length > 0) {
      await tx.activityLog.createMany({
        data: activityLogs.map((row) => ({
          id: row.id,
          householdId: row.householdId,
          householdName: row.householdName,
          clientCode: row.clientCode,
          ...activityLogData(row),
        })),
      });
    }

    // ID を明示指定して流し込んだため、連番シーケンスを最大値の次へ進める。
    for (const table of SEQUENCE_TABLES) {
      await tx.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE((SELECT MAX("id") FROM "${table}"), 0) + 1, false)`,
      );
    }
  }, { timeout: 60000 });

  return {
    households: households.length,
    snapshots: snapshots.length,
    positions: positions.length,
    familyMembers: familyMembers.length,
    planningScenarios: planningScenarios.length,
    activityLogs: activityLogs.length,
  };
}

/** 顧客コードが衝突する場合に `-2`, `-3` … を付けて空きを探す。 */
async function availableClientCode(preferred: string) {
  const existing = new Set((await prisma.household.findMany({ select: { clientCode: true } })).map((household) => household.clientCode));
  if (!existing.has(preferred)) return preferred;
  for (let suffix = 2; suffix <= 999; suffix += 1) {
    const candidate = `${preferred.slice(0, 30 - String(suffix).length - 1)}-${suffix}`;
    if (!existing.has(candidate)) return candidate;
  }
  throw new BackupError("顧客コードの空きが見つかりません。取り込み前に不要な顧客を整理してください。");
}

/** 顧客1件ぶんのバックアップを、既存データを消さずに新規顧客として取り込む。 */
export async function importHousehold(backup: HouseholdBackup) {
  if (backup.snapshots.length === 0) throw new BackupError("年度データが1件も含まれていないため取り込めません。");

  const fiscalYears = new Set<number>();
  for (const snapshot of backup.snapshots) {
    if (fiscalYears.has(snapshot.fiscalYear)) throw new BackupError(`${snapshot.fiscalYear}年度が重複しています。同一年度は1件だけ取り込めます。`);
    fiscalYears.add(snapshot.fiscalYear);
    for (const position of snapshot.positions) {
      const invalidAllocation = position.allocations.find((allocation) => allocation.familyMemberIndex >= backup.familyMembers.length);
      if (invalidAllocation) throw new BackupError(`明細「${position.name}」の取得者・負担者が家族一覧に見つかりません。`);
    }
  }

  const currentFiscalYear = currentFiscalYearOf(backup.snapshots);

  const clientCode = await availableClientCode(backup.household.clientCode.toUpperCase());
  await syncStaffDirectory({ force: true });
  const created = await prisma.$transaction(async (tx) => {
    const staffIdOf = await resolveStaffIds(tx, [backup.household]);
    const household = await tx.household.create({ data: { ...householdData(backup.household, staffIdOf(backup.household)), clientCode }, select: { id: true, clientCode: true, name: true } });
    await restoreStaffAssignments(tx, household.id, staffIdOf(backup.household), backup.staffAssignments);
    const memberIds: number[] = [];
    for (const member of backup.familyMembers) {
      const createdMember = await tx.familyMember.create({ data: { householdId: household.id, ...familyMemberData(member) }, select: { id: true } });
      memberIds.push(createdMember.id);
    }
    for (const snapshot of backup.snapshots) {
      const createdSnapshot = await tx.snapshot.create({ data: { householdId: household.id, ...snapshotData(snapshot, backup.household), isCurrent: snapshot.fiscalYear === currentFiscalYear }, select: { id: true } });
      for (const position of snapshot.positions) {
        const { allocations, ...positionFields } = position;
        const createdPosition = await tx.position.create({ data: { snapshotId: createdSnapshot.id, ...positionData(positionFields) }, select: { id: true } });
        if (allocations.length > 0) await tx.positionAllocation.createMany({ data: allocations.map((allocation) => ({
          positionId: createdPosition.id,
          familyMemberId: memberIds[allocation.familyMemberIndex]!,
          role: allocation.role,
          numerator: allocation.numerator,
          denominator: allocation.denominator,
        })) });
      }
    }
    if (backup.planningScenarios.length > 0) await tx.planningScenario.createMany({ data: backup.planningScenarios.map((scenario) => ({ householdId: household.id, ...planningScenarioData(scenario) })) });
    if (backup.activityLogs.length > 0) await tx.activityLog.createMany({ data: backup.activityLogs.map((log) => ({ householdId: household.id, householdName: backup.household.name, clientCode, ...activityLogData(log) })) });
    return household;
  });

  return {
    household: created,
    renamedClientCode: clientCode === backup.household.clientCode.toUpperCase() ? null : clientCode,
    counts: {
      households: 1,
      snapshots: backup.snapshots.length,
      positions: backup.snapshots.reduce((total, snapshot) => total + snapshot.positions.length, 0),
      familyMembers: backup.familyMembers.length,
      planningScenarios: backup.planningScenarios.length,
      activityLogs: backup.activityLogs.length,
    } satisfies BackupCounts,
  };
}
