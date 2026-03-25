import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, Search, X, Plus, Users, ChevronDown, ChevronLeft, ChevronRight, LayoutGrid, List, ArrowUpDown, AlertCircle } from 'lucide-react';
import { taxReturnData } from '@/data/taxReturnData';
import { fetchCustomersWithYears, fetchStaff, CustomerWithYears } from '@/utils/api';
import { Staff } from '@/types';
import { CustomerCard } from '@/components/CustomerCard';
import { AdminMenu } from '@/components/AdminMenu';
import PageShell from '@/components/PageShell';
import { DashboardSkeleton } from '@/components/Skeleton';
import { formatReiwaYear, formatDateTime } from '@/utils/date';

type SortKey = 'name' | 'code' | 'updated';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'name', label: '名前順' },
  { key: 'code', label: 'コード順' },
  { key: 'updated', label: '更新日順' },
];

const ITEMS_PER_PAGE = 20;

function sortCustomers(customers: CustomerWithYears[], sortKey: SortKey): CustomerWithYears[] {
  return [...customers].sort((a, b) => {
    switch (sortKey) {
      case 'name':
        return a.customer_name.localeCompare(b.customer_name, 'ja');
      case 'code':
        return (a.customer_code || '').localeCompare(b.customer_code || '');
      case 'updated':
        return (b.latest_updated_at || '').localeCompare(a.latest_updated_at || '');
    }
  });
}

export default function CustomerDashboardPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<CustomerWithYears[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [staffFilter, setStaffFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('updated');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [customersData, staffData] = await Promise.all([
        fetchCustomersWithYears(),
        fetchStaff(),
      ]);
      setCustomers(customersData);
      setStaffList(staffData);
    } catch {
      setLoadError('データの読み込みに失敗しました。ネットワーク接続を確認してください。');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredCustomers = useMemo(() => {
    let result = customers;
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      result = result.filter(c =>
        c.customer_name.toLowerCase().includes(q) ||
        (c.customer_code && c.customer_code.includes(q))
      );
    }
    if (staffFilter) {
      result = result.filter(c => c.staff_name === staffFilter);
    }
    return sortCustomers(result, sortKey);
  }, [customers, searchText, staffFilter, sortKey]);

  // フィルタ・検索変更時にページをリセット
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, staffFilter, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE));
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const hasFilter = searchText.trim() || staffFilter;

  return (
    <PageShell>
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden animate-fade-in">
          {/* ヘッダー */}
          <header className="bg-emerald-600 p-8 text-center text-white relative">
            <Link to="/" title="ポータルに戻る" className="absolute top-4 left-4 opacity-70 hover:opacity-100 transition-opacity">
              <Home className="w-6 h-6" />
            </Link>
            <h1 className="text-3xl font-bold mb-3">{taxReturnData.title}</h1>
            <p className="text-emerald-100 text-lg">お客様を選択して、必要書類リストを作成・管理できます。</p>
          </header>

          <div className="p-8">
            {/* 検索 + お客様登録ボタン */}
            <div className="mb-4 flex gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  placeholder="お客様名・コードで検索..."
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                />
              </div>
              {hasFilter && (
                <button
                  onClick={() => { setSearchText(''); setStaffFilter(''); }}
                  className="px-3 py-3 text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                  title="フィルタをクリア"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <Link
                to="/customers/create"
                className="inline-flex items-center px-5 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg whitespace-nowrap"
              >
                <Plus className="w-5 h-5 mr-1.5" />
                お客様登録
              </Link>
            </div>

            {/* 担当者フィルタ + ソート + 表示切替 */}
            <div className="mb-6 flex items-center gap-3 flex-wrap">
              {/* 担当者フィルタ */}
              {staffList.length > 0 && (
                <>
                  <div className="relative">
                    <select
                      value={staffFilter}
                      onChange={e => setStaffFilter(e.target.value)}
                      className="appearance-none pl-3 pr-8 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="">担当者で絞り込み</option>
                      {staffList.map(s => (
                        <option key={s.id} value={s.staff_name}>
                          {s.staff_code ? `${s.staff_name} (${s.staff_code})` : s.staff_name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                  {staffFilter && (
                    <button
                      onClick={() => setStaffFilter('')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium hover:bg-emerald-200 transition-colors cursor-pointer"
                    >
                      {staffFilter}
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </>
              )}

              <div className="flex-1" />

              {/* ソート */}
              <div className="relative">
                <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <select
                  value={sortKey}
                  onChange={e => setSortKey(e.target.value as SortKey)}
                  className="appearance-none pl-8 pr-8 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                >
                  {SORT_OPTIONS.map(o => (
                    <option key={o.key} value={o.key}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>

              {/* 表示切替 */}
              <div className="flex border border-slate-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('card')}
                  className={`p-2 cursor-pointer transition-colors ${viewMode === 'card' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-400 hover:text-slate-600'}`}
                  title="カード表示"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 cursor-pointer transition-colors ${viewMode === 'list' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-400 hover:text-slate-600'}`}
                  title="リスト表示"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 件数表示 */}
            {!isLoading && customers.length > 0 && (
              <div className="mb-4 text-sm text-slate-500">
                {hasFilter ? (
                  <span>{filteredCustomers.length} / {customers.length} 件</span>
                ) : (
                  <span>{customers.length} 件のお客様</span>
                )}
                {filteredCustomers.length > ITEMS_PER_PAGE && (
                  <span className="ml-2">（{(currentPage - 1) * ITEMS_PER_PAGE + 1}〜{Math.min(currentPage * ITEMS_PER_PAGE, filteredCustomers.length)}件を表示）</span>
                )}
              </div>
            )}

            {/* お客様一覧 */}
            {isLoading ? (
              <DashboardSkeleton />
            ) : loadError ? (
              <div className="text-center py-16">
                <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                <p className="text-red-600 text-lg mb-4">{loadError}</p>
                <button
                  onClick={loadData}
                  className="inline-flex items-center px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-md cursor-pointer"
                >
                  再読み込み
                </button>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-16">
                {customers.length === 0 ? (
                  <>
                    <p className="text-slate-500 text-lg mb-4">お客様が登録されていません</p>
                    <Link
                      to="/customers/create"
                      className="inline-flex items-center px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-md"
                    >
                      <Users className="w-5 h-5 mr-2" />
                      お客様を登録する
                    </Link>
                  </>
                ) : (
                  <p className="text-slate-500 text-lg">検索条件に一致するお客様が見つかりません</p>
                )}
              </div>
            ) : viewMode === 'card' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paginatedCustomers.map(customer => (
                  <CustomerCard
                    key={customer.id}
                    customer={customer}
                    onClick={() => navigate(`/customers/${customer.id}`)}
                  />
                ))}
              </div>
            ) : (
              /* リスト表示 */
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">コード</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">お客様名</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">担当者</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">年度</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">最終更新</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedCustomers.map(customer => (
                      <tr
                        key={customer.id}
                        onClick={() => navigate(`/customers/${customer.id}`)}
                        className="hover:bg-emerald-50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 text-sm text-slate-400 font-mono">
                          {customer.customer_code ? `#${customer.customer_code}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-800">
                          {customer.customer_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">
                          {customer.staff_name || <span className="text-slate-400">未設定</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {customer.years.length > 0 ? customer.years.map(year => (
                              <span key={year} className="px-1.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded">
                                {formatReiwaYear(year)}
                              </span>
                            )) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400 tabular-nums">
                          {customer.latest_updated_at ? formatDateTime(customer.latest_updated_at) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ページネーション */}
            {!isLoading && filteredCustomers.length > ITEMS_PER_PAGE && (
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer disabled:cursor-not-allowed"
                  aria-label="前のページ"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium text-slate-700">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer disabled:cursor-not-allowed"
                  aria-label="次のページ"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <AdminMenu onDataRestored={loadData} />

            {/* フッター */}
            <div className="mt-8 pt-6 text-center text-xs text-slate-400">
              <p>{taxReturnData.contactInfo.office}</p>
              <p>TEL: {taxReturnData.contactInfo.tel}</p>
            </div>
          </div>
        </div>
    </PageShell>
  );
}
