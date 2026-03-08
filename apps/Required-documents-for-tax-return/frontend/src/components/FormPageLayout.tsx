import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import FormErrorDisplay from './FormErrorDisplay';

interface FormPageLayoutProps {
  backTo: string;
  title: string;
  description?: React.ReactNode;
  /** 右上に追加リンクを表示 */
  headerExtra?: React.ReactNode;
  error: string | null;
  /** trueの場合、カードにグラデーションバーを表示（Create系ページ向け） */
  withAccent?: boolean;
  children: React.ReactNode;
}

export function FormPageLayout({
  backTo,
  title,
  description,
  headerExtra,
  error,
  withAccent = false,
  children,
}: FormPageLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 transition-colors">
      <div className="max-w-xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center mb-2">
            <Link to={backTo} className="mr-3 p-2 bg-white rounded-full text-slate-500 hover:text-emerald-600 shadow-sm hover:shadow transition-all group">
              <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            </Link>
            <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
          </div>
          {(description || headerExtra) && (
            <div className="ml-12 flex items-center gap-4">
              {description && <p className="text-slate-500 text-sm">{description}</p>}
              {headerExtra}
            </div>
          )}
        </header>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {withAccent && (
            <div className="p-1 bg-gradient-to-r from-emerald-500 to-teal-400 opacity-80" />
          )}

          <div className="p-8">
            <FormErrorDisplay error={error} />
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
