/**
 * デフォルトの令和年度を計算
 * 1-3月の場合は前年の確定申告なので前年の令和年を返す
 */
export function getDefaultReiwaYear(): number {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (currentMonth <= 3) {
    return currentYear - 2018 - 1;
  }
  return currentYear - 2018;
}

/**
 * 令和年度の選択肢を生成（現在年から令和元年まで）
 */
export function generateReiwaYears(): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear; y >= 2019; y--) {
    years.push(y - 2018);
  }
  return years;
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
