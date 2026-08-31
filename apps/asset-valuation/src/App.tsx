import { useState, useCallback } from 'react';
import type { StepId, ColumnMapping, CategoryMapping, CaseData } from '@/types';
import { StepIndicator } from '@/components/StepIndicator';
import { CsvImportStep } from '@/components/step1/CsvImportStep';
import { ColumnMappingStep } from '@/components/step2/ColumnMappingStep';
import { DataEditStep } from '@/components/step3/DataEditStep';
import { ResultStep } from '@/components/step4/ResultStep';
import { useAssetData } from '@/hooks/useAssetData';
import { usePresets } from '@/hooks/usePresets';
import { useCategoryOrderPresets } from '@/hooks/useCategoryOrderPresets';
import { useCaseDraft } from '@/hooks/useCaseDraft';
import { Home, History, X } from 'lucide-react';
import { formatDateTime } from '@/utils/formatters';
import { exportCaseJson } from '@/utils/fileDownload';
import type { CsvData } from '@/utils/csvParser';

const EMPTY_MAPPING: ColumnMapping = {
  category: '',
  name: '',
  no: '',
  acquisitionDate: '',
  usefulLife: '',
  acquisitionCost: '',
  bookValue: '',
};

export default function App() {
  const [currentStep, setCurrentStep] = useState<StepId>(1);
  const [maxReachedStep, setMaxReachedStep] = useState<StepId>(1);

  // 基本情報
  const [caseName, setCaseName] = useState('');
  const [taxDate, setTaxDate] = useState('');

  // CSVデータ
  const [csvData, setCsvData] = useState<CsvData | null>(null);

  // マッピング
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>(EMPTY_MAPPING);
  const [categoryMapping, setCategoryMapping] = useState<CategoryMapping>({});

  // アセット管理
  const {
    assets,
    groupedAssets,
    labelOrder,
    moveCategory,
    moveCategoryTo,
    applyCategoryOrder,
    resetCategoryOrder,
    undoOrder,
    canUndoOrder,
    importFromCsv,
    recalculateAll,
    updateAsset,
    deleteAsset,
    addEmptyAsset,
    toggleFixedAssetTaxBulk,
    sortAssets,
    moveAsset,
    moveAssetsTo,
    loadFromJson,
  } = useAssetData(taxDate);

  // プリセット管理
  const {
    presets,
    addPreset,
    deletePreset,
    exportPresetsToJson,
    importPresetsFromJson,
  } = usePresets();

  // カテゴリ順プリセット管理
  const { orderPresets, saveOrderPreset, deleteOrderPreset } =
    useCategoryOrderPresets();

  // 作業内容の自動保存（リロードやタブを閉じても続きから再開できるようにする）
  const { restorable, savedAt, saveError, dismissRestore, discardDraft } =
    useCaseDraft({
      caseName,
      taxDate,
      assets,
      labelOrder,
      currentStep,
      maxReachedStep,
    });

  // ステップ遷移
  const goToStep = useCallback(
    (step: StepId) => {
      setCurrentStep(step);
      if (step > maxReachedStep) setMaxReachedStep(step);
    },
    [maxReachedStep]
  );

  // Step1 → Step2
  const handleStep1Next = () => {
    goToStep(2);
  };

  // Step2 → Step3
  const handleStep2Next = () => {
    if (csvData) {
      importFromCsv(csvData, columnMapping, categoryMapping);
    }
    goToStep(3);
  };

  // Step3 → Step4
  const handleStep3Next = () => {
    goToStep(4);
  };

  // 課税時期変更
  const handleTaxDateChange = (date: string) => {
    setTaxDate(date);
    if (assets.length > 0) {
      recalculateAll(date);
    }
  };

  // JSON案件インポート
  const handleJsonImport = (data: CaseData) => {
    setCaseName(data.caseName);
    setTaxDate(data.taxDate);
    loadFromJson(data.assets, data.categoryOrder);
    // loadFromJson は更新前の課税時期で計算するため、取り込んだ日付で計算し直す
    recalculateAll(data.taxDate);
    setCsvData(null);
    // Step3に直接遷移
    setCurrentStep(3);
    setMaxReachedStep(4);
  };

  // 前回の作業を復元
  const handleRestoreDraft = () => {
    if (!restorable) return;
    setCaseName(restorable.caseName);
    setTaxDate(restorable.taxDate);
    loadFromJson(restorable.assets, restorable.labelOrder);
    recalculateAll(restorable.taxDate);
    setCsvData(null);
    setCurrentStep(restorable.currentStep);
    setMaxReachedStep(restorable.maxReachedStep);
    dismissRestore();
  };

  // Excel出力
  const handleExportExcel = async () => {
    const { exportToExcel } = await import('@/utils/excelExport');
    exportToExcel(caseName, taxDate, assets, labelOrder);
  };

  // JSON出力
  const handleExportJson = () => {
    exportCaseJson(caseName, taxDate, assets, labelOrder);
  };

  return (
    <div className="min-h-screen">
      {/* ヘッダー */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 print:hidden">
        <div className="max-w-7xl mx-auto flex items-center h-14 px-4">
          <a
            href="/"
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm font-medium text-slate-400 hover:text-emerald-600 transition-colors"
            title="ポータルに戻る"
          >
            <Home className="h-5 w-5" />
            <span className="hidden sm:inline">ポータル</span>
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* 前回の作業の復元（自動保存された下書きが残っているときだけ） */}
        {restorable && assets.length === 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 print:hidden">
            <History size={18} className="shrink-0" aria-hidden="true" />
            <span className="min-w-0">
              前回の作業が残っています（
              <strong>{restorable.caseName || '案件名未入力'}</strong> /{' '}
              {restorable.assets.length}件 / {formatDateTime(restorable.savedAt)}）
            </span>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={handleRestoreDraft}
                className="min-h-11 rounded-md bg-amber-600 px-4 py-2 font-medium text-white transition-colors hover:bg-amber-700 cursor-pointer"
              >
                復元する
              </button>
              <button
                onClick={discardDraft}
                className="flex min-h-11 items-center gap-1 rounded-md border border-amber-300 px-3 py-2 text-amber-800 transition-colors hover:bg-amber-100 cursor-pointer"
              >
                <X size={15} aria-hidden="true" /> 破棄
              </button>
            </div>
          </div>
        )}

        {/* ステップインジケーター */}
        <div className="print:hidden">
          <StepIndicator
            currentStep={currentStep}
            onStepClick={goToStep}
            maxReachedStep={maxReachedStep}
          />
        </div>

        {/* ステップコンテンツ */}
        {currentStep === 1 && (
          <CsvImportStep
            caseName={caseName}
            taxDate={taxDate}
            onCaseNameChange={setCaseName}
            onTaxDateChange={handleTaxDateChange}
            onCsvLoaded={setCsvData}
            onJsonImport={handleJsonImport}
            onNext={handleStep1Next}
            csvData={csvData}
          />
        )}

        {currentStep === 2 && csvData && (
          <ColumnMappingStep
            csvData={csvData}
            columnMapping={columnMapping}
            categoryMapping={categoryMapping}
            onColumnMappingChange={setColumnMapping}
            onCategoryMappingChange={setCategoryMapping}
            presets={presets}
            onSavePreset={addPreset}
            onDeletePreset={deletePreset}
            onExportPresets={exportPresetsToJson}
            onImportPresets={importPresetsFromJson}
            onBack={() => setCurrentStep(1)}
            onNext={handleStep2Next}
            onGoToStep1={() => setCurrentStep(1)}
          />
        )}

        {currentStep === 3 && (
          <DataEditStep
            caseName={caseName}
            taxDate={taxDate}
            onCaseNameChange={setCaseName}
            onTaxDateChange={handleTaxDateChange}
            savedAt={savedAt}
            saveError={saveError}
            assets={assets}
            groupedAssets={groupedAssets}
            onUpdateAsset={updateAsset}
            onDeleteAsset={deleteAsset}
            onAddEmptyAsset={addEmptyAsset}
            onToggleFixedAssetTaxBulk={toggleFixedAssetTaxBulk}
            onSortAssets={sortAssets}
            onMoveAsset={moveAsset}
            onMoveAssetsTo={moveAssetsTo}
            onMoveCategory={moveCategory}
            onMoveCategoryTo={moveCategoryTo}
            onApplyCategoryOrder={applyCategoryOrder}
            onResetCategoryOrder={resetCategoryOrder}
            onUndoOrder={undoOrder}
            canUndoOrder={canUndoOrder}
            orderPresets={orderPresets}
            onSaveOrderPreset={saveOrderPreset}
            onDeleteOrderPreset={deleteOrderPreset}
            isCustomCategoryOrder={labelOrder.length > 0}
            onBack={() => setCurrentStep(2)}
            onNext={handleStep3Next}
            onGoToStep1={() => setCurrentStep(1)}
          />
        )}

        {currentStep === 4 && (
          <ResultStep
            caseName={caseName}
            taxDate={taxDate}
            assets={assets}
            labelOrder={labelOrder}
            onExportExcel={handleExportExcel}
            onExportJson={handleExportJson}
            onExportPresets={exportPresetsToJson}
            onBack={() => setCurrentStep(3)}
            onGoToStep1={() => setCurrentStep(1)}
          />
        )}
      </main>
    </div>
  );
}
