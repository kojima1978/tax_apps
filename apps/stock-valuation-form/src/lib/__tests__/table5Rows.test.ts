import { describe, expect, it } from 'vitest';
import type { TableId } from '@/types/form';
import { TABLE5_MAX_PAGES, table5RowCount, table5TotalRowsOf } from '../table5Rows';

describe('第5表の明細行数', () => {
  const pages = (value: string) => (_table: TableId, field: string) => (field === '_pages' ? value : '');

  it('続紙のぶんだけ行が増える', () => {
    expect(table5TotalRowsOf(1)).toBe(15);
    expect(table5TotalRowsOf(2)).toBe(38);
    expect(table5TotalRowsOf(TABLE5_MAX_PAGES)).toBe(222);
  });

  it('_pages が空欄・0・数値でないときは本表のみとして扱う', () => {
    expect(table5RowCount(pages(''))).toBe(15);
    expect(table5RowCount(pages('0'))).toBe(15);
    expect(table5RowCount(pages('abc'))).toBe(15);
  });

  it('_pages の枚数どおりに行数を返す', () => {
    expect(table5RowCount(pages('2'))).toBe(38);
    expect(table5RowCount(pages('3'))).toBe(61);
  });
});
