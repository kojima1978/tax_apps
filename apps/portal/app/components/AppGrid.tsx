'use client';

import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { applications, categories } from '@/lib/applications';
import AppCard from './AppCard';

export default function AppGrid() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query) return applications;
    const q = query.toLowerCase();
    return applications.filter(
      (app) => app.title.toLowerCase().includes(q) || app.description.toLowerCase().includes(q),
    );
  }, [query]);

  const grouped = useMemo(
    () => categories.map((cat) => ({
      category: cat,
      apps: filtered.filter((app) => app.category === cat),
    })).filter((g) => g.apps.length > 0),
    [filtered],
  );

  return (
    <>
      <div className="relative max-w-md mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="アプリを検索…"
          className="w-full pl-10 pr-4 py-2.5 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl shadow-sm text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
        />
      </div>

      {grouped.length === 0 && (
        <p className="text-gray-500 text-center py-12">該当するアプリが見つかりません</p>
      )}

      {grouped.map(({ category, apps }) => (
        <section key={category} className="mb-10 last:mb-0">
          <h2 className="text-lg font-semibold text-gray-700 mb-4 border-b border-gray-200 pb-2">
            {category}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {apps.map((app) => (
              <AppCard key={app.url} app={app} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
