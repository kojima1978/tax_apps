'use client';

import Link from 'next/link';
import type { Application } from '@/types/application';
import { iconMap } from '@/lib/icons';
import { ExternalLink } from 'lucide-react';
import { isExternalUrl } from '@/lib/url';

interface AppCardProps {
  app: Application;
}

export default function AppCard({ app }: AppCardProps) {
  const IconComponent = iconMap[app.icon];
  const external = isExternalUrl(app.url);

  const cardContent = (
    <div className="group relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-md hover:shadow-2xl transition-all duration-300 hover:scale-105 border border-gray-200 cursor-pointer">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg group-hover:shadow-xl transition-shadow duration-300">
            {IconComponent && <IconComponent className="w-7 h-7" />}
          </div>
          {external && (
            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-green-600 transition-colors" />
          )}
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {app.title}
          </h3>
          <p className="text-sm text-gray-600">
            {app.description}
          </p>
        </div>
      </div>
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </div>
  );

  if (external) {
    return (
      <a href={app.url} target="_blank" rel="noopener noreferrer">
        {cardContent}
      </a>
    );
  }

  return (
    <Link href={app.url}>
      {cardContent}
    </Link>
  );
}
