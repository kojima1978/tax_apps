/**
 * 道具の中身。MCP の配線（src/index.ts）とは分けてある ── こちらは素の関数なので
 * テストから直接呼べる。
 */
import type { SvfApi } from './api.js';
import type { CaseProfileInput } from './caseIdentity.js';
import { buildCaseProfile } from './caseIdentity.js';
import type { CaseData, FieldValueInput } from './catalog.js';
import { applyFieldValues, readFieldValues } from './catalog.js';
import { InputError } from './errors.js';
import { withCaseLock } from './lock.js';
import {
  renderBalanceSides,
  renderCaseProfile,
  renderCatalog,
  renderFieldChanges,
  renderJson,
} from './render.js';
import type { BalanceRowInput } from './table5.js';
import { applyBalanceSheet, findRowTable, readBalanceRows } from './table5.js';

export interface DescribeFieldsArgs {
  form?: string;
}

export interface ListCasesArgs {
  includeArchived?: boolean;
}

export interface CaseArgs {
  caseId: number;
}

export interface CreateCaseArgs extends CaseProfileInput {
  commit?: boolean;
}

export interface SetFieldsArgs extends CaseArgs {
  values: FieldValueInput[];
  commit?: boolean;
}

export interface SideInput {
  side: string;
  rows: BalanceRowInput[];
}

export interface ImportBalanceSheetArgs extends CaseArgs {
  sides: SideInput[];
  commit?: boolean;
}

function caseData(data: unknown): CaseData {
  return (data ?? {}) as CaseData;
}

/** 書き込める欄の一覧。外部ツールはまずこれを読んでから書く。 */
export async function describeFields(api: SvfApi, args: DescribeFieldsArgs): Promise<string> {
  const catalog = await api.getCatalog();
  if (args.form === undefined || args.form.trim() === '') return renderCatalog(catalog);

  const form = args.form.trim();
  const filtered = {
    ...catalog,
    fields: catalog.fields.filter((f) => f.form === form),
    rowTables: catalog.rowTables.filter((t) => t.form === form),
  };
  if (filtered.fields.length === 0 && filtered.rowTables.length === 0) {
    const forms = [
      ...new Set([...catalog.fields.map((f) => f.form), ...catalog.rowTables.map((t) => t.form)]),
    ];
    throw new InputError(`${form} という様式は辞書にありません。あるのは ${forms.join(' / ')}`);
  }
  return renderCatalog(filtered);
}

export async function listCases(api: SvfApi, args: ListCasesArgs): Promise<string> {
  const cases = await api.listCases(args.includeArchived === true);
  if (cases.length === 0) return '案件が1件もありません。画面から作成してください。';
  return renderJson(
    cases.map((c) => ({
      caseId: c.id,
      companyName: c.companyName,
      taxPeriod: c.taxPeriod,
      updatedAt: c.updatedAt,
      archived: c.archivedAt !== null,
    })),
  );
}

/**
 * 評価案件を1件作る。
 *
 * 同じ会社・同じ課税時期の案件が既にあればそれを返して作らない ── 取込をやり直すたびに
 * 同じ会社の案件が増えると、どちらが本物か分からなくなる。ゴミ箱にだけあるときは作るが、
 * 復元という道があることを文面で知らせる（勝手に戻すと消した判断を覆すことになる）。
 */
export async function createCase(api: SvfApi, args: CreateCaseArgs): Promise<string> {
  const catalog = await api.getCatalog();
  const profile = buildCaseProfile(catalog, args);

  const same = (await api.listCases(true)).filter(
    (c) => c.companyName.trim() === profile.companyName && c.taxPeriod.trim() === profile.taxPeriod,
  );
  const live = same.find((c) => c.archivedAt === null);
  if (live !== undefined) {
    return renderCaseProfile(profile, {
      kind: 'existing',
      caseId: live.id,
      updatedAt: live.updatedAt,
    });
  }

  const archived = same.map((c) => c.id);
  if (args.commit !== true) return renderCaseProfile(profile, { kind: 'dry', archived });

  const created = await api.postCase({
    companyName: profile.companyName,
    taxPeriod: profile.taxPeriod,
    data: profile.data,
  });
  return renderCaseProfile(profile, { kind: 'created', caseId: created.id, archived });
}

/** 案件1件の現在値。辞書に載っている欄と、第5表の明細だけを返す。 */
export async function getCase(api: SvfApi, args: CaseArgs): Promise<string> {
  const catalog = await api.getCatalog();
  const found = await api.getCase(args.caseId);
  const data = caseData(found.data);

  const rowTables = catalog.rowTables.map((rowTable) => ({
    form: rowTable.form,
    table: rowTable.table,
    sides: rowTable.sides.map((side) => ({
      side: side.key,
      label: side.label,
      rows: readBalanceRows(rowTable, data, side.prefix),
    })),
  }));

  return renderJson({
    caseId: found.id,
    companyName: found.companyName,
    taxPeriod: found.taxPeriod,
    updatedAt: found.updatedAt,
    fields: readFieldValues(catalog, data).map((f) => ({
      code: f.code,
      label: f.label,
      period: f.period,
      unit: f.unit,
      value: f.before,
    })),
    rowTables,
  });
}

export async function setFields(api: SvfApi, args: SetFieldsArgs): Promise<string> {
  const catalog = await api.getCatalog();

  // 取得から書き戻しまでを他の書き込みと重ねない（withCaseLock の説明を参照）。
  return withCaseLock(args.caseId, async () => {
    const found = await api.getCase(args.caseId);
    const { data, changes } = applyFieldValues(catalog, caseData(found.data), args.values);

    if (args.commit !== true) return renderFieldChanges(changes, false);

    await api.putCase(args.caseId, {
      companyName: found.companyName,
      taxPeriod: found.taxPeriod,
      data,
    });
    return renderFieldChanges(changes, true);
  });
}

export async function importBalanceSheet(
  api: SvfApi,
  args: ImportBalanceSheetArgs,
): Promise<string> {
  const catalog = await api.getCatalog();
  const rowTable = findRowTable(catalog, 'table5');

  if (args.sides.length === 0) throw new InputError('取り込む側が指定されていません');

  const input: Record<string, BalanceRowInput[]> = {};
  for (const entry of args.sides) {
    const key = String(entry.side).trim();
    if (!rowTable.sides.some((s) => s.key === key)) {
      const keys = rowTable.sides.map((s) => `${s.key}（${s.label}）`).join(' / ');
      throw new InputError(`${entry.side} という側はありません。指定できるのは ${keys}`);
    }
    if (input[key] !== undefined) {
      throw new InputError(`${key} が2回指定されています。1回にまとめてください`);
    }
    input[key] = entry.rows;
  }

  return withCaseLock(args.caseId, async () => {
    const found = await api.getCase(args.caseId);
    const { data, sides } = applyBalanceSheet(catalog, caseData(found.data), input);

    if (args.commit !== true) return renderBalanceSides(sides, false);

    await api.putCase(args.caseId, {
      companyName: found.companyName,
      taxPeriod: found.taxPeriod,
      data,
    });
    return renderBalanceSides(sides, true);
  });
}
