'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, Database, Loader2, Settings, Users, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { taxReturnData } from '@/data/taxReturnData';
import { fetchStaff, fetchCustomerNames, fetchAvailableYears } from '@/utils/api';
// import YearSelector from './YearSelector';

interface MenuScreenProps {
  year: number;
  onYearChange: (year: number) => void;
  onStartEditor: () => void;
  onLoadCustomerData: (customerName: string, staffName: string, year: number) => void;
}

export default function MenuScreen({ year, onYearChange, onStartEditor, onLoadCustomerData }: MenuScreenProps) {
  const router = useRouter();
  const [staffList, setStaffList] = useState<{ id: number, staff_name: string }[]>([]);
  const [customerNames, setCustomerNames] = useState<string[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedStaffName, setSelectedStaffName] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | ''>('');
  const [isLoading, setIsLoading] = useState(false);

  // Default years to show if no history exists (Current year and Previous year)
  // Default years to show if no history exists (Current year and Previous year)
  const currentYear = new Date().getFullYear();
  const defaultYears = [];
  for (let y = currentYear; y >= 2019; y--) {
    defaultYears.push(y);
  }

  // Merge available years with default years for display
  const displayYears = Array.from(new Set([...availableYears, ...defaultYears]))
    .sort((a, b) => b - a);

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

  const canLoad = selectedStaffName && selectedCustomer && selectedYear;
  const hasData = staffList.length > 0;

  return (
    <div className="bg-white shadow-xl rounded-2xl overflow-hidden animate-fade-in relative min-h-[600px] flex flex-col">
      <header className="bg-emerald-600 p-8 text-center text-white relative flex-shrink-0">
        <h1 className="text-3xl font-bold mb-3">{taxReturnData.title}</h1>
        <p className="text-emerald-100 text-lg">必要書類を確認・編集して、準備リストを作成できます。</p>

        <div className="absolute top-4 right-4 flex gap-3">
          <Link
            href="/staff"
            className="p-2 bg-emerald-700 hover:bg-emerald-800 rounded-full transition-colors text-white"
            title="担当者管理"
          >
            <Users className="w-5 h-5" />
          </Link>
          <Link
            href="/customers"
            className="p-2 bg-emerald-700 hover:bg-emerald-800 rounded-full transition-colors text-white"
            title="お客様管理"
          >
            <UserPlus className="w-5 h-5" />
          </Link>
        </div>
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
                      formatOption={(y) => availableYears.includes(y) ? `令和${y - 2018}年 (保存済み)` : `令和${y - 2018}年 (新規)`}
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

