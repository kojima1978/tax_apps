'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileEdit, ChevronRight, Database, Loader2, Settings, Users, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { taxReturnData } from '@/data/taxReturnData';
import { fetchStaff, fetchCustomerNames, fetchAvailableYears } from '@/utils/api';
import YearSelector from './YearSelector';
import StaffManagementModal from './StaffManagementModal';
import CustomerManagementModal from './CustomerManagementModal';

interface MenuScreenProps {
  year: number;
  onYearChange: (year: number) => void;
  onStartEditor: () => void;
  onLoadCustomerData: (customerName: string, staffName: string, year: number) => void;
}

export default function MenuScreen({ year, onYearChange, onStartEditor, onLoadCustomerData }: MenuScreenProps) {
  const [staffList, setStaffList] = useState<{ id: number, staff_name: string }[]>([]);
  const [customerNames, setCustomerNames] = useState<string[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedStaffName, setSelectedStaffName] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | ''>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

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
    await onLoadCustomerData(selectedCustomer, selectedStaffName, selectedYear);
    setIsLoading(false);
  };

  const canLoad = selectedStaffName && selectedCustomer && selectedYear;
  const hasData = staffList.length > 0;

  return (
    <div className="bg-white shadow-xl rounded-2xl overflow-hidden animate-fade-in relative min-h-[600px] flex flex-col">
      <header className="bg-emerald-600 p-8 text-center text-white relative flex-shrink-0">
        <h1 className="text-3xl font-bold mb-3">{taxReturnData.title}</h1>
        <p className="text-emerald-100 text-lg">必要書類を確認・編集して、準備リストを作成できます。</p>

        <div className="absolute top-4 right-4 flex gap-3">
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
              <button
                onClick={() => setIsStaffModalOpen(true)}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-lg shadow-md hover:shadow-xl transition-all flex items-center justify-center gap-2"
              >
                <Database className="w-5 h-5" />
                担当者を登録する
              </button>
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
                <h2 className="text-xl font-bold text-slate-800">編集するデータを選択</h2>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <SelectField
                    label="担当者"
                    value={selectedStaffName}
                    onChange={setSelectedStaffName}
                    options={staffList.map(s => s.staff_name)}
                    onAdd={() => setIsStaffModalOpen(true)}
                    addLabel="新規登録"
                  />
                  <SelectField
                    label="お客様名"
                    value={selectedCustomer}
                    onChange={setSelectedCustomer}
                    options={customerNames}
                    disabled={!selectedStaffName}
                    onAdd={() => setIsCustomerModalOpen(true)}
                    addLabel="新規登録"
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
                    className="flex items-center px-8 py-3 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors shadow-md disabled:shadow-none"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        読み込み中...
                      </>
                    ) : (
                      <>
                        <ChevronRight className="w-5 h-5 mr-1" />
                        読み込んで編集
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* 新規作成セクション */}
            <div className="border-t border-slate-100 pt-10">
              <div className="flex items-center justify-center mb-8">
                <span className="bg-white px-4 text-slate-400 text-sm font-medium relative z-10">
                  または、新しいリストを作成
                </span>
                <div className="absolute left-0 right-0 h-px bg-slate-200 transform -translate-y-1/2 z-0"></div>
              </div>

              <div className="flex justify-center mb-8">
                <YearSelector year={year} onYearChange={onYearChange} />
              </div>

              <div className="max-w-md mx-auto">
                <button
                  onClick={onStartEditor}
                  className="group relative flex flex-col items-center p-8 bg-white border-2 border-emerald-50 rounded-2xl shadow-sm hover:border-emerald-500 hover:shadow-xl transition-all duration-300 text-center w-full"
                >
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-emerald-600 transition-colors">
                    <FileEdit className="w-8 h-8 text-emerald-600 group-hover:text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">新規リスト作成</h3>
                  <p className="text-sm text-slate-500 mb-6">
                    一から新しいリストを作成します
                  </p>
                  <div className="flex items-center px-6 py-2 bg-emerald-50 text-emerald-700 rounded-full font-bold text-sm group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    作成スタート <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </button>
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

      <CustomerManagementModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        defaultStaffId={staffList.find(s => s.staff_name === selectedStaffName)?.id}
        onCustomerChange={(newCustomerName) => {
          if (selectedStaffName) {
            loadCustomerNames(selectedStaffName).then(() => {
              if (newCustomerName) {
                setSelectedCustomer(newCustomerName);
              }
            });
          }
        }}
      />

      <StaffManagementModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        onStaffChange={loadStaff}
      />
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
    <div>
      <div className="flex justify-between items-end mb-2">
        <label className="block text-sm font-bold text-slate-700">{label}</label>
        {onAdd && !disabled && (
          <button
            onClick={onAdd}
            className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center font-medium bg-emerald-50 px-2 py-0.5 rounded-full hover:bg-emerald-100 transition-colors"
          >
            <UserPlus className="w-3 h-3 mr-1" />
            {addLabel || '追加'}
          </button>
        )}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white disabled:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
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

