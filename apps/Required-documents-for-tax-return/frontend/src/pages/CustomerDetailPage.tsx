import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, LayoutDashboard, Loader2, ChevronRight, Edit2, Calendar, Trash2 } from 'lucide-react';
import { fetchCustomerById, fetchAvailableYears, deleteDocumentByCustomerAndYear } from '@/utils/api';
import { formatReiwaYear, getDefaultYear } from '@/utils/date';
import { Customer } from '@/types';
import PageShell from '@/components/PageShell';

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const customerId = Number(id);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [savedYears, setSavedYears] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNewYear, setSelectedNewYear] = useState<number | ''>('');

  const defaultYear = getDefaultYear();

  // 年度選択肢（2019〜現在）
  const allYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let y = currentYear; y >= 2019; y--) {
      years.push(y);
    }
    return years;
  }, []);

  const loadCustomer = useCallback(async () => {
    if (isNaN(customerId)) return;
    setIsLoading(true);
    try {
      const customerData = await fetchCustomerById(customerId);
      setCustomer(customerData);

      const customerYears = await fetchAvailableYears(customerData.customer_name, customerData.staff_name);
      setSavedYears(customerYears);

      // Set default new year (pick latest unsaved year or default)
      if (customerYears.length > 0) {
        const latestSaved = Math.max(...customerYears);
        const nextYear = latestSaved + 1;
        const currentYear = new Date().getFullYear();
        if (nextYear <= currentYear) {
          setSelectedNewYear(nextYear);
        } else {
          setSelectedNewYear(defaultYear);
        }
      } else {
        setSelectedNewYear(defaultYear);
      }
    } catch {
      // Customer not found
    } finally {
      setIsLoading(false);
    }
  }, [customerId, defaultYear]);

  useEffect(() => {
    loadCustomer();
  }, [loadCustomer]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </main>
    );
  }

  if (!customer) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 text-lg mb-4">お客様が見つかりません</p>
          <Link to="/" className="text-emerald-600 hover:text-emerald-700 font-medium">
            トップページに戻る
          </Link>
        </div>
      </main>
    );
  }

  return (
    <PageShell>
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden animate-fade-in">
          {/* ヘッダー */}
          <div className="bg-emerald-600 p-6 text-white">
            <div className="flex items-center mb-4">
              <Link
                to="/"
                className="mr-1 p-1.5 rounded-full hover:bg-emerald-500 transition-colors opacity-80 hover:opacity-100"
                title="TOPへ戻る"
              >
                <LayoutDashboard className="w-5 h-5" />
              </Link>
              <button
                onClick={() => navigate(-1)}
                className="mr-3 p-1.5 rounded-full hover:bg-emerald-500 transition-colors opacity-80 hover:opacity-100"
                aria-label="前のページに戻る"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold">{customer.customer_name} 様</h1>
                <p className="text-emerald-100 text-sm">担当: {customer.staff_name || '未設定'}</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* 保存済み年度リスト */}
            <div className="mb-8">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-emerald-600" />
                保存済み年度
              </h2>

              {savedYears.length > 0 ? (
                <div className="space-y-2">
                  {savedYears.map(year => (
                    <div
                      key={year}
                      className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-emerald-300 hover:shadow-sm transition-all group"
                    >
                      <Link
                        to={`/customers/${customerId}/years/${year}`}
                        className="flex-1 flex items-center"
                      >
                        <span className="px-3 py-1 text-sm font-bold bg-emerald-100 text-emerald-700 rounded-full mr-3">
                          {formatReiwaYear(year)}
                        </span>
                        <span className="text-sm text-slate-500">{year}年分</span>
                      </Link>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/customers/${customerId}/years/${year}`}
                          className="text-emerald-600 font-medium text-sm group-hover:text-emerald-700 flex items-center"
                        >
                          編集する
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Link>
                        <button
                          onClick={async () => {
                            if (!confirm(`${formatReiwaYear(year)}（${year}年分）のデータを削除してもよろしいですか？\nこの操作は取り消せません。`)) return;
                            try {
                              await deleteDocumentByCustomerAndYear(customerId, year);
                              setSavedYears(prev => prev.filter(y => y !== year));
                            } catch {
                              alert('削除に失敗しました');
                            }
                          }}
                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="この年度のデータを削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm py-4">保存された書類データはありません</p>
              )}
            </div>

            {/* 新規年度作成 */}
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
              <h2 className="text-lg font-bold text-slate-800 mb-4">新しい年度の書類を作成</h2>
              <div className="flex items-center gap-4">
                <select
                  value={selectedNewYear}
                  onChange={e => setSelectedNewYear(e.target.value ? Number(e.target.value) : '')}
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                >
                  <option value="">年度を選択</option>
                  {allYears.map(year => (
                    <option key={year} value={year}>
                      {formatReiwaYear(year)} {savedYears.includes(year) ? '(保存済み)' : '(新規)'}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    if (selectedNewYear) {
                      navigate(`/customers/${customerId}/years/${selectedNewYear}`);
                    }
                  }}
                  disabled={!selectedNewYear}
                  className="flex items-center px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all shadow-md disabled:shadow-none"
                >
                  <ChevronRight className="w-5 h-5 mr-1" />
                  作成・編集する
                </button>
              </div>
            </div>

            {/* お客様情報編集リンク */}
            <div className="mt-6 text-center">
              <Link
                to={`/customers/${customerId}/edit`}
                className="inline-flex items-center text-sm text-slate-500 hover:text-emerald-600 transition-colors"
              >
                <Edit2 className="w-4 h-4 mr-1.5" />
                お客様情報を編集
              </Link>
            </div>
          </div>
        </div>
    </PageShell>
  );
}
