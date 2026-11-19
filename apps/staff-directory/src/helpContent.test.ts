import { describe, expect, it } from 'vitest';
import { HELP_SECTIONS } from './helpContent';
import { LINKED_APPS, READING_APPS } from './linkedApps';
import { APP_PAGES, HELP_PAGE } from './navigation';
import { helpDocProblems } from './shared/help-doc/helpDoc';
import { MISSING_LABEL } from './staffList';

/** 節の中の最初の表の1列目（画面名・アプリ名などの見出し） */
function firstColumn(sectionId: string): string[] {
  const table = HELP_SECTIONS.find((s) => s.id === sectionId)?.blocks.find((b) => b.kind === 'table');
  return table?.kind === 'table' ? table.rows.map((row) => row[0] ?? '') : [];
}

describe('使い方の本文', () => {
  it('目次と見出しの食い違い・空の欄・表の列数違いが無い', () => {
    expect(helpDocProblems(HELP_SECTIONS)).toEqual([]);
  });

  it('画面の構成の表はサイドバーの画面と同じ並び', () => {
    const pages = [...APP_PAGES, HELP_PAGE].map((p) => p.label);
    expect(firstColumn('screens').slice(0, pages.length)).toEqual(pages);
  });

  it('未入力の絞り込みのチップは社員一覧と同じ名前', () => {
    const chips = HELP_SECTIONS.find((s) => s.id === 'staff-list')?.blocks.filter((b) => b.kind === 'table')[1];
    const labels = chips?.kind === 'table' ? chips.rows.map((row) => row[0]) : [];
    expect(labels).toEqual(expect.arrayContaining(Object.values(MISSING_LABEL)));
  });

  it('台帳を使うアプリの表は連携の画面と同じアプリ', () => {
    expect(firstColumn('links')).toEqual([...LINKED_APPS, ...READING_APPS].map((a) => a.label));
  });
});
