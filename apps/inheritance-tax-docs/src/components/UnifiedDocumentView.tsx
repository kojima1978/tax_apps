import { memo, useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  FileDown,
  Download,
  Upload,
  RotateCcw,
  Info,
  AlertCircle,
  Home,
  Eye,
  EyeOff,
} from 'lucide-react';
import { CATEGORIES, type CategoryDocuments, type CustomDocumentItem, type DocChanges, type Stats } from '../constants/documents';
import { COMPANY_INFO, getFullAddress, getContactLine } from '../utils/company';
import { exportToExcel } from '../utils/excelExporter';
import { type ExportData } from '../utils/jsonDataManager';
import { formatDate, formatDeadline } from '../utils/helpers';
import { useJsonImport } from '../hooks/useJsonImport';
import { DismissibleBanner } from './ui/DismissibleBanner';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { EditableCategoryTable } from './ui/EditableCategoryTable';

const TOOLBAR_BTN = 'flex items-center px-4 py-2 rounded-lg text-white shadow font-bold text-sm';
const FORM_INPUT_CLASS = 'w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500';

interface UnifiedDocumentViewProps {
  clientName: string;
  deceasedName: string;
  deadline: string;
  personInCharge: string;
  personInChargeContact: string;
  expandedCategories: Record<string, boolean>;
  customDocuments: CustomDocumentItem[];
  documentOrder: Record<string, string[]>;
  editedDocuments: Record<string, DocChanges>;
  canDelegateOverrides: Record<string, boolean>;
  specificDocNames: Record<string, string[]>;
  checkedDocuments: Record<string, boolean>;
  deleteConfirmation: { type: 'document' | 'category'; name: string } | null;
  stats: Stats;
  onClientNameChange: (value: string) => void;
  onDeceasedNameChange: (value: string) => void;
  onDeadlineChange: (value: string) => void;
  onPersonInChargeChange: (value: string) => void;
  onPersonInChargeContactChange: (value: string) => void;
  onToggleExpanded: (categoryId: string) => void;
  onReorderDocuments: (categoryId: string, newOrder: string[]) => void;
  onToggleCanDelegate: (docId: string, originalCanDelegate: boolean) => void;
  onAddSpecificName: (docId: string, name: string) => void;
  onEditSpecificName: (docId: string, index: number, name: string) => void;
  onRemoveSpecificName: (docId: string, index: number) => void;
  onToggleDocumentCheck: (docId: string) => void;
  onToggleAllInCategory: (categoryId: string, checked: boolean) => void;
  onRemoveDocument: (docId: string, categoryId: string, name: string) => void;
  onRemoveCategory: (categoryId: string, name: string) => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onResetToDefault: () => void;
  onExportJson: () => void;
  onImportJson: (data: ExportData) => void;
  onOpenAddModal: (categoryId: string) => void;
  onStartEdit: (docId: string) => void;
  getSelectedDocuments: () => CategoryDocuments[];
}

function UnifiedDocumentViewComponent({
  clientName,
  deceasedName,
  deadline,
  personInCharge,
  personInChargeContact,
  expandedCategories,
  customDocuments,
  documentOrder,
  editedDocuments,
  canDelegateOverrides,
  specificDocNames,
  checkedDocuments,
  deleteConfirmation,
  stats,
  onClientNameChange,
  onDeceasedNameChange,
  onDeadlineChange,
  onPersonInChargeChange,
  onPersonInChargeContactChange,
  onToggleExpanded,
  onReorderDocuments,
  onToggleCanDelegate,
  onAddSpecificName,
  onEditSpecificName,
  onRemoveSpecificName,
  onToggleDocumentCheck,
  onToggleAllInCategory,
  onRemoveDocument,
  onRemoveCategory,
  onConfirmDelete,
  onCancelDelete,
  onResetToDefault,
  onExportJson,
  onImportJson,
  onOpenAddModal,
  onStartEdit,
  getSelectedDocuments,
}: UnifiedDocumentViewProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const { isImporting, importError, importSuccess, handleJsonImport, clearImportError, clearImportSuccess } = useJsonImport(onImportJson);
  const [hideSubmittedInPrint, setHideSubmittedInPrint] = useState(false);
  const [currentDate, setCurrentDate] = useState('');
  useEffect(() => { setCurrentDate(formatDate(new Date())); }, []);

  const printInfoFields: { label: string; value: string; format?: (v: string) => string }[] = [
    { label: 'お客様名', value: clientName, format: v => `${v} 様` },
    { label: '被相続人', value: deceasedName, format: v => `${v} 様` },
    { label: '資料収集期限（目安）', value: deadline, format: formatDeadline },
    { label: '担当者', value: personInCharge },
    { label: '担当者連絡先', value: personInChargeContact },
  ];

  const inputRows: { cols: string; fields: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }[] }[] = [
    { cols: 'md:grid-cols-3', fields: [
      { label: 'お客様名', value: clientName, onChange: onClientNameChange, placeholder: '例：山田 太郎' },
      { label: '被相続人名', value: deceasedName, onChange: onDeceasedNameChange, placeholder: '例：山田 一郎' },
      { label: '資料収集期限', value: deadline, onChange: onDeadlineChange, type: 'date' },
    ]},
    { cols: 'md:grid-cols-2', fields: [
      { label: '担当者', value: personInCharge, onChange: onPersonInChargeChange, placeholder: '例：佐藤 花子' },
      { label: '担当者連絡先', value: personInChargeContact, onChange: onPersonInChargeContactChange, placeholder: '例：088-632-6228' },
    ]},
  ];

  const handleExcelExport = async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      const results = getSelectedDocuments();
      exportToExcel({ results, clientName, deceasedName, deadline, specificDocNames, checkedDocuments, personInCharge, personInChargeContact });
    } catch (error) {
      console.error('Excel export failed:', error);
      setExportError('Excelファイルの出力に失敗しました。もう一度お試しください。');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 animate-fade-in">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden print-compact">

        {/* ヘッダー + ツールバー（スクリーン用） */}
        <header className="bg-blue-800 p-6 text-white no-print">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <a href="/" title="ポータルに戻る" aria-label="ポータルに戻る" className="opacity-70 hover:opacity-100 transition-opacity">
                <Home className="w-6 h-6" aria-hidden="true" />
              </a>
              <div>
                <h1 className="text-2xl font-bold mb-1">相続税申告 資料準備ガイド</h1>
                <p className="text-blue-200 text-sm">
                  テーブル上で直接 編集・削除・並べ替え・代行切替ができます
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={onExportJson}
                className={`${TOOLBAR_BTN} bg-indigo-600 hover:bg-indigo-700`}
                title="設定をJSONファイルとして保存"
              >
                <Download className="w-4 h-4 mr-1" /> 保存
              </button>
              <label
                className={`${TOOLBAR_BTN} cursor-pointer ${
                  isImporting ? 'bg-slate-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700'
                }`}
                title="JSONファイルから設定を読み込み"
              >
                <Upload className="w-4 h-4 mr-1" /> 読込
                <input type="file" accept=".json" onChange={handleJsonImport} disabled={isImporting} className="hidden" />
              </label>
              <button
                onClick={handleExcelExport}
                disabled={isExporting}
                className={`${TOOLBAR_BTN} bg-emerald-600 hover:bg-emerald-700 ${
                  isExporting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 mr-1" /> {isExporting ? '出力中...' : 'Excel'}
              </button>
              <button
                onClick={() => window.print()}
                className={`${TOOLBAR_BTN} bg-blue-600 hover:bg-blue-700`}
              >
                <FileDown className="w-4 h-4 mr-1" /> 印刷
              </button>
              <button
                onClick={() => setShowResetConfirm(true)}
                disabled={!stats.hasCustomizations}
                className={`${TOOLBAR_BTN} ${
                  stats.hasCustomizations ? 'bg-slate-600 hover:bg-slate-700' : 'bg-slate-400 cursor-not-allowed opacity-50'
                }`}
                title="書類のカスタマイズをすべて初期状態に戻す"
              >
                <RotateCcw className="w-4 h-4 mr-1" /> 初期化
              </button>
            </div>
          </div>
        </header>

        {/* 印刷用ヘッダー */}
        <div className="hidden print:block print-compact-header border-b-2 border-blue-800 pb-4 mb-4 px-6 pt-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2 print-compact-title">
                相続税申告 資料準備ガイド
              </h1>
              <p className="text-slate-600 print-compact-subtitle">
                以下の書類をご準備の上、ご来所・ご郵送ください。
              </p>
            </div>
            <div className="text-right text-sm text-slate-500 print:text-sm">
              <p>発行日: {currentDate}</p>
              <p>{COMPANY_INFO.name}</p>
            </div>
          </div>
          {printInfoFields.some(f => f.value) && (
            <div className="mt-4 p-4 bg-white border border-blue-200 rounded-lg grid grid-cols-3 gap-4 print-compact-info">
              {printInfoFields.filter(f => f.value).map(({ label, value, format }) => (
                <div key={label}>
                  <span className="text-xs text-slate-500 print:text-xs">{label}</span>
                  <p className="font-bold text-slate-800 print:text-sm">{format ? format(value) : value}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 初期化確認ダイアログ */}
        {showResetConfirm && (
          <ConfirmDialog
            title="書類設定を初期化"
            onConfirm={() => { onResetToDefault(); setShowResetConfirm(false); }}
            onCancel={() => setShowResetConfirm(false)}
            confirmLabel="初期化する"
          >
            <p className="text-sm text-slate-600 mb-1">
              以下のカスタマイズがすべてリセットされます:
            </p>
            <ul className="text-sm text-slate-500 list-disc list-inside mb-4 space-y-0.5">
              <li>追加した書類</li>
              <li>並び替え</li>
              <li>名称・説明の変更</li>
              <li>代行可否の変更</li>
              <li>具体的な書類名</li>
            </ul>
            <p className="text-xs text-slate-400 mb-4">
              ※ お客様名・被相続人名・期限・担当者情報は保持されます。
            </p>
          </ConfirmDialog>
        )}

        {/* 削除確認ダイアログ */}
        {deleteConfirmation && (
          <ConfirmDialog
            title={deleteConfirmation.type === 'document' ? '書類を削除' : 'カテゴリを削除'}
            onConfirm={onConfirmDelete}
            onCancel={onCancelDelete}
          >
            <p className="text-sm text-slate-600 mb-4">
              「{deleteConfirmation.name}」を削除しますか？
            </p>
          </ConfirmDialog>
        )}

        {/* エラー表示 */}
        <DismissibleBanner message={exportError} onDismiss={() => setExportError(null)} variant="error" />
        <DismissibleBanner message={importError} onDismiss={clearImportError} variant="error" />
        <DismissibleBanner message={importSuccess ? 'データを読み込みました。' : null} onDismiss={clearImportSuccess} variant="success" />

        {/* 基本情報入力（スクリーン用） */}
        <div className="p-6 bg-blue-50 border-b border-blue-100 no-print">
          {inputRows.map(({ cols, fields }, ri) => (
            <div key={ri} className={`grid ${cols} gap-4${ri > 0 ? ' mt-4' : ''}`}>
              {fields.map(({ label, value, onChange, type, placeholder }) => (
                <div key={label}>
                  <label className="block text-sm text-slate-600 mb-1">{label}</label>
                  <input
                    type={type ?? 'text'}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className={FORM_INPUT_CLASS}
                    placeholder={placeholder}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* 統計バー（スクリーン用） */}
        <div className="px-6 py-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 no-print">
          <div className="text-sm text-slate-600 flex items-center gap-4">
            <span className="bg-emerald-100 text-emerald-700 px-3 py-0.5 rounded-full font-medium">
              {stats.checkedCount} / {stats.totalCount} 提出済み
            </span>
            {stats.customCount > 0 && (
              <span className="text-slate-400">
                追加: <span className="text-emerald-600">{stats.customCount}</span>件
              </span>
            )}
          </div>
          <button
            onClick={() => setHideSubmittedInPrint(!hideSubmittedInPrint)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              hideSubmittedInPrint
                ? 'bg-amber-100 text-amber-700'
                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
            }`}
            title={hideSubmittedInPrint ? '提出済みを印刷に含める' : '提出済みを印刷で非表示'}
          >
            {hideSubmittedInPrint
              ? <EyeOff className="w-4 h-4" />
              : <Eye className="w-4 h-4" />
            }
            提出済みを印刷で非表示
          </button>
        </div>

        {/* 注意事項 */}
        <div className="mx-6 mt-6 mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg print-compact-notice print:mx-2 print:mt-2 print:mb-2">
          <div className="flex items-start">
            <Info className="w-5 h-5 text-amber-600 mr-2 mt-0.5 flex-shrink-0 print:w-4 print:h-4" />
            <div className="text-sm text-amber-800">
              <p className="font-bold mb-1 print:mb-0 print:text-sm">ご確認ください</p>
              <ul className="list-disc list-inside space-y-1 print:space-y-0">
                <li>
                  資料は原本、コピー、データなどどのような形でお送りいただいても結構です。原本はスキャンやコピーを行った後、すべてお返しいたします。
                </li>
                <li>
                  代行欄に<span className="bg-amber-200 px-1 rounded print:px-0.5">可</span>と記載されている書類は弊社で取得代行を行うことが可能です。詳しくは担当者にお尋ねください。
                </li>
                <li>
                  身分関係書類は原則として相続開始日から10日を経過した日以後に取得したものが必要となります。
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* カテゴリテーブル群 */}
        <div className="p-6 space-y-4 print:space-y-1 print:p-2">
          {CATEGORIES.filter((category) => (documentOrder[category.id] || []).length > 0).map((category, index) => (
            <EditableCategoryTable
              key={category.id}
              category={category}
              categoryIndex={index + 1}
              isExpanded={expandedCategories[category.id] ?? false}
              customDocuments={customDocuments}
              documentOrder={documentOrder[category.id] || []}
              editedDocuments={editedDocuments}
              canDelegateOverrides={canDelegateOverrides}
              specificDocNames={specificDocNames}
              onToggleExpanded={onToggleExpanded}
              onReorderDocuments={onReorderDocuments}
              onToggleCanDelegate={onToggleCanDelegate}
              onAddSpecificName={onAddSpecificName}
              onEditSpecificName={onEditSpecificName}
              onRemoveSpecificName={onRemoveSpecificName}
              checkedDocuments={checkedDocuments}
              onToggleDocumentCheck={onToggleDocumentCheck}
              onToggleAllInCategory={onToggleAllInCategory}
              onRemoveDocument={onRemoveDocument}
              onRemoveCategory={onRemoveCategory}
              hideSubmittedInPrint={hideSubmittedInPrint}
              onOpenAddModal={onOpenAddModal}
              onStartEdit={onStartEdit}
            />
          ))}
        </div>

        {/* 留意事項 + フッター */}
        <div className="mx-6 mb-6 mt-4 pt-6 border-t border-slate-300 print-compact-footer print:mx-2 print:mb-2 print:mt-2">
          <div className="flex items-start bg-slate-50 p-4 rounded-lg border border-slate-200 print-compact-footer-box">
            <AlertCircle className="w-5 h-5 text-slate-500 mr-2 mt-0.5 flex-shrink-0 print:w-4 print:h-4" />
            <div className="text-sm text-slate-600 space-y-1 print:space-y-0">
              <p><strong>ご留意事項</strong></p>
              <p>・原本が必要な書類と、コピーで対応可能な書類がございます。ご不明な点は担当者にご確認ください。</p>
              <p>・公的機関（市役所等）で取得する証明書は、原則として発行後3ヶ月以内のものをご用意ください。</p>
            </div>
          </div>
          <div className="mt-8 text-center text-sm text-slate-400 print-compact-address">
            {getFullAddress()} / {getContactLine()}
          </div>
        </div>
      </div>
    </div>
  );
}

export const UnifiedDocumentView = memo(UnifiedDocumentViewComponent);
