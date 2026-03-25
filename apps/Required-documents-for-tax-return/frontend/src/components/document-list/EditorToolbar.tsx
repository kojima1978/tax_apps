import { useRef, useState } from 'react';
import { ChevronLeft, LayoutDashboard, Printer, Save, Copy, Loader2, FileSpreadsheet, FileJson, Upload, Check, RotateCcw, RefreshCcw, Search, X, ChevronsUpDown, ChevronsDownUp, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatReiwaYear } from '@/utils/date';
import { getErrorMessage } from '@/utils/error';
import { exportCustomerJson, readJsonFile, validateCustomerImport, CustomerExport } from '@/utils/jsonExportImport';
import { CategoryGroup } from '@/types';
import { ConfirmDialog } from '@/components/ConfirmDialog';

const PRINT_LAYOUTS = [
  { value: 'single' as const, label: '1列' },
  { value: 'double' as const, label: '2列' },
];

interface InfoBarItem {
  label: string;
  value: string;
  className: string;
}

interface EditorToolbarProps {
  customerId: number;
  year: number;
  customerName: string;
  staffName: string;
  documentGroups: CategoryGroup[];
  onDocumentGroupsChange: (groups: CategoryGroup[]) => void;
  onBack: () => void;
  onSave: () => Promise<void>;
  onLoad: () => Promise<void>;
  onCopyToNextYear: () => Promise<void>;
  onResetToDefault: () => void;
  onExportExcel: () => void;
  isSaving: boolean;
  isLoading: boolean;
  lastSaved: Date | null;
  saveError?: string | null;
  printLayout: 'single' | 'double';
  onPrintLayoutChange: (layout: 'single' | 'double') => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

export function EditorToolbar({
  customerId,
  year,
  customerName,
  staffName,
  documentGroups,
  onDocumentGroupsChange,
  onBack,
  onSave,
  onLoad,
  onCopyToNextYear,
  onResetToDefault,
  onExportExcel,
  isSaving,
  isLoading,
  lastSaved,
  saveError,
  printLayout,
  onPrintLayoutChange,
  searchQuery,
  onSearchQueryChange,
  onExpandAll,
  onCollapseAll,
}: EditorToolbarProps) {
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const [isJsonImporting, setIsJsonImporting] = useState(false);
  const [importConfirm, setImportConfirm] = useState<{ parsed: CustomerExport } | null>(null);

  const reiwaYearStr = formatReiwaYear(year);

  const INFO_BAR_ITEMS: InfoBarItem[] = [
    { label: '対象年度', value: reiwaYearStr + '分', className: 'text-sm' },
    { label: 'お客様', value: customerName, className: 'text-lg' },
  ];

  const handlePrint = () => window.print();

  const handleExportJson = () => {
    exportCustomerJson(customerName, staffName, year, documentGroups);
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsJsonImporting(true);
    try {
      const rawData = await readJsonFile(file);
      const validation = validateCustomerImport(rawData);
      if (!validation.isValid) {
        setImportError(validation.error ?? 'バリデーションエラー');
        return;
      }

      const parsed = rawData as CustomerExport;
      setImportConfirm({ parsed });
    } catch (error) {
      setImportError('JSONインポートに失敗しました: ' + getErrorMessage(error, ''));
    } finally {
      setIsJsonImporting(false);
      if (jsonFileInputRef.current) jsonFileInputRef.current.value = '';
    }
  };

  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  const handleConfirmImport = () => {
    if (!importConfirm) return;
    onDocumentGroupsChange(importConfirm.parsed.data.document_groups);
    setImportConfirm(null);
    setImportSuccess(true);
    setTimeout(() => setImportSuccess(false), 3000);
  };

  const TOOLBAR_ACTIONS = [
    { onClick: onCopyToNextYear, disabled: isSaving || !customerName, colorClass: 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50', title: '現在の内容を翌年度にコピーします', icon: Copy, label: '翌年度へコピー' },
    { onClick: handlePrint, colorClass: 'bg-slate-700 text-white hover:bg-slate-800', icon: Printer, label: '印刷' },
    { onClick: onExportExcel, colorClass: 'bg-[#217346] text-white hover:bg-[#1e6b41]', icon: FileSpreadsheet, label: 'Excel出力' },
    { onClick: handleExportJson, colorClass: 'bg-amber-600 text-white hover:bg-amber-700', title: 'JSONファイルとしてエクスポート', icon: FileJson, label: 'JSON出力' },
    { onClick: () => jsonFileInputRef.current?.click(), disabled: isJsonImporting, colorClass: 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50', title: 'JSONファイルからインポート', icon: Upload, label: isJsonImporting ? '読込中...' : 'JSON読込' },
  ];

  return (
    <div className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm no-print">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <Link
              to="/"
              title="TOPへ戻る"
              className="mr-1 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-emerald-600 transition-colors"
            >
              <LayoutDashboard className="w-5 h-5" />
            </Link>
            <button
              onClick={onBack}
              className="mr-3 p-2 rounded-full hover:bg-slate-100 text-slate-500"
              aria-label="前のページに戻る"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-slate-800">必要書類リスト作成</h1>
          </div>

          <div className="flex items-center space-x-2" role="toolbar" aria-label="操作ツールバー">
            <button
              onClick={onLoad}
              disabled={isLoading || !customerName || !staffName}
              className="flex items-center px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium disabled:opacity-50"
              title="保存されている状態に戻します"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              変更を破棄
            </button>
            <button
              onClick={onResetToDefault}
              className="flex items-center px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium disabled:opacity-50"
              title="初期状態（標準リスト）に戻します"
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              標準に戻す
            </button>
            <button
              onClick={onSave}
              disabled={isSaving || !customerName || !staffName}
              className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold shadow-sm disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
              title="Ctrl+S"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  保存
                </>
              )}
            </button>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {INFO_BAR_ITEMS.map(({ label, value, className }) => (
              <div key={label} className="flex items-center">
                <span className="text-xs font-bold text-slate-500 mr-2">{label}:</span>
                <span className={`${className} font-bold text-slate-800`}>{value}</span>
              </div>
            ))}
            <div className="flex items-center">
              <span className="text-xs font-bold text-slate-500 mr-2">担当者:</span>
              {staffName ? (
                <span className="text-sm font-bold text-slate-800">{staffName}</span>
              ) : (
                <Link
                  to={`/customers/${customerId}/edit?returnTo=${encodeURIComponent(`/customers/${customerId}/years/${year}`)}`}
                  className="text-sm font-bold text-amber-600 hover:text-amber-700 underline underline-offset-2"
                >
                  未設定
                </Link>
              )}
              <Link
                to={`/customers/${customerId}/edit?returnTo=${encodeURIComponent(`/customers/${customerId}/years/${year}`)}`}
                className="ml-1.5 text-slate-400 hover:text-emerald-600"
                title="お客様情報を編集"
              >
                <Pencil className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between flex-wrap gap-y-2">
          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-500" role="status" aria-live="polite">
              {importError ? (
                <span className="flex items-center text-red-600">
                  <span className="w-3 h-3 mr-1 font-bold">!</span>
                  {importError}
                </span>
              ) : importSuccess ? (
                <span className="flex items-center text-emerald-600">
                  <Check className="w-3 h-3 mr-1" />
                  インポート完了。保存ボタンで反映できます。
                </span>
              ) : saveError ? (
                <span className="flex items-center text-red-600">
                  <span className="w-3 h-3 mr-1 font-bold">!</span>
                  保存エラー: {saveError}
                </span>
              ) : lastSaved ? (
                <span className="flex items-center text-emerald-600">
                  <Check className="w-3 h-3 mr-1" />
                  保存済み: {lastSaved.toLocaleTimeString()}
                </span>
              ) : (
                '未保存'
              )}
            </div>

            {/* 検索 */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                placeholder="書類を検索..."
                className="pl-7 pr-7 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 w-40"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchQueryChange('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* 全展開/全折りたたみ */}
            <div className="flex border border-slate-300 rounded overflow-hidden">
              <button
                onClick={onExpandAll}
                className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 flex items-center"
                title="すべて展開"
              >
                <ChevronsUpDown className="w-3 h-3 mr-0.5" />
                展開
              </button>
              <div className="w-px bg-slate-300" />
              <button
                onClick={onCollapseAll}
                className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 flex items-center"
                title="すべて折りたたみ"
              >
                <ChevronsDownUp className="w-3 h-3 mr-0.5" />
                折畳
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="flex bg-white border border-slate-300 rounded overflow-hidden mr-2" role="radiogroup" aria-label="印刷レイアウト">
              {PRINT_LAYOUTS.map(({ value, label }, i) => (
                <span key={value} className="contents">
                  {i > 0 && <div className="w-px bg-slate-300" aria-hidden="true" />}
                  <button
                    onClick={() => onPrintLayoutChange(value)}
                    className={`px-3 py-1.5 text-xs font-medium ${printLayout === value ? 'bg-emerald-100 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}
                    role="radio"
                    aria-checked={printLayout === value}
                    title={`${label}で印刷`}
                  >
                    {label}
                  </button>
                </span>
              ))}
            </div>
            {TOOLBAR_ACTIONS.map(({ onClick, disabled, colorClass, title, icon: Icon, label }) => (
              <button
                key={label}
                onClick={onClick}
                disabled={disabled}
                className={`flex items-center px-3 py-1.5 text-xs rounded ${colorClass}`}
                title={title}
              >
                <Icon className="w-3 h-3 mr-1" />
                {label}
              </button>
            ))}
            <input
              ref={jsonFileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportJson}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {importConfirm && (
        <ConfirmDialog
          open
          title="JSONインポート"
          message={`「${importConfirm.parsed.data.customer_name}」の${formatReiwaYear(importConfirm.parsed.data.year)}のデータをインポートします。\n現在の編集内容は上書きされます。よろしいですか？`}
          confirmLabel="インポート"
          onConfirm={handleConfirmImport}
          onCancel={() => setImportConfirm(null)}
        />
      )}
    </div>
  );
}
