import { Prisma } from "@prisma/client";
import type { ActivityLog, FamilyMember, Household, PlanningScenario, Position, PositionAllocation, Snapshot } from "@prisma/client";
import { z } from "zod";
import { parseFxRates } from "@/lib/fx-rates";
import { normalizedValuationMethod } from "@/lib/position-input";
import { prisma } from "@/lib/prisma";
import { parseDateOnlyUtc } from "@/lib/snapshot-date";

export const BACKUP_SCHEMA_VERSION = 1;

/** 復元処理が利用者向けの日本語メッセージ付きで中断したことを表す。 */
export class BackupError extends Error {}

// ---------------------------------------------------------------- 書き出し

// Decimal は精度を落とさないよう文字列のまま保持する。
const decimalText = (value: Prisma.Decimal) => value.toString();
const decimalTextOrNull = (value: Prisma.Decimal | null) => value === null ? null : value.toString();
const dateOnly = (value: Date) => value.toISOString().slice(0, 10);

/** 顧客単位の書き出しでは、取り込み先で採番し直す列（ID・作成日時）を落とす。 */
function omit<T extends Record<string, unknown>, K extends keyof T & string>(source: T, keys: readonly K[]): Omit<T, K> {
  return Object.fromEntries(Object.entries(source).filter(([key]) => !keys.includes(key as K))) as Omit<T, K>;
}

/**
 * バックアップの担当者は**名前の文字列**のまま持つ（台帳の ID は持たない）。
 * ファイルの形を変えずに済み、台帳ごと失った環境へ戻しても名前から作り直せる。
 */
function serializeHousehold(household: Household & { staff: { name: string } | null }) {
  return {
    id: household.id,
    clientCode: household.clientCode,
    name: household.name,
    nameKana: household.nameKana,
    birthDate: household.birthDate ? dateOnly(household.birthDate) : null,
    assignedStaff: household.staff?.name ?? "",
    relatedCompany: household.relatedCompany,
    currency: household.currency,
    estimatedInheritanceTax: decimalText(household.estimatedInheritanceTax),
    otherTaxes: decimalText(household.otherTaxes),
    successionCosts: decimalText(household.successionCosts),
    inheritanceTaxUpdatedAt: household.inheritanceTaxUpdatedAt?.toISOString() ?? null,
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
  const [households, snapshots, positions, familyMembers, positionAllocations, planningScenarios, activityLogs] = await Promise.all([
    prisma.household.findMany({ orderBy: { id: "asc" }, include: { staff: { select: { name: true } } } }),
    prisma.snapshot.findMany({ orderBy: { id: "asc" } }),
    prisma.position.findMany({ orderBy: { id: "asc" } }),
    prisma.familyMember.findMany({ orderBy: { id: "asc" } }),
    prisma.positionAllocation.findMany({ orderBy: { id: "asc" } }),
    prisma.planningScenario.findMany({ orderBy: { id: "asc" } }),
    prisma.activityLog.findMany({ orderBy: { id: "asc" } }),
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
    },
  };
}

/** 顧客1件ぶんを入れ子構造で書き出す（他の環境へ新規顧客として取り込む用）。 */
export async function exportHousehold(householdId: number) {
  const household = await prisma.household.findUnique({
    where: { id: householdId },
    include: {
      staff: { select: { name: true } },
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
  // 関連法人も後から追加した項目のため既定値を持たせる。
  relatedCompany: z.string().max(100).default(""),
  currency: z.string().max(10).default("JPY"),
  estimatedInheritanceTax: decimalLike.default(0),
  otherTaxes: decimalLike.default(0),
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

export const fullBackupSchema = z.object({
  schemaVersion: z.literal(BACKUP_SCHEMA_VERSION),
  kind: z.literal("full"),
  exportedAt: z.string().optional(),
  data: z.object({
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
  schemaVersion: z.literal(BACKUP_SCHEMA_VERSION),
  kind: z.literal("household"),
  exportedAt: z.string().optional(),
  household: householdFieldsSchema,
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
 * バックアップの担当者名を台帳（Staff）へ引き当てる。無い名前はその場で作る。
 * 台帳はバックアップのテーブル一覧に入れていない ── 担当者が付いている顧客を戻せば
 * 名前から復元できるので、**台帳そのものは消さない**（どの顧客にも付いていない
 * 担当者を、顧客の復元で道連れにしないため）。
 */
async function resolveStaffIds(tx: Prisma.TransactionClient, rows: readonly HouseholdFields[]) {
  const names = [...new Set(rows.map((row) => row.assignedStaff.trim()).filter((name) => name !== ""))];
  const ids = new Map<string, number>();
  for (const name of names) {
    const staff = await tx.staff.upsert({ where: { name }, update: {}, create: { name }, select: { id: true } });
    ids.set(name, staff.id);
  }
  return (row: HouseholdFields) => ids.get(row.assignedStaff.trim()) ?? null;
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
    estimatedInheritanceTax: toDecimal(row.estimatedInheritanceTax),
    otherTaxes: toDecimal(row.otherTaxes),
    successionCosts: toDecimal(row.successionCosts),
    inheritanceTaxUpdatedAt: row.inheritanceTaxUpdatedAt === null ? null : new Date(row.inheritanceTaxUpdatedAt),
    hasSpouse: row.hasSpouse,
    heirRank: row.heirRank,
    heirCount: row.heirCount,
  };
}

function snapshotData(row: SnapshotFields) {
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

  await prisma.$transaction(async (tx) => {
    await tx.activityLog.deleteMany();
    await tx.planningScenario.deleteMany();
    await tx.position.deleteMany();
    await tx.snapshot.deleteMany();
    await tx.household.deleteMany();

    if (households.length > 0) {
      const staffIdOf = await resolveStaffIds(tx, households);
      await tx.household.createMany({
        data: households.map((row) => ({ id: row.id, ...householdData(row, staffIdOf(row)), createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) })),
      });
    }
    if (snapshots.length > 0) {
      await tx.snapshot.createMany({
        data: snapshots.map((row) => ({ id: row.id, householdId: row.householdId, ...snapshotData(row), createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) })),
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

  // 現在年度は必ず1件にそろえる（未指定のバックアップでは最新年度を現在扱いにする）。
  const latestFiscalYear = Math.max(...backup.snapshots.map((snapshot) => snapshot.fiscalYear));
  const declaredCurrent = backup.snapshots.filter((snapshot) => snapshot.isCurrent);
  const currentFiscalYear = declaredCurrent.length === 1 ? declaredCurrent[0].fiscalYear : latestFiscalYear;

  const clientCode = await availableClientCode(backup.household.clientCode.toUpperCase());
  const created = await prisma.$transaction(async (tx) => {
    const staffIdOf = await resolveStaffIds(tx, [backup.household]);
    const household = await tx.household.create({ data: { ...householdData(backup.household, staffIdOf(backup.household)), clientCode }, select: { id: true, clientCode: true, name: true } });
    const memberIds: number[] = [];
    for (const member of backup.familyMembers) {
      const createdMember = await tx.familyMember.create({ data: { householdId: household.id, ...familyMemberData(member) }, select: { id: true } });
      memberIds.push(createdMember.id);
    }
    for (const snapshot of backup.snapshots) {
      const createdSnapshot = await tx.snapshot.create({ data: { householdId: household.id, ...snapshotData(snapshot), isCurrent: snapshot.fiscalYear === currentFiscalYear }, select: { id: true } });
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
