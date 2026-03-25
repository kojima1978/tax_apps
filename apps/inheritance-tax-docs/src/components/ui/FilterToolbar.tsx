import { memo } from 'react';
import { ChevronsDown, ChevronsUp, Filter, Eye, EyeOff, Search, X } from 'lucide-react';
import type { FilterState } from '../../hooks/useFilterState';

interface FilterToolbarProps {
  filter: FilterState;
  hideSubmittedInPrint: boolean;
  onToggleHideSubmittedInPrint: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

const EXPAND_ACTIONS = [
  { icon: ChevronsDown, label: '全展開', key: 'expand', title: 'すべて展開' },
  { icon: ChevronsUp, label: '全折りたたみ', key: 'collapse', title: 'すべて折りたたみ' },
] as const;

export const FilterToolbar = memo(function FilterToolbar({
  filter, hideSubmittedInPrint, onToggleHideSubmittedInPrint, onExpandAll, onCollapseAll,
}: FilterToolbarProps) {
  const expandHandlers = { expand: onExpandAll, collapse: onCollapseAll } as const;

  return (
    <div className="no-print">
      <div className="bg-slate-100 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              {/* B1: すべて展開/折りたたみ */}
              {EXPAND_ACTIONS.map(({ icon: Icon, label, key, title }) => (
                <button key={key} onClick={expandHandlers[key]} title={title} className="flex items-center gap-1 px-3 py-2.5 rounded-lg text-xs font-medium bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors">
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              ))}

              {/* B2: フィルター切替 */}
              <button
                onClick={filter.toggleShowFilters}
                className={`flex items-center gap-1 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  filter.hasActiveFilters
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                }`}
                title="フィルター"
              >
                <Filter className="w-3.5 h-3.5" /> フィルター
                {filter.hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onToggleHideSubmittedInPrint}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  hideSubmittedInPrint
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                }`}
                title={hideSubmittedInPrint ? '提出済みを印刷に含める' : '提出済みを印刷で非表示'}
              >
                {hideSubmittedInPrint ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                提出済みを印刷で非表示
              </button>
            </div>
          </div>

          {/* B2+B3: フィルター/検索パネル */}
          {filter.showFilters && (
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200">
              {/* B3: 検索 */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={filter.searchQuery}
                  onChange={(e) => filter.setSearchQuery(e.target.value)}
                  placeholder="書類名を検索..."
                  aria-label="書類名を検索"
                  className="w-full pl-8 pr-8 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {filter.searchQuery && (
                  <button
                    onClick={() => filter.setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* B2: フィルタートグル */}
              {filter.filterLabels.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={filter.filters[key]}
                    onChange={() => filter.toggleFilter(key)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-slate-600">{label}</span>
                </label>
              ))}
              {filter.hasActiveFilters && (
                <button onClick={filter.clearAll} className="text-xs text-emerald-600 hover:text-emerald-800 underline">
                  クリア
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
