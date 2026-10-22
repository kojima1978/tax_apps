import type Database from 'better-sqlite3';
import {
  parseCompanyInput,
  parseDepartmentInput,
  parseStaffInput,
  parseStaffPersonalInput,
  type CompanyInput,
  type DepartmentInput,
  type Result,
  type StaffInput,
  type StaffPersonalInput,
} from './normalize.js';
import { SCHEMA_VERSION } from './db.js';

// 台帳まるごとの JSON 控え（画面の「JSONで書き出し」「JSONから復元」）。
// 夜間の backup.sh は SQLite のファイルごと取るので、こちらは手で持ち運ぶための写し。
//
// 台帳ID（staff.id）と部署・会社の id はそのまま書き出し、復元でもそのまま戻す ──
// 各アプリはこの番号で人と部署を参照しているので、振り直すと別人を指すようになる。
// 住所・生年月日も入る（台帳の外へ出る唯一の経路なので、ファイルの扱いには注意）。

const FORMAT = 'staff-directory-backup';
/** ファイルの形の版。DB の版（SCHEMA_VERSION）とは別に持ち、形を変えたら上げて古い版も読めるようにする */
const BACKUP_VERSION = 1;

const SEQUENCED_TABLES = ['companies', 'departments', 'staff'] as const;
type SequencedTable = (typeof SEQUENCED_TABLES)[number];

type ExportedAffiliation = { companyId: number; departmentId: number | null; employeeNo: string | null; isPrimary: boolean };

export type DirectoryBackup = {
  format: typeof FORMAT;
  version: number;
  schemaVersion: number;
  exportedAt: string;
  /** AUTOINCREMENT の続き番号。消した部署などの番号を、戻した後に別のものへ使い回さないため */
  sequences: Record<SequencedTable, number>;
  companies: (CompanyInput & { id: number; createdAt: string; updatedAt: string })[];
  departments: (Omit<DepartmentInput, 'companyId'> & { id: number; companyId: number; createdAt: string; updatedAt: string })[];
  staff: {
    id: number;
    familyName: string;
    givenName: string;
    familyKana: string;
    givenKana: string;
    mobilePhone: string;
    retiredOn: string | null;
    postalCode: string;
    address: string;
    birthDate: string | null;
    affiliations: ExportedAffiliation[];
    createdAt: string;
    updatedAt: string;
  }[];
  externalLinks: { app: string; entity: 'staff' | 'department'; externalId: string; localId: number; createdAt: string }[];
};

/** 件数の要約。復元の前に「今」と「ファイル」を並べて見せる */
export type DirectorySummary = {
  companies: number;
  departments: number;
  staff: number;
  activeStaff: number;
  withPersonal: number;
  externalLinks: number;
};

export function exportDirectory(db: Database.Database): DirectoryBackup {
  const seqOf = db.prepare('SELECT seq FROM sqlite_sequence WHERE name = ?').pluck();
  const sequences = Object.fromEntries(
    SEQUENCED_TABLES.map((t) => [t, Number(seqOf.get(t) ?? 0)]),
  ) as Record<SequencedTable, number>;

  const affiliations = db
    .prepare(
      `SELECT staff_id, company_id, department_id, employee_no, is_primary
       FROM staff_affiliations ORDER BY staff_id, is_primary DESC, company_id`,
    )
    .all() as { staff_id: number; company_id: number; department_id: number | null; employee_no: string | null; is_primary: number }[];
  const byStaff = new Map<number, ExportedAffiliation[]>();
  for (const a of affiliations) {
    const list = byStaff.get(a.staff_id) ?? [];
    list.push({ companyId: a.company_id, departmentId: a.department_id, employeeNo: a.employee_no, isPrimary: a.is_primary === 1 });
    byStaff.set(a.staff_id, list);
  }

  return {
    format: FORMAT,
    version: BACKUP_VERSION,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    sequences,
    companies: (
      db.prepare('SELECT * FROM companies ORDER BY id').all() as Record<string, string & number>[]
    ).map((r) => ({
      id: r.id,
      name: r.name,
      shortName: r.short_name,
      postalCode: r.postal_code,
      address: r.address,
      phone: r.phone,
      fax: r.fax,
      sortOrder: r.sort_order,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
    departments: (
      db.prepare('SELECT * FROM departments ORDER BY id').all() as Record<string, string & number>[]
    ).map((r) => ({
      id: r.id,
      companyId: r.company_id,
      name: r.name,
      sortOrder: r.sort_order,
      active: r.active === 1,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
    staff: (db.prepare('SELECT * FROM staff ORDER BY id').all() as Record<string, string & number>[]).map((r) => ({
      id: r.id,
      familyName: r.family_name,
      givenName: r.given_name,
      familyKana: r.family_kana,
      givenKana: r.given_kana,
      mobilePhone: r.mobile_phone,
      retiredOn: r.retired_on,
      postalCode: r.postal_code,
      address: r.address,
      birthDate: r.birth_date,
      affiliations: byStaff.get(r.id) ?? [],
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
    externalLinks: (
      db.prepare('SELECT * FROM external_links ORDER BY app, entity, external_id').all() as Record<string, string & number>[]
    ).map((r) => ({
      app: r.app,
      entity: r.entity as 'staff' | 'department',
      externalId: r.external_id,
      localId: r.local_id,
      createdAt: r.created_at,
    })),
  };
}

export function summarizeDirectory(db: Database.Database): DirectorySummary {
  const count = (sql: string) => Number(db.prepare(sql).pluck().get());
  return {
    companies: count('SELECT count(*) FROM companies'),
    departments: count('SELECT count(*) FROM departments'),
    staff: count('SELECT count(*) FROM staff'),
    activeStaff: count('SELECT count(*) FROM staff WHERE retired_on IS NULL'),
    withPersonal: count(
      `SELECT count(*) FROM staff WHERE postal_code <> '' OR address <> '' OR birth_date IS NOT NULL`,
    ),
    externalLinks: count('SELECT count(*) FROM external_links'),
  };
}

// ---- 読み込み ----

type Stamped = { createdAt: string | null; updatedAt: string | null };

export type ParsedBackup = {
  exportedAt: string;
  sequences: Record<SequencedTable, number>;
  companies: (CompanyInput & Stamped & { id: number })[];
  departments: (DepartmentInput & Stamped & { id: number; companyId: number })[];
  staff: (StaffInput & StaffPersonalInput & Stamped & { id: number })[];
  externalLinks: { app: string; entity: 'staff' | 'department'; externalId: string; localId: number; createdAt: string | null }[];
};

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = <T = never>(error: string): Result<T> => ({ ok: false, error });

const isId = (v: unknown): v is number => Number.isInteger(v) && (v as number) > 0;

// 日時は SQLite の datetime('now') の形だけ受け取り、それ以外は復元した時刻にする（弾くほどのものではない）
const stamp = (v: unknown): string | null =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(v) ? v : null;

function rows(b: Record<string, unknown>, key: string, label: string): Result<Record<string, unknown>[]> {
  const v = b[key];
  if (!Array.isArray(v) || v.some((r) => typeof r !== 'object' || r === null)) {
    return fail(`${label}の一覧が読めません`);
  }
  return ok(v as Record<string, unknown>[]);
}

// 1行ずつ画面と同じ検査（normalize.ts）を通す。ファイルを手で直した場合も、画面からは
// 入れられない値が台帳に入らないように。参照（部署の会社・所属の会社と部署）もここで確かめる ──
// DB の外部キーでも止まるが、それだと「どの行か」を言えない
export function parseBackup(body: unknown): Result<ParsedBackup> {
  if (typeof body !== 'object' || body === null) return fail('台帳の JSON ではありません');
  const b = body as Record<string, unknown>;
  if (b.format !== FORMAT) return fail('社員台帳から書き出した JSON ではありません');
  if (b.version !== BACKUP_VERSION) return fail(`この JSON の版（${String(b.version)}）には対応していません`);

  const companyRows = rows(b, 'companies', '会社');
  if (!companyRows.ok) return companyRows;
  const departmentRows = rows(b, 'departments', '部署');
  if (!departmentRows.ok) return departmentRows;
  const staffRows = rows(b, 'staff', '社員');
  if (!staffRows.ok) return staffRows;
  const linkRows = rows(b, 'externalLinks', '他アプリとの対応');
  if (!linkRows.ok) return linkRows;

  // 会社が無いと部署も所属も作れない（新しい DB にも1社は置いている）
  if (companyRows.value.length === 0) return fail('会社が1つもありません');

  const companies: ParsedBackup['companies'] = [];
  for (const r of companyRows.value) {
    if (!isId(r.id) || companies.some((c) => c.id === r.id)) return fail(`会社の id（${String(r.id)}）が正しくないか重複しています`);
    const parsed = parseCompanyInput(r);
    if (!parsed.ok) return fail(`会社（id ${r.id}）: ${parsed.error}`);
    if (companies.some((c) => c.name === parsed.value.name)) return fail(`会社「${parsed.value.name}」が2つあります`);
    companies.push({ ...parsed.value, id: r.id, createdAt: stamp(r.createdAt), updatedAt: stamp(r.updatedAt) });
  }
  const companyIds = new Set(companies.map((c) => c.id));

  const departments: ParsedBackup['departments'] = [];
  for (const r of departmentRows.value) {
    if (!isId(r.id) || departments.some((d) => d.id === r.id)) return fail(`部署の id（${String(r.id)}）が正しくないか重複しています`);
    const parsed = parseDepartmentInput(r);
    if (!parsed.ok) return fail(`部署（id ${r.id}）: ${parsed.error}`);
    const companyId = parsed.value.companyId;
    if (companyId === null || !companyIds.has(companyId)) return fail(`部署（id ${r.id}）: 会社が見つかりません`);
    departments.push({ ...parsed.value, companyId, id: r.id, createdAt: stamp(r.createdAt), updatedAt: stamp(r.updatedAt) });
  }
  const departmentCompany = new Map(departments.map((d) => [d.id, d.companyId]));

  const staff: ParsedBackup['staff'] = [];
  for (const r of staffRows.value) {
    if (!isId(r.id) || staff.some((s) => s.id === r.id)) return fail(`社員の台帳ID（${String(r.id)}）が正しくないか重複しています`);
    const parsed = parseStaffInput(r);
    if (!parsed.ok) return fail(`社員（台帳ID ${r.id}）: ${parsed.error}`);
    const personal = parseStaffPersonalInput(r);
    if (!personal.ok) return fail(`社員（台帳ID ${r.id}）: ${personal.error}`);
    for (const a of parsed.value.affiliations) {
      if (!companyIds.has(a.companyId)) return fail(`社員（台帳ID ${r.id}）: 所属の会社が見つかりません`);
      if (a.departmentId !== null && departmentCompany.get(a.departmentId) !== a.companyId) {
        return fail(`社員（台帳ID ${r.id}）: 所属の部署がその会社のものではありません`);
      }
    }
    staff.push({ ...parsed.value, ...personal.value, id: r.id, createdAt: stamp(r.createdAt), updatedAt: stamp(r.updatedAt) });
  }

  const externalLinks: ParsedBackup['externalLinks'] = [];
  for (const r of linkRows.value) {
    const externalId = typeof r.externalId === 'number' ? String(r.externalId) : r.externalId;
    if (
      typeof r.app !== 'string' || r.app === '' ||
      (r.entity !== 'staff' && r.entity !== 'department') ||
      typeof externalId !== 'string' || externalId === '' ||
      !isId(r.localId)
    ) {
      return fail('他アプリとの対応の行が読めません');
    }
    externalLinks.push({ app: r.app, entity: r.entity, externalId, localId: r.localId, createdAt: stamp(r.createdAt) });
  }

  const seq = (typeof b.sequences === 'object' && b.sequences !== null ? b.sequences : {}) as Record<string, unknown>;
  const sequences = Object.fromEntries(
    SEQUENCED_TABLES.map((t) => [t, Number.isInteger(seq[t]) && (seq[t] as number) > 0 ? (seq[t] as number) : 0]),
  ) as Record<SequencedTable, number>;

  return ok({
    exportedAt: typeof b.exportedAt === 'string' ? b.exportedAt : '',
    sequences,
    companies,
    departments,
    staff,
    externalLinks,
  });
}

// ---- 復元 ----

export type RestoreResult = { exportedAt: string; current: DirectorySummary; restored: DirectorySummary };

class DryRun extends Error {}

/**
 * 台帳の中身をまるごと入れ替える。1つのトランザクションなので、途中で何かに引っかかれば何も変わらない。
 * dryRun は同じ処理を最後まで流してから巻き戻す ── 確認画面で「復元できる」と出たものは、
 * 一意制約まで含めて本当に通る。
 */
export function restoreDirectory(db: Database.Database, backup: ParsedBackup, dryRun: boolean): Result<RestoreResult> {
  const current = summarizeDirectory(db);
  let restored: DirectorySummary | null = null;
  try {
    db.transaction(() => {
      const seqOf = db.prepare('SELECT seq FROM sqlite_sequence WHERE name = ?').pluck();
      const seqBefore = Object.fromEntries(SEQUENCED_TABLES.map((t) => [t, Number(seqOf.get(t) ?? 0)]));

      // 参照される側を後に消し、先に入れる（外部キーは有効のまま）
      db.exec(`
        DELETE FROM external_links;
        DELETE FROM staff_affiliations;
        DELETE FROM staff;
        DELETE FROM departments;
        DELETE FROM companies;
      `);

      const insertCompany = db.prepare(
        `INSERT INTO companies (id, name, short_name, postal_code, address, phone, fax, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, coalesce(?, datetime('now')), coalesce(?, datetime('now')))`,
      );
      for (const c of backup.companies) {
        insertCompany.run(c.id, c.name, c.shortName, c.postalCode, c.address, c.phone, c.fax, c.sortOrder, c.createdAt, c.updatedAt);
      }
      const insertDepartment = db.prepare(
        `INSERT INTO departments (id, company_id, name, sort_order, active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, coalesce(?, datetime('now')), coalesce(?, datetime('now')))`,
      );
      for (const d of backup.departments) {
        insertDepartment.run(d.id, d.companyId, d.name, d.sortOrder, d.active ? 1 : 0, d.createdAt, d.updatedAt);
      }
      const insertStaff = db.prepare(
        `INSERT INTO staff (id, family_name, given_name, family_kana, given_kana, mobile_phone, retired_on,
           postal_code, address, birth_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, coalesce(?, datetime('now')), coalesce(?, datetime('now')))`,
      );
      const insertAffiliation = db.prepare(
        `INSERT INTO staff_affiliations (staff_id, company_id, department_id, employee_no, is_primary) VALUES (?, ?, ?, ?, ?)`,
      );
      for (const s of backup.staff) {
        insertStaff.run(
          s.id, s.familyName, s.givenName, s.familyKana, s.givenKana, s.mobilePhone, s.retiredOn,
          s.postalCode, s.address, s.birthDate, s.createdAt, s.updatedAt,
        );
        for (const a of s.affiliations) {
          insertAffiliation.run(s.id, a.companyId, a.departmentId, a.employeeNo, a.isPrimary ? 1 : 0);
        }
      }
      const insertLink = db.prepare(
        `INSERT INTO external_links (app, entity, external_id, local_id, created_at)
         VALUES (?, ?, ?, ?, coalesce(?, datetime('now')))`,
      );
      for (const l of backup.externalLinks) insertLink.run(l.app, l.entity, l.externalId, l.localId, l.createdAt);

      // 続き番号は「今」と「ファイル」の大きいほう。書き出した後に足した人の台帳IDは、
      // 復元で台帳からは消えても他アプリの写しには残っているので、別の人に振り直してはいけない
      for (const t of SEQUENCED_TABLES) {
        const seq = Math.max(seqBefore[t], backup.sequences[t], Number(seqOf.get(t) ?? 0));
        db.prepare('DELETE FROM sqlite_sequence WHERE name = ?').run(t);
        if (seq > 0) db.prepare('INSERT INTO sqlite_sequence (name, seq) VALUES (?, ?)').run(t, seq);
      }

      restored = summarizeDirectory(db);
      if (dryRun) throw new DryRun();
    })();
  } catch (err) {
    if (!(err instanceof DryRun)) {
      const code = (err as { code?: string }).code ?? '';
      if (code.startsWith('SQLITE_CONSTRAINT')) {
        // 社員番号の重複など、行単位の検査では見ていない決まり
        return fail(`台帳の決まりに合わない行があるため復元できません（${(err as Error).message}）`);
      }
      throw err;
    }
  }
  return ok({ exportedAt: backup.exportedAt, current, restored: restored! });
}
