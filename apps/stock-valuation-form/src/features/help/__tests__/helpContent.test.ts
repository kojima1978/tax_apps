import { describe, expect, it } from 'vitest';
import { helpDocProblems } from '@/shared/help-doc/helpDoc';
import { NAV_TABS } from '@/data/constants';
import { SHORTCUTS } from '@/data/shortcuts';
import { HELP_SECTIONS } from '../helpContent';

/** 節の中の最初の表の1列目（表が無ければ空）。 */
function firstColumn(sectionId: string): string[] {
  const section = HELP_SECTIONS.find((s) => s.id === sectionId);
  const table = section?.blocks.find((b) => b.kind === 'table');
  return table && table.kind === 'table' ? table.rows.map((row) => row[0] ?? '') : [];
}

describe('使い方の本文', () => {
  it('見出しの番号・空の欄・表の列数が崩れていない', () => {
    expect(helpDocProblems(HELP_SECTIONS)).toEqual([]);
  });

  it('表の一覧はサイドバーの表を全部、サイドバーの順で載せる', () => {
    expect(firstColumn('tables')).toEqual(NAV_TABS.map((tab) => tab.label));
  });

  it('ショートカットは画面の一覧（?）と同じものを載せる', () => {
    expect(firstColumn('shortcuts')).toEqual(SHORTCUTS.map((s) => s.keys.join(' ＋ ')));
  });
});
