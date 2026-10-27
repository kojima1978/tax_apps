import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MasterCategory } from './masterDefaults.js';

type Db = typeof import('./db.js');

let workDir: string;
let db: Db;
let migrations: typeof import('./masterMigrations.js');
let seeds: typeof import('./masterDefaults.js')['MASTER_SEEDS'];

const POA_ID = 'power_of_attorney';

/** 委任状を足す前の版のシード（＝既存の PC の DB に入っている形） */
const withoutPoa = (categories: MasterCategory[]): MasterCategory[] =>
  categories.map((category) => ({ ...category, documents: category.documents.filter((doc) => doc.id !== POA_ID) }));

const readMaster = (code: string) => {
  const row = db.getDb().prepare('SELECT * FROM document_masters WHERE code = ?').get(code) as import('./db.js').DocumentMasterRow;
  return {
    version: row.version,
    draft: JSON.parse(row.draft_json) as MasterCategory[],
    published: JSON.parse(row.published_json) as MasterCategory[],
  };
};

const poaPlaces = (categories: MasterCategory[]) =>
  categories.flatMap((category) => category.documents.filter((doc) => doc.id === POA_ID).map(() => category.id));

beforeEach(async () => {
  workDir = mkdtempSync(join(tmpdir(), 'master-migrations-test-'));
  process.env.DATABASE_PATH = join(workDir, 'masters.sqlite');
  vi.resetModules();
  db = await import('./db.js');
  migrations = await import('./masterMigrations.js');
  seeds = (await import('./masterDefaults.js')).MASTER_SEEDS;
});

afterEach(() => {
  db.closeDb();
  delete process.env.DATABASE_PATH;
  rmSync(workDir, { recursive: true, force: true });
});

describe('委任状を書類マスタへ足すマイグレーション', () => {
  it('既存の DB では相続税の「マイナンバー・印鑑証明書」の末尾へ足し、版を上げて履歴を残す', () => {
    db.seedDocumentMastersIfEmpty(seeds.map((seed) => ({ ...seed, categories: withoutPoa(seed.categories) })));
    migrations.runMasterMigrations();

    const master = readMaster('inheritance-tax');
    expect(master.version).toBe(2);
    expect(poaPlaces(master.published)).toEqual(['identity']);
    expect(poaPlaces(master.draft)).toEqual(['identity']);
    expect(master.published.find((category) => category.id === 'identity')?.documents.at(-1)?.id).toBe(POA_ID);

    const versions = db.getDb().prepare("SELECT version FROM document_master_versions WHERE master_code = 'inheritance-tax' ORDER BY version").all();
    expect(versions).toEqual([{ version: 1 }, { version: 2 }]);
    const log = db.getDb().prepare("SELECT action, actor FROM audit_logs WHERE target_id = 'inheritance-tax'").get();
    expect(log).toMatchObject({ action: 'publish', actor: expect.stringContaining('システム') });

    // ほかの種別には足さない
    expect(readMaster('simplified').version).toBe(1);
    expect(poaPlaces(readMaster('simplified').published)).toEqual([]);
  });

  it('新しい DB はシードに入っているので何もしない。2回目も何もしない', () => {
    db.seedDocumentMastersIfEmpty(seeds);
    migrations.runMasterMigrations();
    migrations.runMasterMigrations();
    const master = readMaster('inheritance-tax');
    expect(master.version).toBe(1);
    expect(poaPlaces(master.published)).toEqual(['identity']);
  });

  it('一度流したあとに利用者が消した委任状は、起動し直しても足し戻さない', () => {
    db.seedDocumentMastersIfEmpty(seeds.map((seed) => ({ ...seed, categories: withoutPoa(seed.categories) })));
    migrations.runMasterMigrations();
    const removed = JSON.stringify(withoutPoa(readMaster('inheritance-tax').published));
    db.getDb().prepare("UPDATE document_masters SET draft_json = ?, published_json = ? WHERE code = 'inheritance-tax'").run(removed, removed);

    migrations.runMasterMigrations();
    expect(poaPlaces(readMaster('inheritance-tax').published)).toEqual([]);
  });

  it('名前に「委任状」を含む書類を自分で足してあれば、二重には足さない', () => {
    const own = withoutPoa(seeds.find((seed) => seed.code === 'inheritance-tax')!.categories);
    own[1] = { ...own[1], documents: [...own[1].documents, { id: 'custom_1', name: '委任状（金融機関用）', description: '', howToGet: '', canDelegate: false }] };
    expect(migrations.withPowerOfAttorney(own)).toBeNull();
  });
});

describe('委任者の被相続人欄を被相続人DBへ写すマイグレーション', () => {
  /** 被相続人DBを作る前の形（deceased_name 列がある版）を再現する */
  const withLegacyColumn = () => {
    const columns = db.getDb().prepare('PRAGMA table_info(poa_principals)').all() as { name: string }[];
    if (!columns.some((column) => column.name === 'deceased_name')) {
      db.getDb().exec("ALTER TABLE poa_principals ADD COLUMN deceased_name TEXT NOT NULL DEFAULT ''");
    }
  };
  const insertPrincipal = (name: string, deceasedName: string, deleted = false) => {
    withLegacyColumn();
    return Number(db.getDb().prepare('INSERT INTO poa_principals (name, deceased_name, deleted_at) VALUES (?, ?, ?)')
      .run(name, deceasedName, deleted ? '2026-10-01 00:00:00' : null).lastInsertRowid);
  };
  const hasLegacyColumn = () =>
    (db.getDb().prepare('PRAGMA table_info(poa_principals)').all() as { name: string }[])
      .some((column) => column.name === 'deceased_name');
  const deceasedRows = () => db.getDb().prepare('SELECT id, name FROM poa_deceased ORDER BY id').all() as { id: number; name: string }[];
  const heirsOf = (deceasedId: number) => (db.getDb().prepare(`
    SELECT p.name FROM poa_deceased_heirs h JOIN poa_principals p ON p.id = h.principal_id WHERE h.deceased_id = ? ORDER BY p.id
  `).all(deceasedId) as { name: string }[]).map((row) => row.name);

  it('同じ名前（空白・全角半角の違いは無視）を1人にまとめてつなぐ。ゴミ箱の中もつなぎ、写したら列を落とす', () => {
    insertPrincipal('架空 太郎', '架空 一郎');
    insertPrincipal('架空 花子', '架空一郎');
    insertPrincipal('架空 次郎', '架空 花江', true);
    insertPrincipal('仮名 三郎', '');
    migrations.runMasterMigrations();

    const rows = deceasedRows();
    expect(rows.map((row) => row.name)).toEqual(['架空 一郎', '架空 花江']);
    expect(heirsOf(rows[0].id)).toEqual(['架空 太郎', '架空 花子']);
    expect(heirsOf(rows[1].id)).toEqual(['架空 次郎']);
    // 列は落ちる（二重持ちを残さない）。元の書き方は操作履歴に残る
    expect(hasLegacyColumn()).toBe(false);
    const log = db.getDb().prepare("SELECT action, actor FROM audit_logs WHERE target_type = 'poa_deceased' ORDER BY id").all();
    expect(log).toEqual([
      { action: 'create', actor: expect.stringContaining('システム') },
      { action: 'create', actor: expect.stringContaining('システム') },
    ]);
  });

  it('2回目は何もしない（外したつながりや消した被相続人を戻さない）', () => {
    insertPrincipal('架空 太郎', '架空 一郎');
    migrations.runMasterMigrations();
    db.getDb().prepare('DELETE FROM poa_deceased_heirs').run();
    // 列を足し戻しても、1回写した印があるので二度目は写さない（落とすだけ）
    insertPrincipal('架空 花子', '架空 花江');

    migrations.runMasterMigrations();
    expect(hasLegacyColumn()).toBe(false);
    expect(deceasedRows().map((row) => row.name)).toEqual(['架空 一郎']);
    expect(heirsOf(deceasedRows()[0].id)).toEqual([]);
  });

  it('列が無い（＝新しい）DB では何もしない', () => {
    migrations.runMasterMigrations();
    expect(hasLegacyColumn()).toBe(false);
    expect(deceasedRows()).toEqual([]);
    expect(db.getDb().prepare("SELECT 1 FROM app_migrations WHERE name = 'poa-deceased-from-principals'").get()).toBeUndefined();
  });
});
