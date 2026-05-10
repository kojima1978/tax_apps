import type { Application } from '@/lib/applications';
import { ExternalLink } from 'lucide-react';

const CARD_CLASS = [
  'group relative h-full bg-white border border-gray-200 rounded-xl shadow-sm p-5',
  'hover:shadow-lg hover:border-emerald-300',
  'focus-within:shadow-lg focus-within:border-emerald-300',
  'transition-all duration-200 cursor-pointer',
].join(' ');

export default function AppCard({ app }: { app: Application }) {
  const Icon = app.icon;
  const external = app.url.startsWith('http');

  return (
    <a
      href={app.url}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="h-full"
    >
      <div className={CARD_CLASS}>
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-sm group-hover:shadow-md transition-shadow duration-200">
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-gray-900 truncate">{app.title}</h3>
              {external && (
                <ExternalLink className="flex-shrink-0 w-4 h-4 text-gray-400 group-hover:text-emerald-600 transition-colors" />
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{app.description}</p>
          </div>
        </div>
      </div>
    </a>
  );
}
