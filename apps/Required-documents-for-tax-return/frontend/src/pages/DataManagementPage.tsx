import { ArrowLeft, Trash2, Edit2, Check, X, Search, Loader2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDateTime, formatReiwaYear } from '@/utils/date';
import { useDataManagement, SortKey } from '@/hooks/useDataManagement';

const SORT_COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'staff_name', label: '担当者' },
  { key: 'customer_name', label: 'お客様名' },
  { key: 'year', label: '年度' },
  { key: 'updated_at', label: '更新日時' },
];

export default function DataManagementPage() {
  const {
    staffList,
    isLoading,
    filteredRecords,
    paginatedRecords,
    availableYears,
    totalPages,
    hasSearchFilter,
    searchStaff,
    setSearchStaff,
    searchCustomer,
    setSearchCustomer,
    searchYear,
    setSearchYear,
    clearSearch,
    sortConfig,
    handleSort,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    editState,
    setEditState,
    startEdit,
    cancelEdit,
    saveEdit,
    handleDelete,
  } = useDataManagement();

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortConfig.key !== column) return <span className="w-4 h-4 ml-1 inline-block text-slate-300">↕</span>;
    return sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 ml-1 inline-block" /> : <ChevronDown className="w-4 h-4 ml-1 inline-block" />;
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/"
            className="flex items-center bg-white px-4 py-2 rounded-lg shadow text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            TOPへ戻る
          </Link>
          <h1 className="text-xl font-bold text-slate-800">保存データ管理</h1>
        </div>

        {/* 検索 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center mb-4">
            <Search className="w-5 h-5 text-emerald-600 mr-2" />
            <h2 className="text-sm font-bold text-slate-700">検索フィルター</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">担当者</label>
              <input
                type="text"
                value={searchStaff}
                onChange={(e) => setSearchStaff(e.target.value)}
                placeholder="担当者名で検索..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">お客様名</label>
              <input
                type="text"
                value={searchCustomer}
                onChange={(e) => setSearchCustomer(e.target.value)}
                placeholder="お客様名で検索..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">年度</label>
              <select
                value={searchYear}
                onChange={(e) => setSearchYear(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="">すべて</option>
                {availableYears.map((y) => (
                  <option key={y} value={y}>{formatReiwaYear(y)}</option>
                ))}
              </select>
            </div>
          </div>
          {hasSearchFilter && (
            <div className="mt-4 flex justify-end">
              <button onClick={clearSearch} className="text-sm text-slate-500 hover:text-slate-700 underline">
                検索条件をクリア
              </button>
            </div>
          )}
        </div>

        {/* データ一覧 */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col min-h-[500px]">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="flex-1 text-center py-12 text-slate-500">
              {hasSearchFilter ? '検索結果がありません' : '保存されたデータがありません'}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto flex-1">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                    <tr>
                      {SORT_COLUMNS.map(({ key, label }) => (
                        <th
                          key={key}
                          className="px-4 py-3 text-left text-sm font-medium text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                          onClick={() => handleSort(key)}
                        >
                          {label} <SortIcon column={key} />
                        </th>
                      ))}
                      <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-sm">
                          {editState.id === record.id ? (
                            <select
                              value={editState.staffId}
                              onChange={(e) => setEditState((prev) => ({ ...prev, staffId: e.target.value ? Number(e.target.value) : '' }))}
                              className="w-full px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                            >
                              {staffList.map(s => (
                                <option key={s.id} value={s.id}>{s.staff_name}</option>
                              ))}
                            </select>
                          ) : (
                            record.staff_name
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {editState.id === record.id ? (
                            <input
                              type="text"
                              value={editState.customerName}
                              onChange={(e) => setEditState((prev) => ({ ...prev, customerName: e.target.value }))}
                              className="w-full px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          ) : (
                            <span className="font-medium">{record.customer_name}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded">
                            {formatReiwaYear(record.year)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500 tabular-nums">
                          {formatDateTime(record.updated_at)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {editState.id === record.id ? (
                            <div className="flex items-center justify-center space-x-2">
                              <button onClick={saveEdit} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="保存">
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={cancelEdit} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded" title="キャンセル">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={() => startEdit(record)}
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                title="編集"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(record.id, record.customer_name, record.year)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="削除"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              {filteredRecords.length > 0 && (
                <div className="border-t border-slate-200 px-4 py-3 flex items-center justify-between bg-slate-50">
                  <div className="text-sm text-slate-500">
                    全 {filteredRecords.length} 件中 {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredRecords.length)} 件を表示
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1 rounded-md hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm font-medium text-slate-700">
                      {currentPage} / {totalPages || 1}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1 rounded-md hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
