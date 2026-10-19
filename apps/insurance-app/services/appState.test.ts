import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// lib/db.ts は読み込んだ時点で DATABASE_PATH を決めるので、環境変数を先に
// 使い捨てのファイルへ向けてから動的に import する。以前のスクリプトは
// 稼働中のサーバ（本物の DB）にケースを作って消していた。
const workDir = mkdtempSync(join(tmpdir(), 'insurance-app-test-'));
process.env.DATABASE_PATH = join(workDir, 'insurance.sqlite');

type Services = typeof import('./appState') & typeof import('./cases') & typeof import('@/lib/db');
let svc: Services;

beforeAll(async () => {
  svc = {
    ...(await import('./appState')),
    ...(await import('./cases')),
    ...(await import('@/lib/db')),
  };
});

afterAll(() => {
  svc?.closeDb();
  rmSync(workDir, { recursive: true, force: true });
});

describe('resetToSample', () => {
  it('サンプルの家族4人・契約9件を入れ、契約の参照先がすべて実在する', () => {
    const { id } = svc.createCase();
    const state = svc.resetToSample(id);

    expect(state.familyMembers).toHaveLength(4);
    expect(state.policies).toHaveLength(9);

    const memberIds = new Set(state.familyMembers.map(member => member.id));
    expect(memberIds.size).toBe(state.familyMembers.length);
    expect(new Set(state.policies.map(policy => policy.id)).size).toBe(state.policies.length);
    expect(state.policies.every(policy => memberIds.has(policy.insuredId))).toBe(true);
    expect(state.policies.every(policy => !policy.beneficiaryId || memberIds.has(policy.beneficiaryId))).toBe(true);
  });

  it('2回続けて入れ直しても件数は増えない', () => {
    const { id } = svc.createCase();
    svc.resetToSample(id);
    const state = svc.resetToSample(id);

    expect(state.familyMembers).toHaveLength(4);
    expect(state.policies).toHaveLength(9);
  });

  it('ほかのケースには触らない', () => {
    const other = svc.createCase();
    const before = svc.getAppState(other.id);

    const { id } = svc.createCase();
    svc.resetToSample(id);

    expect(svc.getAppState(other.id)).toEqual(before);
    expect(svc.listCases().map(c => c.id)).toEqual(expect.arrayContaining([other.id, id]));
  });

  it('ケースを消すと家族・契約も残らない', () => {
    const { id } = svc.createCase();
    svc.resetToSample(id);

    expect(svc.deleteCase(id)).toBe(true);
    expect(svc.getAppState(id)).toBeNull();
    expect(svc.listCases().some(c => c.id === id)).toBe(false);
  });
});
