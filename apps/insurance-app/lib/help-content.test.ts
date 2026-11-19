import { describe, expect, it } from 'vitest';
import { helpDocProblems } from '@/lib/shared/help-doc/helpDoc';
import { CASE_SECTIONS } from '@/utils/caseSections';
import { HELP_SECTIONS } from './help-content';

describe('使い方の本文', () => {
  it('見出しの番号・空の欄・表の列数が崩れていない', () => {
    expect(helpDocProblems(HELP_SECTIONS)).toEqual([]);
  });

  it('お客様の画面の表はサイドバーの画面を全部、サイドバーの順で載せる', () => {
    const section = HELP_SECTIONS.find(s => s.id === 'case-screens');
    const table = section?.blocks.find(b => b.kind === 'table');
    const names = table && table.kind === 'table' ? table.rows.map(row => row[0]) : [];
    expect(names).toEqual(CASE_SECTIONS.map(s => s.label));
  });
});
