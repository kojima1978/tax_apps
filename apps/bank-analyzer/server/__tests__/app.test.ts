import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { BASE_PATH, createApp } from '../app.js';

// DB 無しで回すための差し替え。使う口だけを持たせる。
function fakeDb(queryRaw: () => Promise<unknown>): PrismaClient {
  return { $queryRaw: queryRaw } as unknown as PrismaClient;
}

describe('GET /api/health', () => {
  it('DB に届けば ok', async () => {
    const res = await createApp(fakeDb(async () => [{ '?column?': 1 }])).request(`${BASE_PATH}/api/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });

  it('DB に届かなければ 503（healthcheck に拾わせる）', async () => {
    const app = createApp(
      fakeDb(async () => {
        throw new Error('connection refused');
      }),
    );
    const res = await app.request(`${BASE_PATH}/api/health`);
    expect(res.status).toBe(503);
  });
});

describe('例外', () => {
  it('中身を出さず 500 と決まった文言にする', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const db = {
      case: { findMany: async () => Promise.reject(new Error('SELECT secret FROM x')) },
      transaction: { groupBy: async () => [] },
    } as unknown as PrismaClient;
    const res = await createApp(db).request(`${BASE_PATH}/api/cases`);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ success: false, error: 'サーバーエラーが発生しました' });
    vi.restoreAllMocks();
  });
});

describe('GET /api/staff-directory/workload', () => {
  it('担当者（台帳ID）ごとの件数と一覧へのリンクだけを返す', async () => {
    const db = {
      case: { findMany: async () => [{ assigneeStaffId: 4 }, { assigneeStaffId: 4 }, { assigneeStaffId: 9 }] },
    } as unknown as PrismaClient;
    const res = await createApp(db).request(`${BASE_PATH}/api/staff-directory/workload`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      roles: [{ key: 'assignee', label: '担当' }],
      activeLabel: 'すべて',
      staff: [
        { staffDirectoryId: 4, counts: { assignee: { active: 2, total: 2 } }, links: { assignee: '/?assignee=staff:4' } },
        { staffDirectoryId: 9, counts: { assignee: { active: 1, total: 1 } }, links: { assignee: '/?assignee=staff:9' } },
      ],
    });
  });
});
