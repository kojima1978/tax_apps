import { Link } from 'react-router-dom';
import { FileText, FileSpreadsheet, FileIcon, Download, ExternalLink, ArrowLeft, Home, Sun, Moon } from 'lucide-react';
import { useDarkMode } from '@/hooks/useDarkMode';
import { RESOURCES, type Resource } from '@/constants/resources';

const EXT_ICONS: Record<string, typeof FileText> = {
  xlsx: FileSpreadsheet,
  doc: FileIcon,
  docx: FileIcon,
};

function getIcon(resource: Resource) {
  if (resource.url) return FileText;
  const ext = resource.filename.split('.').pop() ?? '';
  return EXT_ICONS[ext] ?? FileText;
}

function ResourceCard({ resource, basePath }: { resource: Resource; basePath: string }) {
  const isExternal = !!resource.url;
  const Icon = getIcon(resource);

  return (
    <a
      href={isExternal ? resource.url : `${basePath}files/${resource.filename}`}
      {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : { download: resource.downloadName })}
      className="group flex items-start gap-4 p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-600 transition-all"
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50 transition-colors">
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
          {resource.title}
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {resource.description}
        </p>
      </div>
      <div className="flex-shrink-0 self-center text-slate-400 dark:text-slate-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
        {isExternal ? <ExternalLink className="w-4 h-4" /> : <Download className="w-4 h-4" />}
      </div>
    </a>
  );
}

export const ResourcesPage = () => {
  const basePath = import.meta.env.BASE_URL;
  const { isDark, toggleDark } = useDarkMode();

  return (
    <div className="w-full animate-fade-in">
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <a href="/" className="flex items-center gap-1 text-slate-400 hover:text-emerald-600 transition-colors" title="ポータルに戻る">
                <Home className="h-5 w-5" />
                <span className="hidden md:inline text-sm font-medium">ポータル</span>
              </a>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <Link to="/" className="flex items-center gap-1 text-slate-400 hover:text-emerald-600 transition-colors" title="書類リストに戻る">
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm font-medium">書類リスト</span>
              </Link>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">参考資料</h1>
            </div>
            <button
              onClick={toggleDark}
              className="p-1.5 rounded text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              aria-label={isDark ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
            >
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 md:px-8 md:py-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            相続手続きに関する参考資料をダウンロードできます。
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {RESOURCES.map((resource) => (
              <ResourceCard key={resource.url ?? resource.filename} resource={resource} basePath={basePath} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
