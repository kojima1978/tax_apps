'use client';

import { useState, useEffect, useCallback } from 'react';
import MenuScreen from '@/components/MenuScreen';
import DocumentListScreen from '@/components/DocumentListScreen';
import { generateInitialDocumentGroups } from '@/utils/documentUtils';
import { CategoryGroup } from '@/types';
import { fetchDocuments, saveDocuments, copyToNextYear as apiCopyToNextYear } from '@/utils/api';
import { getDefaultReiwaYear } from '@/utils/date';

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

  const saveData = useCallback(async () => {
    if (!state.customerName.trim() || !state.staffName.trim()) return;

    setState((prev) => ({ ...prev, isSaving: true, saveError: null }));

    try {
      await saveDocuments(state.customerName, state.staffName, state.year, state.documentGroups);
      setState((prev) => ({ ...prev, isSaving: false, lastSaved: new Date() }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isSaving: false,
        saveError: error instanceof Error ? error.message : '保存に失敗しました',
      }));
    }
  }, [state.customerName, state.staffName, state.year, state.documentGroups]);

  const loadData = useCallback(async (customerName: string, staffName: string, year: number): Promise<boolean> => {
    if (!customerName.trim() || !staffName.trim()) return false;

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const data = await fetchDocuments(customerName, staffName, year);

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

  const handleCopyToNextYear = useCallback(async () => {
    if (!state.customerName.trim() || !state.staffName.trim()) {
      alert('お客様名と担当者名を入力してください');
      return;
    }

    await saveData();

    try {
      const data = await apiCopyToNextYear(state.customerName, state.staffName, state.year);

      if (data.success) {
        alert(`令和${state.year - 2018}年のデータを令和${state.year + 1 - 2018}年にコピーしました。\n年度を切り替えて確認してください。`);
      } else {
        alert('翌年度更新に失敗しました');
      }
    } catch (error) {
      console.error('翌年度更新に失敗しました:', error);
      alert('翌年度更新に失敗しました');
    }
  }, [state.customerName, state.staffName, state.year, saveData]);

  // 自動保存（5秒後）
  useEffect(() => {
    if (state.step !== 'editor') return;
    if (!state.customerName.trim() || !state.staffName.trim()) return;

    const timeoutId = setTimeout(saveData, 5000);
    return () => clearTimeout(timeoutId);
  }, [state.documentGroups, state.step, state.customerName, state.staffName, saveData]);

  const handleYearChange = async (year: number) => {
    setState((prev) => ({ ...prev, year }));

    if (state.customerName.trim() && state.staffName.trim()) {
      const loaded = await loadData(state.customerName, state.staffName, year);
      if (!loaded) {
        setState((prev) => ({ ...prev, documentGroups: generateInitialDocumentGroups(year) }));
      }
    } else {
      setState((prev) => ({ ...prev, documentGroups: generateInitialDocumentGroups(year) }));
    }
  };

  const handleLoadData = async () => {
    if (!state.customerName.trim() || !state.staffName.trim()) {
      alert('お客様名と担当者名を入力してください');
      return;
    }

    const loaded = await loadData(state.customerName, state.staffName, state.year);
    alert(loaded ? 'データを読み込みました' : '保存されたデータが見つかりませんでした');
  };

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

  const handleLoadCustomerData = async (customerName: string, staffName: string, year: number) => {
    setState((prev) => ({
      ...prev,
      customerName,
      staffName,
      year,
      isLoading: true,
    }));

    try {
      const data = await fetchDocuments(customerName, staffName, year);

      setState((prev) => ({
        ...prev,
        documentGroups: data.found && data.documentGroups
          ? (data.documentGroups as CategoryGroup[])
          : generateInitialDocumentGroups(year),
        isLoading: false,
        step: 'editor',
      }));
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
            onStartEditor={() => setState((prev) => ({ ...prev, step: 'editor' }))}
            onLoadCustomerData={handleLoadCustomerData}
          />
        )}
        {state.step === 'editor' && (
          <DocumentListScreen
            year={state.year}
            documentGroups={state.documentGroups}
            onDocumentGroupsChange={(documentGroups) => setState((prev) => ({ ...prev, documentGroups }))}
            onBack={() => setState((prev) => ({ ...prev, step: 'menu' }))}
            onYearChange={handleYearChange}
            customerName={state.customerName}
            staffName={state.staffName}
            onCustomerNameChange={(customerName) => setState((prev) => ({ ...prev, customerName }))}
            onStaffNameChange={(staffName) => setState((prev) => ({ ...prev, staffName }))}
            onSave={handleSaveData}
            onLoad={handleLoadData}
            onCopyToNextYear={handleCopyToNextYear}
            isSaving={state.isSaving}
            isLoading={state.isLoading}
            lastSaved={state.lastSaved}
          />
        )}
      </div>
    </main>
  );
}
