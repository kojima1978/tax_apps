'use client';

import { useState, useEffect, useCallback } from 'react';
import MenuScreen from '@/components/MenuScreen';
import DocumentListScreen, { CategoryGroup, generateInitialDocumentGroups } from '@/components/DocumentListScreen';

// バックエンドAPIのベースURL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type Step = 'menu' | 'editor';

interface AppState {
  step: Step;
  year: number;
  documentGroups: CategoryGroup[];
  customerName: string;
  staffName: string;
  isSaving: boolean;
  isLoading: boolean;
  lastSaved: Date | null;
  saveError: string | null;
}

// デフォルトの年度を計算（現在の年から令和年に変換）
function getDefaultReiwaYear(): number {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  // 1-3月の場合は前年の確定申告なので前年の令和年を返す
  if (currentMonth <= 3) {
    return currentYear - 2018 - 1;
  }
  return currentYear - 2018;
}

export default function Home() {
  const defaultYear = getDefaultReiwaYear();

  const [state, setState] = useState<AppState>({
    step: 'menu',
    year: defaultYear,
    documentGroups: generateInitialDocumentGroups(defaultYear),
    customerName: '',
    staffName: '',
    isSaving: false,
    isLoading: false,
    lastSaved: null,
    saveError: null,
  });

  // データを保存する関数
  const saveData = useCallback(async () => {
    if (!state.customerName.trim() || !state.staffName.trim()) {
      return; // お客様名と担当者名が入力されていない場合は保存しない
    }

    setState((prev) => ({ ...prev, isSaving: true, saveError: null }));

    try {
      const response = await fetch(`${API_BASE_URL}/api/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: state.customerName,
          staffName: state.staffName,
          year: state.year,
          documentGroups: state.documentGroups,
        }),
      });

      if (!response.ok) {
        throw new Error('保存に失敗しました');
      }

      setState((prev) => ({
        ...prev,
        isSaving: false,
        lastSaved: new Date(),
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isSaving: false,
        saveError: error instanceof Error ? error.message : '保存に失敗しました',
      }));
    }
  }, [state.customerName, state.staffName, state.year, state.documentGroups]);

  // データを読み込む関数
  const loadData = useCallback(async (customerName: string, staffName: string, year: number) => {
    if (!customerName.trim() || !staffName.trim()) {
      return false;
    }

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const params = new URLSearchParams({
        customerName,
        staffName,
        year: String(year),
      });

      const response = await fetch(`${API_BASE_URL}/api/documents?${params}`);
      const data = await response.json();

      if (data.found && data.documentGroups) {
        setState((prev) => ({
          ...prev,
          documentGroups: data.documentGroups as CategoryGroup[],
          isLoading: false,
        }));
        return true;
      }

      setState((prev) => ({ ...prev, isLoading: false }));
      return false;
    } catch (error) {
      console.error('データの読み込みに失敗しました:', error);
      setState((prev) => ({ ...prev, isLoading: false }));
      return false;
    }
  }, []);

  // 翌年度更新関数
  const copyToNextYear = useCallback(async () => {
    if (!state.customerName.trim() || !state.staffName.trim()) {
      alert('お客様名と担当者名を入力してください');
      return;
    }

    // まず現在のデータを保存
    await saveData();

    try {
      const response = await fetch(`${API_BASE_URL}/api/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: state.customerName,
          staffName: state.staffName,
          year: state.year,
          action: 'copyToNextYear',
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert(`令和${state.year}年のデータを令和${state.year + 1}年にコピーしました。\n年度を切り替えて確認してください。`);
      } else {
        alert(data.error || '翌年度更新に失敗しました');
      }
    } catch (error) {
      console.error('翌年度更新に失敗しました:', error);
      alert('翌年度更新に失敗しました');
    }
  }, [state.customerName, state.staffName, state.year, saveData]);

  // 自動保存（documentGroupsが変更されたら5秒後に保存）
  useEffect(() => {
    if (state.step !== 'editor') return;
    if (!state.customerName.trim() || !state.staffName.trim()) return;

    const timeoutId = setTimeout(() => {
      saveData();
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, [state.documentGroups, state.step, state.customerName, state.staffName, saveData]);

  const handleYearChange = async (year: number) => {
    // 年度が変わった場合、まずデータベースから読み込みを試みる
    setState((prev) => ({
      ...prev,
      year,
    }));

    // お客様名と担当者名が設定されている場合はデータを読み込む
    if (state.customerName.trim() && state.staffName.trim()) {
      const loaded = await loadData(state.customerName, state.staffName, year);
      if (!loaded) {
        // データがない場合は新規生成
        setState((prev) => ({
          ...prev,
          documentGroups: generateInitialDocumentGroups(year),
        }));
      }
    } else {
      // お客様名と担当者名がない場合は新規生成
      setState((prev) => ({
        ...prev,
        documentGroups: generateInitialDocumentGroups(year),
      }));
    }
  };

  const handleDocumentGroupsChange = (documentGroups: CategoryGroup[]) => {
    setState((prev) => ({ ...prev, documentGroups }));
  };

  const handleCustomerNameChange = (customerName: string) => {
    setState((prev) => ({ ...prev, customerName }));
  };

  const handleStaffNameChange = (staffName: string) => {
    setState((prev) => ({ ...prev, staffName }));
  };

  // データ読み込み関数（ボタンクリック用）
  const handleLoadData = async () => {
    if (!state.customerName.trim() || !state.staffName.trim()) {
      alert('お客様名と担当者名を入力してください');
      return;
    }

    const loaded = await loadData(state.customerName, state.staffName, state.year);
    if (loaded) {
      alert('データを読み込みました');
    } else {
      alert('保存されたデータが見つかりませんでした');
    }
  };

  // 手動保存関数
  const handleSaveData = async () => {
    if (!state.customerName.trim() || !state.staffName.trim()) {
      alert('お客様名と担当者名を入力してください');
      return;
    }

    await saveData();
    if (!state.saveError) {
      alert('データを保存しました');
    }
  };

  const handleStartEditor = () => {
    setState((prev) => ({
      ...prev,
      step: 'editor',
    }));
  };

  const handleBackToMenu = () => {
    setState((prev) => ({
      ...prev,
      step: 'menu',
    }));
  };

  // 検索結果からデータを読み込んでエディタに遷移
  const handleLoadCustomerData = async (customerName: string, staffName: string, year: number) => {
    setState((prev) => ({
      ...prev,
      customerName,
      staffName,
      year,
      isLoading: true,
    }));

    try {
      const params = new URLSearchParams({
        customerName,
        staffName,
        year: String(year),
      });

      const response = await fetch(`${API_BASE_URL}/api/documents?${params}`);
      const data = await response.json();

      if (data.found && data.documentGroups) {
        setState((prev) => ({
          ...prev,
          documentGroups: data.documentGroups as CategoryGroup[],
          isLoading: false,
          step: 'editor',
        }));
      } else {
        // データが見つからない場合は新規生成してエディタに遷移
        setState((prev) => ({
          ...prev,
          documentGroups: generateInitialDocumentGroups(year),
          isLoading: false,
          step: 'editor',
        }));
      }
    } catch (error) {
      console.error('データの読み込みに失敗しました:', error);
      setState((prev) => ({
        ...prev,
        documentGroups: generateInitialDocumentGroups(year),
        isLoading: false,
        step: 'editor',
      }));
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        {state.step === 'menu' && (
          <MenuScreen
            year={state.year}
            onYearChange={handleYearChange}
            onStartEditor={handleStartEditor}
            onLoadCustomerData={handleLoadCustomerData}
          />
        )}
        {state.step === 'editor' && (
          <DocumentListScreen
            year={state.year}
            documentGroups={state.documentGroups}
            onDocumentGroupsChange={handleDocumentGroupsChange}
            onBack={handleBackToMenu}
            onYearChange={handleYearChange}
            customerName={state.customerName}
            staffName={state.staffName}
            onCustomerNameChange={handleCustomerNameChange}
            onStaffNameChange={handleStaffNameChange}
            onSave={handleSaveData}
            onLoad={handleLoadData}
            onCopyToNextYear={copyToNextYear}
            isSaving={state.isSaving}
            isLoading={state.isLoading}
            lastSaved={state.lastSaved}
          />
        )}
      </div>
    </main>
  );
}
