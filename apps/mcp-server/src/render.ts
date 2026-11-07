/**
 * 返す文面の組み立て。
 *
 * 書き込み系は「何がどう変わるか」を先に出す。差分を読まずに確定できてしまうと、
 * 試算を既定にしている意味が無くなるため。
 */
import type { CaseProfile } from './caseIdentity.js';
import type { FieldCatalog, FieldChange } from './catalog.js';
import type { BalanceRow, SideChange } from './table5.js';

/**
 * 画面の自動保存は同じ PUT /cases/:id を叩く。案件を開いたまま外から書くと、
 * ブラウザが持っている古い入力で上書きされて、書いたはずの数字が消える。
 */
export const AUTOSAVE_WARNING =
  '※ この案件を画面で開いたままだと、ブラウザの自動保存に上書きされます。'
  + '取込は画面を閉じた状態で行い、終わってから開き直してください。';

const EMPTY = '（空欄）';

function show(value: string): string {
  return value === '' ? EMPTY : value;
}

function unit(value: string | undefined): string {
  return value === undefined ? '' : ` ${value}`;
}

function heading(count: number, commit: boolean): string {
  return commit
    ? `${count}件を書き込みました。`
    : `${count}件を書き込めます（これは試算です。確定するには commit: true を付けて呼び直してください）。`;
}

export function renderFieldChanges(changes: readonly FieldChange[], commit: boolean): string {
  const changed = changes.filter((c) => c.changed);
  const same = changes.length - changed.length;

  const lines = [heading(changed.length, commit)];
  if (same > 0) lines.push(`（${same}件は現在の値と同じでした）`);
  lines.push('');

  for (const change of changes) {
    const where = change.period === undefined ? '' : `（${change.period}）`;
    const mark = change.changed ? '  ' : '= ';
    lines.push(
      `${mark}${change.code} ${change.label}${where}: `
      + `${show(change.before)} → ${show(change.after)}${unit(change.unit)}`,
    );
  }

  lines.push('');
  lines.push(AUTOSAVE_WARNING);
  return lines.join('\n');
}

function renderRow(row: BalanceRow): string {
  const note = row.note === '' ? '' : `  [${row.note}]`;
  return `  ${String(row.row).padStart(3, ' ')}. ${row.name}  相続税評価額 ${show(row.evaluated)} / 帳簿価額 ${show(row.book)}${note}`;
}

export function renderBalanceSides(sides: readonly SideChange[], commit: boolean): string {
  const total = sides.reduce((n, side) => n + side.after.length, 0);
  const lines = [
    commit
      ? `第5表の明細を入れ替えました（合計 ${total} 行）。`
      : `第5表の明細を入れ替えます（合計 ${total} 行。これは試算です。確定するには commit: true を付けて呼び直してください）。`,
  ];

  for (const side of sides) {
    lines.push('');
    lines.push(`【${side.label}】 ${side.before.length} 行 → ${side.after.length} 行`);
    if (side.before.length > 0) {
      lines.push(`  取込前（すべて消えます）: ${side.before.map((r) => r.name).join('、')}`);
    }
    for (const row of side.after) lines.push(renderRow(row));
  }

  lines.push('');
  lines.push('※ 指定した側は1行目から詰め直します。指定しなかった側はそのままです。');
  lines.push(AUTOSAVE_WARNING);
  return lines.join('\n');
}

/** 案件を作る道具の結果。どれも「作ったか・作らなかったか」が1行目で分かるようにする。 */
export type CreateCaseOutcome =
  | { kind: 'existing'; caseId: number; updatedAt: string }
  | { kind: 'dry'; archived: number[] }
  | { kind: 'created'; caseId: number; archived: number[] };

export function renderCaseProfile(profile: CaseProfile, outcome: CreateCaseOutcome): string {
  const lines: string[] = [];
  if (outcome.kind === 'existing') {
    lines.push('すでに同じ会社・同じ課税時期の案件があります。新しくは作りません。');
  } else if (outcome.kind === 'created') {
    lines.push('案件を作りました。');
  } else {
    lines.push('案件を作れます（これは試算です。確定するには commit: true を付けて呼び直してください）。');
  }

  lines.push('');
  if (outcome.kind !== 'dry') lines.push(`  caseId: ${outcome.caseId}`);
  lines.push(`  会社名: ${show(profile.companyName)}`);
  for (const date of profile.dates) lines.push(`  ${date.label}: ${show(date.text)}`);
  if (outcome.kind === 'existing') lines.push(`  最終更新: ${outcome.updatedAt}`);

  if (outcome.kind !== 'existing') {
    // 書く欄まで見せる（見出しが欄から作られるので、ここが空だと一覧で見分けられなくなる）
    for (const [table, fields] of Object.entries(profile.data)) {
      const shown = Object.entries(fields).map(([field, value]) => `${field}=${show(value)}`);
      lines.push('');
      lines.push(`  ${table} へ入る欄: ${shown.join(' / ')}`);
    }
  }

  if (outcome.kind !== 'existing' && outcome.archived.length > 0) {
    lines.push('');
    lines.push(
      `※ 同じ会社・同じ課税時期の案件がゴミ箱にあります（caseId: ${outcome.archived.join('、')}）。`
      + '戻して使うなら画面から復元してください。',
    );
  }

  if (profile.notes.length > 0) {
    lines.push('');
    lines.push('人が画面で入れる欄:');
    for (const note of profile.notes) lines.push(`  - ${note}`);
  }

  lines.push('');
  lines.push(
    outcome.kind === 'dry'
      ? '※ 作る前に、会社名が決算書の表紙どおりか・課税時期が相続開始の日かを確かめてください。'
      : 'この caseId へ set_fields / import_balance_sheet で入れてください。',
  );
  return lines.join('\n');
}

/** 辞書はそのまま渡す（読むのはAIなので、整形より欠けが無いことを優先する）。 */
export function renderCatalog(catalog: FieldCatalog): string {
  return JSON.stringify(catalog, null, 2);
}

export function renderJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
