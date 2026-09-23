/**
 * 第5表の明細。入れ替えなので「消える行」を取り違えると気づけない壊れ方をする。
 */
import { describe, expect, it } from 'vitest';
import type { CaseData } from '../catalog.js';
import { applyBalanceSheet, readBalanceRows } from '../table5.js';
import { catalog } from './fixtures.js';

const rowTable = catalog.rowTables[0]!;

const existing: CaseData = {
  table5: {
    a_1_1: '現金及び預金',
    a_1_2: '1,000',
    a_1_3: '1,000',
    a_2_1: '売掛金',
    a_2_2: '500',
    a_2_3: '500',
    l_1_1: '買掛金',
    l_1_2: '300',
    l_1_3: '300',
  },
  table4: { f28: '1,000' },
};

describe('明細の読み出し', () => {
  it('入力済みの行だけを返す', () => {
    const rows = readBalanceRows(rowTable, existing, 'a');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ row: 1, name: '現金及び預金', evaluated: '1,000', book: '1,000', note: '' });
  });

  it('間が空いていても行番号を保ったまま返す', () => {
    const rows = readBalanceRows(rowTable, { table5: { a_5_1: '土地' } }, 'a');
    expect(rows).toEqual([{ row: 5, name: '土地', evaluated: '', book: '', note: '' }]);
  });
});

describe('明細の入れ替え', () => {
  it('1行目から詰め直し、その側の古い行は消す', () => {
    const { data, sides } = applyBalanceSheet(catalog, existing, {
      asset: [{ name: '土地', evaluated: 8000, book: 5000, note: '土地等' }],
    });

    expect(data.table5?.a_1_1).toBe('土地');
    expect(data.table5?.a_1_2).toBe('8,000');
    expect(data.table5?.a_1_3).toBe('5,000');
    expect(data.table5?.a_1_4).toBe('土地等');
    expect(data.table5?.a_2_1).toBeUndefined();

    expect(sides).toHaveLength(1);
    expect(sides[0]?.before.map((r) => r.name)).toEqual(['現金及び預金', '売掛金']);
    expect(sides[0]?.after.map((r) => r.name)).toEqual(['土地']);
  });

  it('指定しなかった側と他の表はそのまま', () => {
    const { data } = applyBalanceSheet(catalog, existing, { asset: [{ name: '土地' }] });
    expect(data.table5?.l_1_1).toBe('買掛金');
    expect(data.table4?.f28).toBe('1,000');
  });

  it('元のデータは書き換えない', () => {
    applyBalanceSheet(catalog, existing, { asset: [{ name: '土地' }] });
    expect(existing.table5?.a_2_1).toBe('売掛金');
  });

  it('空欄は保存しない', () => {
    const { data } = applyBalanceSheet(catalog, {}, { asset: [{ name: '土地', book: 5000 }] });
    expect(data.table5?.a_1_3).toBe('5,000');
    expect(data.table5?.a_1_2).toBeUndefined();
    expect(data.table5?.a_1_4).toBeUndefined();
  });

  // 貸倒引当金のような控除項目はマイナスで入る。
  it('金額欄はマイナスを受け付ける', () => {
    const { data } = applyBalanceSheet(catalog, {}, {
      asset: [{ name: '貸倒引当金', evaluated: -120, book: -120 }],
    });
    expect(data.table5?.a_1_2).toBe('△120');
  });

  it('科目が空の行は弾く', () => {
    expect(() =>
      applyBalanceSheet(catalog, {}, { asset: [{ name: '土地' }, { name: '', book: 100 }] }),
    ).toThrow(/空行を挟むと以降の行がずれる/);
  });

  it('備考は側ごとの選択肢に照らす', () => {
    expect(() =>
      applyBalanceSheet(catalog, {}, { asset: [{ name: '土地', note: '不動産' }] }),
    ).toThrow(/選択肢にありません/);
    expect(() =>
      applyBalanceSheet(catalog, {}, { liability: [{ name: '買掛金', note: '株式等' }] }),
    ).toThrow(/選べるのは なし/);
  });

  it('行数の上限を超えたら弾く', () => {
    const rows = Array.from({ length: rowTable.maxRows + 1 }, (_, i) => ({ name: `科目${i + 1}` }));
    expect(() => applyBalanceSheet(catalog, {}, { asset: rows })).toThrow(/上限を超えています/);
  });

  it('側を1つも指定しなければ弾く', () => {
    expect(() => applyBalanceSheet(catalog, {}, {})).toThrow(/取り込む側が指定されていません/);
  });

  it('0行を指定するとその側は空になる', () => {
    const { data, sides } = applyBalanceSheet(catalog, existing, { asset: [] });
    expect(data.table5?.a_1_1).toBeUndefined();
    expect(data.table5?.l_1_1).toBe('買掛金');
    expect(sides[0]?.after).toHaveLength(0);
  });

  // 様式の列が増減したら、黙って隣の欄へ書くのではなくそこで落ちる。
  it('辞書の列数が前提と違えば落ちる', () => {
    const narrowed = {
      ...catalog,
      rowTables: [{ ...rowTable, columns: rowTable.columns.slice(0, 3) }],
    };
    expect(() => applyBalanceSheet(narrowed, {}, { asset: [{ name: '土地' }] })).toThrow(
      /列が3列に変わっています/,
    );
  });
});
