'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ChevronRight, Database, Download, Home, Loader2, Settings, Upload, Users, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { taxReturnData } from '@/data/taxReturnData';
import { toReiwa } from '@/utils/date';
import { fetchStaff, fetchCustomerNames, fetchAvailableYears } from '@/utils/api';
import { exportFullBackup, importFullBackup, readJsonFile, validateFullBackupImport, FullBackupExport } from '@/utils/jsonExportImport';

interface MenuScreenProps {
  onLoadCustomerData: (customerName: string, staffName: string, year: number) => void;
}

export default function MenuScreen({ onLoadCustomerData }: MenuScreenProps) {
  const router = useRouter();
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

  const handleAddStaff = () => {
    router.push('/staff/create');
  };

  const handleAddCustomer = () => {
    router.push('/customers/create');
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
      alert('バックアップのエクスポートに失敗しました: ' + (error instanceof Error ? error.message : ''));
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
      alert('バックアップの復元に失敗しました: ' + (error instanceof Error ? error.message : ''));
    } finally {
      setIsImporting(false);
      if (backupFileInputRef.current) backupFileInputRef.current.value = '';
    }
  };

  const canLoad = selectedStaffName && selectedCustomer && selectedYear;
  const hasData = staffList.length > 0;

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
        {/* 初回ガイド: 担当者がいない場合 */}
        {!hasData && (
          <div className="flex-1 flex flex-col items-center justify-center py-10 animate-fade-in">
            <div className="max-w-lg w-full bg-white border-2 border-emerald-100 rounded-2xl p-8 text-center shadow-lg">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4">まずは担当者を登録しましょう</h2>
              <p className="text-slate-600 mb-8 leading-relaxed">
                このアプリでは、担当者ごとにお客様のデータを管理します。<br />
                まずはあなたの名前（または担当者名）を登録してください。
              </p>
              <Link
                href="/staff/create"
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-lg shadow-md hover:shadow-xl transition-all flex items-center justify-center gap-2"
              >
                <Database className="w-5 h-5" />
                担当者を登録する
              </Link>
            </div>
          </div>
        )}

        {/* 通常表示: 担当者がいる場合 */}
        {hasData && (
          <>
            {/* 登録リンク */}
            <div className="mb-8 flex items-center gap-6">
              <Link
                href="/staff/create"
                className="inline-flex items-center text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                <UserPlus className="w-4 h-4 mr-1.5" />
                担当者登録
              </Link>
              <Link
                href="/customers/create"
                className="inline-flex items-center text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                <Users className="w-4 h-4 mr-1.5" />
                お客様登録
              </Link>
            </div>

            {/* 保存済みデータ読み込みセクション */}
            <div className="mb-10">
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center mr-3 text-emerald-600">
                  <span className="font-bold">1</span>
                </div>
                <h2 className="text-xl font-bold text-slate-800">
                  データを選択して開始
                </h2>
              </div>

              <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex flex-col gap-6 mb-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <SelectField
                      label="担当者"
                      value={selectedStaffName}
                      onChange={setSelectedStaffName}
                      options={staffList.map(s => s.staff_name)}
                      onAdd={handleAddStaff}
                      addLabel="新規登録"
                    />
                    <SelectField
                      label="お客様名"
                      value={selectedCustomer}
                      onChange={setSelectedCustomer}
                      options={customerNames}
                      disabled={!selectedStaffName}
                      onAdd={handleAddCustomer}
                      addLabel="新規登録"
                    />
                  </div>
                  <div className="w-full md:w-1/2">
                    <SelectField
                      label="対象年度"
                      value={selectedYear}
                      onChange={(val) => setSelectedYear(val ? Number(val) : '')}
                      options={displayYears}
                      formatOption={(y) => availableYears.includes(y) ? `令和${toReiwa(y)}年 (保存済み)` : `令和${toReiwa(y)}年 (新規)`}
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
                href="/data-management"
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
          </>
        )}

        <div className="mt-auto pt-10 text-center text-xs text-slate-400">
          <p>{taxReturnData.contactInfo.office}</p>
          <p>TEL: {taxReturnData.contactInfo.tel}</p>
        </div>
      </div>
    </div>
  );
}

// セレクトフィールドコンポーネント
interface SelectFieldProps<T extends string | number> {
  label: string;
  value: T | '';
  onChange: (value: string) => void;
  options: T[];
  formatOption?: (option: T) => string;
  disabled?: boolean;
  onAdd?: () => void;
  addLabel?: string;
}

function SelectField<T extends string | number>({
  label,
  value,
  onChange,
  options,
  formatOption,
  disabled = false,
  onAdd,
  addLabel
}: SelectFieldProps<T>) {
  return (
    <div className="w-full">
      <div className="flex justify-between items-end mb-2">
        <label className="block text-sm font-bold text-slate-700">{label}</label>
        {onAdd && !disabled && (
          <button
            onClick={onAdd}
            className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center font-medium bg-emerald-50 px-2 py-1 rounded hover:bg-emerald-100 transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5 mr-1" />
            {addLabel || '追加'}
          </button>
        )}
      </div>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white disabled:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400 appearance-none shadow-sm transition-shadow hover:border-emerald-300"
        >
          <option value="">選択してください</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {formatOption ? formatOption(opt) : opt}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-slate-400">
          <ChevronRight className="w-4 h-4 rotate-90" />
        </div>
      </div>
    </div>
  );
}

