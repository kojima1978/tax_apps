import { describe, expect, it } from 'vitest';
import { BASE_PATH, createApp, type AppDb } from '../app.js';

// DB 無しで回すための差し替え。使う口だけを持たせる。
function fakeDb(overrides: { queryRaw?: () => Promise<unknown>; cases?: unknown[] }): AppDb {
  return {
    $queryRaw: overrides.queryRaw ?? (async () => [{ '?column?': 1 }]),
    case: { findMany: async () => overrides.cases ?? [] },
  } as unknown as AppDb;
}

describe('GET /api/health', () => {
  it('DB に届けば ok', async () => {
    const res = await createApp(fakeDb({})).request(`${BASE_PATH}/api/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });

  it('DB に届かなければ 503（healthcheck に拾わせる）', async () => {
    const app = createApp(
      fakeDb({
        queryRaw: async () => {
          throw new Error('connection refused');
        },
      }),
    );
    const res = await app.request(`${BASE_PATH}/api/health`);
    expect(res.status).toBe(503);
  });
});

describe('GET /api/cases', () => {
  it('BigInt の id と DATE 列を JSON に出せる形へ直す', async () => {
    const app = createApp(
      fakeDb({
        cases: [
          {
            id: 12n,
            name: '架空 太郎',
            createdAt: new Date('2026-10-07T01:02:03.000Z'),
            referenceDate: new Date('2021-04-01T00:00:00.000Z'),
            _count: { transactions: 3 },
          },
        ],
      }),
    );
    const res = await app.request(`${BASE_PATH}/api/cases`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([
      {
        id: 12,
        name: '架空 太郎',
        createdAt: '2026-10-07T01:02:03.000Z',
        referenceDate: '2021-04-01',
        transactionCount: 3,
      },
    ]);
  });
});
