'use client';

import { useGiftTaxGuide } from '@/hooks/useGiftTaxGuide';
import { MenuStep } from './MenuStep';
import { EditableListStep } from './EditableListStep';
import { ResultStep } from './ResultStep';

export default function GiftTaxDocGuide() {
  const {
    step,
    setStep,
    isTwoColumnPrint,
    results,
    currentDate,
    resetToMenu,
    handlePrint,
    handleExcelExport,
    togglePrintColumn,
    toggleShowUnchecked,
    showUncheckedInPrint,
    getPrintClass,
    staffName,
    setStaffName,
    staffPhone,
    setStaffPhone,
    customerName,
    setCustomerName,
    documentList,
    setDocumentList,
  } = useGiftTaxGuide();

  // メニュー画面
  if (step === 'menu') {
    return (
      <MenuStep
        setStep={setStep}
        staffName={staffName}
        setStaffName={setStaffName}
        staffPhone={staffPhone}
        setStaffPhone={setStaffPhone}
        customerName={customerName}
        setCustomerName={setCustomerName}
      />
    );
  }

  // 編集画面（全リスト）
  if (step === 'edit') {
    return (
      <EditableListStep
        documentList={documentList}
        setDocumentList={setDocumentList}
        setStep={setStep}
        resetToMenu={resetToMenu}
        handleExcelExport={handleExcelExport}
        staffName={staffName}
        setStaffName={setStaffName}
        staffPhone={staffPhone}
        setStaffPhone={setStaffPhone}
        customerName={customerName}
        setCustomerName={setCustomerName}
      />
    );
  }

  // 結果画面（印刷プレビュー）
  return (
    <ResultStep
      setStep={setStep}
      resetToMenu={resetToMenu}
      isTwoColumnPrint={isTwoColumnPrint}
      togglePrintColumn={togglePrintColumn}
      showUncheckedInPrint={showUncheckedInPrint}
      toggleShowUnchecked={toggleShowUnchecked}
      handleExcelExport={handleExcelExport}
      handlePrint={handlePrint}
      getPrintClass={getPrintClass}
      results={results}
      currentDate={currentDate}
      staffName={staffName}
      staffPhone={staffPhone}
      customerName={customerName}
    />
  );
}
