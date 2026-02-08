'use client';

import React, { memo, useRef, useState } from 'react';
import {
  FileSpreadsheet,
  FileDown,
  Info,
  AlertCircle,
  Download,
  Upload,
  X,
  Home,
} from 'lucide-react';
import type { CategoryData, DocumentItem, CustomDocumentItem } from '../constants/documents';
import { exportToExcel } from '../utils/excelExporter';
import { type ExportData } from '../utils/jsonDataManager';
import { isCustomDocument, formatDate, formatDeadline } from '../utils/helpers';
import { getIcon } from '../utils/iconMap';
import { StepIndicator } from './StepIndicator';
import { useJsonImport } from '../hooks/useJsonImport';

interface ResultScreenProps {
  results: { category: CategoryData; documents: (DocumentItem | CustomDocumentItem)[] }[];
  isFullListMode: boolean;
  clientName: string;
  deceasedName: string;
  deadline: string;
  onBack: () => void;
  onExportJson: () => void;
  onImportJson: (data: ExportData) => void;
}

// カテゴリテーブルコンポーネント
interface CategoryTableProps {
  category: CategoryData;
  documents: (DocumentItem | CustomDocumentItem)[];
}

const CategoryTable = memo(function CategoryTable({ category, documents }: CategoryTableProps) {
  type DocWithCanDelegate = (DocumentItem | CustomDocumentItem) & { canDelegate?: boolean };

  return (
    <div className="break-inside-avoid print-compact-section">
      <h3
        className={`font-bold text-lg mb-3 px-3 py-2 rounded-lg flex items-center print-compact-category-header ${category.bgColor} ${category.color}`}
      >
        <span className="mr-2 print:mr-1">{getIcon(category.iconName)}</span>
        {category.name}
        <span className="ml-2 text-sm font-normal print:text-xs print:ml-1">
          ({documents.length}件)
        </span>
      </h3>
      <div className="border border-slate-200 rounded-lg overflow-hidden print:rounded-sm">
        <table className="w-full text-sm print-compact-table">
          <thead className="bg-slate-100">
            <tr>
              <th className="w-8 px-2 py-2 text-center print:w-6">✓</th>
              <th className="px-3 py-2 text-left font-bold text-slate-700">必要書類名</th>
              <th className="px-3 py-2 text-left font-bold text-slate-700 hidden md:table-cell print:table-cell">
                内容説明
              </th>
              <th className="px-3 py-2 text-left font-bold text-slate-700 hidden lg:table-cell print:table-cell">
                取得方法
              </th>
              <th className="w-16 px-2 py-2 text-center font-bold text-slate-700 print:w-12">
                代行
              </th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc, idx) => {
              const isCustom = isCustomDocument(doc);
              const docWithDelegate = doc as DocWithCanDelegate;
              const canDelegate = docWithDelegate.canDelegate ?? false;
              return (
                <tr key={doc.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="px-2 py-3 text-center">
                    <span className="inline-block w-4 h-4 border-2 border-slate-300 rounded-sm print:border-slate-400 print:w-3 print:h-3 print:border" />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center flex-wrap">
                      <span className="font-medium text-slate-800 doc-name">{doc.name}</span>
                      {isCustom && (
                        <span className="ml-2 px-1.5 py-0.5 text-xs bg-emerald-100 text-emerald-700 rounded print:border print:border-emerald-700 print:ml-1 print:px-1 print:py-0 print:text-[8px]">
                          追加
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 md:hidden doc-desc">{doc.description}</p>
                    {doc.howToGet && (
                      <p className="text-xs text-slate-400 mt-1 lg:hidden doc-how">{doc.howToGet}</p>
                    )}
                  </td>
                  <td className="px-3 py-3 text-slate-600 hidden md:table-cell print:table-cell doc-desc">
                    {doc.description}
                  </td>
                  <td className="px-3 py-3 text-slate-500 hidden lg:table-cell print:table-cell doc-how text-xs">
                    {doc.howToGet || '-'}
                  </td>
                  <td className="px-2 py-3 text-center">
                    {canDelegate && (
                      <span className="px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded print:border print:border-amber-700 print:px-1 print:py-0 print:text-[8px]">
                        可
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
});

function ResultScreenComponent({
  results,
  isFullListMode,
  clientName,
  deceasedName,
  deadline,
  onBack,
  onExportJson,
  onImportJson,
}: ResultScreenProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const { isImporting, importError, handleJsonImport, clearImportError } = useJsonImport(onImportJson);
  const currentDate = formatDate(new Date());

  const handlePrint = () => {
    window.print();
  };

  const handleExcelExport = async () => {
    setIsExporting(true);
    setExportError(null);

    try {
      exportToExcel({
        results,
        isFullListMode,
        clientName,
        deceasedName,
        deadline,
      });
    } catch (error) {
      console.error('Excel export failed:', error);
      setExportError('Excelファイルの出力に失敗しました。もう一度お試しください。');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 animate-fade-in">
      {/* ステップインジケーター */}
      <StepIndicator
        currentStep={2}
        onStepChange={(step) => step === 1 && onBack()}
      />

      <div className="no-print flex items-center justify-between mb-6 mt-4">
          <a href="/" title="ポータルに戻る" className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors">
            <Home className="w-5 h-5" />
            <span className="text-sm">ポータル</span>
          </a>
          <div className="flex items-center space-x-3">
          <button
            onClick={handleExcelExport}
            disabled={isExporting}
            className={`flex items-center px-6 py-2 rounded-lg text-white shadow hover:opacity-90 bg-emerald-600 font-bold ${
              isExporting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            {isExporting ? '出力中...' : 'Excel出力'}
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center px-6 py-2 rounded-lg text-white shadow hover:opacity-90 bg-blue-600 font-bold"
          >
            <FileDown className="w-4 h-4 mr-2" /> PDF保存 / 印刷
          </button>
          <button
            onClick={onExportJson}
            className="flex items-center px-6 py-2 rounded-lg text-white shadow hover:opacity-90 bg-indigo-600 font-bold"
            title="設定をJSONファイルとして保存"
          >
            <Download className="w-4 h-4 mr-2" /> 保存
          </button>
          <label
            className={`flex items-center px-6 py-2 rounded-lg text-white shadow font-bold cursor-pointer ${
              isImporting
                ? 'bg-slate-400 cursor-not-allowed'
                : 'bg-orange-600 hover:opacity-90'
            }`}
            title="JSONファイルから設定を読み込み"
          >
            <Upload className="w-4 h-4 mr-2" /> 読込
            <input
              type="file"
              accept=".json"
              onChange={handleJsonImport}
              disabled={isImporting}
              className="hidden"
            />
          </label>
          </div>
      </div>

      {/* エラーメッセージ */}
      {exportError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center">
          <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
          {exportError}
          <button
            onClick={() => setExportError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {importError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center">
          <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
          {importError}
          <button
            onClick={clearImportError}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div
        ref={printRef}
        className="bg-white p-8 md:p-12 rounded-xl shadow-xl print:shadow-none print-compact"
      >
        {/* ヘッダー */}
        <div className="border-b-2 border-blue-800 pb-6 mb-8 print-compact-header">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2 print-compact-title">
                相続税申告 資料準備ガイド
              </h1>
              <p className="text-slate-600 print-compact-subtitle">
                {isFullListMode && (
                  <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded mr-2 align-middle print:border print:border-emerald-800 print:px-1 print:py-0">
                    全リスト表示
                  </span>
                )}
                以下の書類をご準備の上、ご来所・ご郵送ください。
              </p>
            </div>
            <div className="text-right text-sm text-slate-500 print:text-xs">
              <p>発行日: {currentDate}</p>
              <p>税理士法人 マスエージェント</p>
            </div>
          </div>

          {/* 基本情報表示 */}
          {(clientName || deceasedName || deadline) && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg grid md:grid-cols-3 gap-4 print:bg-white print:border print:border-blue-200 print-compact-info">
              {clientName && (
                <div>
                  <span className="text-xs text-slate-500 print:text-[9px]">お客様名</span>
                  <p className="font-bold text-slate-800 print:text-xs">{clientName} 様</p>
                </div>
              )}
              {deceasedName && (
                <div>
                  <span className="text-xs text-slate-500 print:text-[9px]">被相続人</span>
                  <p className="font-bold text-slate-800 print:text-xs">{deceasedName} 様</p>
                </div>
              )}
              {deadline && (
                <div>
                  <span className="text-xs text-slate-500 print:text-[9px]">
                    資料収集期限（目安）
                  </span>
                  <p className="font-bold text-slate-800 print:text-xs">
                    {formatDeadline(deadline)}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 注意事項 */}
        <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-lg print-compact-notice">
          <div className="flex items-start">
            <Info className="w-5 h-5 text-amber-600 mr-2 mt-0.5 flex-shrink-0 print:w-4 print:h-4" />
            <div className="text-sm text-amber-800">
              <p className="font-bold mb-1 print:mb-0 print:text-xs">ご確認ください</p>
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

        {/* 書類リスト */}
        <div className="space-y-8 print:space-y-1">
          {results.map(({ category, documents }) => (
            <CategoryTable key={category.id} category={category} documents={documents} />
          ))}
        </div>

        {/* フッター */}
        <div className="mt-12 pt-6 border-t border-slate-300 print-compact-footer">
          <div className="flex items-start bg-slate-50 p-4 rounded-lg border border-slate-200 print-compact-footer-box">
            <AlertCircle className="w-5 h-5 text-slate-500 mr-2 mt-0.5 flex-shrink-0 print:w-4 print:h-4" />
            <div className="text-sm text-slate-600 space-y-1 print:space-y-0">
              <p>
                <strong>ご留意事項</strong>
              </p>
              <p>
                ・原本が必要な書類と、コピーで対応可能な書類がございます。ご不明な点は担当者にご確認ください。
              </p>
              <p>
                ・公的機関（市役所等）で取得する証明書は、原則として発行後3ヶ月以内のものをご用意ください。
              </p>
              {isFullListMode && (
                <p className="text-emerald-600 font-semibold print:text-slate-600">
                  ・本リストは「全項目表示」モードで出力されています。お客様の状況により不要な書類も含まれていますのでご注意ください。
                </p>
              )}
            </div>
          </div>
          <div className="mt-8 text-center text-sm text-slate-400 print-compact-address">
            〒770-0002 徳島県徳島市春日２丁目３番３３号 / TEL 088-632-6228 / FAX 088-631-9870
          </div>
        </div>
      </div>
    </div>
  );
}

export const ResultScreen = memo(ResultScreenComponent);
