// 業種目の絞り込み。115件並ぶ表を基礎情報・月別株価のどちらでも同じ操作で絞れるようにする。

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import type { IndustryCategory } from '@/data/industryDataset';

/**
 * キーワードとは別の、状態による絞り込み。
 * 「変更あり」「未入力」など画面ごとに意味が違うので、判定は呼び出し側から渡す。
 */
export interface CategoryStatusFilter {
  id: string;
  label: string;
  match: (category: IndustryCategory) => boolean;
}

export interface CategoryFilterState {
  keyword: string;
  setKeyword: (keyword: string) => void;
  status: string | null;
  setStatus: (status: string | null) => void;
  statuses: readonly CategoryStatusFilter[];
  /** 状態ごとの現在の件数。絞り込み中でも減っていく様子が見えるように常に数え直す。 */
  counts: Readonly<Record<string, number>>;
  filtered: readonly IndustryCategory[];
}

const NO_STATUSES: readonly CategoryStatusFilter[] = [];

export function useCategoryFilter(
  categories: readonly IndustryCategory[],
  statuses: readonly CategoryStatusFilter[] = NO_STATUSES,
): CategoryFilterState {
  const [keyword, setKeyword] = useState('');
  const [status, setStatusRaw] = useState<string | null>(null);
  /*
   * 絞り込みを押した時点で該当した業種目番号。
   *
   * 判定を毎回やり直すと、「未入力」で絞って値を入れたそばから行が消える（入力中の欄ごと
   * 消えて次の行へ進めない）。押した時点の並びを固定して、上から順に片付けられるようにする。
   * 件数の表示は固定しないので、残りが減っていくのはチップ側で分かる。
   */
  const [pinned, setPinned] = useState<ReadonlySet<number>>(() => new Set());

  const setStatus = useCallback((next: string | null) => {
    setStatusRaw(next);
    const target = next === null ? undefined : statuses.find((candidate) => candidate.id === next);
    setPinned(new Set(target ? categories.filter(target.match).map((c) => c.number) : []));
  }, [categories, statuses]);

  // 選択中の状態が選択肢から消えることもある（削除が無くなれば「削除」の絞り込みも消える）。
  const active = statuses.some((candidate) => candidate.id === status) ? status : null;

  const filtered = useMemo(() => {
    const needle = keyword.trim();
    if (needle === '' && active === null) return categories;

    return categories.filter((category) => {
      if (needle !== '' && !category.name.includes(needle) && String(category.number) !== needle) {
        return false;
      }
      return active === null || pinned.has(category.number);
    });
  }, [categories, keyword, active, pinned]);

  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    for (const candidate of statuses) {
      result[candidate.id] = categories.reduce(
        (total, category) => (candidate.match(category) ? total + 1 : total),
        0,
      );
    }
    return result;
  }, [categories, statuses]);

  return { keyword, setKeyword, status: active, setStatus, statuses, counts, filtered };
}

interface Props {
  filter: CategoryFilterState;
  total: number;
  children?: ReactNode;
}

export function CategoryFilterRow({ filter, total, children }: Props) {
  return (
    <div className="admin-row">
      <label className="admin-label admin-label-grow">
        業種目を絞り込む
        <input
          className="admin-input"
          value={filter.keyword}
          onChange={(event) => filter.setKeyword(event.target.value)}
          placeholder="業種目名または番号"
        />
      </label>

      {filter.statuses.length > 0 && (
        <div className="admin-filter-chips" role="group" aria-label="状態で絞り込む">
          {filter.statuses.map((status) => {
            const selected = filter.status === status.id;
            const count = filter.counts[status.id] ?? 0;
            return (
              <button
                key={status.id}
                type="button"
                className={`admin-filter-chip${selected ? ' admin-filter-chip-active' : ''}`}
                aria-pressed={selected}
                title={`${status.label}の行だけを表示します（押した時点の行が並び、直しても消えません）`}
                // 0件の絞り込みは押しても空表になるだけなので、選択中でなければ触らせない。
                disabled={!selected && count === 0}
                onClick={() => filter.setStatus(selected ? null : status.id)}
              >
                {status.label} {count}
              </button>
            );
          })}
        </div>
      )}

      <span className="admin-note">{filter.filtered.length} / {total} 件</span>
      {children}
    </div>
  );
}
