import { useState, useRef } from 'react';
import { Upload, FileJson, Calendar, User, ChevronRight, Loader2, Download, CircleCheck, Info } from 'lucide-react';
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
  const missingItems = [
    !caseName.trim() && '案件名',
    !taxDate && '課税時期',
    !csvData && 'CSVファイル',
  ].filter(Boolean) as string[];

  const downloadTemplate = () => {
    const header = 'NO,資産名称,資産カテゴリ,取得年月日,耐用年数,取得価額,期末帳簿価額\r\n';
    const sample = '1,本社建物,建物（定額法）,2020-04-01,30,30000000,20000000\r\n';
    const blob = new Blob([`\uFEFF${header}${sample}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = '減価償却資産_取込テンプレート.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-gray-800">
        CSVインポート・基本情報入力
      </h2>

      {/* 基本情報 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 space-y-4">
        <div>
          <label htmlFor="case-name" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
            <User size={16} />
            案件名 <span className="text-red-500">*</span>
          </label>
          <input
            id="case-name"
            type="text"
            required
            autoComplete="organization"
            value={caseName}
            onChange={(e) => onCaseNameChange(e.target.value)}
            placeholder="例: 株式会社〇〇〇 様"
            className="min-h-11 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label htmlFor="tax-date" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
            <Calendar size={16} />
            課税時期 <span className="text-red-500">*</span>
          </label>
          <input
            id="tax-date"
            type="date"
            required
            aria-describedby="tax-date-help"
            value={taxDate}
            onChange={(e) => onTaxDateChange(e.target.value)}
            className="min-h-11 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <p id="tax-date-help" className="mt-1 text-xs leading-relaxed text-gray-500">
            相続開始日など、評価の基準となる日を入力してください。
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
        <div className="flex items-start gap-2">
          <Info size={18} className="mt-0.5 shrink-0 text-blue-600" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">CSVを用意する</p>
            <p className="mt-1 text-xs leading-relaxed text-blue-800">
              1行目を見出しにし、日付はYYYY-MM-DD、金額は半角数字で入力してください。UTF-8とShift_JISに対応しています。
            </p>
            <button
              type="button"
              onClick={downloadTemplate}
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-md border border-blue-300 bg-white px-3 py-2 font-medium text-blue-800 transition-colors hover:bg-blue-100"
            >
              <Download size={16} aria-hidden="true" />
              CSVテンプレートをダウンロード
            </button>
          </div>
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
        className={`bg-white rounded-lg border-2 border-dashed p-5 text-center transition-colors sm:p-8 ${
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
        <p className="hidden text-gray-600 mb-2 sm:block">
          {loading ? '読み込み中...' : 'CSVファイルをドラッグ＆ドロップ'}
        </p>
        <p className="mb-4 text-sm text-gray-600 sm:hidden">取込ファイルを選択してください</p>
        <p className="hidden text-gray-500 text-sm mb-4 sm:block">または</p>
        <div className="flex flex-col gap-3 justify-center sm:flex-row">
          <button
            onClick={() => csvInputRef.current?.click()}
            className="min-h-11 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors cursor-pointer"
          >
            CSVファイルを選択
          </button>
          <button
            onClick={() => jsonInputRef.current?.click()}
            className="min-h-11 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <FileJson size={16} />
            保存した案件を開く
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
        <div role="status" className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-md p-3 text-sm text-green-800">
          <CircleCheck size={18} aria-hidden="true" />
          読込済み: {csvFileName}（{csvData?.rows.length ?? 0}件）
        </div>
      )}

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* 次へ */}
      <div className="flex flex-col items-end gap-2">
        <button
          onClick={onNext}
          disabled={!canProceed}
          aria-describedby={!canProceed ? 'next-step-help' : undefined}
          className={`flex min-h-11 items-center gap-1 px-6 py-2 rounded-md font-medium transition-colors ${
            canProceed
              ? 'bg-green-600 text-white hover:bg-green-700 cursor-pointer'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          次へ <ChevronRight size={16} />
        </button>
        {!canProceed && (
          <p id="next-step-help" className="text-right text-xs text-gray-600">
            次へ進むには、{missingItems.join('・')}を設定してください。
          </p>
        )}
      </div>
    </div>
  );
}
