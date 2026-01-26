'use client';

import { useGiftTaxGuide } from '@/hooks/useGiftTaxGuide';
import { MenuStep } from './MenuStep';
import { CheckStep } from './CheckStep';
import { ResultStep } from './ResultStep';

export default function GiftTaxDocGuide() {
  const {
    step,
    setStep,
    selectedOptions,
    isFullListMode,
    setIsFullListMode,
    isTwoColumnPrint,
    results,
    currentDate,
    resetToMenu,
    toggleOption,
    handlePrint,
    handleExcelExport,
    togglePrintColumn,
    getPrintClass,
    setSelectedOptions,
  } = useGiftTaxGuide();

  // メニュー画面
  if (step === 'menu') {
    return (
      <MenuStep
        setStep={setStep}
        setIsFullListMode={setIsFullListMode}
        setSelectedOptions={setSelectedOptions}
      />
    );
  }

  // チェックリスト画面
  if (step === 'check') {
    return (
      <CheckStep
        setStep={setStep}
        setSelectedOptions={setSelectedOptions}
        selectedOptions={selectedOptions}
        toggleOption={toggleOption}
        setIsFullListMode={setIsFullListMode}
      />
    );
  }

  // 結果画面
  return (
    <ResultStep
      isFullListMode={isFullListMode}
      setStep={setStep}
      resetToMenu={resetToMenu}
      isTwoColumnPrint={isTwoColumnPrint}
      togglePrintColumn={togglePrintColumn}
      handleExcelExport={handleExcelExport}
      handlePrint={handlePrint}
      getPrintClass={getPrintClass}
      results={results}
      currentDate={currentDate}
    />
  );
}
