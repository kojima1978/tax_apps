import { describe, expect, it } from 'vitest';
import type { IndustryYear } from '@/data/industryDataset';
import {
  CATEGORY_FIELDS,
  detectDelimiter,
  extractCategoryRows,
  extractMonthlyPriceRows,
  guessAssignment,
  MONTHLY_PRICE_FIELDS,
  previewMonthlyPrices,
  splitPastedTable,
  type ColumnAssignment,
  type Delimiter,
  type MonthlyPriceField,
} from '../parsePastedTable';

/** 貼り付けからの一連（区切り判定 → 分解 → 列推測 → 行解釈）をまとめて通す。 */
function importMonthly(text: string, delimiter?: Delimiter) {
  const table = splitPastedTable(text, delimiter ?? detectDelimiter(text));
  return {
    table,
    assignment: guessAssignment(table, MONTHLY_PRICE_FIELDS),
    ...extractMonthlyPriceRows(table, guessAssignment(table, MONTHLY_PRICE_FIELDS)),
  };
}

function importCategories(text: string) {
  const table = splitPastedTable(text, detectDelimiter(text));
  return extractCategoryRows(table, guessAssignment(table, CATEGORY_FIELDS));
}

describe('detectDelimiter', () => {
  it('タブが1つでもあればタブ区切りとみなす', () => {
    expect(detectDelimiter('1\t763\t579\n2\t812\t604')).toBe('tab');
  });

  it('列数が揃うカンマはCSVとみなす', () => {
    expect(detectDelimiter('番号,株価,2年平均\n1,763,579\n2,812,604')).toBe('comma');
  });

  it('桁区切りのカンマだけならCSVとみなさない', () => {
    // 「1 1,234」のような空白区切りは、カンマで割ると列数が揃わない。
    expect(detectDelimiter('1 1,234 987\n2 2,345\n3 456')).toBe('whitespace');
  });

  it('区切りが無ければ空白区切りにする', () => {
    expect(detectDelimiter('1 763 579')).toBe('whitespace');
  });
});

describe('splitPastedTable', () => {
  it('空行を落としつつ元の行番号を保つ', () => {
    const table = splitPastedTable('1\t763\n\n2\t812\n', 'tab');
    expect(table.rows.map((row) => row.line)).toEqual([1, 3]);
    expect(table.columnCount).toBe(2);
  });

  it('CSVの引用符を解く', () => {
    const table = splitPastedTable('1,"卸売業，小売業",763', 'comma');
    expect(table.rows[0]!.cells).toEqual(['1', '卸売業，小売業', '763']);
  });
});

describe('guessAssignment', () => {
  it('見出し行があれば見出しで列を決める', () => {
    const table = splitPastedTable('番号\t２年間の平均株価\t株価\n1\t579\t763', 'tab');
    const assignment = guessAssignment(table, MONTHLY_PRICE_FIELDS);
    expect(assignment).toEqual({ number: 0, twoYearAveragePrice: 1, price: 2 });
  });

  it('見出しが無ければ数値列を左から順に割り当てる', () => {
    const table = splitPastedTable('1\t763\t579\n2\t812\t604', 'tab');
    expect(guessAssignment(table, MONTHLY_PRICE_FIELDS)).toEqual({
      number: 0,
      price: 1,
      twoYearAveragePrice: 2,
    });
  });
});

describe('extractMonthlyPriceRows', () => {
  it('全角数字と桁区切りを読める', () => {
    const result = importMonthly('１\t１，２３４\t９８７\n2\t2,345\t1,876');
    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([
      { line: 1, number: 1, price: 1234, twoYearAveragePrice: 987 },
      { line: 2, number: 2, price: 2345, twoYearAveragePrice: 1876 },
    ]);
  });

  it('見出し行・注記行は読み飛ばす', () => {
    const result = importMonthly('番号\t株価\t２年平均\n1\t763\t579\n（注）単位は円', 'tab');
    expect(result.rows).toHaveLength(1);
    expect(result.skipped.map((issue) => issue.line)).toEqual([1, 3]);
  });

  it('2年平均が空欄なら未公表として null にする', () => {
    const result = importMonthly('番号\t株価\t２年平均\n1\t763\t\n2\t812\t-', 'tab');
    expect(result.rows.map((row) => row.twoYearAveragePrice)).toEqual([null, null]);
  });

  it('重複した業種目番号はエラーにする', () => {
    const result = importMonthly('1\t763\n1\t812', 'tab');
    expect(result.rows).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({ line: 2 });
    expect(result.errors[0]!.reason).toContain('重複');
  });

  it('株価が数値でない行はエラーにする', () => {
    const result = importMonthly('番号\t株価\n1\t非公表', 'tab');
    expect(result.rows).toEqual([]);
    expect(result.errors[0]!.reason).toContain('株価');
  });

  it('必須列が割り当てられていなければ何も取り込まない', () => {
    const table = splitPastedTable('1\n2', 'tab');
    const assignment: ColumnAssignment<MonthlyPriceField> = { number: 0 };
    const result = extractMonthlyPriceRows(table, assignment);
    expect(result.rows).toEqual([]);
    expect(result.errors[0]).toEqual({ line: 0, reason: '列が未割当です: 株価' });
  });
});

describe('extractCategoryRows', () => {
  const HEADER = '番号\t大分類\t中分類\t小分類\tB\tC\tD\t前年平均\n';

  it('最も下位の区分から階層を決める', () => {
    const result = importCategories(
      `${HEADER}1\t製造業\t\t\t5.2\t34\t312\t451\n`
      + '2\t製造業\t食料品製造業\t\t4.8\t30\t289\t402\n'
      + '3\t製造業\t食料品製造業\tパン・菓子製造業\t4.1\t28\t265\t388',
    );
    expect(result.errors).toEqual([]);
    expect(result.rows.map((row) => row.level)).toEqual(['LARGE', 'MIDDLE', 'SMALL']);
    // 業種目名の列が無い表では、最下位の区分名を名前に使う。
    expect(result.rows.map((row) => row.name)).toEqual([
      '製造業', '食料品製造業', 'パン・菓子製造業',
    ]);
  });

  it('Bは小数、△付きの利益は負数として読む', () => {
    const result = importCategories(`${HEADER}1\t製造業\t\t\t5.2\t△34\t312\t451`);
    expect(result.rows[0]).toMatchObject({ dividend: 5.2, profit: -34, netAsset: 312 });
  });

  it('大分類が空欄の行はエラーにする', () => {
    const result = importCategories(`${HEADER}1\t\t\t\t5.2\t34\t312\t451`);
    expect(result.rows).toEqual([]);
    expect(result.errors[0]!.reason).toContain('大分類');
  });
});

const YEAR: IndustryYear = {
  label: '令和8年分',
  era: '令和',
  eraYear: 8,
  gregorianYear: 2026,
  sourceUrl: null,
  note: '',
  categories: [
    {
      number: 1,
      largeName: '製造業',
      middleName: '',
      smallName: '',
      name: '製造業',
      level: 'LARGE',
      dividend: 5.2,
      profit: 34,
      netAsset: 312,
      previousYearAveragePrice: 451,
      monthlyPrices: [{ year: 2026, month: 1, price: 763, twoYearAveragePrice: 579 }],
    },
    {
      number: 2,
      largeName: '建設業',
      middleName: '',
      smallName: '',
      name: '建設業',
      level: 'LARGE',
      dividend: 4.8,
      profit: 30,
      netAsset: 289,
      previousYearAveragePrice: 402,
      monthlyPrices: [],
    },
  ],
};

describe('previewMonthlyPrices', () => {
  it('登録済みの値と突き合わせて新規・変更・据置を分ける', () => {
    const { rows } = importMonthly('1\t763\t579\n2\t812\t604');
    const preview = previewMonthlyPrices(rows, YEAR, 2026, 1);

    expect(preview.diffs.map((diff) => diff.status)).toEqual(['same', 'new']);
    expect(preview.unknownNumbers).toEqual([]);
    expect(preview.missingNumbers).toEqual([]);
  });

  it('株価が違えば変更として前後を持つ', () => {
    const { rows } = importMonthly('1\t800\t579');
    const preview = previewMonthlyPrices(rows, YEAR, 2026, 1);

    expect(preview.diffs[0]).toMatchObject({
      status: 'changed',
      before: { price: 763, twoYearAveragePrice: 579 },
      after: { price: 800, twoYearAveragePrice: 579 },
    });
  });

  it('同じ番号でも月が違えば新規になる', () => {
    const { rows } = importMonthly('1\t763\t579');
    expect(previewMonthlyPrices(rows, YEAR, 2026, 2).diffs[0]!.status).toBe('new');
  });

  it('その年分に無い番号と、貼り付けに無い番号を拾う', () => {
    const { rows } = importMonthly('1\t763\t579\n99\t900\t700');
    const preview = previewMonthlyPrices(rows, YEAR, 2026, 1);

    expect(preview.unknownNumbers).toEqual([99]);
    expect(preview.missingNumbers).toEqual([2]);
  });
});
