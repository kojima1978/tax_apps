// 取込（loadStatement + validateBalance）を Django 版の正解（test-data/golden/expected/importer）と
// 突き合わせる。入力ファイルはすべて、allowMultiple の true / false の両方で流す。
//
// 正解と違ってよいのは計画書 §3 で「直す」と決めたファイルだけで、それぞれの
// 「React 版ではこうなる」を DEVIATIONS に書いてある。ここに無いファイルが1か所でも
// 正解とずれたら落ちる。

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateBalance } from '../lib/balance.js';
import { StatementImportError } from '../lib/import/errors.js';
import { loadStatement, type Statement } from '../lib/import/loadStatement.js';

const GOLDEN_DIR = path.resolve('test-data/golden');
const INPUT_DIR = path.join(GOLDEN_DIR, 'inputs/files');
const EXPECTED_DIR = path.join(GOLDEN_DIR, 'expected/importer');

// ---------------------------------------------------------------------------
// 結果を比べられる形にそろえる
// ---------------------------------------------------------------------------

type Row = {
  date: string;
  description: string | null;
  amountOut: number;
  amountIn: number;
  balance: number | null;
  bankName: string | null;
  branchName: string | null;
  accountNumber: string | null;
  accountType: string | null;
};
type CheckedRow = Row & { calcBalance: number | null; isBalanceError: boolean };

type Outcome =
  | {
      columns: string[];
      metadata: Record<string, string>;
      hasBalance: boolean;
      rows: Row[];
      validated: CheckedRow[];
    }
  | ({ error: string } & Record<string, unknown>);

type DjangoRow = Record<string, unknown>;
type DjangoSuccess = {
  columns: string[];
  attrs: { has_balance: boolean; csv_metadata?: Record<string, unknown> };
  rows: DjangoRow[];
  validated: DjangoRow[];
};

const META_KEYS = [
  ['bank_name', 'bankName'],
  ['branch_name', 'branchName'],
  ['account_number', 'accountNumber'],
  ['account_type', 'accountType'],
] as const;

// pandas は口座番号を数値で持っていた（#1）。値の比較は文字列でそろえ、0 落ちは DEVIATIONS で扱う。
const metaText = (v: unknown): string | null => (v === null || v === undefined ? null : String(v));

function fromDjangoRow(d: DjangoRow): Row {
  const row: Row = {
    date: String(d.date).slice(0, 10),
    description: (d.description as string | null) ?? null,
    amountOut: d.amount_out as number,
    amountIn: d.amount_in as number,
    balance: (d.balance as number | null) ?? null,
    bankName: null,
    branchName: null,
    accountNumber: null,
    accountType: null,
  };
  for (const [snake, camel] of META_KEYS) row[camel] = metaText(d[snake]);
  return row;
}

function fromDjango(expected: Record<string, unknown>): Outcome {
  if ('error' in expected) return expected as Outcome;
  const d = expected as DjangoSuccess;
  const metadata: Record<string, string> = {};
  for (const [snake, camel] of META_KEYS) {
    const v = metaText(d.attrs.csv_metadata?.[snake]);
    if (v !== null) metadata[camel] = v;
  }
  return {
    // Django 版は残高の列が無いファイルにも空の balance 列を足していた。
    columns: d.attrs.has_balance ? d.columns : d.columns.filter((c) => c !== 'balance'),
    metadata,
    hasBalance: d.attrs.has_balance,
    rows: d.rows.map(fromDjangoRow),
    validated: d.validated.map((v) => ({
      ...fromDjangoRow(v),
      calcBalance: (v.calc_balance as number | null) ?? null,
      isBalanceError: v.is_balance_error as boolean,
    })),
  };
}

function strip<T extends { line: number }>({ line: _line, ...rest }: T): Omit<T, 'line'> {
  return rest;
}

function run(bytes: Uint8Array, allowMultiple: boolean): Outcome {
  let st: Statement;
  try {
    st = loadStatement(bytes, { allowMultiple });
  } catch (e) {
    if (e instanceof StatementImportError) return { error: e.name, ...e.toDict() };
    throw e;
  }
  return {
    columns: st.columns,
    metadata: st.metadata,
    hasBalance: st.hasBalance,
    rows: st.rows.map(strip),
    validated: validateBalance(st.rows, st.hasBalance).map(strip),
  };
}

// ---------------------------------------------------------------------------
// 正解と違ってよいもの（計画書 §3 の #1〜#5）
// ---------------------------------------------------------------------------

type Success = Extract<Outcome, { rows: Row[] }>;

const NO_META = { bankName: null, branchName: null, accountNumber: null, accountType: null };
const TEST_BANK = { bankName: 'テスト銀行', branchName: '本店', accountNumber: '7654321', accountType: '普通' };

// [日付, 摘要, 払戻額, お預り額, 残高, 計算上の残高, 不整合]
type RowSpec = [string, string, number, number, number | null, number, boolean];

function success(
  specs: RowSpec[],
  meta: typeof NO_META | typeof TEST_BANK = NO_META,
): Success {
  const hasMeta = meta.bankName !== null;
  const rows = specs.map(([date, description, amountOut, amountIn, balance]) => ({
    date,
    description,
    amountOut,
    amountIn,
    balance,
    ...meta,
  }));
  return {
    columns: [
      ...(hasMeta ? ['bank_name', 'branch_name', 'account_number', 'account_type'] : []),
      'date',
      'description',
      'amount_out',
      'amount_in',
      'balance',
    ],
    metadata: hasMeta ? (meta as Record<string, string>) : {},
    hasBalance: true,
    rows,
    validated: rows.map((r, i) => ({ ...r, calcBalance: specs[i]![5], isBalanceError: specs[i]![6] })),
  };
}

const DEVIATIONS: Record<string, (django: Outcome) => Outcome | ((actual: Outcome) => void)> = {
  // #1 口座番号の先頭の 0 を落とさない
  'e01_leading_zero_account.csv': (django) => {
    const d = structuredClone(django) as Success;
    expect(d.metadata.accountNumber).toBe('12345');
    d.metadata.accountNumber = '0012345';
    for (const r of [...d.rows, ...d.validated]) r.accountNumber = '0012345';
    return d;
  },

  // #2 残高の空欄は 0 ではなく「残高なし」。Django 版は2行目と3行目に不整合を出していた
  'e02_blank_balance.csv': (django) => {
    const d = structuredClone(django) as Success;
    expect(d.validated.filter((v) => v.isBalanceError)).toHaveLength(2);
    return success([
      ['2021-04-01', 'ATM', 10000, 0, 90000, 90000, false],
      ['2021-04-02', '給与', 0, 200000, null, 290000, false],
      ['2021-04-03', 'イオン', 3000, 0, 287000, 287000, false],
    ]);
  },

  // #3 日付は行ごとに判定する（Django 版はどれもファイルごと DateParseError）
  'e03_mixed_wareki_seireki.csv': () =>
    success([
      ['2021-04-01', 'ATM', 10000, 0, 90000, 90000, false],
      ['2021-04-02', '給与', 0, 200000, 290000, 290000, false],
      ['2021-04-03', 'イオン', 3000, 0, 287000, 287000, false],
    ]),
  'e13_wareki_variants.csv': () =>
    success([
      ['1989-01-07', '昭和最終日', 1, 0, 999, 999, false],
      ['1989-01-08', '平成初日', 1, 0, 998, 998, false],
      ['2019-04-30', '平成最終日', 1, 0, 997, 997, false],
      ['2019-05-01', '令和初日', 1, 0, 996, 996, false],
      ['2021-04-01', 'ゼロ埋め', 1, 0, 995, 995, false],
      ['2021-04-02', 'スラッシュ', 1, 0, 994, 994, false],
      ['2021-04-03', 'ISO', 1, 0, 993, 993, false],
      ['2021-04-04', '西暦スラッシュ', 1, 0, 992, 992, false],
    ]),
  'e13b_seireki_only.csv': () =>
    success([
      ['2021-04-03', 'ISO', 1, 0, 999, 999, false],
      ['2021-04-04', '西暦スラッシュ', 1, 0, 998, 998, false],
      ['2021-04-05', 'ゼロ埋め', 1, 0, 997, 997, false],
    ]),
  // 空行は読み飛ばす。2行目が抜けているので3行目は残高が合わない（ファイルどおり）
  'e21_blank_row.csv': () =>
    success([
      ['2021-04-01', 'ATM', 10000, 0, 90000, 90000, false],
      ['2021-04-03', 'イオン', 3000, 0, 287000, 87000, true],
    ]),
  // xlsx の日付セルと文字列の和暦が混ざっていてもよい
  'e22_excel.xlsx': () =>
    success(
      [
        ['2021-04-01', 'ATM', 10000, 0, 90000, 90000, false],
        ['2021-04-02', '給与', 0, 200000, 290000, 290000, false],
        ['2021-04-03', 'イオン', 3000, 0, 287000, 287000, false],
      ],
      TEST_BANK,
    ),

  // #4 小数は切り捨てずにエラー
  'e04_decimal_amount.csv': () => (actual) => {
    expect(actual).toMatchObject({
      error: 'AmountParseError',
      message: 'お預り額の変換に失敗しました（1件）',
      column_name: 'お預り額',
      line_number: 2,
      actual_value: '100.7',
      sample_values: ['100.7'],
    });
    expect((actual as Record<string, unknown>).suggestion).toContain('小数は使えません');
  },

  // #5 `04/03/2021` は読まない
  'e05_us_date.csv': () => (actual) => {
    expect(actual).toMatchObject({
      error: 'DateParseError',
      message: '日付の変換に失敗しました（2件）',
      line_number: 2,
      sample_values: ['04/03/2021', '04/15/2021'],
    });
  },
};

// ---------------------------------------------------------------------------

const files = fs.readdirSync(INPUT_DIR).filter((f) => fs.statSync(path.join(INPUT_DIR, f)).isFile());

describe('取込: Django 版の正解との突き合わせ', () => {
  it('入力ファイルすべてに正解がある', () => {
    expect(files.length).toBeGreaterThan(30);
    for (const f of files) expect(fs.existsSync(path.join(EXPECTED_DIR, `${f}.json`)), f).toBe(true);
  });

  it('DEVIATIONS に書いたファイルは実在する', () => {
    for (const f of Object.keys(DEVIATIONS)) expect(files).toContain(f);
  });

  for (const file of files) {
    for (const mode of ['allow_multiple_false', 'allow_multiple_true'] as const) {
      it(`${file}（${mode}）`, () => {
        const expectedAll = JSON.parse(fs.readFileSync(path.join(EXPECTED_DIR, `${file}.json`), 'utf8')) as Record<
          string,
          Record<string, unknown>
        >;
        const django = fromDjango(expectedAll[mode]!);
        const actual = run(new Uint8Array(fs.readFileSync(path.join(INPUT_DIR, file))), mode === 'allow_multiple_true');

        const deviation = DEVIATIONS[file];
        const expected = deviation ? deviation(django) : django;
        if (typeof expected === 'function') expected(actual);
        else expect(actual).toEqual(expected);
      });
    }
  }
});

describe('取込: 正解に無い入力', () => {
  const csv = (text: string) => new TextEncoder().encode(text);
  const HEADER = '日付,摘要,払戻額,お預り額,差引残高\n';

  it('.xls は形式エラー', () => {
    const bytes = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    expect(() => loadStatement(bytes)).toThrow(/\.xls/);
  });

  it('見出しより列の多い行は行番号つきで止める（末尾の空欄だけなら読む）', () => {
    expect(loadStatement(csv(`${HEADER}R3.4.1,ATM,1000,,9000,,\n`)).rows).toHaveLength(1);
    try {
      loadStatement(csv(`${HEADER}R3.4.1,ATM,1000,,9000\nR3.4.2,振込,カンマ,1000,,8000\n`));
      expect.unreachable();
    } catch (e) {
      expect((e as StatementImportError).toDict().line_number).toBe(3);
    }
  });

  it('日付の空欄は「（空欄）」と出す', () => {
    try {
      loadStatement(csv(`${HEADER}R3.4.1,ATM,1000,,9000\n,振込,1000,,8000\n`));
      expect.unreachable();
    } catch (e) {
      expect((e as StatementImportError).toDict().sample_values).toEqual(['（空欄）']);
    }
  });

  it('件数は10件で頭打ちにしない', () => {
    const lines = Array.from({ length: 12 }, () => 'X,ATM,1,,1').join('\n');
    expect(() => loadStatement(csv(`${HEADER}${lines}\n`))).toThrow('（12件）');
  });

  it('引用符の中のカンマと改行', () => {
    const st = loadStatement(csv(`${HEADER}R3.4.1,"カ,ナ\n改行",1000,,9000\n`));
    expect(st.rows[0]).toMatchObject({ description: 'カ,ナ\n改行', amountOut: 1000 });
  });

  it('金額の 100.0 は整数として受ける', () => {
    expect(loadStatement(csv(`${HEADER}R3.4.1,ATM,"1,000.0",,9000\n`)).rows[0]!.amountOut).toBe(1000);
  });
});
