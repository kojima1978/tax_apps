/**
 * 元号の既定。第1表の1の元号プルダウンは未選択のままでも令和として扱う（様式の運用に合わせる）。
 * 表示・日付・年分の特定で同じ既定を使う必要があるので、値はここだけに置く。
 */
export const DEFAULT_ERA = '令和';

/**
 * 日付欄（元号・年・月・日）のプルダウンの選択肢。
 *
 * 第1表の1の課税時期・事業年度と、案件を作るときのダイアログが同じものを使う。別々に持つと、
 * ダイアログで入れた値が様式の <select> に無い値になり、「画面には出ているのに保存値は空」
 * という形で黙って食い違う（元号欄で実際に起きた。選択肢に空が無いため、閉じた <select> は
 * 先頭の「令和」を出すが、保存されているのは空）。
 */
const numOptions = (n: number) => ['', ...Array.from({ length: n }, (_, i) => String(i + 1))];

/** 元号は空の選択肢を置かない（未選択でも令和として扱う様式の運用に合わせる）。先頭は DEFAULT_ERA と揃えること */
export const ERA_OPTS = ['令和', '平成'];
export const YEAR_OPTS = numOptions(64);
export const MONTH_OPTS = numOptions(12);
export const DAY_OPTS = numOptions(31);

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
  return new Date(westernYear(get(`${prefix}_g`) || DEFAULT_ERA, y), m - 1, d);
}
