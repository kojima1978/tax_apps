import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, Loader2, Search, Download, Upload, Settings, UserPlus, Users, Edit2, X, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { taxReturnData } from '@/data/taxReturnData';
import { formatReiwaYear, formatDateTime } from '@/utils/date';
import { fetchCustomersWithYears, fetchStaff, CustomerWithYears } from '@/utils/api';
import { getErrorMessage } from '@/utils/error';
import { exportFullBackup, importFullBackup, readJsonFile, validateFullBackupImport, FullBackupExport } from '@/utils/jsonExportImport';
import { Staff } from '@/types';

const ADMIN_LINKS = [
  { href: '/staff/create', icon: UserPlus, label: '担当者登録' },
  { href: '/staff', icon: Edit2, label: '担当者一覧・編集' },
  { href: '/customers', icon: Users, label: 'お客様一覧・編集' },
  { href: '/data-management', icon: Settings, label: '保存データ管理' },
] as const;

export default function CustomerDashboardPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<CustomerWithYears[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [staffFilter, setStaffFilter] = useState('');
  const [showAdmin, setShowAdmin] = useState(false);

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

  // バックアップ/復元
  const backupFileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleFullExport = async () => {
    setIsExporting(true);
    try {
      await exportFullBackup();
    } catch (error) {
      alert('バックアップのエクスポートに失敗しました: ' + getErrorMessage(error, ''));
    } finally {
      setIsExporting(false);
    }
  };

  const handleFullImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const rawData = await readJsonFile(file);
      const validation = validateFullBackupImport(rawData);
      if (!validation.isValid) {
        alert(validation.error);
        return;
      }

      if (!confirm('既存のデータと重複する場合は上書きされます。復元を実行しますか？')) return;

      const result = await importFullBackup(rawData as FullBackupExport);
      alert(`復元が完了しました。\n担当者: ${result.staffCount}件\nお客様: ${result.customerCount}件\n書類データ: ${result.recordCount}件`);
      loadData();
    } catch (error) {
      alert('バックアップの復元に失敗しました: ' + getErrorMessage(error, ''));
    } finally {
      setIsImporting(false);
      if (backupFileInputRef.current) backupFileInputRef.current.value = '';
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
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
                  <button
                    key={customer.id}
                    onClick={() => navigate(`/customers/${customer.id}`)}
                    className="text-left bg-white border border-slate-200 rounded-xl p-5 hover:border-emerald-300 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                        {customer.customer_name}
                      </h3>
                    </div>
                    <p className="text-sm text-slate-500 mb-3">
                      担当: {customer.staff_name || <span className="text-slate-400">未設定</span>}
                    </p>
                    {customer.years.length > 0 ? (
                      <>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {customer.years.map(year => (
                            <span
                              key={year}
                              className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full"
                            >
                              {formatReiwaYear(year)}
                            </span>
                          ))}
                        </div>
                        {customer.latest_updated_at && (
                          <p className="text-xs text-slate-400">
                            最終更新: {formatDateTime(customer.latest_updated_at)}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-slate-400">書類データなし</p>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* 管理メニュー（折りたたみ） */}
            <div className="mt-10 border-t border-slate-200 pt-6">
              <button
                onClick={() => setShowAdmin(!showAdmin)}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                <Settings className="w-4 h-4" />
                管理メニュー
                {showAdmin ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showAdmin && (
                <div className="mt-4 space-y-4 animate-fade-in">
                  {/* 管理リンク */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {ADMIN_LINKS.map(({ href, icon: Icon, label }) => (
                      <Link
                        key={href}
                        to={href}
                        className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all text-slate-600 hover:text-emerald-700 group"
                      >
                        <Icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-medium text-center">{label}</span>
                      </Link>
                    ))}
                  </div>

                  {/* バックアップ・復元 */}
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      onClick={handleFullExport}
                      disabled={isExporting}
                      className="inline-flex items-center px-4 py-2 text-sm text-slate-600 hover:text-emerald-700 bg-white border border-slate-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {isExporting ? 'エクスポート中...' : '全データバックアップ'}
                    </button>
                    <button
                      onClick={() => backupFileInputRef.current?.click()}
                      disabled={isImporting}
                      className="inline-flex items-center px-4 py-2 text-sm text-slate-600 hover:text-amber-700 bg-white border border-slate-200 rounded-lg hover:border-amber-300 hover:bg-amber-50 transition-colors disabled:opacity-50"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {isImporting ? '復元中...' : 'バックアップから復元'}
                    </button>
                    <input
                      ref={backupFileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleFullImport}
                      className="hidden"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* フッター */}
            <div className="mt-8 pt-6 text-center text-xs text-slate-400">
              <p>{taxReturnData.contactInfo.office}</p>
              <p>TEL: {taxReturnData.contactInfo.tel}</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
