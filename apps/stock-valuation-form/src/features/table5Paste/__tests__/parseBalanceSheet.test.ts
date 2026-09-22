// 第5表への貼り付け取込。
//
// 確かめたいのは「取り込む行」より「取り込まない行」で、合計行や区分の見出しを
// 1明細として入れてしまうと②総資産価額が黙って二重になる。最後に、項目2の通し検算で
// 使っている架空1社を貼り付け直して①③が一致するところまで往復させる。

import { describe, expect, it } from 'vitest';
import { makeGetField, sampleCompany } from '@/__tests__/walkthrough/sampleCompany';
import { calcTable5 } from '@/components/tables/table5/Table5Grid';
import { detectDelimiter, splitPastedTable } from '@/features/pastedTable/parseTable';
import {
  BALANCE_SHEET_FIELDS,
  type BalanceSheetRow,
  type BalanceSheetSide,
  extractBalanceSheetRows,
  guessBalanceSheetAssignment,
  lastUsedRow,
  planApply,
} from '../parseBalanceSheet';
import {
  TABLE5_CONT_ROWS,
  TABLE5_MAIN_ROWS,
  TABLE5_MAX_PAGES,
  table5TotalRowsOf,
} from '@/lib/table5Rows';

/** 貼り付けテキストを、画面と同じ経路（区切り判定 → 列の推測 → 行の解釈）で読む。 */
function read(text: string, side: BalanceSheetSide = 'a') {
  const table = splitPastedTable(text, detectDelimiter(text));
  const assignment = guessBalanceSheetAssignment(table, BALANCE_SHEET_FIELDS);
  return { assignment, ...extractBalanceSheetRows(table, assignment, side) };
}

const blank = (count: number) => Array.from({ length: count }, () => ['', '', '', '']);

const row = (name: string, evaluated = '', book = '', note = ''): BalanceSheetRow =>
  ({ line: 1, name, evaluated, book, note });

const HEADER = '科目\t相続税評価額\t帳簿価額\t備考';

describe('列の割り当て', () => {
  it('見出し行があれば4列とも当たる', () => {
    const { assignment } = read(`${HEADER}\n現金預金\t80000\t80000\t`);
    expect(assignment).toEqual({ name: 0, evaluated: 1, book: 2, note: 3 });
  });

  it('見出しの順序が入れ替わっていても当たる', () => {
    const { assignment } = read('科目\t帳簿価額\t相続税評価額\n現金預金\t80000\t80000');
    expect(assignment).toEqual({ name: 0, book: 1, evaluated: 2 });
  });

  it('「帳簿評価額」は帳簿価額に割り当てる（相続税評価額に吸わせない）', () => {
    const { assignment } = read('科目\t帳簿評価額\n現金預金\t80000');
    expect(assignment.book).toBe(1);
    expect(assignment.evaluated).toBeUndefined();
  });

  it('見出しの無い「科目→金額」の2列でも科目の列を補う', () => {
    // 共通の推測は数値欄しか埋められないので、数字がひとつも無い列を科目とみなす。
    const { assignment, rows } = read('現金預金\t80000\n売掛金\t60000');
    expect(assignment.name).toBe(0);
    expect(rows.map((item) => item.name)).toEqual(['現金預金', '売掛金']);
  });

  it('科目の列が決まらなければ1行も取り込まない', () => {
    const table = splitPastedTable('80000\t80000\n60000\t60000', 'tab');
    const result = extractBalanceSheetRows(table, { evaluated: 0, book: 1 }, 'a');
    expect(result.rows).toEqual([]);
    expect(result.errors).toEqual([{ line: 0, reason: '科目の列が決まっていません' }]);
  });

  it('金額の列がひとつも決まっていなければ取り込まない', () => {
    const table = splitPastedTable('現金預金\t80000', 'tab');
    const result = extractBalanceSheetRows(table, { name: 0 }, 'a');
    expect(result.rows).toEqual([]);
    expect(result.errors[0]?.reason).toBe('相続税評価額か帳簿価額のどちらかは列を決めてください');
  });
});

describe('取り込まない行', () => {
  it('合計・小計とみられる行は除外し、理由を残す', () => {
    const { rows, skipped } = read([
      HEADER,
      '現金預金\t80000\t80000\t',
      '流動資産合計\t180000\t180000\t',
      '小計\t180000\t180000\t',
      '計\t360000\t360000\t',
    ].join('\n'));

    expect(rows.map((item) => item.name)).toEqual(['現金預金']);
    // 見出し1行＋合計3行。②に二重計上される旨を必ず出す。
    expect(skipped).toHaveLength(4);
    expect(skipped.filter((issue) => issue.reason.includes('二重計上'))).toHaveLength(3);
  });

  it('金額の無い行（区分の見出し）は除外する', () => {
    const { rows, skipped } = read([HEADER, '【流動資産】\t\t\t', '現金預金\t80000\t80000\t'].join('\n'));
    expect(rows.map((item) => item.name)).toEqual(['現金預金']);
    expect(skipped.some((issue) => issue.reason.includes('【流動資産】'))).toBe(true);
  });

  it('科目が空の行は除外する', () => {
    const { rows, skipped } = read([HEADER, '\t80000\t80000\t', '現金預金\t80000\t80000\t'].join('\n'));
    expect(rows).toHaveLength(1);
    expect(skipped.some((issue) => issue.reason === '科目が空の行')).toBe(true);
  });
});

describe('金額の読み取り', () => {
  it('全角・桁区切り・△ を吸収する', () => {
    const { rows } = read([HEADER, '現金預金\t８０，０００\t1,234\t', '繰延税金資産\t△5,000\t▲5000\t'].join('\n'));
    expect(rows[0]).toMatchObject({ name: '現金預金', evaluated: '80000', book: '1234' });
    expect(rows[1]).toMatchObject({ name: '繰延税金資産', evaluated: '-5000', book: '-5000' });
  });

  it('小数は端数処理せずエラーにする', () => {
    const { rows, errors } = read([HEADER, '現金預金\t80000.5\t80000\t'].join('\n'));
    expect(rows).toEqual([]);
    expect(errors[0]?.reason).toContain('小数');
  });

  it('金額として読めない行はエラーにする', () => {
    const { rows, errors } = read([HEADER, '現金預金\t八万\t80000\t'].join('\n'));
    expect(rows).toEqual([]);
    expect(errors[0]?.reason).toContain('金額として読めません');
  });

  it('片方だけの金額はそのまま取り込む（もう片方は空のまま）', () => {
    // 試算表からの貼り付けは帳簿価額しか無いことが多い。相続税評価額は人が入れる。
    const { rows } = read('科目\t帳簿価額\n現金預金\t80000');
    expect(rows[0]).toMatchObject({ evaluated: '', book: '80000' });
  });
});

describe('備考', () => {
  it('資産側は「株式等」「土地等」だけ採用し、それ以外は空欄にして理由を出す', () => {
    const { rows, notices } = read([
      HEADER,
      '土地\t150000\t50000\t土地等',
      '投資有価証券\t60000\t40000\t株式等',
      '建物\t30000\t25000\t本社',
    ].join('\n'), 'a');

    expect(rows.map((item) => item.note)).toEqual(['土地等', '株式等', '']);
    expect(notices).toHaveLength(1);
    expect(notices[0]?.reason).toContain('選択肢');
  });

  it('負債側の備考は様式上も自由記入なのでそのまま入れる', () => {
    const { rows, notices } = read([HEADER, '長期借入金\t120000\t120000\t○○銀行'].join('\n'), 'l');
    expect(rows[0]?.note).toBe('○○銀行');
    expect(notices).toEqual([]);
  });
});

describe('取り込み位置と続紙', () => {
  const plan = (existing: string[][], incoming: BalanceSheetRow[], mode: 'append' | 'replace', otherUsed = 0) =>
    planApply({ existing, incoming, mode, otherUsed, mainRows: 15, contRows: 23, maxPages: 2 });

  it('末尾に追加は、入力済みの最終行の後ろへ足す（途中の空行は詰めない）', () => {
    const existing = blank(15);
    existing[0] = ['現金預金', '80000', '80000', ''];
    existing[2] = ['棚卸資産', '40000', '40000', ''];

    const result = plan(existing, [row('建物', '30000', '25000')], 'append');
    expect(result.rows[1]).toEqual(['', '', '', '']);
    expect(result.rows[3]).toEqual(['建物', '30000', '25000', '']);
    expect(result.pages).toBe(1);
    expect(result.overflow).toBe(0);
  });

  it('入れ替えは、既存の行をすべて空にしてから先頭に入れる', () => {
    const existing = blank(15);
    existing[0] = ['現金預金', '80000', '80000', ''];
    existing[1] = ['売掛金', '60000', '60000', ''];

    const result = plan(existing, [row('建物', '30000', '25000')], 'replace');
    expect(result.rows[0]).toEqual(['建物', '30000', '25000', '']);
    expect(result.rows[1]).toEqual(['', '', '', '']);
  });

  it('本表15行に収まらなければ続紙を1枚増やす', () => {
    const incoming = Array.from({ length: 20 }, (_, i) => row(`科目${i + 1}`, '1000'));
    const result = plan(blank(15), incoming, 'replace');
    expect(result.pages).toBe(2);
    expect(result.capacity).toBe(38);
    expect(result.overflow).toBe(0);
  });

  it('続紙を足しても収まらない行数は取り込まない（何行余るかを返す）', () => {
    const incoming = Array.from({ length: 40 }, (_, i) => row(`科目${i + 1}`, '1000'));
    const result = plan(blank(15), incoming, 'replace');
    expect(result.capacity).toBe(38);
    expect(result.overflow).toBe(2);
  });

  it('行数が減れば続紙を減らすが、反対側が使っていれば残す', () => {
    const existing = blank(38);
    existing[30] = ['科目31', '1000', '1000', ''];

    expect(plan(existing, [row('現金預金', '80000')], 'replace').pages).toBe(1);
    expect(plan(existing, [row('現金預金', '80000')], 'replace', 20).pages).toBe(2);
  });

  it('アプリの上限（続紙9枚・222行）まで続紙を増やし、超えた分は取り込まない', () => {
    const many = (count: number) => Array.from({ length: count }, (_, i) => row(`科目${i + 1}`, '1000'));
    const appPlan = (incoming: BalanceSheetRow[]) => planApply({
      existing: blank(TABLE5_MAIN_ROWS), incoming, mode: 'replace' as const, otherUsed: 0,
      mainRows: TABLE5_MAIN_ROWS, contRows: TABLE5_CONT_ROWS, maxPages: TABLE5_MAX_PAGES,
    });

    // 100行 → 本表15行＋続紙4枚（107行）
    expect(appPlan(many(100))).toMatchObject({ pages: 5, overflow: 0 });

    const capacity = table5TotalRowsOf(TABLE5_MAX_PAGES);
    expect(capacity).toBe(222);
    expect(appPlan(many(capacity))).toMatchObject({ pages: TABLE5_MAX_PAGES, overflow: 0 });
    expect(appPlan(many(capacity + 1)).overflow).toBe(1);
  });

  it('lastUsedRow は値の入っている最終行を返す', () => {
    const rows = blank(10);
    rows[4] = ['売掛金', '60000', '60000', ''];
    expect(lastUsedRow(rows)).toBe(5);
    expect(lastUsedRow(blank(10))).toBe(0);
  });
});

describe('往復（架空1社を貼り付け直す）', () => {
  // 項目2の通し検算と同じ会社。貼り付けた結果が第5表の入力そのものになり、
  // ①総資産価額・③負債合計まで一致することを確かめる。
  const ASSET_TEXT = [
    HEADER,
    '現金預金\t80,000\t80,000\t',
    '売掛金\t60,000\t60,000\t',
    '棚卸資産\t40,000\t40,000\t',
    '建物\t30,000\t25,000\t',
    '土地\t150,000\t50,000\t土地等',
    '投資有価証券\t60,000\t40,000\t株式等',
    '保険積立金\t20,000\t20,000\t',
    '資産合計\t440,000\t315,000\t',
  ].join('\n');

  const LIABILITY_TEXT = [
    HEADER,
    '買掛金\t50,000\t50,000\t',
    '長期借入金\t120,000\t120,000\t',
    '未払法人税等\t15,000\t15,000\t',
    '賞与引当金\t8,000\t8,000\t',
    '負債合計\t193,000\t193,000\t',
  ].join('\n');

  /** 取り込んだ結果を様式のフィールド（a_1_1 …／l_1_1 …）へ展開する。 */
  function fieldsOf(text: string, side: BalanceSheetSide) {
    const { rows, errors } = read(text, side);
    expect(errors).toEqual([]);
    const result = planApply({
      existing: blank(15), incoming: rows, mode: 'replace', otherUsed: 0,
      mainRows: 15, contRows: 23, maxPages: 2,
    });
    expect(result.overflow).toBe(0);

    const fields: Record<string, string> = {};
    result.rows.forEach((cells, index) => {
      cells.forEach((value, column) => {
        if (value !== '') fields[`${side}_${index + 1}_${column + 1}`] = value;
      });
    });
    return fields;
  }

  const table5 = { ...fieldsOf(ASSET_TEXT, 'a'), ...fieldsOf(LIABILITY_TEXT, 'l') };

  it('手で入力した第5表と同じフィールドになる', () => {
    expect(table5).toEqual(sampleCompany.table5);
  });

  it('①総資産価額と③負債合計が通し検算と一致する', () => {
    const calculated = calcTable5(makeGetField({ ...sampleCompany, table5 }));
    expect(calculated['①']).toBe(440000);
    // 賞与引当金は評価通達186により負債に含めない（185,000＝193,000−8,000）。
    expect(calculated['③']).toBe(185000);
  });
});
