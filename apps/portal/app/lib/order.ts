/**
 * Application Order Utility
 * localStorage を使ったアプリケーション表示順の管理
 */

const STORAGE_KEY = 'portal_app_order';

interface HasId {
  id: string;
}

/** localStorage に保存された順序でアプリを並べ替える */
export function applySavedOrder<T extends HasId>(apps: T[]): T[] {
  if (typeof window === 'undefined') return apps;

  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return apps;

  try {
    const orderIds = JSON.parse(saved) as string[];
    return [...apps].sort((a, b) => {
      const indexA = orderIds.indexOf(a.id);
      const indexB = orderIds.indexOf(b.id);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return 0;
    });
  } catch {
    return apps;
  }
}

/** 並び順を localStorage に保存する */
export function saveOrder<T extends HasId>(apps: T[]): void {
  const orderIds = apps.map((app) => app.id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orderIds));
}
