'use client';

import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { applications, categories } from '@/lib/applications';
import type { Category } from '@/lib/applications';
import AppCard from './AppCard';

export default function AppGrid() {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

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
      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="アプリを検索…"
          className="w-full pl-10 pr-4 py-2.5 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl shadow-sm text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
            selectedCategory === null
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white/80 text-gray-600 border border-gray-200 hover:border-emerald-300 hover:text-emerald-700'
          }`}
        >
          すべて
          <span className="ml-1.5 text-xs opacity-70">{query ? filtered.length : applications.length}</span>
        </button>
        {categories.map((cat) => {
          const count = categoryCounts.get(cat) ?? 0;
          if (count === 0 && query) return null;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white/80 text-gray-600 border border-gray-200 hover:border-emerald-300 hover:text-emerald-700'
              }`}
            >
              {cat}
              <span className="ml-1.5 text-xs opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {grouped.length === 0 && (
        <p className="text-gray-500 text-center py-12">該当するアプリが見つかりません</p>
      )}

      {grouped.map(({ category, apps }) => (
        <section key={category} className="mb-10 last:mb-0">
          <h2 className="text-base font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200">
            {category}
            <span className="ml-2 text-sm font-normal text-gray-400">{apps.length}</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {apps.map((app) => (
              <AppCard key={app.url} app={app} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
