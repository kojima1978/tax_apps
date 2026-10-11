'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, SearchX, X } from 'lucide-react';
import { applications, categories } from '@/lib/applications';
import type { Category } from '@/lib/applications';
import AppCard from './AppCard';

export default function AppGrid() {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        event.preventDefault();
        searchRef.current?.focus();
      }

      if (event.key === 'Escape' && document.activeElement === searchRef.current) {
        setQuery('');
        searchRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filtered = useMemo(() => {
    let result = applications;
    if (selectedCategory) {
      result = result.filter((app) => app.category === selectedCategory);
    }
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(
        (app) => app.title.toLowerCase().includes(q) || app.description.toLowerCase().includes(q),
      );
    }
    return result;
  }, [query, selectedCategory]);

  const grouped = useMemo(
    () => categories.map((cat) => ({
      category: cat,
      apps: filtered.filter((app) => app.category === cat),
    })).filter((g) => g.apps.length > 0),
    [filtered],
  );

  const categoryCounts = useMemo(() => {
    const base = query
      ? applications.filter((app) => {
          const q = query.toLowerCase();
          return app.title.toLowerCase().includes(q) || app.description.toLowerCase().includes(q);
        })
      : applications;
    return new Map(categories.map((cat) => [cat, base.filter((app) => app.category === cat).length]));
  }, [query]);

  return (
    <>
      <div className="mb-8 overflow-hidden rounded-2xl border border-emerald-900/10 bg-white shadow-sm sm:mb-10">
        <div className="border-b border-slate-100 px-5 py-6 sm:px-7 sm:py-7">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
            Application launcher
          </p>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                目的の業務アプリを開く
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                キーワード検索、または業務カテゴリからツールを選択できます。
              </p>
            </div>

            <div className="relative w-full lg:max-w-md">
              <label htmlFor="app-search" className="sr-only">アプリを検索</label>
              <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                ref={searchRef}
                id="app-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="アプリ名・機能で検索"
                autoComplete="off"
                className="h-12 w-full rounded-xl border border-slate-300 bg-slate-50 pl-11 pr-20 text-base text-slate-900 shadow-inner shadow-slate-950/[0.02] outline-none transition duration-200 placeholder:text-slate-400 hover:border-slate-400 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    searchRef.current?.focus();
                  }}
                  aria-label="検索キーワードを消去"
                  className="absolute right-1.5 top-1/2 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors duration-200 hover:bg-slate-200 hover:text-slate-800"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              ) : (
                <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-slate-200 bg-white px-2 py-1 font-sans text-xs font-medium text-slate-500 shadow-sm sm:block">
                  /
                </kbd>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 px-4 py-3 sm:px-6" aria-label="アプリのカテゴリ絞り込み">
          <FilterButton
            active={selectedCategory === null}
            count={query ? filtered.length : applications.length}
            label="すべて"
            onClick={() => setSelectedCategory(null)}
          />
          {categories.map((category) => {
            const count = categoryCounts.get(category) ?? 0;
            if (count === 0 && query) return null;
            return (
              <FilterButton
                key={category}
                active={selectedCategory === category}
                count={count}
                label={category}
                onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
              />
            );
          })}
        </div>
      </div>

      {grouped.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-14 text-center" role="status">
          <SearchX className="mx-auto size-9 text-slate-400" aria-hidden="true" />
          <p className="mt-3 font-semibold text-slate-800">該当するアプリが見つかりません</p>
          <p className="mt-1 text-sm text-slate-500">別のキーワードをお試しください。</p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setSelectedCategory(null);
              searchRef.current?.focus();
            }}
            className="mt-5 min-h-11 cursor-pointer rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-emerald-800"
          >
            絞り込みを解除
          </button>
        </div>
      )}

      {grouped.map(({ category, apps }) => (
        <section key={category} className="mb-10 last:mb-0" aria-labelledby={`category-${category}`}>
          <div className="mb-4 flex items-center gap-3">
            <h2 id={`category-${category}`} className="text-base font-bold text-slate-900 sm:text-lg">
              {category}
            </h2>
            <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">
              {apps.length}
            </span>
            <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {apps.map((app) => (
              <AppCard key={app.url} app={app} />
            ))}
          </div>
        </section>
      ))}

      <p className="sr-only" aria-live="polite">
        {filtered.length}件のアプリを表示しています
      </p>
    </>
  );
}

function FilterButton({
  active,
  count,
  label,
  onClick,
}: {
  active: boolean;
  count: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3.5 text-sm font-semibold transition-colors duration-200 ${
        active
          ? 'bg-emerald-700 text-white shadow-sm'
          : 'text-slate-600 hover:bg-slate-100 hover:text-emerald-800'
      }`}
    >
      {label}
      <span className={`min-w-5 rounded-full px-1.5 py-0.5 text-center text-xs tabular-nums ${active ? 'bg-white/15 text-white' : 'bg-slate-200 text-slate-600'}`}>
        {count}
      </span>
    </button>
  );
}
