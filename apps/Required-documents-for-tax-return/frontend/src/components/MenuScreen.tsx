'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileEdit, ChevronRight, Database, Loader2, Settings } from 'lucide-react';
import Link from 'next/link';
import { taxReturnData } from '@/data/taxReturnData';
import { fetchStaffNames, fetchCustomerNames, fetchAvailableYears } from '@/utils/api';
import YearSelector from './YearSelector';

interface MenuScreenProps {
  year: number;
  onYearChange: (year: number) => void;
  onStartEditor: () => void;
  onLoadCustomerData: (customerName: string, staffName: string, year: number) => void;
}

export default function MenuScreen({ year, onYearChange, onStartEditor, onLoadCustomerData }: MenuScreenProps) {
  const [staffNames, setStaffNames] = useState<string[]>([]);
  const [customerNames, setCustomerNames] = useState<string[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | ''>('');
  const [isLoading, setIsLoading] = useState(false);

  const loadStaffNames = useCallback(async () => {
    const names = await fetchStaffNames();
    setStaffNames(names);
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
    loadStaffNames();
  }, [loadStaffNames]);

  useEffect(() => {
    if (selectedStaff) {
      loadCustomerNames(selectedStaff);
    } else {
      setCustomerNames([]);
    }
    setSelectedCustomer('');
    setSelectedYear('');
    setAvailableYears([]);
  }, [selectedStaff, loadCustomerNames]);

  useEffect(() => {
    if (selectedCustomer && selectedStaff) {
      loadAvailableYears(selectedCustomer, selectedStaff);
    } else {
      setAvailableYears([]);
    }
    setSelectedYear('');
  }, [selectedCustomer, selectedStaff, loadAvailableYears]);

  const handleLoadData = async () => {
    if (!selectedStaff || !selectedCustomer || !selectedYear) return;

    setIsLoading(true);
    await onLoadCustomerData(selectedCustomer, selectedStaff, selectedYear);
    setIsLoading(false);
  };

  const canLoad = selectedStaff && selectedCustomer && selectedYear;
  const hasData = staffNames.length > 0;

  return (
    <div className="bg-white shadow-xl rounded-2xl overflow-hidden animate-fade-in">
      <header className="bg-emerald-600 p-10 text-center text-white">
        <h1 className="text-3xl font-bold mb-3">{taxReturnData.title}</h1>
        <p className="text-emerald-100 text-lg">必要書類を確認・編集して、準備リストを作成できます。</p>
      </header>

      <div className="p-10">
        {/* 保存済みデータ読み込みセクション */}
        {hasData && (
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <Database className="w-5 h-5 text-emerald-600 mr-2" />
              <h2 className="text-lg font-bold text-slate-800">保存済みデータを読み込む</h2>
            </div>
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <SelectField
                  label="担当者"
                  value={selectedStaff}
                  onChange={setSelectedStaff}
                  options={staffNames}
                />
                <SelectField
                  label="お客様名"
                  value={selectedCustomer}
                  onChange={setSelectedCustomer}
                  options={customerNames}
                  disabled={!selectedStaff}
                />
                <SelectField
                  label="年度"
                  value={selectedYear}
                  onChange={(val) => setSelectedYear(val ? Number(val) : '')}
                  options={availableYears}
                  formatOption={(y) => `令和${y}年`}
                  disabled={!selectedCustomer}
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleLoadData}
                  disabled={!canLoad || isLoading}
                  className="flex items-center px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      読み込み中...
                    </>
                  ) : (
                    <>
                      <ChevronRight className="w-4 h-4 mr-1" />
                      読み込んで編集
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 新規作成セクション */}
        <div className={hasData ? 'border-t border-slate-200 pt-8' : ''}>
          {hasData && <p className="text-center text-slate-500 text-sm mb-4">または、新規作成</p>}
          <div className="flex justify-center mb-8">
            <YearSelector year={year} onYearChange={onYearChange} />
          </div>
          <div className="max-w-md mx-auto">
            <button
              onClick={onStartEditor}
              className="group relative flex flex-col items-center p-8 bg-white border-2 border-emerald-100 rounded-2xl shadow-sm hover:border-emerald-500 hover:shadow-xl transition-all duration-300 text-center w-full"
            >
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6 group-hover:bg-emerald-600 transition-colors">
                <FileEdit className="w-10 h-10 text-emerald-600 group-hover:text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-3">書類リストを編集</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                全ての必要書類を一覧表示し、
                <br />
                <span className="font-bold text-emerald-600">追加・削除・編集</span>して
                お客様専用のリストを作成します。
              </p>
              <div className="mt-8 flex items-center px-6 py-2 bg-emerald-50 text-emerald-700 rounded-full font-bold group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                編集を開始 <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </button>
          </div>
        </div>

        {/* 管理画面リンク */}
        {hasData && (
          <div className="mt-8 flex justify-center">
            <Link
              href="/data-management"
              className="flex items-center px-4 py-2 text-slate-500 hover:text-slate-700 transition-colors"
            >
              <Settings className="w-4 h-4 mr-2" />
              保存データ管理
            </Link>
          </div>
        )}

        <div className="mt-10 text-center text-sm text-slate-500">
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
}

function SelectField<T extends string | number>({
  label,
  value,
  onChange,
  options,
  formatOption,
  disabled = false,
}: SelectFieldProps<T>) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
      >
        <option value="">選択してください</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {formatOption ? formatOption(opt) : opt}
          </option>
        ))}
      </select>
    </div>
  );
}
