import { useState, useCallback } from 'react';
import type { StepId, ColumnMapping, CategoryMapping, CaseData } from '@/types';
import { StepIndicator } from '@/components/StepIndicator';
import { CsvImportStep } from '@/components/step1/CsvImportStep';
import { ColumnMappingStep } from '@/components/step2/ColumnMappingStep';
import { DataEditStep } from '@/components/step3/DataEditStep';
import { ResultStep } from '@/components/step4/ResultStep';
import { useAssetData } from '@/hooks/useAssetData';
import { usePresets } from '@/hooks/usePresets';
import { useJsonExport } from '@/hooks/useJsonExport';
import { exportToExcel } from '@/utils/excelExport';
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
    importFromCsv,
    recalculateAll,
    updateAsset,
    deleteAsset,
    addEmptyAsset,
    toggleFixedAssetTaxBulk,
    sortAssets,
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

  const { exportCase } = useJsonExport();

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
    loadFromJson(data.assets);
    setCsvData(null);
    // Step3に直接遷移
    setCurrentStep(3);
    setMaxReachedStep(4);
  };

  // Excel出力
  const handleExportExcel = () => {
    exportToExcel(caseName, taxDate, assets);
  };

  // JSON出力
  const handleExportJson = () => {
    exportCase(caseName, taxDate, assets);
  };

  return (
    <div className="min-h-screen">
      {/* ヘッダー */}
      <header className="bg-green-700 text-white py-4 px-6 print:hidden flex items-center justify-between">
        <h1 className="text-lg font-bold">相続税 減価償却資産評価</h1>
        <a
          href="/"
          className="text-sm text-green-100 hover:text-white hover:underline"
        >
          ポータルに戻る
        </a>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
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
            taxDate={taxDate}
            assets={assets}
            groupedAssets={groupedAssets}
            onUpdateAsset={updateAsset}
            onDeleteAsset={deleteAsset}
            onAddEmptyAsset={addEmptyAsset}
            onToggleFixedAssetTaxBulk={toggleFixedAssetTaxBulk}
            onSortAssets={sortAssets}
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
