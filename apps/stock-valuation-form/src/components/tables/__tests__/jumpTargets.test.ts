import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { basename, join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { TABS } from '@/data/constants';

/**
 * jumpTo は「タブを切り替えてから欄を探す」ので、遷移先はタブ列に実在する表でなければ
 * 何も起きずに終わる（querySelector が空振りするだけで、エラーも警告も出ない）。
 * table4 / table7 / table8 は第4表・第7表を分割したときに残したデータバケットのIDで、
 * タブ列には無い。実際に第4表の1 G25 →第4表の1 ① などが第4表の2へ飛んで空振りしていた。
 */
const TABLES_DIR = fileURLToPath(new URL('..', import.meta.url));

function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : tsxFiles(full);
    return e.name.endsWith('.tsx') ? [full] : [];
  });
}

describe('jumpTo の遷移先', () => {
  it('タブ列に実在する表だけを指す（データバケットのIDは指さない）', () => {
    const tabIds = new Set<string>(TABS.map((t) => t.id));
    const bad: string[] = [];
    let found = 0;
    for (const file of tsxFiles(TABLES_DIR)) {
      const text = readFileSync(file, 'utf-8');
      for (const m of text.matchAll(/jumpTo:[^{;\n]*\{\s*tab:\s*'([^']+)'/g)) {
        found += 1;
        if (!tabIds.has(m[1]!)) bad.push(`${basename(file)}: ${m[1]}`);
      }
    }
    expect(found).toBeGreaterThanOrEqual(31); // 正規表現が空振りして素通りするのを防ぐ
    expect(bad).toEqual([]);
  });
});
