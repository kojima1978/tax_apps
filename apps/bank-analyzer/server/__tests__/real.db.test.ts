// 段階6（並行稼働での突き合わせ）。本番 DB の**複製**に新アプリをつなぎ、段階1で Django が
// 記録した実データの正解と出力を比べる。実データを使うので、次の2つが揃ったときだけ走る
// （CI では走らない。`manage.sh test` の対象にも入れない）:
//
//   BANK_ANALYZER_REAL_DB_URL  本番 DB の複製（**原本**。このテストは原本の複製を作って触る）
//   BANK_ANALYZER_GOLDEN_DIR   実データの正解（~/.tax-apps/bank-analyzer-golden）
//
// 走らせ方は REACT_MIGRATION_PLAN.md「段階6の結果」節。
//
// ここで見るのは「まだ実データで一度も確かめていないもの」だけ:
//   - case.json / transactions.json … DB の行そのもの（Prisma のスキーマ対応）
//   - exports.json                  … CSV 4本・Excel 3本・JSON（API 経由）
//   - apply_classification_rules / run_classifier … 書き込み2本（複製の上で実行して捨てる）
// 月次・分析画面・未分類のまとめ・ルール適用のプレビューは段階3で実データごと通してある
// （aggregate.test.ts）。入力の transactions.json がここで一致すれば同じことを二度やるだけ。

import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BASE_PATH, createApp } from '../app.js';

const REAL_URL = process.env.BANK_ANALYZER_REAL_DB_URL ?? '';
const GOLDEN_DIR = process.env.BANK_ANALYZER_GOLDEN_DIR ?? '';
const RUN = Boolean(REAL_URL && GOLDEN_DIR);

const CASE_DIRS = RUN
  ? fs.readdirSync(GOLDEN_DIR).filter((d) => /^case_\d+$/.test(d) && fs.existsSync(path.join(GOLDEN_DIR, d, 'case.json'))).sort()
  : [];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>;

const golden = (dir: string, file: string): Json =>
  JSON.parse(fs.readFileSync(path.join(GOLDEN_DIR, dir, file), 'utf8'));

// --- 原本の複製 ------------------------------------------------------------
// 原本には触らない（読み取りだけでも接続していると CREATE DATABASE ... TEMPLATE が弾かれる）。

function urlFor(name: string): string {
  const u = new URL(REAL_URL);
  u.pathname = `/${name}`;
  return u.toString();
}

function useClone(): () => PrismaClient {
  // describe.skipIf でも describe の中身は読まれる。環境変数が無いときは何も組み立てない
  // （`manage.sh test` と CI はここを通る。new URL('') で収集そのものが落ちていた）
  if (!RUN) {
    return () => {
      throw new Error('実データの環境変数が無いので走りません');
    };
  }
  const origin = new URL(REAL_URL).pathname.slice(1);
  const name = `bank_real_${randomUUID().replaceAll('-', '')}`;
  let admin: PrismaClient | undefined;
  let client: PrismaClient | undefined;

  beforeAll(async () => {
    admin = new PrismaClient({ datasourceUrl: urlFor('postgres') });
    await admin.$executeRawUnsafe(`CREATE DATABASE "${name}" TEMPLATE "${origin}"`);
    client = new PrismaClient({ datasourceUrl: `${urlFor(name)}?schema=public` });
  }, 120_000);

  afterAll(async () => {
    await client?.$disconnect();
    await admin?.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await admin?.$disconnect();
  });

  return () => {
    if (!client) throw new Error('複製は beforeAll の後でしか使えません');
    return client;
  };
}

// --- 正解の形へ寄せる ------------------------------------------------------
// 記録は Django の .values() そのまま（snake_case・取引 id は案件内の通し番号）。

const isoDate = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

async function caseIdOf(db: PrismaClient, name: string): Promise<bigint> {
  const found = await db.case.findUnique({ where: { name }, select: { id: true } });
  if (!found) throw new Error(`複製に案件「${name}」がありません`);
  return found.id;
}

// 取引 id → 案件内の通し番号（1始まり）。dump_golden.py の tx_idmap と同じ
async function txIdMap(db: PrismaClient, caseId: bigint): Promise<Map<bigint, number>> {
  const rows = await db.transaction.findMany({ where: { caseId }, orderBy: { id: 'asc' }, select: { id: true } });
  return new Map(rows.map((r, i) => [r.id, i + 1]));
}

// 口座の並びは記録の都合（bank_name, branch_name, account_number）なので、比べる前に両側を同じ順にする
const byAccount = (a: Json, b: Json) =>
  `${a.bank_name ?? ''}\u0000${a.branch_name ?? ''}\u0000${a.account_number}`.localeCompare(
    `${b.bank_name ?? ''}\u0000${b.branch_name ?? ''}\u0000${b.account_number}`,
  );

// 記録の accounts[].id は dump の id 置換に巻き込まれた値（取引の通し番号と当たれば数字、
// 当たらなければ "?<元の id>"）で、口座を指していない。比べる意味が無いので落とす
const dropId = ({ id: _id, ...rest }: Json) => rest;

describe.skipIf(!RUN)('段階6: 本番 DB の複製と Django の記録', () => {
  const db = useClone();

  it('正解のある案件が複製にそろっている', async () => {
    expect(CASE_DIRS.length).toBeGreaterThan(0);
    const names = CASE_DIRS.map((d) => golden(d, 'case.json').name as string);
    const inDb = (await db().case.findMany({ select: { name: true } })).map((c) => c.name);
    expect([...names].sort()).toEqual([...inDb].sort());
  });

  describe.each(CASE_DIRS)('%s', (dir) => {
    it('案件と口座', async () => {
      const expected = golden(dir, 'case.json');
      const found = await db().case.findUnique({
        where: { name: expected.name as string },
        include: { accounts: true },
      });
      expect(found).not.toBeNull();
      const actual = {
        name: found!.name,
        reference_date: isoDate(found!.referenceDate),
        custom_patterns: found!.customPatterns,
        accounts: found!.accounts
          .map((a) => ({
            account_number: a.accountNumber,
            bank_name: a.bankName,
            branch_name: a.branchName,
            account_type: a.accountType,
            holder: a.holder,
            passbook_balance: a.passbookBalance,
            certificate_balance: a.certificateBalance,
            has_accrued_interest: a.hasAccruedInterest,
            passbook_years: a.passbookYears,
            inventory_remarks: a.inventoryRemarks,
            print_order: a.printOrder,
          }))
          .sort(byAccount),
      };
      expect(actual).toEqual({
        ...expected,
        accounts: (expected.accounts as Json[]).map(dropId).sort(byAccount),
      });
    });

    it('取引の全行', async () => {
      const expected = golden(dir, 'transactions.json') as unknown as Json[];
      const caseId = await caseIdOf(db(), golden(dir, 'case.json').name as string);
      const idmap = await txIdMap(db(), caseId);
      const rows = await db().transaction.findMany({ where: { caseId }, orderBy: { id: 'asc' } });
      const actual = rows.map((t) => ({
        id: idmap.get(t.id)!,
        date: isoDate(t.date),
        description: t.description,
        description_search: t.descriptionSearch,
        amount_out: t.amountOut,
        amount_in: t.amountIn,
        balance: t.balance,
        is_large: t.isLarge,
        is_transfer: t.isTransfer,
        transfer_to: t.transferTo,
        category: t.category,
        classification_score: t.classificationScore,
        is_flagged: t.isFlagged,
        memo: t.memo,
      }));
      expect(actual).toEqual(expected);
    });
  });
});

// --- 書き出し --------------------------------------------------------------
// 記録は Django の応答そのまま（CSV は行、Excel は openpyxl で読み直した形）。
// ファイル名の日付印は <DATE> に置き換えて比べる。

const API = `${BASE_PATH}/api/cases`;

const DATE_STAMP = /R\d{6}(?=_)/g;

const meta = (res: Response) => ({
  status: res.status,
  content_type: res.headers.get('Content-Type'),
  disposition: (res.headers.get('Content-Disposition') ?? '').replace(DATE_STAMP, '<DATE>'),
});

// Python の csv.reader と同じ読み方（引用符の中の改行・"" も含む）
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; ) {
    const ch = text[i]!;
    if (quoted) {
      if (ch !== '"') { field += ch; i++; continue; }
      if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
      quoted = false;
      i++;
      continue;
    }
    if (ch === '"') { quoted = true; i++; continue; }
    if (ch === ',') { row.push(field); field = ''; i++; continue; }
    if (ch === '\r' || ch === '\n') {
      row.push(field);
      rows.push(row);
      field = '';
      row = [];
      i += ch === '\r' && text[i + 1] === '\n' ? 2 : 1;
      continue;
    }
    field += ch;
    i++;
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

async function csvShape(res: Response) {
  const raw = new Uint8Array(await res.arrayBuffer());
  const text = new TextDecoder('utf-8').decode(raw);
  return {
    ...meta(res),
    bom: raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf,
    crlf: text.includes('\r\n'),
    rows: parseCsv(text.replace(/^\ufeff/, '')),
  };
}

// openpyxl の seet_properties.tabColor は alpha を 00、exceljs は FF で書く。見た目は同じ色
const tabColorOf = (ws: ExcelJS.Worksheet) => {
  const argb = ws.properties?.tabColor?.argb;
  return argb ? argb.slice(-6) : null;
};

// openpyxl の freeze_panes（"A6"）の形にする
function freezeOf(ws: ExcelJS.Worksheet): string | null {
  const view = ws.views?.find((v) => v.state === 'frozen') as { xSplit?: number; ySplit?: number } | undefined;
  if (!view) return null;
  const col = (view.xSplit ?? 0) + 1;
  const row = (view.ySplit ?? 0) + 1;
  let letters = '';
  for (let n = col; n > 0; n = Math.floor((n - 1) / 26)) letters = String.fromCharCode(65 + ((n - 1) % 26)) + letters;
  return `${letters}${row}`;
}

// 結合した範囲の左上以外は openpyxl では None。exceljs は親の値を返すので落とす
function cellValue(cell: ExcelJS.Cell): unknown {
  if (cell.isMerged && cell.master.address !== cell.address) return null;
  const value = cell.value;
  if (value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

// 列番号 → Excel の列名（27列目から AA になる。年の列が多い案件は Z を越える）
function colLetter(n: number): string {
  let s = '';
  for (let v = n; v > 0; v = Math.floor((v - 1) / 26)) s = String.fromCharCode(65 + ((v - 1) % 26)) + s;
  return s;
}

async function xlsxShape(res: Response): Promise<ReturnType<typeof meta> & { sheets?: Json[] }> {
  const base = meta(res);
  if (res.status !== 200) return base;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await res.arrayBuffer());
  const sheets = wb.worksheets.map((ws) => {
    const values: unknown[][] = [];
    const numberFormats: Record<string, string> = {};
    for (let r = 1; r <= ws.rowCount; r++) {
      const row: unknown[] = [];
      for (let c = 1; c <= ws.columnCount; c++) {
        const cell = ws.getRow(r).getCell(c);
        const value = cellValue(cell);
        row.push(value);
        if (value !== null && cell.numFmt && cell.numFmt !== 'General') numberFormats[cell.address] = cell.numFmt;
      }
      values.push(row);
    }
    const widths: Record<string, number> = {};
    ws.columns?.forEach((col, i) => {
      if (col?.width !== undefined) widths[colLetter(i + 1)] = col.width;
    });
    return {
      title: ws.name,
      tab_color: tabColorOf(ws),
      freeze_panes: freezeOf(ws),
      merged: [...((ws.model as { merges?: string[] }).merges ?? [])].sort(),
      column_widths: widths,
      number_formats: numberFormats,
      values,
    };
  });
  return { ...base, sheets };
}

// Django の CSV は**行ごとに BOM が付く**。Content-Type の charset が utf-8-sig なので
// HttpResponse.write() が呼ばれるたびに BOM を書き、pandas は1行ずつ書くため
// （Excel は先頭の1つだけ見るので表示では気づけない）。新アプリは先頭に1つだけ付ける
const stripBom = (rows: string[][]) => rows.map((r) => r.map((c) => c.replaceAll('\ufeff', '')));

// 通帳有無一覧の右上は「作成日」なので、記録した日と今日が違う。日付だけ寄せる
const DROP_SHEET_DATE = (v: unknown) =>
  typeof v === 'string' ? v.replace(/^\d{4}\/\d{2}\/\d{2}\n/, '<DATE>\n') : v;

// openpyxl は alpha を 00、exceljs は FF で書く。見た目は同じ色なので下6桁で比べる
const rgb6 = (v: string | null) => (v ? v.slice(-6) : null);

function expectedSheets(sheets: Json[]): Json[] {
  return sheets.map((sh) => ({
    ...sh,
    tab_color: rgb6(sh.tab_color),
    values: sh.values.map((row: unknown[]) => row.map(DROP_SHEET_DATE)),
  }));
}

function actualSheets(sheets: Json[]): Json[] {
  return sheets.map((sh) => ({
    ...sh,
    values: sh.values.map((row: unknown[]) => row.map(DROP_SHEET_DATE)),
  }));
}

// 新アプリで増えた・形が違うものを記録の側へ足す（意図的な差。計画書「段階4の結果」節）
function expectedJsonBody(body: Json): Json {
  const { case: c, ...rest } = body;
  return { ...rest, case: { ...c, custom_patterns: {} } };
}

// 記録は exported_at / created_at を落としてある（dump_golden.py の DROP_KEYS）
const DROP_KEYS = new Set(['created_at', 'updated_at', 'exported_at', 'reverted_at', 'change_group']);

function dropStamps(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(dropStamps);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Json)
        .filter(([k]) => !DROP_KEYS.has(k) && !k.endsWith('_id'))
        .map(([k, v]) => [k, dropStamps(v)]),
    );
  }
  return value;
}

// 資金移動の CSV は Django の行の並びと一致しない（意図的な差が2つ重なっている）。
//   ・Django は取込のときに付けた印（is_transfer）の行をそのまま並べる。印は付け直されないので
//     古い行が混じり、相手のいない行が1つだけ残ることもある（case_05 が実際にそう）。
//     新アプリは画面と同じ組（transferPairs）を出金→入金の順に出す
//   ・Django の「相手」は印の付いた入金のうち**最初に見つかったもの**で、日付も重複も見ていない。
//     正解の analysis.json では同じ入金が5つの出金の相手として並んでいる（case_03 の取引 482）。
//     新アプリは判定で実際に組んだ相手を出すので、入金側は正解と一致しない（計画書「段階3の結果」）
// そこで比べるのは次の3つ。入金側の組み合わせそのものは段階3で実データごと確かめてある
//   (1) 出金側の行と並び … 正解の組の source と一致すること
//   (2) 入金側の行       … Django が印を付けた行のどれかであり、2つの出金が同じ行を指さないこと
//   (3) 組の形           … 出金→入金の順に2行ずつ
const SEP = '\u0000';
const rowKey = (r: string[]) => r.slice(5, 9).join(SEP);

// 同じ日の中の並びだけは比べない（意図的な差・計画書「段階3の結果」）。Django 版は pandas の
// 安定でない並べ替えで同じ日の順に規則が無く、case_02 の R6.11.6 の2件が入れ替わる。
// 新アプリは (日付, id) 順。日付の並び自体は比べるので、日の塊の中だけ並べ替えて突き合わせる
function sameDaySorted(rows: string[][]): string[][] {
  const sorted: string[][] = [];
  for (let i = 0; i < rows.length; ) {
    let j = i;
    while (j < rows.length && rows[j]![0] === rows[i]![0]) j++;
    sorted.push(...rows.slice(i, j).sort((a, b) => a.join(SEP).localeCompare(b.join(SEP))));
    i = j;
  }
  return sorted;
}

function expectTransfersCsv(dir: string, expected: string[][], actual: string[][]) {
  const pairs: Json[] = golden(dir, 'analysis.json').default.transfer_pairs;
  const txs = new Map<number, Json>(golden(dir, 'transactions.json').map((t: Json) => [t.id, t]));
  // 摘要・払戻・お預り・差引残高（CSV の 6〜9 列目）で行と取引を結ぶ。出金側は6案件とも1対1
  const byKey = new Map<string, string[]>();
  for (const r of expected.slice(1)) byKey.set(rowKey(r), r);
  const rowOf = (id: number) => {
    const t = txs.get(id)!;
    const row = byKey.get([t.description, t.amount_out, t.amount_in, t.balance ?? ''].join(SEP));
    expect(row, `組の取引 ${id} に当たる行が Django の CSV にありません`).toBeDefined();
    return row!;
  };

  expect(actual[0]).toEqual(expected[0]);
  const body = actual.slice(1);
  expect(body.length).toBe(pairs.length * 2);

  const out = body.filter((_, i) => i % 2 === 0);
  expect(sameDaySorted(out)).toEqual(sameDaySorted(pairs.map((p) => rowOf(p.source.id))));

  const marked = new Set(expected.slice(1).map(rowKey));
  const seen = new Set<string>();
  body
    .filter((_, i) => i % 2 === 1)
    .forEach((r, i) => {
      const key = rowKey(r);
      expect(marked.has(key), `${i + 1}組目の入金は Django が印を付けた行ではありません: ${r.join(',')}`).toBe(true);
      expect(seen.has(key), `${i + 1}組目の入金が別の組とかぶっています: ${r.join(',')}`).toBe(false);
      seen.add(key);
    });
  // 2行ずつ「出金（払戻あり・お預り0）→入金（お預りあり・払戻0）」
  body.forEach((r, i) => expect([r[6] === '0', r[7] === '0']).toEqual(i % 2 === 0 ? [false, true] : [true, false]));
}

describe.skipIf(!RUN)('段階6: 書き出し', () => {
  const db = useClone();
  const get = (p: string) => createApp(db()).request(`${API}${p}`);

  describe.each(CASE_DIRS)('%s', (dir) => {
    const CSV: Array<[string, string]> = [
      ['csv_all', 'export/csv/all'],
      ['csv_transfers', 'export/csv/transfers'],
      ['csv_flagged', 'export/csv/flagged'],
      ['csv_filtered', `export/csv-filtered?keyword=${encodeURIComponent('振')}&amount_type=out&amount_min=1000`],
    ];

    it.each(CSV)('%s', async (key, url) => {
      const expected = golden(dir, 'exports.json')[key]!;
      const id = await caseIdOf(db(), golden(dir, 'case.json').name);
      const res = await get(`/${id}/${url}`);

      // 書き出せないとき: Django は分析画面へ 302、新アプリは 400 の JSON（意図的な差）
      if (expected.status === 302) {
        expect(res.status).toBe(400);
        expect(((await res.json()) as { error: string }).error).toMatch(/データがありません。$/);
        return;
      }

      const actual = await csvShape(res);
      expect(actual.status).toBe(200);
      expect(actual.bom).toBe(true);
      // Django は charset=utf-8-sig（BOM は本文にしか現れないので正しくない）/ 改行は pandas の LF
      expect(actual.content_type).toBe('text/csv; charset=utf-8');
      expect(actual.crlf).toBe(true);
      expect(actual.disposition).toBe(expected.disposition);
      const rows = stripBom(expected.rows);
      if (key === 'csv_transfers') expectTransfersCsv(dir, rows, actual.rows);
      else expect(actual.rows).toEqual(rows);
    });

    const XLSX: Array<[string, string]> = [
      ['xlsx_by_category', 'export/xlsx/categories'],
      ['xlsx_monthly_cashflow', 'export/xlsx/monthly'],
      ['xlsx_passbook_inventory', 'export/xlsx/passbook-inventory'],
    ];

    it.each(XLSX)('%s', async (key, url) => {
      const expected = golden(dir, 'exports.json')[key]!;
      const id = await caseIdOf(db(), golden(dir, 'case.json').name);
      const actual = await xlsxShape(await get(`/${id}/${url}`));
      expect(actual.status).toBe(expected.status);
      expect(actual.content_type).toBe(expected.content_type);
      expect(actual.disposition).toBe(expected.disposition);
      expect(actualSheets(actual.sheets!)).toEqual(expectedSheets(expected.sheets));
    });

    it('json', async () => {
      const expected = golden(dir, 'exports.json').json;
      const id = await caseIdOf(db(), golden(dir, 'case.json').name);
      const res = await get(`/${id}/export/json`);
      expect(res.status).toBe(expected.status);
      expect(res.headers.get('Content-Type')).toBe(expected.content_type);
      expect((res.headers.get('Content-Disposition') ?? '').replace(DATE_STAMP, '<DATE>')).toBe(expected.disposition);
      expect(dropStamps(await res.json())).toEqual(expectedJsonBody(expected.body));
    });
  });
});

// --- 分類の書き込み --------------------------------------------------------
// 複製の上で実際に走らせて捨てる（Django 側は atomic + rollback で記録してある）。
// 案件ごとに触る行は分かれているので、1つの複製で6案件ぶん回せる。

const MUTATIONS: Array<[string, string]> = [
  ['apply_classification_rules', 'classify/rules'],
  ['run_classifier', 'classify/run'],
];

describe.skipIf(!RUN).each(MUTATIONS)('段階6: %s', (file, url) => {
  const db = useClone();

  it.each(CASE_DIRS)('%s', async (dir) => {
    const expected = golden(dir, `${file}.json`);
    const client = db();
    const id = await caseIdOf(client, golden(dir, 'case.json').name);
    const before = await client.classificationChange.count({ where: { caseId: id } });

    const res = await createApp(client).request(`${API}/${id}/${url}`, { method: 'POST' });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { count: number }).count).toBe(expected.return);

    const idmap = await txIdMap(client, id);
    const rows = await client.transaction.findMany({
      where: { caseId: id },
      orderBy: { id: 'asc' },
      select: { id: true, category: true, classificationScore: true },
    });
    expect(
      rows.map((t) => ({ id: idmap.get(t.id)!, category: t.category, classification_score: t.classificationScore })),
    ).toEqual(expected.transactions);

    const changes = await client.classificationChange.findMany({
      where: { caseId: id },
      orderBy: { id: 'asc' },
      skip: before,
    });
    expect(
      changes.map((c) => ({
        transaction_identifier: idmap.get(c.transactionIdentifier) ?? `?${c.transactionIdentifier}`,
        transaction_description: c.transactionDescription,
        old_category: c.oldCategory,
        new_category: c.newCategory,
        source: c.source,
      })),
    ).toEqual(expected.changes);
  });
});
