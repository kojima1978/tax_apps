'use client';

import { useState, useEffect } from 'react';
import AppCard from './AppCard';
import { Search } from 'lucide-react';
import { AppLink } from '@/data/links';

interface LauncherGridProps {
  applications: AppLink[];
}

export default function LauncherGrid({ applications }: LauncherGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [orderedApps, setOrderedApps] = useState<AppLink[]>(applications);

  useEffect(() => {
    // Load order from localStorage
    const savedOrder = localStorage.getItem('portal_app_order');
    if (savedOrder) {
      try {
        const orderIds = JSON.parse(savedOrder) as string[];
        const newOrder = [...applications].sort((a, b) => {
          const indexA = orderIds.indexOf(a.id);
          const indexB = orderIds.indexOf(b.id);
          // If both IDs are in the saved list, sort by index
          if (indexA !== -1 && indexB !== -1) {
            return indexA - indexB;
          }
          // If only A is in list, it comes first
          if (indexA !== -1) return -1;
          // If only B is in list, it comes first
          if (indexB !== -1) return 1;
          // If neither, keep original order (or put at end)
          return 0;
        });
        setOrderedApps(newOrder);
      } catch (e) {
        console.error('Failed to parse saved order', e);
        setOrderedApps(applications);
      }
    } else {
      setOrderedApps(applications);
    }
  }, [applications]);

  const filteredApps = orderedApps.filter((app) =>
    app.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Search Bar */}
      <div className="mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="アプリケーションを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder-gray-500 shadow-md transition-shadow duration-300"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredApps.map((app) => (
          <AppCard key={app.id} app={app} />
        ))}
      </div>

      {/* No Results */}
      {filteredApps.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">
            検索条件に一致するアプリケーションが見つかりませんでした。
          </p>
        </div>
      )}
    </div>
  );
}
