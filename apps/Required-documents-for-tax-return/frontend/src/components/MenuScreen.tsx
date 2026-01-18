'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileEdit, ChevronRight, Database, Loader2, Settings } from 'lucide-react';
import Link from 'next/link';
import { taxReturnData } from '@/data/taxReturnData';
import YearSelector from './YearSelector';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface MenuScreenProps {
  year: number;
  onYearChange: (year: number) => void;
  onStartEditor: () => void;
  onLoadCustomerData: (customerName: string, staffName: string, year: number) => void;
}

export default function MenuScreen({ year, onYearChange, onStartEditor, onLoadCustomerData }: MenuScreenProps) {
  // セレクトボックス用の状態
  const [staffNames, setStaffNames] = useState<string[]>([]);
  const [customerNames, setCustomerNames] = useState<string[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  const [selectedStaff, setSelectedStaff] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | ''>('');

  const [isLoading, setIsLoading] = useState(false);

  // 担当者一覧を取得
  const fetchStaffNames = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/staff-names`);
      if (response.ok) {
        const data = await response.json();
        setStaffNames(data.staffNames || []);
      }
    } catch (error) {
      console.error('担当者一覧の取得に失敗:', error);
    }
  }, []);

  // お客様名一覧を取得（担当者でフィルタ）
  const fetchCustomerNames = useCallback(async (staffName: string) => {
    try {
      const url = staffName
        ? `${API_BASE_URL}/api/customer-names?staffName=${encodeURIComponent(staffName)}`
        : `${API_BASE_URL}/api/customer-names`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setCustomerNames(data.customerNames || []);
      }
    } catch (error) {
      console.error('お客様名一覧の取得に失敗:', error);
    }
  }, []);

  // 年度一覧を取得（お客様名・担当者名でフィルタ）
  const fetchAvailableYears = useCallback(async (customerName: string, staffName: string) => {
    try {
      const url = customerName && staffName
        ? `${API_BASE_URL}/api/available-years?customerName=${encodeURIComponent(customerName)}&staffName=${encodeURIComponent(staffName)}`
        : `${API_BASE_URL}/api/available-years`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setAvailableYears(data.years || []);
      }
    } catch (error) {
      console.error('年度一覧の取得に失敗:', error);
    }
  }, []);

  // 初期読み込み
  useEffect(() => {
    fetchStaffNames();
  }, [fetchStaffNames]);

  // 担当者が変更されたらお客様名一覧を更新
  useEffect(() => {
    if (selectedStaff) {
      fetchCustomerNames(selectedStaff);
      setSelectedCustomer('');
      setSelectedYear('');
      setAvailableYears([]);
    } else {
      setCustomerNames([]);
      setSelectedCustomer('');
      setSelectedYear('');
      setAvailableYears([]);
    }
  }, [selectedStaff, fetchCustomerNames]);

  // お客様名が変更されたら年度一覧を更新
  useEffect(() => {
    if (selectedCustomer && selectedStaff) {
      fetchAvailableYears(selectedCustomer, selectedStaff);
      setSelectedYear('');
    } else {
      setAvailableYears([]);
      setSelectedYear('');
    }
  }, [selectedCustomer, selectedStaff, fetchAvailableYears]);

  // 読み込みボタン
  const handleLoadData = async () => {
    if (!selectedStaff || !selectedCustomer || !selectedYear) {
      return;
    }
    setIsLoading(true);
    await onLoadCustomerData(selectedCustomer, selectedStaff, selectedYear);
    setIsLoading(false);
  };

  const canLoad = selectedStaff && selectedCustomer && selectedYear;

  return (
    <div className="bg-white shadow-xl rounded-2xl overflow-hidden animate-fade-in">
      <header className="bg-emerald-600 p-10 text-center text-white">
        <h1 className="text-3xl font-bold mb-3">{taxReturnData.title}</h1>
        <p className="text-emerald-100 text-lg">必要書類を確認・編集して、準備リストを作成できます。</p>
      </header>
      <div className="p-10">
        {/* 保存済みデータ読み込みセクション */}
        {staffNames.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <Database className="w-5 h-5 text-emerald-600 mr-2" />
              <h2 className="text-lg font-bold text-slate-800">保存済みデータを読み込む</h2>
            </div>
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {/* 担当者選択 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    担当者
                  </label>
                  <select
                    value={selectedStaff}
                    onChange={(e) => setSelectedStaff(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                  >
                    <option value="">選択してください</option>
                    {staffNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* お客様名選択 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    お客様名
                  </label>
                  <select
                    value={selectedCustomer}
                    onChange={(e) => setSelectedCustomer(e.target.value)}
                    disabled={!selectedStaff}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
                  >
                    <option value="">選択してください</option>
                    {customerNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 年度選択 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    年度
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value ? Number(e.target.value) : '')}
                    disabled={!selectedCustomer}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
                  >
                    <option value="">選択してください</option>
                    {availableYears.map((y) => (
                      <option key={y} value={y}>
                        令和{y}年
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 読み込みボタン */}
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
        <div className={staffNames.length > 0 ? 'border-t border-slate-200 pt-8' : ''}>
          {staffNames.length > 0 && (
            <p className="text-center text-slate-500 text-sm mb-4">または、新規作成</p>
          )}
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
        {staffNames.length > 0 && (
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
