/**
 * 一覧のページ切り替え。顧客一覧と不動産一覧で同じ数え方・同じ選択肢にするため、
 * 件数の扱いはここだけに置く（表示するのはこのページのぶんだけで、
 * 合計やCSVは絞り込んだ全件が対象）。
 */

/** 1ページの表示件数の選択肢。 */
export const PAGE_SIZES = [25, 50, 100] as const;
export const PAGE_SIZE_DEFAULT = 25;

/** 件数から最後のページ番号を出す。0件でも1ページと数える（ページ番号を0にしない）。 */
export const pageCount = (count: number, size: number) => Math.max(1, Math.ceil(count / size));

/**
 * 表示するページを切り出す。ページ番号が範囲外なら端へ寄せて返す
 * （絞り込みで件数が減ったとき、前のページ番号のまま空振りにならないように）。
 */
export function pageSlice<T>(rows: T[], page: number, size: number) {
  const last = pageCount(rows.length, size);
  const current = Math.min(Math.max(1, Math.trunc(page)), last);
  const from = (current - 1) * size;
  return { current, last, from, rows: rows.slice(from, from + size) };
}
