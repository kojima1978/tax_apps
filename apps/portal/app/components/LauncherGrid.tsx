'use client';

import { useState } from 'react';
import AppCard from './AppCard';
import { Search } from 'lucide-react';
import type { Application } from '@/types/application';
import { useOrderedApplications } from '@/hooks/useOrderedApplications';
import PageContainer from './ui/PageContainer';
import { glassPanel } from '@/lib/styles';

interface LauncherGridProps {
  applications: Application[];
}

export default function LauncherGrid({ applications }: LauncherGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [orderedApps] = useOrderedApplications(applications);

  const filteredApps = orderedApps.filter((app) =>
    app.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PageContainer>
      {/* Search Bar */}
      <div className="mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="アプリケーションを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-12 pr-4 py-4 ${glassPanel} rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder-gray-500 shadow-md transition-shadow duration-300`}
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
    </PageContainer>
  );
}
