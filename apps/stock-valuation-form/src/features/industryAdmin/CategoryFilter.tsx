// 業種目の絞り込み。115件並ぶ表を基礎情報・月別株価のどちらでも同じ操作で絞れるようにする。

import { useMemo, useState, type ReactNode } from 'react';
import type { IndustryCategory } from '@/data/industryDataset';

export function useCategoryFilter(categories: readonly IndustryCategory[]) {
  const [keyword, setKeyword] = useState('');

  const filtered = useMemo(() => {
    const needle = keyword.trim();
    if (needle === '') return categories;
    return categories.filter(
      (category) => category.name.includes(needle) || String(category.number) === needle,
    );
  }, [categories, keyword]);

  return { keyword, setKeyword, filtered };
}

interface Props {
  keyword: string;
  onChange: (keyword: string) => void;
  shown: number;
  total: number;
  children?: ReactNode;
}

export function CategoryFilterRow({ keyword, onChange, shown, total, children }: Props) {
  return (
    <div className="admin-row">
      <label className="admin-label admin-label-grow">
        業種目を絞り込む
        <input
          className="admin-input"
          value={keyword}
          onChange={(event) => onChange(event.target.value)}
          placeholder="業種目名または番号"
        />
      </label>
      <span className="admin-note">{shown} / {total} 件</span>
      {children}
    </div>
  );
}
