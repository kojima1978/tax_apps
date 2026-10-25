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
