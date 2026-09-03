/** 和暦の元号＋年を西暦年に直す。元号が空のときは令和として扱う */
export function westernYear(era: string, year: number): number {
  return era === '昭和' ? 1925 + year : era === '平成' ? 1988 + year : 2018 + year;
}

/**
 * `${prefix}_g/_y/_m/_d` の4列プルダウン（元号・年・月・日）を Date にする。
 * どれか1つでも未入力なら判定不能として null を返す。
 */
export function readWarekiDate(get: (field: string) => string, prefix: string): Date | null {
  const y = Number(get(`${prefix}_y`));
  const m = Number(get(`${prefix}_m`));
  const d = Number(get(`${prefix}_d`));
  if (!y || !m || !d) return null;
  return new Date(westernYear(get(`${prefix}_g`) || '令和', y), m - 1, d);
}
