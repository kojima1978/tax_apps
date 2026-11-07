/**
 * 道具の中身。MCP の配線（src/index.ts）とは分けてある ── こちらは素の関数なので
 * テストから直接呼べる。
 */
import type { SvfApi } from './api.js';
import type { CaseProfileInput } from './caseIdentity.js';
import { buildCaseProfile } from './caseIdentity.js';
import type { CaseData, FieldValueInput } from './catalog.js';
import { applyFieldValues, readFieldValues, storageKey } from './catalog.js';
import { InputError } from './errors.js';
import type { IntakeSourceInput, IntakeTarget } from './intake.js';
import { applyIntake, buildIntakeRecord, readIntake } from './intake.js';
import { withCaseLock } from './lock.js';
import {
  renderCaseProfile,
  renderCatalog,
  renderFieldChanges,
  renderJson,
  renderRowSides,
} from './render.js';
import type { RowInput } from './rows.js';
import { applyRows, findRowTable, readRows } from './rows.js';

export interface DescribeFieldsArgs {
  form?: string;
}

export interface ListCasesArgs {
  includeArchived?: boolean;
}

export interface CaseArgs {
  caseId: number;
}

/** 読んだ資料。付けると画面に「自動で入った欄」の印と出典が出る。 */
export interface SourcedArgs {
  source?: IntakeSourceInput;
}

export interface CreateCaseArgs extends CaseProfileInput, SourcedArgs {
  commit?: boolean;
}

export interface SetFieldsArgs extends CaseArgs, SourcedArgs {
  values: FieldValueInput[];
  commit?: boolean;
}

export interface SideInput {
  side: string;
  rows: RowInput[];
}

export interface ImportRowsArgs extends CaseArgs, SourcedArgs {
  rowTable: string;
  sides: SideInput[];
  commit?: boolean;
}

function caseData(data: unknown): CaseData {
  return (data ?? {}) as CaseData;
}

/**
 * 案件を作るときに書く欄（会社名・課税時期の4欄…）。出典を付けると画面で印が付くので、
 * 「相続開始の通知から読んだ課税時期」も人の確認待ちとして一覧に出る。
 */
function profileTargets(data: CaseData): IntakeTarget[] {
  const targets: IntakeTarget[] = [];
  for (const [table, fields] of Object.entries(data)) {
    for (const [field, value] of Object.entries(fields)) {
      targets.push({ key: storageKey(table, field), filled: value !== '' });
    }
  }
  return targets;
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
  const record = buildIntakeRecord(args.source);

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
  if (args.commit !== true) {
    return renderCaseProfile(profile, { kind: 'dry', archived }, record);
  }

  const { data } = applyIntake(catalog, profile.data, profileTargets(profile.data), record);
  const created = await api.postCase({
    companyName: profile.companyName,
    taxPeriod: profile.taxPeriod,
    data,
  });
  return renderCaseProfile(profile, { kind: 'created', caseId: created.id, archived }, record);
}

/** 案件1件の現在値。辞書に載っている欄と明細行の表だけを返す。 */
export async function getCase(api: SvfApi, args: CaseArgs): Promise<string> {
  const catalog = await api.getCatalog();
  const found = await api.getCase(args.caseId);
  const data = caseData(found.data);

  const rowTables = catalog.rowTables.map((rowTable) => ({
    rowTable: rowTable.id,
    form: rowTable.form,
    table: rowTable.table,
    // 続紙の枚数も見せる（行は入っているのに枚数が足りない案件を見分けるため）
    pages: data[rowTable.table]?.[rowTable.pages.field] ?? String(rowTable.pages.base),
    sides: rowTable.sides.map((side) => ({
      side: side.key,
      label: side.label,
      rows: readRows(rowTable, data, side.prefix).map((row) => ({ row: row.row, ...row.values })),
    })),
  }));

  return renderJson({
    caseId: found.id,
    companyName: found.companyName,
    taxPeriod: found.taxPeriod,
    updatedAt: found.updatedAt,
    // どの欄を外から入れたか（画面でも印が出ている）。人が直した欄・確認した欄は
    // 画面が落とす・confirmed を立てるので、ここに残っているのが確認待ち。
    intake: readIntake(catalog, data),
    // 資料からは決まらないので人が画面で入れるもの（取込の最後にこれを報告する）
    manualItems: catalog.manualItems ?? [],
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
  const record = buildIntakeRecord(args.source);

  // 取得から書き戻しまでを他の書き込みと重ねない（withCaseLock の説明を参照）。
  return withCaseLock(args.caseId, async () => {
    const found = await api.getCase(args.caseId);
    const applied = applyFieldValues(catalog, caseData(found.data), args.values);
    const { changes } = applied;

    if (args.commit !== true) return renderFieldChanges(changes, false, record);

    const targets: IntakeTarget[] = changes.map((c) => ({ key: c.key, filled: c.after !== '' }));
    const { data } = applyIntake(catalog, applied.data, targets, record);

    await api.putCase(args.caseId, {
      companyName: found.companyName,
      taxPeriod: found.taxPeriod,
      data,
    });
    return renderFieldChanges(changes, true, record);
  });
}

/** 明細行の表（第5表の資産・負債、第1表の1 の株主）を入れ替える。 */
export async function importRows(api: SvfApi, args: ImportRowsArgs): Promise<string> {
  const catalog = await api.getCatalog();
  const rowTable = findRowTable(catalog, args.rowTable);
  const record = buildIntakeRecord(args.source);

  if (args.sides.length === 0) throw new InputError('取り込む側が指定されていません');

  const input: Record<string, RowInput[]> = {};
  for (const entry of args.sides) {
    const key = String(entry.side).trim();
    if (!rowTable.sides.some((s) => s.key === key)) {
      const keys = rowTable.sides.map((s) => `${s.key}（${s.label}）`).join(' / ');
      throw new InputError(
        `${entry.side} という側は${rowTable.form}にはありません。指定できるのは ${keys}`,
      );
    }
    if (input[key] !== undefined) {
      throw new InputError(`${key} が2回指定されています。1回にまとめてください`);
    }
    input[key] = entry.rows;
  }

  return withCaseLock(args.caseId, async () => {
    const found = await api.getCase(args.caseId);
    const applied = applyRows(catalog, caseData(found.data), rowTable.id, input);
    const { sides, pages } = applied;

    if (args.commit !== true) return renderRowSides(rowTable, sides, pages, false, record);

    const { data } = applyIntake(catalog, applied.data, applied.intakeTargets, record);

    await api.putCase(args.caseId, {
      companyName: found.companyName,
      taxPeriod: found.taxPeriod,
      data,
    });
    return renderRowSides(rowTable, sides, pages, true, record);
  });
}
