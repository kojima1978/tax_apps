// テスト用の PostgreSQL を1つ立てる（vitest の globalSetup）。
//
// DB を伴うテストは本物の PostgreSQL で回す。分類の履歴・範囲削除の控えは
// 「DB の書き方まで Django と同じ」が要件なので、モックでは何も確かめたことにならない。
//
// - 走るたびに initdb から作り直して、終わったら消す（前の回の残りに左右されない）
// - マイグレーションを当てた雛形 DB を1つ作り、テストファイルごとにそれを複製する
//   （server/__tests__/helpers/testDb.ts）。ファイル同士は並列に走るので DB を分ける
// - PostgreSQL が見つからなければ落とす。飛ばすと「DB のテストは1件も走っていない」が
//   成功として通ってしまう
//
// 置き場所: テスト用イメージ（Dockerfile の test ステージ）は apk の postgresql16 で
// PATH にある。CI（ubuntu-latest）は /usr/lib/postgresql/<版>/bin に入っていて PATH に無い。

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    // 末尾に DB 名を足して使う（例: `${pgServerUrl}/bank_test_xxx`）
    pgServerUrl: string;
    pgTemplateDb: string;
  }
}

const USER = 'postgres';
const TEMPLATE_DB = 'bank_template';

function findBinDir(): string {
  const onPath = spawnSync('sh', ['-c', 'command -v initdb'], { encoding: 'utf8' }).stdout.trim();
  if (onPath) return path.dirname(onPath);
  const root = '/usr/lib/postgresql';
  const versions = fs.existsSync(root)
    ? fs.readdirSync(root).filter((v) => /^\d+$/.test(v)).sort((a, b) => Number(b) - Number(a))
    : [];
  for (const v of versions) {
    const dir = path.join(root, v, 'bin');
    if (fs.existsSync(path.join(dir, 'initdb'))) return dir;
  }
  throw new Error(
    'PostgreSQL（initdb）が見つかりません。テストはテスト用イメージ（docker compose --profile test）か CI で回してください。',
  );
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      srv.close(() => (typeof addr === 'object' && addr ? resolve(addr.port) : reject(new Error('port'))));
    });
  });
}

export default async function setup(project: TestProject) {
  const bin = findBinDir();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bank-analyzer-pg-'));
  const port = await freePort();
  const run = (cmd: string, args: string[]) =>
    execFileSync(path.join(bin, cmd), args, { stdio: ['ignore', 'pipe', 'pipe'] });

  // 本番の DB は UTF8。ロケールは照合順序がテストの環境で変わらないよう C に固定する
  // （並び順は DB ではなくアプリ側で決めている）。
  run('initdb', ['-D', dataDir, '-U', USER, '--auth=trust', '-E', 'UTF8', '--no-locale']);
  run('pg_ctl', [
    '-D', dataDir, '-w', '-l', path.join(dataDir, 'server.log'),
    '-o', `-p ${port} -k ${dataDir} -c listen_addresses=127.0.0.1 -c fsync=off -c full_page_writes=off`,
    'start',
  ]);

  const serverUrl = `postgresql://${USER}@127.0.0.1:${port}`;
  try {
    // 雛形 DB は migrate deploy に作らせる（無ければ作る）。本番と同じ経路でスキーマを当てる。
    execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
      env: { ...process.env, DATABASE_URL: `${serverUrl}/${TEMPLATE_DB}?schema=public` },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    run('pg_ctl', ['-D', dataDir, '-m', 'immediate', 'stop']);
    fs.rmSync(dataDir, { recursive: true, force: true });
    const e = error as { stdout?: Buffer; stderr?: Buffer };
    throw new Error(`雛形 DB へのマイグレーションに失敗しました:\n${e.stdout ?? ''}${e.stderr ?? ''}`);
  }

  project.provide('pgServerUrl', serverUrl);
  project.provide('pgTemplateDb', TEMPLATE_DB);

  return () => {
    try {
      run('pg_ctl', ['-D', dataDir, '-m', 'immediate', 'stop']);
    } finally {
      fs.rmSync(dataDir, { recursive: true, force: true });
    }
  };
}
