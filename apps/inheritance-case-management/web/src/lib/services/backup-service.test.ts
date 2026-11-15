import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BACKUP_TABLES } from '@/types/backup';

const { tx } = vi.hoisted(() => {
  const models = [
    'administrativeFeeItem', 'department', 'company', 'companyBranch', 'assignee', 'referrer',
    'heirPerson', 'relatedPartyPerson', 'inheritanceCase', 'caseHeir', 'caseRelatedParty',
    'caseProgress', 'caseExpense', 'caseSpecialAddition', 'caseAdministrativeFee', 'auditLog',
  ];
  const tx: Record<string, unknown> = { $executeRawUnsafe: vi.fn() };
  for (const name of models) {
    tx[name] = { findMany: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn() };
  }
  return { tx };
});
vi.mock('@/lib/prisma', () => ({
  prisma: { $transaction: (fn: (client: unknown) => unknown) => fn(tx) },
}));
import { BACKUP_EXCLUDED_MODELS, TABLE_DEFS, restoreBackup } from './backup-service';

type Mocked = { findMany: ReturnType<typeof vi.fn>; deleteMany: ReturnType<typeof vi.fn>; createMany: ReturnType<typeof vi.fn> };
const model = (name: string) => tx[name] as Mocked;

/** schema.prisma からモデルごとのスカラー列（リレーション列を除く）を読む */
function readSchemaModels(): Map<string, { name: string; type: string }[]> {
  const schema = readFileSync(path.resolve(process.cwd(), 'prisma/schema.prisma'), 'utf8');
  const blocks = [...schema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)];
  const modelNames = new Set(blocks.map(m => m[1]));
  return new Map(blocks.map(([, name, body]) => [name, body.split('\n')
    .map(line => line.trim().match(/^(\w+)\s+(\w+)(\[\])?\??/))
    .filter((m): m is RegExpMatchArray => !!m && !modelNames.has(m[2]) && !m[3])
    .map(m => ({ name: m[1], type: m[2] }))]));
}

function sampleValue(type: string): unknown {
  switch (type) {
    case 'Int': case 'Float': return 1;
    case 'Boolean': return true;
    case 'DateTime': return '2026-01-01T00:00:00.000Z';
    case 'Json': return {};
    default: return 'x';
  }
}

describe('JSON バックアップの対象テーブル', () => {
  const models = readSchemaModels();

  it('schema の全モデルがバックアップ対象か、対象外の一覧のどちらかに入っている', () => {
    const covered = [...TABLE_DEFS.map(def => def.seqTable), ...BACKUP_EXCLUDED_MODELS].sort();
    expect(covered).toEqual([...models.keys()].sort());
  });

  it('画面の一覧（BACKUP_TABLES）と復元の定義（TABLE_DEFS）のキーがそろっている', () => {
    expect(BACKUP_TABLES.map(t => t.key).sort()).toEqual(TABLE_DEFS.map(def => def.key).sort());
  });

  it.each(TABLE_DEFS.map(def => [def.seqTable, def] as const))('%s の列がすべて復元される', (name, def) => {
    const fields = models.get(name) ?? [];
    const row = Object.fromEntries(fields.map(f => [f.name, sampleValue(f.type)]));
    expect(Object.keys(def.map(row)).sort()).toEqual(fields.map(f => f.name).sort());
  });
});

describe('restoreBackup の遺産整理の料金表・明細', () => {
  const feeItem = {
    id: 1, category: '戸籍収集', categoryOrder: 0, name: '戸籍謄本', unitPrice: 3000,
    note: null, sortOrder: 0, active: true,
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  };
  const fee = (id: number, caseId: number, feeItemId: number | null) => ({
    id, caseId, feeItemId, sortOrder: 0, category: '戸籍収集', name: '戸籍謄本', quantity: 1, unitPrice: 3000, memo: null,
  });
  const baseData = {
    departments: [], companies: [], companyBranches: [], assignees: [], referrers: [],
    heirPersons: [], relatedPartyPersons: [], cases: [{ id: 10 }], caseHeirs: [], caseRelatedParties: [],
    caseProgress: [], caseExpenses: [], caseSpecialAdditions: [], auditLogs: [],
  };
  const createdFees = () => model('caseAdministrativeFee').createMany.mock.calls.flatMap(([arg]) => arg.data);

  beforeEach(() => {
    for (const value of Object.values(tx)) {
      if (typeof value === 'function') (value as ReturnType<typeof vi.fn>).mockReset();
      else for (const fn of Object.values(value as Mocked)) fn.mockReset();
    }
    model('administrativeFeeItem').findMany.mockResolvedValue([{ ...feeItem, id: 5 }]);
    model('caseAdministrativeFee').findMany.mockResolvedValue([fee(1, 10, 5), fee(2, 99, 5)]);
  });

  it('旧形式（2つのキーが無い）は料金表を消さず、復元後に無い案件の明細は入れ直さない', async () => {
    const counts = await restoreBackup({ ...baseData, cases: [] });
    expect(model('administrativeFeeItem').deleteMany).not.toHaveBeenCalled();
    expect(model('administrativeFeeItem').createMany).not.toHaveBeenCalled();
    expect(model('caseAdministrativeFee').deleteMany).toHaveBeenCalled();
    expect(createdFees()).toEqual([]);
    expect(counts.administrativeFeeItems).toBe(1);
    expect(counts.caseAdministrativeFees).toBe(0);
  });

  it('旧形式でも、同じ番号の案件がある明細は料金表への参照ごと残る', async () => {
    const cases = [{ id: 10, deceasedName: '検証', dateOfDeath: '2026-01-01', fiscalYear: 2026, status: '受託',
      createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }];
    await restoreBackup({ ...baseData, cases });
    expect(createdFees()).toEqual([fee(1, 10, 5)]);
  });

  it('新形式は料金表を入れ替え、無くなった料金表を指す明細は自由行（feeItemId = null）にする', async () => {
    const cases = [{ id: 10, deceasedName: '検証', dateOfDeath: '2026-01-01', fiscalYear: 2026, status: '受託',
      createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }];
    const counts = await restoreBackup({
      ...baseData, cases,
      administrativeFeeItems: [feeItem],
      caseAdministrativeFees: [fee(1, 10, 1), fee(2, 10, 7)],
    });
    expect(model('administrativeFeeItem').deleteMany).toHaveBeenCalled();
    expect(model('administrativeFeeItem').createMany.mock.calls[0][0].data).toHaveLength(1);
    expect(model('caseAdministrativeFee').findMany).not.toHaveBeenCalled();
    expect(createdFees()).toEqual([fee(1, 10, 1), fee(2, 10, null)]);
    expect(counts).toMatchObject({ administrativeFeeItems: 1, caseAdministrativeFees: 2 });
  });

  it('新形式で空配列なら料金表・明細を空にする（今の内容を残さない）', async () => {
    const counts = await restoreBackup({ ...baseData, cases: [], administrativeFeeItems: [], caseAdministrativeFees: [] });
    expect(model('administrativeFeeItem').deleteMany).toHaveBeenCalled();
    expect(model('administrativeFeeItem').findMany).not.toHaveBeenCalled();
    expect(createdFees()).toEqual([]);
    expect(counts).toMatchObject({ administrativeFeeItems: 0, caseAdministrativeFees: 0 });
  });
});
