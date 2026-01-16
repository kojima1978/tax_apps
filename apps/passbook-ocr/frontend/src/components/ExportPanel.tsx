'use client';

import { useState } from 'react';
import { usePassbookStore } from '@/store/passbookStore';
import { Download, FileSpreadsheet, FileText, CheckCircle } from 'lucide-react';

type ExportFormat = 'csv' | 'excel' | 'yayoi' | 'freee' | 'mf';

export default function ExportPanel() {
  const { pages, sessionId } = usePassbookStore();
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('csv');
  const [isExporting, setIsExporting] = useState(false);

  const exportFormats = [
    {
      id: 'csv' as ExportFormat,
      name: 'CSV (汎用)',
      icon: FileText,
      description: 'カンマ区切り形式。Excel等で開けます',
    },
    {
      id: 'excel' as ExportFormat,
      name: 'Excel (XLSX)',
      icon: FileSpreadsheet,
      description: 'Microsoft Excel形式',
    },
    {
      id: 'yayoi' as ExportFormat,
      name: '弥生会計',
      icon: FileSpreadsheet,
      description: '弥生会計インポート形式',
    },
    {
      id: 'freee' as ExportFormat,
      name: 'freee',
      icon: FileSpreadsheet,
      description: 'freee会計インポート形式',
    },
    {
      id: 'mf' as ExportFormat,
      name: 'マネーフォワード',
      icon: FileSpreadsheet,
      description: 'MFクラウド会計インポート形式',
    },
  ];

  const handleExport = async () => {
    setIsExporting(true);

    try {
      // In Phase 2, this will call the backend export API
      // For now, we'll create a simple CSV export on the frontend
      const allTransactions = pages.flatMap(page =>
        page.transactions || []
      );

      let csvContent = '';

      if (selectedFormat === 'csv') {
        // Standard CSV
        csvContent = 'Date,Description,Withdrawal,Deposit,Balance\n';
        allTransactions.forEach(txn => {
          csvContent += `"${txn.date}","${txn.description}","${txn.withdrawal}","${txn.deposit}","${txn.balance}"\n`;
        });
      } else if (selectedFormat === 'yayoi') {
        // Yayoi format (simplified example)
        csvContent = '日付,科目,摘要,借方金額,貸方金額\n';
        allTransactions.forEach(txn => {
          if (txn.withdrawal) {
            csvContent += `"${txn.date}","普通預金","${txn.description}","","${txn.withdrawal}"\n`;
          }
          if (txn.deposit) {
            csvContent += `"${txn.date}","普通預金","${txn.description}","${txn.deposit}",""\n`;
          }
        });
      }

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `passbook_${sessionId?.slice(0, 8)}_${selectedFormat}.csv`;
      link.click();

      // Show success message
      alert('エクスポートが完了しました');
    } catch (error) {
      console.error('Export error:', error);
      alert('エクスポートに失敗しました');
    } finally {
      setIsExporting(false);
    }
  };

  const totalTransactions = pages.reduce(
    (sum, page) => sum + (page.transactions?.length || 0),
    0
  );

  const totalErrors = pages.reduce(
    (sum, page) => sum + (page.error_count || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Export Summary */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">エクスポート準備</h2>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">総ページ数</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {pages.length}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">総取引数</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {totalTransactions}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">未解決エラー</p>
            <p className={`text-2xl font-bold mt-1 ${
              totalErrors > 0 ? 'text-error-600' : 'text-success-600'
            }`}>
              {totalErrors}
            </p>
          </div>
        </div>

        {totalErrors > 0 && (
          <div className="p-4 bg-warning-50 rounded-lg border border-warning-200">
            <p className="text-sm text-warning-900 font-medium">
              ⚠ エラーが{totalErrors}件残っています
            </p>
            <p className="text-xs text-warning-700 mt-1">
              エクスポート前にエラーを修正することをお勧めします
            </p>
          </div>
        )}
      </div>

      {/* Format Selection */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">出力形式</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {exportFormats.map((format) => {
            const Icon = format.icon;
            const isSelected = selectedFormat === format.id;

            return (
              <button
                key={format.id}
                onClick={() => setSelectedFormat(format.id)}
                className={`
                  p-4 rounded-lg border-2 text-left transition-all
                  ${isSelected
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  <Icon
                    size={24}
                    className={isSelected ? 'text-primary-600' : 'text-gray-400'}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`font-medium ${
                        isSelected ? 'text-primary-900' : 'text-gray-900'
                      }`}>
                        {format.name}
                      </p>
                      {isSelected && (
                        <CheckCircle size={16} className="text-primary-600" />
                      )}
                    </div>
                    <p className={`text-xs mt-1 ${
                      isSelected ? 'text-primary-700' : 'text-gray-600'
                    }`}>
                      {format.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Export Options */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">オプション</h2>

        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              className="w-4 h-4 text-primary-600 rounded"
              defaultChecked
            />
            <span className="text-sm text-gray-700">
              ヘッダー行を含める
            </span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              className="w-4 h-4 text-primary-600 rounded"
              defaultChecked
            />
            <span className="text-sm text-gray-700">
              金額をカンマ区切りにする
            </span>
          </label>

          {(selectedFormat === 'yayoi' || selectedFormat === 'freee' || selectedFormat === 'mf') && (
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                className="w-4 h-4 text-primary-600 rounded"
                defaultChecked
              />
              <span className="text-sm text-gray-700">
                勘定科目を自動推論する
              </span>
            </label>
          )}
        </div>
      </div>

      {/* Export Button */}
      <div className="card bg-primary-50 border-primary-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-primary-900">
              エクスポート準備完了
            </h3>
            <p className="text-sm text-primary-700 mt-1">
              {totalTransactions}件の取引を{exportFormats.find(f => f.id === selectedFormat)?.name}形式でエクスポートします
            </p>
          </div>

          <button
            onClick={handleExport}
            disabled={isExporting || totalErrors > 5}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-lg font-medium
              transition-all shadow-md
              ${isExporting || totalErrors > 5
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-primary-600 text-white hover:bg-primary-700'
              }
            `}
          >
            <Download size={20} />
            {isExporting ? 'エクスポート中...' : 'エクスポート'}
          </button>
        </div>

        {totalErrors > 5 && (
          <p className="text-xs text-error-600 mt-3">
            エラーが多すぎます。先に編集画面で修正してください
          </p>
        )}
      </div>

      {/* Info */}
      <div className="card bg-blue-50 border-blue-200">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          会計ソフト連携について
        </h3>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• 弥生会計: 仕訳日記帳インポート形式に対応</li>
          <li>• freee: 自動仕訳CSV形式に対応</li>
          <li>• マネーフォワード: 明細データCSV形式に対応</li>
          <li>• 摘要から勘定科目を自動推論（Phase 2機能）</li>
        </ul>
      </div>
    </div>
  );
}
