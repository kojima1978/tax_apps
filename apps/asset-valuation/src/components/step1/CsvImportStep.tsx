import { useState, useRef } from 'react';
import { Upload, FileJson, Calendar, User, ChevronRight, Loader2 } from 'lucide-react';
import { parseCsvFile } from '@/utils/csvParser';
import type { CsvData } from '@/utils/csvParser';
import type { CaseData } from '@/types';
import { validateCaseData } from '@/utils/validators';

interface Props {
  caseName: string;
  taxDate: string;
  onCaseNameChange: (name: string) => void;
  onTaxDateChange: (date: string) => void;
  onCsvLoaded: (data: CsvData) => void;
  onJsonImport: (data: CaseData) => void;
  onNext: () => void;
  csvData: CsvData | null;
}

export function CsvImportStep({
  caseName,
  taxDate,
  onCaseNameChange,
  onTaxDateChange,
  onCsvLoaded,
  onJsonImport,
  onNext,
  csvData,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const handleCsvFile = async (file: File) => {
    setError(null);
    setLoading(true);
    try {
      const data = await parseCsvFile(file);
      setCsvFileName(file.name);
      onCsvLoaded(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'CSV読込エラー');
    } finally {
      setLoading(false);
    }
  };

  const handleJsonFile = async (file: File) => {
    setError(null);
    setLoading(true);
    try {
      const text = await file.text();
      const data = validateCaseData(JSON.parse(text));
      onJsonImport(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'JSON読込エラー');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (file.name.endsWith('.json')) {
      handleJsonFile(file);
    } else {
      handleCsvFile(file);
    }
  };

  const canProceed = caseName.trim() !== '' && taxDate !== '' && csvData !== null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-gray-800">
        CSVインポート・基本情報入力
      </h2>

      {/* 基本情報 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
            <User size={16} />
            案件名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={caseName}
            onChange={(e) => onCaseNameChange(e.target.value)}
            placeholder="例: 株式会社〇〇〇 様"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
            <Calendar size={16} />
            課税時期 <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={taxDate}
            onChange={(e) => onTaxDateChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* CSVインポート */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={() => setIsDragOver(true)}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false);
        }}
        className={`bg-white rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          isDragOver
            ? 'border-green-500 bg-green-50'
            : 'border-gray-300 hover:border-green-500'
        }`}
      >
        {loading ? (
          <Loader2 size={48} className="mx-auto text-green-500 mb-4 animate-spin" />
        ) : (
          <Upload size={48} className="mx-auto text-gray-400 mb-4" />
        )}
        <p className="text-gray-600 mb-2">
          {loading ? '読み込み中...' : 'CSVファイルをドラッグ＆ドロップ'}
        </p>
        <p className="text-gray-500 text-sm mb-4">または</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => csvInputRef.current?.click()}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors cursor-pointer"
          >
            CSVファイルを選択
          </button>
          <button
            onClick={() => jsonInputRef.current?.click()}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-2"
          >
            <FileJson size={16} />
            案件JSONを復元
          </button>
        </div>
        <input
          ref={csvInputRef}
          type="file"
          accept=".csv,.txt"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleCsvFile(file);
          }}
        />
        <input
          ref={jsonInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleJsonFile(file);
          }}
        />
      </div>

      {csvFileName && (
        <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm text-green-800">
          読込済み: {csvFileName}（{csvData?.rows.length ?? 0}件）
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* 次へ */}
      <div className="flex justify-end">
        <button
          onClick={onNext}
          disabled={!canProceed}
          className={`flex items-center gap-1 px-6 py-2 rounded-md font-medium transition-colors ${
            canProceed
              ? 'bg-green-600 text-white hover:bg-green-700 cursor-pointer'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          次へ <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
