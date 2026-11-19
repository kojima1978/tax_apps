import { describe, expect, it } from 'vitest';
import { helpDocProblems, type HelpSection } from './helpDoc';

const intro: HelpSection = { id: 'intro', title: '1. はじめに', summary: 'できること', blocks: [{ kind: 'paragraph', text: '本文' }] };
const list: HelpSection = {
  id: 'list-2',
  title: '2. 一覧',
  summary: '表と手順',
  blocks: [
    { kind: 'steps', items: ['開く', '選ぶ'] },
    { kind: 'table', headers: ['画面', '中身'], rows: [['一覧', '検索'], ['詳細', '編集']] },
    { kind: 'note', text: '注意' },
  ],
};
// 節は名前で持ち、配列の添字では取り出さない（noUncheckedIndexedAccess のアプリでは undefined 込みの型になり tsc が落ちる）
const ok: HelpSection[] = [intro, list];

describe('helpDocProblems', () => {
  it('整った本文には何も言わない', () => {
    expect(helpDocProblems(ok)).toEqual([]);
  });

  it('節が無いのは崩れ', () => {
    expect(helpDocProblems([])).toHaveLength(1);
  });

  it('id の重複・使えない文字を見つける', () => {
    const problems = helpDocProblems([intro, { ...list, id: 'intro' }, { ...list, id: '3rd', title: '3. 三' }]);
    expect(problems.some((p) => p.includes('重複'))).toBe(true);
    expect(problems.some((p) => p.includes('アンカー'))).toBe(true);
  });

  it('見出しの番号が並び順と食い違うのを見つける', () => {
    const problems = helpDocProblems([list, intro]);
    expect(problems.filter((p) => p.includes('で始まっていません'))).toHaveLength(2);
  });

  it('空の1行説明・空の本文・空の文章を見つける', () => {
    const problems = helpDocProblems([
      { id: 'a', title: '1. a', summary: ' ', blocks: [] },
      { id: 'b', title: '2. b', summary: 'b', blocks: [{ kind: 'paragraph', text: '' }, { kind: 'list', items: [] }] },
    ]);
    expect(problems).toHaveLength(4);
  });

  it('表の列数違い・空のセル・重複行を見つける', () => {
    const problems = helpDocProblems([
      {
        id: 'a',
        title: '1. a',
        summary: 'a',
        blocks: [{ kind: 'table', headers: ['x', 'y'], rows: [['1'], ['1', ''], ['2', '2'], ['2', '2']] }],
      },
    ]);
    expect(problems.some((p) => p.includes('列数'))).toBe(true);
    expect(problems.some((p) => p.includes('空のセル'))).toBe(true);
    expect(problems.some((p) => p.includes('同じ行'))).toBe(true);
  });

  it('箇条書きの重複を見つける（画面は文を key に使う）', () => {
    const problems = helpDocProblems([{ id: 'a', title: '1. a', summary: 'a', blocks: [{ kind: 'steps', items: ['同じ', '同じ'] }] }]);
    expect(problems).toHaveLength(1);
  });
});
