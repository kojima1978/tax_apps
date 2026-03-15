import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, Loader2, Search, X, Plus, Users } from 'lucide-react';
import { taxReturnData } from '@/data/taxReturnData';
import { fetchCustomersWithYears, fetchStaff, CustomerWithYears } from '@/utils/api';
import { Staff } from '@/types';
import { CustomerCard } from '@/components/CustomerCard';
import { AdminMenu } from '@/components/AdminMenu';
import PageShell from '@/components/PageShell';

export default function CustomerDashboardPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<CustomerWithYears[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [staffFilter, setStaffFilter] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [customersData, staffData] = await Promise.all([
        fetchCustomersWithYears(),
        fetchStaff(),
      ]);
      setCustomers(customersData);
      setStaffList(staffData);
    } catch {
      // silently fail
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
      result = result.filter(c => c.customer_name.toLowerCase().includes(q));
    }
    if (staffFilter) {
      result = result.filter(c => c.staff_name === staffFilter);
    }
    return result;
  }, [customers, searchText, staffFilter]);

  const hasFilter = searchText.trim() || staffFilter;

  return (
    <PageShell>
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden animate-fade-in">
          {/* ヘッダー */}
          <header className="bg-emerald-600 p-8 text-center text-white relative">
            <a href="/" title="ポータルに戻る" className="absolute top-4 left-4 opacity-70 hover:opacity-100 transition-opacity">
              <Home className="w-6 h-6" />
            </a>
            <h1 className="text-3xl font-bold mb-3">{taxReturnData.title}</h1>
            <p className="text-emerald-100 text-lg">お客様を選択して、必要書類リストを作成・管理できます。</p>
          </header>

          <div className="p-8">
            {/* 検索・フィルタ + お客様登録ボタン */}
            <div className="mb-6 flex gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  placeholder="お客様名で検索..."
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                />
              </div>
              <select
                value={staffFilter}
                onChange={e => setStaffFilter(e.target.value)}
                className="px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white min-w-[140px]"
              >
                <option value="">全担当者</option>
                {staffList.map(s => (
                  <option key={s.id} value={s.staff_name}>{s.staff_name}</option>
                ))}
              </select>
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

            {/* 件数表示 */}
            {!isLoading && customers.length > 0 && (
              <div className="mb-4 text-sm text-slate-500">
                {hasFilter ? (
                  <span>{filteredCustomers.length} / {customers.length} 件</span>
                ) : (
                  <span>{customers.length} 件のお客様</span>
                )}
              </div>
            )}

            {/* お客様カード一覧 */}
            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
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
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCustomers.map(customer => (
                  <CustomerCard
                    key={customer.id}
                    customer={customer}
                    onClick={() => navigate(`/customers/${customer.id}`)}
                  />
                ))}
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
