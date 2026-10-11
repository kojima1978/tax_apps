import type { Application } from '@/lib/applications';
import { ArrowUpRight, ExternalLink } from 'lucide-react';

const CARD_CLASS = [
  'group relative flex h-full min-h-32 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm',
  'hover:border-emerald-300 hover:shadow-md',
  'focus-visible:border-emerald-500 focus-visible:shadow-md',
  'transition-[border-color,box-shadow] duration-200 cursor-pointer',
].join(' ');

export default function AppCard({ app }: { app: Application }) {
  const Icon = app.icon;
  const external = app.url.startsWith('http');

  return (
    <a
      href={app.url}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={CARD_CLASS}
      aria-label={`${app.title}を開く${external ? '（新しいタブ）' : ''}`}
    >
      <span className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-emerald-500 transition-transform duration-200 group-hover:scale-x-100 group-focus-visible:scale-x-100" aria-hidden="true" />
      <div className="flex items-start gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100 transition-colors duration-200 group-hover:bg-emerald-100">
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-base font-bold leading-6 text-slate-900 transition-colors duration-200 group-hover:text-emerald-800">
              {app.title}
            </h3>
            {external ? (
              <ExternalLink className="mt-1 size-4 shrink-0 text-slate-400 group-hover:text-emerald-700" aria-hidden="true" />
            ) : (
              <ArrowUpRight className="mt-0.5 size-5 shrink-0 text-slate-300 transition-[color,transform] duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-emerald-700" aria-hidden="true" />
            )}
          </div>
          <p className="mt-1.5 text-sm leading-5 text-slate-600">{app.description}</p>
        </div>
      </div>
    </a>
  );
}
