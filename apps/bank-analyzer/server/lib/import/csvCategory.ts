// CSV の「分類」の列に書かれた名前を、アプリの分類へ当てる（依頼24）。
//
//  - 空欄・「未分類」 → なし（今までどおり自動分類にかける）
//  - 古い名前 → normalizeCategory で今の名前へ
//  - 知らない名前 → 黙って作らない。取込の画面で人が読み替え先を選ぶ（選ばなければ自動分類）
//
// 全角・半角の違い（`（` と `(` など）は NFKC でそろえて比べ、返すのは登録してある方の書き方。

import { normalizeCategory, UNCATEGORIZED } from '../categories.js';
import { classifyTransactions, type ClassifierSettings } from '../classify.js';

export type CsvCategory =
  | { kind: 'none' }
  | { kind: 'known'; category: string }
  | { kind: 'unknown'; name: string };

const key = (s: string) => s.normalize('NFKC').replace(/\s+/g, '');

export function categoryResolver(known: Iterable<string>): (raw: string | null | undefined) => CsvCategory {
  const byKey = new Map<string, string>();
  for (const c of known) if (!byKey.has(key(c))) byKey.set(key(c), c);
  return (raw) => {
    const trimmed = (raw ?? '').trim();
    if (trimmed === '') return { kind: 'none' };
    if (key(trimmed) === key(UNCATEGORIZED)) return { kind: 'none' };
    const found = byKey.get(key(trimmed)) ?? byKey.get(key(normalizeCategory(trimmed)));
    if (found === undefined) return { kind: 'unknown', name: trimmed };
    return found === UNCATEGORIZED ? { kind: 'none' } : { kind: 'known', category: found };
  };
}

export type DecidedCategory = { category: string; source: 'csv' | 'auto'; unknown?: string };

// 行の分類を決める（取込の確定と、手順3のプレビューで同じ規則を使う）。
// 書かれた分類が使える名前ならそれ（source: 'csv'）。無い・知らない名前の行は自動分類（'auto'）。
// 自動分類は同じ摘要の結果を使い回す（贈与は最初の行の出金額で決まる）ので、分類の無い行だけを並び順に渡す。
export function decideCategories(
  rows: readonly { description: string | null; amountOut: number; category?: string }[],
  known: Iterable<string>,
  classifier: ClassifierSettings,
): DecidedCategory[] {
  const resolve = categoryResolver(known);
  const resolved = rows.map((r) => resolve(r.category));
  const auto = classifyTransactions(rows.filter((_, i) => resolved[i]!.kind !== 'known'), classifier);
  let k = 0;
  return resolved.map((c) => {
    if (c.kind === 'known') return { category: c.category, source: 'csv' };
    const category = auto[k++]!.category;
    return c.kind === 'unknown' ? { category, source: 'auto', unknown: c.name } : { category, source: 'auto' };
  });
}
