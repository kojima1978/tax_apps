import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// 金額の列は「契約通貨での額」1本になった（円の列 + foreign_* 列の対をやめた）。
// 旧スキーマからの移行は DB を開いた瞬間に走るので、lib/db.ts を使い捨てのファイルへ
// 向けて開き直しながら確かめる。
type Services = typeof import('./appState') & typeof import('./cases') & typeof import('@/lib/db');

const FOREIGN_COLUMNS = [
  'foreign_premium_amount',
  'foreign_death_benefit_disease',
  'foreign_death_benefit_accident',
  'foreign_hosp_day_disease',
  'foreign_hosp_day_accident',
  'foreign_diagnosis_benefit',
  'foreign_maturity_benefit',
];

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

/** 直接 SQLite を触るために閉じ、終わったら開き直す（＝移行をもう一度通す） */
const withRawDb = async (edit: (raw: Database.Database) => void): Promise<void> => {
  svc.closeDb();
  const raw = new Database(dbPath);
  try {
    edit(raw);
  } finally {
    raw.close();
  }
  svc = await load();
};

const columnsOf = (): string[] =>
  (svc.getDb().prepare('PRAGMA table_info(policies)').all() as { name: string }[]).map(column => column.name);

const userVersion = (): number => Number(svc.getDb().pragma('user_version', { simple: true }));

const policyRow = (policyId: string) =>
  svc.getDb().prepare('SELECT * FROM policies WHERE id = ?').get(policyId) as Record<string, number | string | null>;

/** 旧スキーマ（foreign_* 列あり・user_version 0）に戻し、外貨建ての1件を作る */
const makeLegacyForeignPolicy = async (policyId: string, rate: number): Promise<void> => {
  await withRawDb(raw => {
    for (const column of FOREIGN_COLUMNS) {
      raw.exec(`ALTER TABLE policies ADD COLUMN ${column} REAL NOT NULL DEFAULT 0`);
    }
    // 円の列は保存した時のレートで換算した写し。ここでは誰も維持していない状態
    // （= 外貨額 × 今のレートと食い違う値）を入れておく
    raw.prepare(`
      UPDATE policies
         SET currency = 'USD', exchange_rate = ?, payment_frequency = 'monthly',
             premium_amount = 99999, annual_premium = 888888, death_benefit_disease = 7777777,
             maturity_benefit = 666666,
             foreign_premium_amount = 1000, foreign_death_benefit_disease = 100000,
             foreign_maturity_benefit = 50000
       WHERE id = ?
    `).run(rate, policyId);
    raw.pragma('user_version = 0');
  });
};

beforeEach(async () => {
  workDir = mkdtempSync(join(tmpdir(), 'insurance-amounts-test-'));
  dbPath = join(workDir, 'insurance.sqlite');
  process.env.DATABASE_PATH = dbPath;
  svc = await load();
});

afterEach(() => {
  svc?.closeDb();
  delete process.env.DATABASE_PATH;
  rmSync(workDir, { recursive: true, force: true });
});

describe('金額の列を契約通貨へ畳む移行', () => {
  it('新しい DB には foreign_* 列が無く、版が記録されている', () => {
    const { id } = svc.createCase();
    svc.resetToSample(id);

    expect(columnsOf().filter(column => column.startsWith('foreign_'))).toEqual([]);
    expect(userVersion()).toBe(1);
  });

  it('旧スキーマの外貨建て契約は、円の列を外貨額で置き換える', async () => {
    const { id } = svc.createCase();
    const state = svc.resetToSample(id);
    const policyId = state.policies[0].id;

    await makeLegacyForeignPolicy(policyId, 140);
    // 開き直しで移行が走っている
    const row = policyRow(policyId);

    expect(columnsOf().filter(column => column.startsWith('foreign_'))).toEqual([]);
    expect(userVersion()).toBe(1);
    expect(row.premium_amount).toBe(1000);
    expect(row.death_benefit_disease).toBe(100000);
    expect(row.maturity_benefit).toBe(50000);
    // 年額保険料は保険料から導く列。月払なので12倍
    expect(row.annual_premium).toBe(12000);
    // 索引も作り直している
    const indexes = (svc.getDb().prepare(`SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'policies'`)
      .all() as { name: string }[]).map(index => index.name);
    expect(indexes).toContain('idx_policies_case_id_sort_order');
    expect(indexes).toContain('idx_policies_case_id_policy_number');
    expect(indexes).toContain('idx_policies_insured_member_id');
    expect(indexes).toContain('idx_policies_beneficiary_member_id');
  });

  it('円建ての契約は移行で変わらない', async () => {
    const { id } = svc.createCase();
    const state = svc.resetToSample(id);
    const target = state.policies.find(policy => policy.premiumAmount > 0)!;
    const before = policyRow(target.id);

    await withRawDb(raw => {
      for (const column of FOREIGN_COLUMNS) {
        raw.exec(`ALTER TABLE policies ADD COLUMN ${column} REAL NOT NULL DEFAULT 0`);
      }
      // 円建てなのに外貨の列に値が残っている（画面は読んでいない）状態
      raw.prepare('UPDATE policies SET foreign_premium_amount = 123 WHERE id = ?').run(target.id);
      raw.pragma('user_version = 0');
    });

    const after = policyRow(target.id);
    expect(after.premium_amount).toBe(before.premium_amount);
    expect(after.annual_premium).toBe(before.annual_premium);
    expect(after.death_benefit_disease).toBe(before.death_benefit_disease);
  });

  it('移行を何度通しても金額は動かない', async () => {
    const { id } = svc.createCase();
    const state = svc.resetToSample(id);
    const policyId = state.policies[0].id;

    await makeLegacyForeignPolicy(policyId, 140);
    const once = policyRow(policyId);
    await withRawDb(() => {});
    const twice = policyRow(policyId);

    expect(twice).toEqual(once);
    expect(userVersion()).toBe(1);
  });

  it('古い版のアプリが付け直した foreign_* は、金額を触らずに落とす', async () => {
    const { id } = svc.createCase();
    const state = svc.resetToSample(id);
    const policyId = state.policies[0].id;

    await makeLegacyForeignPolicy(policyId, 140);
    const migrated = policyRow(policyId);

    // 移行済みの DB を古い版で開くと optionalPolicyColumns が 0 で付け直す
    await withRawDb(raw => {
      for (const column of FOREIGN_COLUMNS) {
        raw.exec(`ALTER TABLE policies ADD COLUMN ${column} REAL NOT NULL DEFAULT 0`);
      }
    });

    expect(columnsOf().filter(column => column.startsWith('foreign_'))).toEqual([]);
    expect(policyRow(policyId).premium_amount).toBe(migrated.premium_amount);
    expect(policyRow(policyId).annual_premium).toBe(migrated.annual_premium);
  });
});

describe('円換算は読み出しで作る', () => {
  const saveForeignPolicy = (caseId: string, usdJpyRate: number) => {
    const state = svc.getAppState(caseId)!;
    const policy = state.policies[0];
    policy.currency = 'USD';
    policy.paymentFrequency = 'annual';
    policy.foreignPremiumAmount = 1000;
    policy.foreignDeathBenefitDisease = 100000;
    policy.premiumAmount = 0;
    policy.deathBenefitDisease = 0;
    state.valuationSettings = { usdJpyRate, fxRateDate: '2026-10-01' };
    return svc.saveAppState(caseId, state);
  };

  it('保存するのは契約通貨の額で、読み出しで案件のレートを掛ける', () => {
    const { id } = svc.createCase();
    const state = svc.resetToSample(id);
    const policyId = state.policies[0].id;

    const saved = saveForeignPolicy(id, 150);
    const row = policyRow(policyId);
    expect(row.premium_amount).toBe(1000);
    expect(row.death_benefit_disease).toBe(100000);

    const savedPolicy = saved.policies.find(policy => policy.id === policyId)!;
    expect(savedPolicy.premiumAmount).toBe(150000);
    expect(savedPolicy.deathBenefitDisease).toBe(15000000);
    expect(savedPolicy.foreignPremiumAmount).toBe(1000);
  });

  it('レートを変えると、契約を書き直さなくても円換算が追いつく', () => {
    const { id } = svc.createCase();
    const state = svc.resetToSample(id);
    const policyId = state.policies[0].id;

    saveForeignPolicy(id, 150);
    const beforeRow = policyRow(policyId);

    const current = svc.getAppState(id)!;
    current.valuationSettings = { usdJpyRate: 160, fxRateDate: '2026-10-02' };
    svc.saveAppState(id, current);

    // 保存されている額（契約通貨）は動かない
    expect(policyRow(policyId).premium_amount).toBe(beforeRow.premium_amount);
    const reread = svc.getAppState(id)!.policies.find(policy => policy.id === policyId)!;
    expect(reread.premiumAmount).toBe(160000);
    expect(reread.deathBenefitDisease).toBe(16000000);
  });

  it('案件のレートが無い DB では、行に残っている保存時のレートで換算する', async () => {
    const { id } = svc.createCase();
    const state = svc.resetToSample(id);
    const policyId = state.policies[0].id;

    await makeLegacyForeignPolicy(policyId, 140);
    await withRawDb(raw => {
      raw.prepare('UPDATE app_state_meta SET valuation_settings = NULL WHERE case_id = ?').run(id);
    });

    const policy = svc.getAppState(id)!.policies.find(p => p.id === policyId)!;
    expect(policy.foreignPremiumAmount).toBe(1000);
    expect(policy.premiumAmount).toBe(140000);
  });
});
