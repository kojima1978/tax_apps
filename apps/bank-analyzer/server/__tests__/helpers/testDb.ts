// テストファイルごとの使い捨て DB（雛形 DB の複製）。
//
//   const db = useTestDb();          // describe の外で1回
//   it('...', async () => { await db().case.create(...) })
//
// 各テストの前に中身を空にする（TRUNCATE ... RESTART IDENTITY）ので、テスト同士は
// 互いの行を見ない。id も毎回 1 から振り直される。

import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, inject } from 'vitest';

const TABLES = [
  'analyzer_classificationchange',
  'analyzer_deletionbackup',
  'analyzer_transaction',
  'analyzer_account',
  'analyzer_case',
  'analyzer_appsetting',
];

async function createDatabase(admin: PrismaClient, name: string, template: string) {
  // 同じ雛形から同時に複製すると「雛形を使用中」で弾かれることがあるので、少し待って再試行する。
  for (let attempt = 0; ; attempt++) {
    try {
      await admin.$executeRawUnsafe(`CREATE DATABASE "${name}" TEMPLATE "${template}"`);
      return;
    } catch (error) {
      if (attempt >= 20 || !String(error).includes('being accessed by other users')) throw error;
      await new Promise((r) => setTimeout(r, 100 + Math.random() * 200));
    }
  }
}

export function useTestDb(): () => PrismaClient {
  const serverUrl = inject('pgServerUrl');
  const template = inject('pgTemplateDb');
  const name = `bank_test_${randomUUID().replaceAll('-', '')}`;
  const admin = new PrismaClient({ datasourceUrl: `${serverUrl}/postgres` });
  let client: PrismaClient | undefined;

  beforeAll(async () => {
    await createDatabase(admin, name, template);
    client = new PrismaClient({ datasourceUrl: `${serverUrl}/${name}?schema=public` });
  });

  beforeEach(async () => {
    await client!.$executeRawUnsafe(`TRUNCATE ${TABLES.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`);
  });

  afterAll(async () => {
    await client?.$disconnect();
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await admin.$disconnect();
  });

  return () => {
    if (!client) throw new Error('useTestDb() の DB は beforeAll の後でしか使えません');
    return client;
  };
}
