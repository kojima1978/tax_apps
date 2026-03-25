import { useState, useMemo } from 'react';
import {
  MAPPING_FIELDS,
  CATEGORY_ORDER,
  resolveBaseCategory,
} from '@/types';
import type {
  ColumnMapping,
  CategoryMapping,
  MappingFieldKey,
  AssetCategory,
  MappingPreset,
} from '@/types';
import type { CsvData } from '@/utils/csvParser';
import { StepNavigation } from '@/components/StepNavigation';
import { PresetManager } from './PresetManager';

interface Props {
  csvData: CsvData;
  columnMapping: ColumnMapping;
  categoryMapping: CategoryMapping;
  onColumnMappingChange: (mapping: ColumnMapping) => void;
  onCategoryMappingChange: (mapping: CategoryMapping) => void;
  presets: MappingPreset[];
  onSavePreset: (name: string, col: ColumnMapping, cat: CategoryMapping) => void;
  onDeletePreset: (name: string) => void;
  onExportPresets: () => void;
  onImportPresets: (file: File) => Promise<void>;
  onBack: () => void;
  onNext: () => void;
  onGoToStep1: () => void;
}

export function ColumnMappingStep({
  csvData,
  columnMapping,
  categoryMapping,
  onColumnMappingChange,
  onCategoryMappingChange,
  presets,
  onSavePreset,
  onDeletePreset,
  onExportPresets,
  onImportPresets,
  onBack,
  onNext,
  onGoToStep1,
}: Props) {
  const [error, setError] = useState<string | null>(null);

  const previewRows = csvData.rows.slice(0, 5);

  // CSVのカテゴリカラムから一意の値を取得
  const uniqueCategories = useMemo(() => {
    const catCol = columnMapping.category;
    if (!catCol) return [];
    const idx = csvData.headers.indexOf(catCol);
    if (idx < 0) return [];
    const vals = new Set<string>();
    csvData.rows.forEach((row) => {
      const v = row[idx]?.trim();
      if (v) vals.add(v);
    });
    return Array.from(vals);
  }, [csvData, columnMapping.category]);

  const handleFieldChange = (field: MappingFieldKey, value: string) => {
    onColumnMappingChange({ ...columnMapping, [field]: value });
  };

  const handleCategoryMap = (csvValue: string, category: AssetCategory) => {
    onCategoryMappingChange({ ...categoryMapping, [csvValue]: category });
  };

  const handleLoadPreset = (preset: MappingPreset) => {
    onColumnMappingChange(preset.columnMapping);
    onCategoryMappingChange(preset.categoryMapping);
  };

  const handleNext = () => {
    // バリデーション
    const missing = MAPPING_FIELDS.filter(
      (f) => f.required && !columnMapping[f.key]
    );
    if (missing.length > 0) {
      setError(
        `未マッピング: ${missing.map((f) => f.label).join(', ')}`
      );
      return;
    }
    // カテゴリマッピング確認
    const unmapped = uniqueCategories.filter(
      (c) => !categoryMapping[c] && !resolveBaseCategory(c)
    );
    if (unmapped.length > 0) {
      setError(
        `未マッピングのカテゴリ: ${unmapped.join(', ')}`
      );
      return;
    }
    setError(null);
    onNext();
  };

  // マッピング後のプレビューデータを取得
  const getPreviewValue = (
    row: string[],
    field: MappingFieldKey
  ): string => {
    const colName = columnMapping[field];
    if (!colName) return '—';
    const idx = csvData.headers.indexOf(colName);
    return idx >= 0 ? (row[idx] ?? '') : '';
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-gray-800">
        カラムマッピング
      </h2>

      {/* プリセット管理 */}
      <PresetManager
        presets={presets}
        onLoadPreset={handleLoadPreset}
        onSavePreset={onSavePreset}
        onDeletePreset={onDeletePreset}
        onExportPresets={onExportPresets}
        onImportPresets={onImportPresets}
        currentColumnMapping={columnMapping}
        currentCategoryMapping={categoryMapping}
      />

      {/* カラムマッピング */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-bold text-gray-700 mb-4">
          カラム割り当て
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {MAPPING_FIELDS.map((field) => (
            <div key={field.key}>
              <label className="text-sm text-gray-600">
                {field.label}
                {field.required && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </label>
              <select
                value={columnMapping[field.key] || ''}
                onChange={(e) =>
                  handleFieldChange(field.key, e.target.value)
                }
                className={`w-full mt-1 px-2 py-1.5 text-sm border rounded-md cursor-pointer focus:outline-none focus:ring-1 focus:ring-green-500 ${
                  field.required && !columnMapping[field.key]
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300'
                }`}
              >
                <option value="">— 選択してください —</option>
                {csvData.headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* カテゴリマッピング */}
      {uniqueCategories.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-bold text-gray-700 mb-4">
            カテゴリ名の割り当て
          </h3>
          <div className="space-y-2">
            {uniqueCategories.map((csvCat) => {
              const autoMatch = resolveBaseCategory(csvCat);
              const mapped =
                categoryMapping[csvCat] ?? autoMatch ?? '';
              return (
                <div
                  key={csvCat}
                  className="flex items-center gap-4"
                >
                  <span className="w-48 text-sm text-gray-600 truncate">
                    {csvCat}
                  </span>
                  <span className="text-gray-500">→</span>
                  <select
                    value={mapped}
                    onChange={(e) =>
                      handleCategoryMap(
                        csvCat,
                        e.target.value as AssetCategory
                      )
                    }
                    className={`flex-1 px-2 py-1.5 text-sm border rounded-md cursor-pointer ${
                      !mapped
                        ? 'border-red-300 bg-red-50'
                        : autoMatch
                          ? 'border-green-300 bg-green-50'
                          : 'border-gray-300'
                    }`}
                  >
                    <option value="">— 選択 —</option>
                    {CATEGORY_ORDER.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  {autoMatch && (
                    <span className="text-xs text-green-600">
                      自動
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* プレビュー */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-bold text-gray-700 mb-4">
          プレビュー（先頭5行）
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-100">
                {MAPPING_FIELDS.map((f) => (
                  <th
                    key={f.key}
                    className="px-2 py-1 text-left font-medium text-gray-600"
                  >
                    {f.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, i) => (
                <tr key={i} className="border-t">
                  {MAPPING_FIELDS.map((f) => (
                    <td
                      key={f.key}
                      className="px-2 py-1 text-gray-700 truncate max-w-[150px]"
                    >
                      {getPreviewValue(row, f.key)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <StepNavigation
        onBack={onBack}
        onNext={handleNext}
        onGoToStep1={onGoToStep1}
      />
    </div>
  );
}
