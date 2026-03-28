import { FileText } from 'lucide-react';

export const EmptyState = () => (
  <div className="text-center py-16 animate-fade-in">
    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-slate-800 rounded-full mb-6 shadow-inner">
      <FileText className="w-10 h-10 text-emerald-400" />
    </div>
    <h3 className="text-lg font-bold text-slate-600 dark:text-slate-300 mb-2">
      書類がありません
    </h3>
    <p className="text-sm text-slate-400 dark:text-slate-500 mb-6">
      下のボタンからカテゴリを追加してください
    </p>
  </div>
);
