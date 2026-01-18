'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Trash2, Edit2, Check, X, Search, Loader2 } from 'lucide-react';
import Link from 'next/link';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface DataRecord {
  id: number;
  customer_name: string;
  staff_name: string;
  year: number;
  updated_at: string;
}

export default function DataManagementPage() {
  const [records, setRecords] = useState<DataRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 個別検索フィルター
  const [searchStaff, setSearchStaff] = useState('');
  const [searchCustomer, setSearchCustomer] = useState('');
  const [searchYear, setSearchYear] = useState<number | ''>('');

  // 編集中の状態
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editStaffName, setEditStaffName] = useState('');
  const [originalCustomerName, setOriginalCustomerName] = useState('');
  const [originalStaffName, setOriginalStaffName] = useState('');

  // データ一覧を取得
  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/records`);
      if (response.ok) {
        const data = await response.json();
        setRecords(data.records || []);
      }
    } catch (error) {
      console.error('データの取得に失敗:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // 削除
  const handleDelete = async (id: number, customerName: string, year: number) => {
    if (!confirm(`「${customerName}」の令和${year}年のデータを削除しますか？\nこの操作は取り消せません。`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setRecords((prev) => prev.filter((r) => r.id !== id));
      } else {
        alert('削除に失敗しました');
      }
    } catch (error) {
      console.error('削除エラー:', error);
      alert('削除に失敗しました');
    }
  };

  // 編集開始
  const startEdit = (record: DataRecord) => {
    setEditingId(record.id);
    setEditCustomerName(record.customer_name);
    setEditStaffName(record.staff_name);
    setOriginalCustomerName(record.customer_name);
    setOriginalStaffName(record.staff_name);
  };

  // 編集キャンセル
  const cancelEdit = () => {
    setEditingId(null);
    setEditCustomerName('');
    setEditStaffName('');
    setOriginalCustomerName('');
    setOriginalStaffName('');
  };

  // 編集保存
  const saveEdit = async () => {
    if (!editCustomerName.trim() || !editStaffName.trim()) {
      alert('お客様名と担当者名を入力してください');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/customers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldCustomerName: originalCustomerName,
          oldStaffName: originalStaffName,
          newCustomerName: editCustomerName.trim(),
          newStaffName: editStaffName.trim(),
        }),
      });

      if (response.ok) {
        // 同じ顧客の全レコードを更新
        setRecords((prev) =>
          prev.map((r) =>
            r.customer_name === originalCustomerName && r.staff_name === originalStaffName
              ? { ...r, customer_name: editCustomerName.trim(), staff_name: editStaffName.trim() }
              : r
          )
        );
        cancelEdit();
      } else {
        const data = await response.json();
        alert(data.error || '更新に失敗しました');
      }
    } catch (error) {
      console.error('更新エラー:', error);
      alert('更新に失敗しました');
    }
  };

  // 登録されている年度一覧を取得
  const availableYears = [...new Set(records.map((r) => r.year))].sort((a, b) => b - a);

  // フィルタリング
  const filteredRecords = records.filter((record) => {
    const staffMatch = searchStaff === '' || record.staff_name.toLowerCase().includes(searchStaff.toLowerCase());
    const customerMatch = searchCustomer === '' || record.customer_name.toLowerCase().includes(searchCustomer.toLowerCase());
    const yearMatch = searchYear === '' || record.year === searchYear;
    return staffMatch && customerMatch && yearMatch;
  });

  // 検索条件があるかどうか
  const hasSearchFilter = searchStaff || searchCustomer || searchYear;

  // 日付フォーマット
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      <div className="max-w-5xl mx-auto p-4 md:p-8">
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
            {/* 担当者検索 */}
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
            {/* お客様名検索 */}
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
            {/* 年度検索 */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">年度</label>
              <select
                value={searchYear}
                onChange={(e) => setSearchYear(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="">すべて</option>
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    令和{y}年
                  </option>
                ))}
              </select>
            </div>
          </div>
          {/* クリアボタン */}
          {hasSearchFilter && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setSearchStaff('');
                  setSearchCustomer('');
                  setSearchYear('');
                }}
                className="text-sm text-slate-500 hover:text-slate-700 underline"
              >
                検索条件をクリア
              </button>
            </div>
          )}
        </div>

        {/* データ一覧 */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              {hasSearchFilter ? '検索結果がありません' : '保存されたデータがありません'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">担当者</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">お客様名</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">年度</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">更新日時</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-slate-600">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm">
                        {editingId === record.id ? (
                          <input
                            type="text"
                            value={editStaffName}
                            onChange={(e) => setEditStaffName(e.target.value)}
                            className="w-full px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        ) : (
                          record.staff_name
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {editingId === record.id ? (
                          <input
                            type="text"
                            value={editCustomerName}
                            onChange={(e) => setEditCustomerName(e.target.value)}
                            className="w-full px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        ) : (
                          <span className="font-medium">{record.customer_name}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded">
                          令和{record.year}年
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {formatDate(record.updated_at)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {editingId === record.id ? (
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={saveEdit}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                              title="保存"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1.5 text-slate-400 hover:bg-slate-100 rounded"
                              title="キャンセル"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => startEdit(record)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                              title="編集"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(record.id, record.customer_name, record.year)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
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
          )}
        </div>

        {/* 件数表示 */}
        {!isLoading && (
          <div className="mt-4 text-sm text-slate-500 text-right">
            全 {filteredRecords.length} 件
            {hasSearchFilter && ` (全体: ${records.length} 件)`}
          </div>
        )}
      </div>
    </main>
  );
}
