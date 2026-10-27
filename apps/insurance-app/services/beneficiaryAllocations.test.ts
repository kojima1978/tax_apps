import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BeneficiaryAllocation } from '@/types';

// lib/db.ts は読み込んだ時点で DATABASE_PATH を決めるので、テストごとに
// 使い捨てのファイルへ向けてから動的に import する。旧スキーマからの移行を
// 見るため、開き直し（= マイグレーションのやり直し）も1件ごとに行う。
type Services = typeof import('./appState') & typeof import('./cases') & typeof import('@/lib/db');
let workDir: string;
let dbPath: string;
let svc: Services;

const load = async (): Promise<Services> => {
  vi.resetModules();
  return {
    ...(await import('./appState')),
    ...(await import('./cases')),
    ...(await import('@/lib/db')),
  };
};

/** コンテナ外から直接 SQLite を触るために閉じ、終わったら開き直す（＝移行をもう一度通す） */
const withRawDb = async (edit: (raw: Database.Database) => void): Promise<void> => {
  svc.closeDb();
  const raw = new Database(dbPath);
  raw.pragma('foreign_keys = ON');
  try {
    edit(raw);
  } finally {
    raw.close();
  }
  svc = await load();
};

const allocationsOf = (caseId: string, policyId: string): BeneficiaryAllocation[] =>
  svc.getAppState(caseId)!.policies.find(policy => policy.id === policyId)!.beneficiaryAllocations ?? [];

beforeEach(async () => {
  workDir = mkdtempSync(join(tmpdir(), 'insurance-beneficiaries-test-'));
  dbPath = join(workDir, 'insurance.sqlite');
  process.env.DATABASE_PATH = dbPath;
  svc = await load();
});

afterEach(() => {
  svc?.closeDb();
  delete process.env.DATABASE_PATH;
  rmSync(workDir, { recursive: true, force: true });
});

describe('受取割合を policy_beneficiaries で持つ', () => {
  it('複数人の受取割合を保存し、並び順ごと読み戻す', () => {
    const { id } = svc.createCase();
    const state = svc.resetToSample(id);
    const [first, second, third] = state.familyMembers.map(member => member.id);
    const policy = state.policies.find(p => (p.beneficiaryAllocations ?? []).length > 0)!;

    policy.beneficiaryAllocations = [
      { beneficiaryId: third, percentage: 50 },
      { beneficiaryId: first, percentage: 30 },
      { beneficiaryId: second, percentage: 20 },
    ];
    const saved = svc.saveAppState(id, state);

    expect(saved.policies.find(p => p.id === policy.id)!.beneficiaryAllocations).toEqual([
      { beneficiaryId: third, percentage: 50 },
      { beneficiaryId: first, percentage: 30 },
      { beneficiaryId: second, percentage: 20 },
    ]);
    const rows = svc.getDb().prepare('SELECT COUNT(*) AS n FROM policy_beneficiaries WHERE policy_id = ?').get(policy.id) as { n: number };
    expect(rows.n).toBe(3);
  });

  it('家族情報に居ない受取人は保存しない（保存そのものは通す）', () => {
    const { id } = svc.createCase();
    const state = svc.resetToSample(id);
    const member = state.familyMembers[0].id;
    const policy = state.policies.find(p => (p.beneficiaryAllocations ?? []).length > 0)!;

    policy.beneficiaryAllocations = [
      { beneficiaryId: member, percentage: 60 },
      { beneficiaryId: 'いない人', percentage: 40 },
    ];
    const saved = svc.saveAppState(id, state);

    expect(saved.policies.find(p => p.id === policy.id)!.beneficiaryAllocations)
      .toEqual([{ beneficiaryId: member, percentage: 60 }]);
  });

  it('入れ替えると前の受取人は残らない', () => {
    const { id } = svc.createCase();
    const state = svc.resetToSample(id);
    const [first, second] = state.familyMembers.map(member => member.id);
    const policy = state.policies.find(p => (p.beneficiaryAllocations ?? []).length > 0)!;

    policy.beneficiaryAllocations = [{ beneficiaryId: first, percentage: 100 }];
    svc.saveAppState(id, state);
    policy.beneficiaryAllocations = [{ beneficiaryId: second, percentage: 100 }];
    svc.saveAppState(id, state);

    expect(allocationsOf(id, policy.id)).toEqual([{ beneficiaryId: second, percentage: 100 }]);
  });
});

describe('旧版の JSON 列からの移行', () => {
  it('JSON 列の値を表へ写して列を落とす。居ない受取人は運ばない', async () => {
    const { id } = svc.createCase();
    const state = svc.resetToSample(id);
    const [first, second] = state.familyMembers.map(member => member.id);
    const policy = state.policies.find(p => (p.beneficiaryAllocations ?? []).length > 0)!;
    const legacy = JSON.stringify([
      { beneficiaryId: second, percentage: 70 },
      { beneficiaryId: first, percentage: 30 },
      { beneficiaryId: 'いない人', percentage: 10 },
    ]);

    await withRawDb((raw) => {
      raw.exec('ALTER TABLE policies ADD COLUMN beneficiary_allocations TEXT');
      raw.prepare('DELETE FROM policy_beneficiaries').run();
      raw.prepare('UPDATE policies SET beneficiary_allocations = ? WHERE id = ?').run(legacy, policy.id);
    });

    const columns = svc.getDb().prepare('PRAGMA table_info(policies)').all() as { name: string }[];
    expect(columns.some(column => column.name === 'beneficiary_allocations')).toBe(false);
    expect(allocationsOf(id, policy.id)).toEqual([
      { beneficiaryId: second, percentage: 70 },
      { beneficiaryId: first, percentage: 30 },
    ]);
  });

  it('JSON 列が空だった古い契約は単一受取人を100%として入れ、複数人の契約には足さない', async () => {
    const { id } = svc.createCase();
    const state = svc.resetToSample(id);
    const [first, second] = state.familyMembers.map(member => member.id);
    const multi = state.policies.find(p => (p.beneficiaryAllocations ?? []).length > 0)!;
    const single = state.policies.find(p => p.id !== multi.id && p.beneficiaryId)!;
    multi.beneficiaryAllocations = [
      { beneficiaryId: first, percentage: 60 },
      { beneficiaryId: second, percentage: 40 },
    ];
    svc.saveAppState(id, state);
    const legacy = JSON.stringify(multi.beneficiaryAllocations);

    // 受取人が1人だけの時期の形: JSON 列は NULL で、単一受取人の列にしか入っていない
    await withRawDb((raw) => {
      raw.exec('ALTER TABLE policies ADD COLUMN beneficiary_allocations TEXT');
      raw.prepare('DELETE FROM policy_beneficiaries').run();
      raw.prepare('UPDATE policies SET beneficiary_allocations = ? WHERE id = ?').run(legacy, multi.id);
    });

    expect(allocationsOf(id, single.id)).toEqual([{ beneficiaryId: single.beneficiaryId, percentage: 100 }]);
    // 複数人の契約へ100%の行が1つ余計に入っていないこと（＝移行より後に補完している）
    expect(allocationsOf(id, multi.id)).toEqual([
      { beneficiaryId: first, percentage: 60 },
      { beneficiaryId: second, percentage: 40 },
    ]);
    const orphans = svc.getDb().prepare(`
      SELECT COUNT(*) AS n FROM policies p
      WHERE p.beneficiary_member_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM policy_beneficiaries b WHERE b.policy_id = p.id)
    `).get() as { n: number };
    expect(orphans.n).toBe(0);
  });

  it('壊れた JSON の契約は単一受取人（beneficiary_member_id）へ落ちる', async () => {
    const { id } = svc.createCase();
    const state = svc.resetToSample(id);
    const policy = state.policies.find(p => p.beneficiaryId)!;

    await withRawDb((raw) => {
      raw.exec('ALTER TABLE policies ADD COLUMN beneficiary_allocations TEXT');
      raw.prepare('DELETE FROM policy_beneficiaries').run();
      raw.prepare('UPDATE policies SET beneficiary_allocations = ? WHERE id = ?').run('not-json', policy.id);
    });

    expect(allocationsOf(id, policy.id)).toEqual([{ beneficiaryId: policy.beneficiaryId, percentage: 100 }]);
  });
});
