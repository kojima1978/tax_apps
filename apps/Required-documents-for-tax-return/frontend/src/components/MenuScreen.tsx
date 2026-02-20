import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ChevronRight, Download, Edit2, Home, Loader2, Settings, Upload, Users, UserPlus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { taxReturnData } from '@/data/taxReturnData';
import { formatReiwaYear } from '@/utils/date';
import { fetchStaff, fetchCustomerNames, fetchAvailableYears } from '@/utils/api';
import { getErrorMessage } from '@/utils/error';
import { exportFullBackup, importFullBackup, readJsonFile, validateFullBackupImport, FullBackupExport } from '@/utils/jsonExportImport';
import SelectField from './SelectField';

const MENU_LINKS = [
  { href: '/staff/create', icon: UserPlus, label: '担当者登録', primary: true },
  { href: '/staff', icon: Edit2, label: '担当者一覧・編集', primary: false },
  { href: '/customers/create', icon: Users, label: 'お客様登録', primary: true },
  { href: '/customers', icon: Edit2, label: 'お客様一覧・編集', primary: false },
] as const;

interface MenuScreenProps {
  onLoadCustomerData: (customerName: string, staffName: string, year: number) => void;
}

export default function MenuScreen({ onLoadCustomerData }: MenuScreenProps) {
  const navigate = useNavigate();
  const [staffList, setStaffList] = useState<{ id: number, staff_name: string }[]>([]);
  const [customerNames, setCustomerNames] = useState<string[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedStaffName, setSelectedStaffName] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | ''>('');
  const [isLoading, setIsLoading] = useState(false);

  // Default years to show if no history exists (Current year and Previous year)
  const defaultYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let y = currentYear; y >= 2019; y--) {
      years.push(y);
    }
    return years;
  }, []);

  // Merge available years with default years for display
  const displayYears = useMemo(
    () => Array.from(new Set([...availableYears, ...defaultYears])).sort((a, b) => b - a),
    [availableYears, defaultYears]
  );

  const loadStaff = useCallback(async () => {
    const staff = await fetchStaff();
    setStaffList(staff);
  }, []);

  const loadCustomerNames = useCallback(async (staffName: string) => {
    const names = await fetchCustomerNames(staffName || undefined);
    setCustomerNames(names);
  }, []);

  const loadAvailableYears = useCallback(async (customerName: string, staffName: string) => {
    const years = await fetchAvailableYears(customerName || undefined, staffName || undefined);
    setAvailableYears(years);
  }, []);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  useEffect(() => {
    if (selectedStaffName) {
      loadCustomerNames(selectedStaffName);
    } else {
      setCustomerNames([]);
    }
    setSelectedCustomer('');
    setSelectedYear('');
    setAvailableYears([]);
  }, [selectedStaffName, loadCustomerNames]);

  useEffect(() => {
    if (selectedCustomer && selectedStaffName) {
      loadAvailableYears(selectedCustomer, selectedStaffName);
    } else {
      setAvailableYears([]);
    }
    setSelectedYear('');
  }, [selectedCustomer, selectedStaffName, loadAvailableYears]);

  const handleLoadData = async () => {
    if (!selectedStaffName || !selectedCustomer || !selectedYear) return;

    setIsLoading(true);
    await onLoadCustomerData(selectedCustomer, selectedStaffName, Number(selectedYear));
    setIsLoading(false);
  };

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
      loadStaff();
    } catch (error) {
      alert('バックアップの復元に失敗しました: ' + getErrorMessage(error, ''));
    } finally {
      setIsImporting(false);
      if (backupFileInputRef.current) backupFileInputRef.current.value = '';
    }
  };

  const canLoad = selectedStaffName && selectedCustomer && selectedYear;

  return (
    <div className="bg-white shadow-xl rounded-2xl overflow-hidden animate-fade-in relative min-h-[600px] flex flex-col">
      <header className="bg-emerald-600 p-8 text-center text-white relative flex-shrink-0">
        <a href="/" title="ポータルに戻る" className="absolute top-4 left-4 opacity-70 hover:opacity-100 transition-opacity">
          <Home className="w-6 h-6" />
        </a>
        <h1 className="text-3xl font-bold mb-3">{taxReturnData.title}</h1>
        <p className="text-emerald-100 text-lg">必要書類を確認・編集して、準備リストを作成できます。</p>

      </header>

      <div className="p-8 flex-1 flex flex-col">
            {/* 保存済みデータ読み込みセクション */}
            <div className="mb-10">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center mr-3 text-emerald-600">
                  <span className="font-bold">1</span>
                </div>
                <h2 className="text-xl font-bold text-slate-800">
                  データを選択して開始（担当者・お客様登録）
                </h2>
              </div>

              {/* 登録・編集リンク */}
              <div className="mb-6 ml-11 flex items-center gap-6">
                {MENU_LINKS.map(({ href, icon: Icon, label, primary }) => (
                  <Link
                    key={href}
                    to={href}
                    className={`inline-flex items-center text-sm font-medium transition-colors ${
                      primary ? 'text-emerald-600 hover:text-emerald-700' : 'text-slate-500 hover:text-emerald-600'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-1.5" />
                    {label}
                  </Link>
                ))}
              </div>

              <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex flex-col gap-6 mb-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <SelectField
                      label="担当者"
                      value={selectedStaffName}
                      onChange={setSelectedStaffName}
                      options={staffList.map(s => s.staff_name)}
                      onAdd={() => navigate('/staff/create')}
                      addLabel="新規登録"
                    />
                    <SelectField
                      label="お客様名"
                      value={selectedCustomer}
                      onChange={setSelectedCustomer}
                      options={customerNames}
                      disabled={!selectedStaffName}
                      onAdd={() => navigate('/customers/create')}
                      addLabel="新規登録"
                    />
                  </div>
                  <div className="w-full md:w-1/2">
                    <SelectField
                      label="対象年度"
                      value={selectedYear}
                      onChange={(val) => setSelectedYear(val ? Number(val) : '')}
                      options={displayYears}
                      formatOption={(y) => availableYears.includes(y) ? `${formatReiwaYear(y)} (保存済み)` : `${formatReiwaYear(y)} (新規)`}
                      disabled={!selectedCustomer}
                    />
                  </div>
                </div>

                <div className="flex justify-center md:justify-end">
                  <button
                    onClick={handleLoadData}
                    disabled={!canLoad || isLoading}
                    className="w-full md:w-auto flex items-center justify-center px-10 py-4 bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all shadow-md disabled:shadow-none transform hover:-translate-y-0.5 active:translate-y-0"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        準備中...
                      </>
                    ) : (
                      <>
                        <ChevronRight className="w-5 h-5 mr-2" />
                        作成・編集する
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* 管理画面リンク */}
            <div className="mt-12 text-center">
              <Link
                to="/data-management"
                className="inline-flex items-center px-6 py-3 text-slate-500 hover:text-emerald-600 transition-colors hover:bg-slate-50 rounded-full border border-transparent hover:border-slate-200"
              >
                <Settings className="w-4 h-4 mr-2" />
                保存データ管理画面へ
              </Link>
            </div>

            {/* データバックアップ・復元 */}
            <div className="mt-8 pt-8 border-t border-slate-200">
              <div className="flex items-center justify-center gap-4">
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

        <div className="mt-auto pt-10 text-center text-xs text-slate-400">
          <p>{taxReturnData.contactInfo.office}</p>
          <p>TEL: {taxReturnData.contactInfo.tel}</p>
        </div>
      </div>
    </div>
  );
}

