// 案件（評価する会社1社ぶんの入力データ）の保存。
//
// ここで守りたいのは2つ。
//  1. 預かったデータを壊さないこと ── 様式の欄の名前も値もサーバは解釈せず、そのまま返す。
//  2. 消したように見せて実体は残すこと ── 1社ぶんの入力は再入力に半日かかるので、
//     既定の削除はゴミ箱行きで、完全削除は ?purge=1 を明示したときだけ。
// Prisma は最小限のフェイクで置き換えて DB 無しで確かめる。

import type { PrismaClient } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import {
  copiedCaseName,
  parseCaseData,
  parseCaseId,
  parseCaseInput,
  toCaseResponse,
  toCaseSummary,
} from '../cases.js';
import { ValidationError } from '../validation.js';
import { createCaseRouter } from '../routes/cases.js';

describe('parseCaseData', () => {
  it('表ID→欄名→値の入れ子をそのまま通す', () => {
    const data = { table1_1: { f12: '株式会社テスト', f14_y: '8' }, table5: {} };
    expect(parseCaseData(data)).toEqual(data);
  });

  it('様式に無い表IDや欄名でも弾かない（様式の改訂でサーバを直さずに済ませるため）', () => {
    expect(parseCaseData({ table99: { unknownField: '1' } })).toEqual({
      table99: { unknownField: '1' },
    });
  });

  it('値が文字列でなければ弾く（数値のまま保存すると読み戻しで型が揺れる）', () => {
    expect(() => parseCaseData({ table1_1: { f12: 1000 } })).toThrow(ValidationError);
  });

  it('表の中身がオブジェクトでなければ弾く', () => {
    expect(() => parseCaseData({ table1_1: '株式会社テスト' })).toThrow(ValidationError);
  });

  it('配列はオブジェクトとして扱わない', () => {
    expect(() => parseCaseData([])).toThrow(ValidationError);
  });

  it('大きすぎるデータは弾く（別物のJSONを投げ込んだ事故を止める）', () => {
    expect(() => parseCaseData({ table1_1: { f12: 'x'.repeat(2_000_100) } })).toThrow(
      ValidationError,
    );
  });
});

describe('parseCaseInput', () => {
  it('会社名と課税時期は前後の空白を落として受ける', () => {
    const parsed = parseCaseInput({
      companyName: '  株式会社テスト  ',
      taxPeriod: ' 令和8年3月15日 ',
      data: { table1_1: { f12: '株式会社テスト' } },
    });
    expect(parsed.companyName).toBe('株式会社テスト');
    expect(parsed.taxPeriod).toBe('令和8年3月15日');
  });

  it('会社名も課税時期も未入力のまま保存できる（入力の途中で保存されるため）', () => {
    const parsed = parseCaseInput({ data: {} });
    expect(parsed).toEqual({ companyName: '', taxPeriod: '', data: {} });
  });

  it('会社名が長すぎれば弾く', () => {
    expect(() => parseCaseInput({ companyName: 'あ'.repeat(201), data: {} })).toThrow(
      ValidationError,
    );
  });

  it('data が無ければ弾く', () => {
    expect(() => parseCaseInput({ companyName: '株式会社テスト' })).toThrow(ValidationError);
  });
});

describe('parseCaseId', () => {
  it('正の整数だけ通す', () => {
    expect(parseCaseId('12')).toBe(12);
  });

  it.each(['0', '-1', '1.5', 'abc', ''])('%s は弾く', (param) => {
    expect(() => parseCaseId(param)).toThrow(ValidationError);
  });
});

describe('copiedCaseName', () => {
  it('会社名の後ろに（コピー）を付ける', () => {
    expect(copiedCaseName('株式会社テスト')).toBe('株式会社テスト（コピー）');
  });

  it('会社名が空でも複製と分かる名前にする', () => {
    expect(copiedCaseName('')).toBe('（コピー）');
  });

  it('上限を超えないよう切り詰める', () => {
    expect(copiedCaseName('あ'.repeat(200))).toHaveLength(200);
  });
});

describe('toCaseSummary / toCaseResponse', () => {
  const row = {
    id: 1,
    companyName: '株式会社テスト',
    taxPeriod: '令和8年3月15日',
    archivedAt: null,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-02T00:00:00.000Z'),
    data: { table1_1: { f12: '株式会社テスト' } },
  };

  it('一覧には入力データを載せない（案件が増えるほど重くなるため）', () => {
    expect(toCaseSummary(row)).not.toHaveProperty('data');
  });

  it('日時はISO文字列で返す', () => {
    expect(toCaseSummary(row).updatedAt).toBe('2026-09-02T00:00:00.000Z');
  });

  it('ゴミ箱の日時も文字列にする', () => {
    const archived = { ...row, archivedAt: new Date('2026-09-03T00:00:00.000Z') };
    expect(toCaseSummary(archived).archivedAt).toBe('2026-09-03T00:00:00.000Z');
  });

  it('1件取得では入力データも返す', () => {
    expect(toCaseResponse(row).data).toEqual(row.data);
  });
});

// ---------------------------------------------------------------------------
// ルータ
// ---------------------------------------------------------------------------

interface FakeRow {
  id: number;
  companyName: string;
  taxPeriod: string;
  data: unknown;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** createCaseRouter が触る範囲だけの Prisma もどき。 */
function fakeDb(seed: Partial<FakeRow>[] = []) {
  let nextId = 1;
  const rows: FakeRow[] = seed.map((row) => ({
    id: nextId++,
    companyName: '',
    taxPeriod: '',
    data: {},
    archivedAt: null,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    ...row,
  }));

  const find = (id: number) => rows.find((row) => row.id === id) ?? null;

  const client = {
    valuationCase: {
      findMany: async ({ where }: { where?: { archivedAt?: null } }) => {
        const matched =
          where?.archivedAt === null ? rows.filter((row) => row.archivedAt === null) : [...rows];
        return matched.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      },
      findUnique: async ({ where }: { where: { id: number } }) => find(where.id),
      create: async ({ data }: { data: Omit<FakeRow, 'id' | 'archivedAt' | 'createdAt' | 'updatedAt'> }) => {
        const created: FakeRow = {
          id: nextId++,
          archivedAt: null,
          createdAt: new Date('2026-09-10T00:00:00.000Z'),
          updatedAt: new Date('2026-09-10T00:00:00.000Z'),
          ...data,
        };
        rows.push(created);
        return created;
      },
      update: async ({ where, data }: { where: { id: number }; data: Partial<FakeRow> }) => {
        const target = find(where.id);
        if (!target) throw new Error('見つかりません');
        Object.assign(target, data, { updatedAt: new Date('2026-09-11T00:00:00.000Z') });
        return target;
      },
      delete: async ({ where }: { where: { id: number } }) => {
        const index = rows.findIndex((row) => row.id === where.id);
        const [removed] = rows.splice(index, 1);
        return removed;
      },
    },
  } as unknown as PrismaClient;

  return { rows, client };
}

const json = (body: unknown) => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

describe('createCaseRouter', () => {
  it('一覧は既定でゴミ箱を除き、更新の新しい順に並べる', async () => {
    const { client } = fakeDb([
      { companyName: '古い', updatedAt: new Date('2026-09-01T00:00:00.000Z') },
      { companyName: '新しい', updatedAt: new Date('2026-09-05T00:00:00.000Z') },
      { companyName: 'ゴミ箱', archivedAt: new Date('2026-09-06T00:00:00.000Z') },
    ]);

    const res = await createCaseRouter(client).request('/cases');
    const body = (await res.json()) as { cases: { companyName: string }[] };

    expect(body.cases.map((item) => item.companyName)).toEqual(['新しい', '古い']);
  });

  it('includeArchived=1 ならゴミ箱も返す', async () => {
    const { client } = fakeDb([
      { companyName: '通常' },
      { companyName: 'ゴミ箱', archivedAt: new Date('2026-09-06T00:00:00.000Z') },
    ]);

    const res = await createCaseRouter(client).request('/cases?includeArchived=1');
    const body = (await res.json()) as { cases: unknown[] };

    expect(body.cases).toHaveLength(2);
  });

  it('1件取得では入力データをそのまま返す', async () => {
    const data = { table1_1: { f12: '株式会社テスト' } };
    const { client } = fakeDb([{ data }]);

    const res = await createCaseRouter(client).request('/cases/1');
    const body = (await res.json()) as { case: { data: unknown } };

    expect(body.case.data).toEqual(data);
  });

  it('存在しない案件は404', async () => {
    const { client } = fakeDb();
    expect((await createCaseRouter(client).request('/cases/1')).status).toBe(404);
  });

  it('案件IDが整数でなければ400（Prisma まで持ち込まない）', async () => {
    const { client } = fakeDb();
    expect((await createCaseRouter(client).request('/cases/abc')).status).toBe(400);
  });

  it('新規保存は201で作る', async () => {
    const { rows, client } = fakeDb();

    const res = await createCaseRouter(client).request(
      '/cases',
      json({ companyName: '株式会社テスト', taxPeriod: '令和8年3月15日', data: {} }),
    );

    expect(res.status).toBe(201);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.companyName).toBe('株式会社テスト');
  });

  it('JSONとして読めない本体は400', async () => {
    const { client } = fakeDb();

    const res = await createCaseRouter(client).request('/cases', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{壊れている',
    });

    expect(res.status).toBe(400);
  });

  it('上書きは既存の案件だけ（自動保存が消えた案件を作り直さないように）', async () => {
    const { rows, client } = fakeDb();

    const res = await createCaseRouter(client).request('/cases/1', {
      ...json({ data: {} }),
      method: 'PUT',
    });

    expect(res.status).toBe(404);
    expect(rows).toHaveLength(0);
  });

  it('上書きで入力データが入れ替わる', async () => {
    const { rows, client } = fakeDb([{ data: { table1_1: { f12: '旧' } } }]);

    await createCaseRouter(client).request('/cases/1', {
      ...json({ companyName: '新', data: { table1_1: { f12: '新' } } }),
      method: 'PUT',
    });

    expect(rows[0]!.data).toEqual({ table1_1: { f12: '新' } });
  });

  it('削除は既定でゴミ箱行き（実体は残す）', async () => {
    const { rows, client } = fakeDb([{ companyName: '株式会社テスト' }]);

    const res = await createCaseRouter(client).request('/cases/1', { method: 'DELETE' });

    expect(res.status).toBe(200);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.archivedAt).not.toBeNull();
  });

  it('purge=1 を明示したときだけ完全に消す', async () => {
    const { rows, client } = fakeDb([{ companyName: '株式会社テスト' }]);

    const res = await createCaseRouter(client).request('/cases/1?purge=1', { method: 'DELETE' });

    expect((await res.json()) as unknown).toEqual({ purged: true });
    expect(rows).toHaveLength(0);
  });

  it('ゴミ箱から戻せる', async () => {
    const { rows, client } = fakeDb([{ archivedAt: new Date('2026-09-06T00:00:00.000Z') }]);

    await createCaseRouter(client).request('/cases/1/restore', { method: 'POST' });

    expect(rows[0]!.archivedAt).toBeNull();
  });

  it('複製は元を変えずに（コピー）を作る', async () => {
    const data = { table1_1: { f12: '株式会社テスト' } };
    const { rows, client } = fakeDb([
      { companyName: '株式会社テスト', taxPeriod: '令和8年3月15日', data },
    ]);

    const res = await createCaseRouter(client).request('/cases/1/duplicate', { method: 'POST' });

    expect(res.status).toBe(201);
    expect(rows).toHaveLength(2);
    expect(rows[0]!.companyName).toBe('株式会社テスト');
    expect(rows[1]!.companyName).toBe('株式会社テスト（コピー）');
    expect(rows[1]!.taxPeriod).toBe('令和8年3月15日');
    expect(rows[1]!.data).toEqual(data);
  });
});
