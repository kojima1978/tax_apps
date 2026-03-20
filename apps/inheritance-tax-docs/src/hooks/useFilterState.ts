import { useState, useMemo, useCallback } from 'react';

export interface FilterCriteria {
  searchQuery: string;
  showOnlyUnchecked: boolean;
  showOnlyDelegatable: boolean;
  showOnlyUrgent: boolean;
  hideExcluded: boolean;
}

const FILTER_LABELS: { key: FilterKey; label: string }[] = [
  { key: 'showOnlyUnchecked', label: '未提出のみ' },
  { key: 'showOnlyDelegatable', label: '代行可のみ' },
  { key: 'showOnlyUrgent', label: '緊急のみ' },
  { key: 'hideExcluded', label: '対象外を非表示' },
];

type FilterKey = 'showOnlyUnchecked' | 'showOnlyDelegatable' | 'showOnlyUrgent' | 'hideExcluded';

const INITIAL_FILTERS: Record<FilterKey, boolean> = {
  showOnlyUnchecked: false,
  showOnlyDelegatable: false,
  showOnlyUrgent: false,
  hideExcluded: false,
};

export function useFilterState() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const toggleFilter = useCallback((key: FilterKey) => {
    setFilters(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const criteria = useMemo((): FilterCriteria => ({
    searchQuery, ...filters,
  }), [searchQuery, filters]);

  const hasActiveFilters = Object.values(filters).some(Boolean) || searchQuery !== '';

  const clearAll = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    setSearchQuery('');
  }, []);

  const toggleShowFilters = useCallback(() => setShowFilters(p => !p), []);

  return {
    criteria,
    hasActiveFilters,
    filters,
    filterLabels: FILTER_LABELS,
    toggleFilter,
    searchQuery,
    setSearchQuery,
    showFilters,
    toggleShowFilters,
    clearAll,
  };
}

export type FilterState = ReturnType<typeof useFilterState>;
