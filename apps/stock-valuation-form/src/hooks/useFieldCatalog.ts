import { useEffect, useState } from 'react';
import type { FieldCatalog } from '../../server/fieldCatalog';

// 様式の知識（欄の一覧・必須の欄・人が入れるもの）はサーバの辞書だけが持つ。
// 画面はそれを実行時に取るだけで、写しを持たない（server/fieldCatalog.ts の頭の注記）。
const CATALOG_URL = `${import.meta.env.BASE_URL}api/field-catalog`;

let cached: FieldCatalog | null = null;
let pending: Promise<FieldCatalog | null> | null = null;

async function load(): Promise<FieldCatalog | null> {
  try {
    const res = await fetch(CATALOG_URL);
    if (!res.ok) {
      pending = null;
      return null;
    }
    cached = (await res.json()) as FieldCatalog;
    return cached;
  } catch {
    // 辞書が取れないのは API が止まっているときだけ。入力自体は続けられるので黙って諦める
    pending = null;
    return null;
  }
}

/** 欄の辞書。読み込めるまで（または読めないときは）null。 */
export function useFieldCatalog(): FieldCatalog | null {
  const [catalog, setCatalog] = useState<FieldCatalog | null>(cached);
  useEffect(() => {
    if (cached !== null) return;
    let alive = true;
    pending ??= load();
    void pending.then((next) => {
      if (alive && next !== null) setCatalog(next);
    });
    return () => { alive = false; };
  }, []);
  return catalog;
}
