'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, Trash2, Edit2, Check, X, Search, Loader2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { fetchRecords, deleteDocument, updateCustomerName, DataRecord, fetchStaff } from '@/utils/api';
import { formatDateTime, toReiwa } from '@/utils/date';
import { Staff } from '@/types';

interface EditState {
  id: number | null;
  customerName: string;
  staffId: number | '';
  originalStaffId: number | null;
  customerId: number | null;
}

const initialEditState: EditState = {
  id: null,
  customerName: '',
  staffId: '',
  originalStaffId: null,
  customerId: null,
};

type SortKey = 'staff_name' | 'customer_name' | 'year' | 'updated_at';
interface SortConfig {
  key: SortKey;
  direction: 'asc' | 'desc';
}

const ITEMS_PER_PAGE = 20;

export default function DataManagementPage() {
  const [records, setRecords] = useState<DataRecord[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search State
  const [searchStaff, setSearchStaff] = useState('');
  const [searchCustomer, setSearchCustomer] = useState('');
  const [searchYear, setSearchYear] = useState<number | ''>('');

  // Sort & Pagination State
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'updated_at', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);

  const [editState, setEditState] = useState<EditState>(initialEditState);

  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const [recordsData, staffData] = await Promise.all([
        fetchRecords(),
        fetchStaff()
      ]);
      setRecords(recordsData);
      setStaffList(staffData);
    } catch (error) {
      console.error('データの取得に失敗:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchStaff, searchCustomer, searchYear]);

  const handleDelete = async (id: number, customerName: string, year: number) => {
    if (!confirm(`「${customerName}」の令和${toReiwa(year)}年のデータを削除しますか？\nこの操作は取り消せません。`)) {
      return;
    }

    try {
      await deleteDocument(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (error) {
      console.error('削除エラー:', error);
      alert(error instanceof Error ? error.message : '削除に失敗しました');
    }
  };

  const startEdit = (record: DataRecord) => {
    setEditState({
      id: record.id,
      customerName: record.customer_name,
      staffId: record.staff_id || '',
      originalStaffId: record.staff_id,
      customerId: record.customer_id,
    });
  };

  const cancelEdit = () => {
    setEditState(initialEditState);
  };

  const saveEdit = async () => {
    if (!editState.customerId || !editState.customerName.trim() || !editState.staffId) {
      alert('お客様名と担当者は必須です');
      return;
    }

    try {
      await updateCustomerName(
        editState.customerId,
        editState.customerName.trim(),
        Number(editState.staffId)
      );

      const staff = staffList.find(s => s.id === Number(editState.staffId));
      const newStaffName = staff ? staff.staff_name : '';

      setRecords((prev) =>
        prev.map((r) =>
          r.customer_id === editState.customerId
            ? { ...r, customer_name: editState.customerName.trim(), staff_name: newStaffName, staff_id: Number(editState.staffId) }
            : r
        )
      );
      cancelEdit();
    } catch (error) {
      console.error('更新エラー:', error);
      alert(error instanceof Error ? error.message : '更新に失敗しました');
    }
  };

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const availableYears = useMemo(() => {
    return [...new Set(records.map((r) => r.year))].sort((a, b) => b - a);
  }, [records]);

  // Filter -> Sort -> Pagination
  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const staffMatch = !searchStaff || record.staff_name.toLowerCase().includes(searchStaff.toLowerCase());
      const customerMatch = !searchCustomer || record.customer_name.toLowerCase().includes(searchCustomer.toLowerCase());
      const yearMatch = searchYear === '' || record.year === searchYear;
      return staffMatch && customerMatch && yearMatch;
    });
  }, [records, searchStaff, searchCustomer, searchYear]);

  const sortedRecords = useMemo(() => {
    const sorted = [...filteredRecords];
    sorted.sort((a, b) => {
      const aRaw = a[sortConfig.key];
      const bRaw = b[sortConfig.key];

      if (sortConfig.key === 'year') {
        const aNum = Number(aRaw);
        const bNum = Number(bRaw);
        return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
      }

      const aStr = String(aRaw).toLowerCase();
      const bStr = String(bRaw).toLowerCase();
      if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredRecords, sortConfig]);

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedRecords.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedRecords, currentPage]);

  const totalPages = Math.ceil(filteredRecords.length / ITEMS_PER_PAGE);
  const hasSearchFilter = searchStaff || searchCustomer || searchYear !== '';

  const clearSearch = () => {
    setSearchStaff('');
    setSearchCustomer('');
    setSearchYear('');
  };

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
            href="/"
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
                  <option key={y} value={y}>令和{toReiwa(y)}年</option>
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
                      <th
                        className="px-4 py-3 text-left text-sm font-medium text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                        onClick={() => handleSort('staff_name')}
                      >
                        担当者 <SortIcon column="staff_name" />
                      </th>
                      <th
                        className="px-4 py-3 text-left text-sm font-medium text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                        onClick={() => handleSort('customer_name')}
                      >
                        お客様名 <SortIcon column="customer_name" />
                      </th>
                      <th
                        className="px-4 py-3 text-left text-sm font-medium text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                        onClick={() => handleSort('year')}
                      >
                        年度 <SortIcon column="year" />
                      </th>
                      <th
                        className="px-4 py-3 text-left text-sm font-medium text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                        onClick={() => handleSort('updated_at')}
                      >
                        更新日時 <SortIcon column="updated_at" />
                      </th>
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
                            令和{toReiwa(record.year)}年
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
                    全 {filteredRecords.length} 件中 {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredRecords.length)} 件を表示
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
