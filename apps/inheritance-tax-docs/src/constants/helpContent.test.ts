import { describe, it, expect } from 'vitest';
import { HELP_SECTIONS, type HelpBlock } from './helpContent';
import { DOC_LIST_TYPE_LABELS } from './index';

// 目次（画面）は HELP_SECTIONS を .map() して作るので、ここが崩れていなければ
// 目次のリンクと見出しの id は1対1になる。

const allBlocks = (): HelpBlock[] => HELP_SECTIONS.flatMap((section) => [...section.blocks]);

const blockText = (block: HelpBlock): string => {
  switch (block.kind) {
    case 'paragraph':
    case 'note':
      return block.text;
    case 'list':
    case 'steps':
      return block.items.join('\n');
    case 'table':
      return [block.caption ?? '', ...block.headers, ...block.rows.flat()].join('\n');
  }
};

describe('HELP_SECTIONS', () => {
  it('節の id が重複していない', () => {
    const ids = HELP_SECTIONS.map((section) => section.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('節の id はアンカーに使える文字だけ', () => {
    for (const section of HELP_SECTIONS) {
      expect(section.id).toMatch(/^[a-z][a-z0-9-]*$/);
    }
  });

  it('見出しの番号が目次の並び順と一致している（欠番・重複なし）', () => {
    HELP_SECTIONS.forEach((section, index) => {
      expect(section.title.startsWith(`${index + 1}. `)).toBe(true);
    });
  });

  it('どの節にも1行説明と本文がある', () => {
    for (const section of HELP_SECTIONS) {
      expect(section.summary.trim()).not.toBe('');
      expect(section.blocks.length).toBeGreaterThan(0);
    }
  });

  it('本文のブロックに空の文章・空の箇条書きが無い', () => {
    for (const block of allBlocks()) {
      if (block.kind === 'paragraph' || block.kind === 'note') {
        expect(block.text.trim()).not.toBe('');
      } else if (block.kind === 'list' || block.kind === 'steps') {
        expect(block.items.length).toBeGreaterThan(0);
        for (const item of block.items) expect(item.trim()).not.toBe('');
      }
    }
  });

  it('表の列数が見出しと揃っていて、空のセルが無い', () => {
    for (const block of allBlocks()) {
      if (block.kind !== 'table') continue;
      expect(block.headers.length).toBeGreaterThan(1);
      expect(block.rows.length).toBeGreaterThan(0);
      for (const row of block.rows) {
        expect(row.length).toBe(block.headers.length);
        for (const cell of row) expect(cell.trim()).not.toBe('');
      }
    }
  });

  it('箇条書きと表の行に同じ内容が並んでいない（key の重複になる）', () => {
    for (const block of allBlocks()) {
      if (block.kind === 'list' || block.kind === 'steps') {
        expect(new Set(block.items).size).toBe(block.items.length);
      } else if (block.kind === 'table') {
        const keys = block.rows.map((row) => row.join('|'));
        expect(new Set(keys).size).toBe(keys.length);
      }
    }
  });

  it('本文中の「他の節」への参照は実在する節の見出しを指している', () => {
    const titles = new Set(HELP_SECTIONS.map((section) => section.title));
    for (const block of allBlocks()) {
      for (const match of blockText(block).matchAll(/「(\d+\. [^」]+)」/g)) {
        expect(titles).toContain(match[1]);
      }
    }
  });

  it('書類リストの種別はすべて説明に出てくる', () => {
    const text = allBlocks().map(blockText).join('\n') + HELP_SECTIONS.map((s) => s.summary).join('\n');
    for (const label of Object.values(DOC_LIST_TYPE_LABELS)) {
      expect(text).toContain(label.replace(/申告$/, ''));
    }
  });
});
