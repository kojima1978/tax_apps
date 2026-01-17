'use client';

import { useState } from 'react';
import MenuScreen from '@/components/MenuScreen';
import CheckScreen from '@/components/CheckScreen';
import ResultScreen from '@/components/ResultScreen';
import YearSelector from '@/components/YearSelector';

type Step = 'menu' | 'check' | 'result';

interface AppState {
  step: Step;
  selectedOptions: Record<string, boolean>;
  selectedDeductions: Record<string, boolean>;
  isFullListMode: boolean;
  year: number;
  companyNames: string[]; // 源泉徴収票の会社名リスト
  lifeInsuranceCompanies: string[]; // 生命保険会社名リスト
  earthquakeInsuranceCompanies: string[]; // 地震保険会社名リスト
  bankNames: string[]; // 一般事業用通帳の銀行名リスト
  medicalBankNames: string[]; // 医業用通帳の銀行名リスト
  realEstateBankNames: string[]; // 不動産用通帳の銀行名リスト
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
  const [state, setState] = useState<AppState>({
    step: 'menu',
    selectedOptions: {},
    selectedDeductions: {},
    isFullListMode: false,
    year: getDefaultReiwaYear(),
    companyNames: [],
    lifeInsuranceCompanies: [],
    earthquakeInsuranceCompanies: [],
    bankNames: [],
    medicalBankNames: [],
    realEstateBankNames: [],
  });

  const handleYearChange = (year: number) => {
    setState((prev) => ({ ...prev, year }));
  };

  const handleCompanyNamesChange = (companyNames: string[]) => {
    setState((prev) => ({ ...prev, companyNames }));
  };

  const handleLifeInsuranceCompaniesChange = (lifeInsuranceCompanies: string[]) => {
    setState((prev) => ({ ...prev, lifeInsuranceCompanies }));
  };

  const handleEarthquakeInsuranceCompaniesChange = (earthquakeInsuranceCompanies: string[]) => {
    setState((prev) => ({ ...prev, earthquakeInsuranceCompanies }));
  };

  const handleBankNamesChange = (bankNames: string[]) => {
    setState((prev) => ({ ...prev, bankNames }));
  };

  const handleMedicalBankNamesChange = (medicalBankNames: string[]) => {
    setState((prev) => ({ ...prev, medicalBankNames }));
  };

  const handleRealEstateBankNamesChange = (realEstateBankNames: string[]) => {
    setState((prev) => ({ ...prev, realEstateBankNames }));
  };

  const handleStartCheck = () => {
    setState((prev) => ({
      ...prev,
      step: 'check',
      isFullListMode: false,
      selectedOptions: {},
      selectedDeductions: {},
    }));
  };

  const handleShowAll = () => {
    setState((prev) => ({
      ...prev,
      step: 'result',
      isFullListMode: true,
      selectedOptions: {},
      selectedDeductions: {},
    }));
  };

  const handleToggleOption = (id: string) => {
    setState((prev) => ({
      ...prev,
      selectedOptions: {
        ...prev.selectedOptions,
        [id]: !prev.selectedOptions[id],
      },
    }));
  };

  const handleToggleDeduction = (id: string) => {
    setState((prev) => ({
      ...prev,
      selectedDeductions: {
        ...prev.selectedDeductions,
        [id]: !prev.selectedDeductions[id],
      },
    }));
  };

  const handleBackToMenu = () => {
    setState((prev) => ({
      ...prev,
      step: 'menu',
      selectedOptions: {},
      selectedDeductions: {},
      isFullListMode: false,
    }));
  };

  const handleBackToCheck = () => {
    setState((prev) => ({
      ...prev,
      step: 'check',
    }));
  };

  const handleGenerate = () => {
    setState((prev) => ({
      ...prev,
      step: 'result',
    }));
  };

  const handleResultBack = () => {
    if (state.isFullListMode) {
      handleBackToMenu();
    } else {
      handleBackToCheck();
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        {state.step === 'menu' && (
          <>
            <div className="flex justify-end mb-4">
              <YearSelector year={state.year} onYearChange={handleYearChange} />
            </div>
            <MenuScreen onStartCheck={handleStartCheck} onShowAll={handleShowAll} />
          </>
        )}
        {state.step === 'check' && (
          <CheckScreen
            selectedOptions={state.selectedOptions}
            selectedDeductions={state.selectedDeductions}
            onToggleOption={handleToggleOption}
            onToggleDeduction={handleToggleDeduction}
            onBack={handleBackToMenu}
            onGenerate={handleGenerate}
            year={state.year}
            onYearChange={handleYearChange}
            companyNames={state.companyNames}
            onCompanyNamesChange={handleCompanyNamesChange}
            lifeInsuranceCompanies={state.lifeInsuranceCompanies}
            onLifeInsuranceCompaniesChange={handleLifeInsuranceCompaniesChange}
            earthquakeInsuranceCompanies={state.earthquakeInsuranceCompanies}
            onEarthquakeInsuranceCompaniesChange={handleEarthquakeInsuranceCompaniesChange}
            bankNames={state.bankNames}
            onBankNamesChange={handleBankNamesChange}
            medicalBankNames={state.medicalBankNames}
            onMedicalBankNamesChange={handleMedicalBankNamesChange}
            realEstateBankNames={state.realEstateBankNames}
            onRealEstateBankNamesChange={handleRealEstateBankNamesChange}
          />
        )}
        {state.step === 'result' && (
          <ResultScreen
            isFullListMode={state.isFullListMode}
            selectedOptions={state.selectedOptions}
            selectedDeductions={state.selectedDeductions}
            onBack={handleResultBack}
            onReset={handleBackToMenu}
            year={state.year}
            companyNames={state.companyNames}
            lifeInsuranceCompanies={state.lifeInsuranceCompanies}
            earthquakeInsuranceCompanies={state.earthquakeInsuranceCompanies}
            bankNames={state.bankNames}
            medicalBankNames={state.medicalBankNames}
            realEstateBankNames={state.realEstateBankNames}
          />
        )}
      </div>
    </main>
  );
}
