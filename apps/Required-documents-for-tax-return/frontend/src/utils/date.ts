// 令和関連ユーティリティ
export const REIWA_OFFSET = 2018;

export function toReiwa(year: number): number {
  return year - REIWA_OFFSET;
}

export function formatReiwaYear(year: number): string {
  const reiwaYear = toReiwa(year);
  if (reiwaYear === 1) return '令和元年';
  if (reiwaYear < 1) return `${year}年`;
  return `令和${reiwaYear}年`;
}

/**
 * デフォルトの対象年度（西暦）を計算
 * 1-3月の場合は前年の確定申告なので前年を返す
 */
export function getDefaultYear(): number {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (currentMonth <= 3) {
    return currentYear - 1;
  }
  return currentYear;
}

/**
 * 日時を日本語フォーマットで表示
 */
export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 日付を日本語フォーマットで表示
 */
export function formatDate(date: Date = new Date()): string {
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}
