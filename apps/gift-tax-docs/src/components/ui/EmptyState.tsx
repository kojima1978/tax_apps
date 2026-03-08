import { Search, FileText } from 'lucide-react';

type EmptyStateProps = {
  isSearching: boolean;
  onClearSearch: () => void;
};

export const EmptyState = ({ isSearching, onClearSearch }: EmptyStateProps) => (
  <div className="text-center py-16 animate-fade-in">
    <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full mb-6">
      {isSearching
        ? <Search className="w-10 h-10 text-slate-400" />
        : <FileText className="w-10 h-10 text-slate-400" />
      }
    </div>
    <h3 className="text-lg font-bold text-slate-600 dark:text-slate-300 mb-2">
      {isSearching ? '該当する書類が見つかりません' : '書類がありません'}
    </h3>
    <p className="text-sm text-slate-400 dark:text-slate-500 mb-6">
      {isSearching
        ? '検索条件を変更してお試しください'
        : '下のボタンからカテゴリを追加してください'
      }
    </p>
    {isSearching && (
      <button
        onClick={onClearSearch}
        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
      >
        検索をクリア
      </button>
    )}
  </div>
);
