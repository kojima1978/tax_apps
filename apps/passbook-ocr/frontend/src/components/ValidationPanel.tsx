'use client';

import { usePassbookStore } from '@/store/passbookStore';
import { AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';

export default function ValidationPanel() {
  const { currentPage } = usePassbookStore();

  if (!currentPage) {
    return null;
  }

  const errors = currentPage.validation_errors?.filter(e => e.severity === 'error') || [];
  const warnings = currentPage.validation_errors?.filter(e => e.severity === 'warning') || [];

  return (
    <div className="space-y-4">
      {/* Status Summary */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">バリデーション状態</h3>

        {currentPage.validation_status === 'valid' && errors.length === 0 && (
          <div className="flex items-start gap-3 p-4 bg-success-50 rounded-lg border border-success-200">
            <CheckCircle size={24} className="text-success-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-success-900">検証成功</p>
              <p className="text-sm text-success-700 mt-1">
                すべての取引データが正常です
              </p>
            </div>
          </div>
        )}

        {errors.length > 0 && (
          <div className="flex items-start gap-3 p-4 bg-error-50 rounded-lg border border-error-200">
            <AlertCircle size={24} className="text-error-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-error-900">
                {errors.length}件のエラー
              </p>
              <p className="text-sm text-error-700 mt-1">
                修正が必要です
              </p>
            </div>
          </div>
        )}

        {warnings.length > 0 && errors.length === 0 && (
          <div className="flex items-start gap-3 p-4 bg-warning-50 rounded-lg border border-warning-200">
            <AlertTriangle size={24} className="text-warning-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-warning-900">
                {warnings.length}件の警告
              </p>
              <p className="text-sm text-warning-700 mt-1">
                確認をお勧めします
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error List */}
      {errors.length > 0 && (
        <div className="card">
          <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
            <AlertCircle size={18} className="text-error-600" />
            エラー詳細
          </h3>
          <div className="space-y-2">
            {errors.map((error, idx) => (
              <div
                key={idx}
                className="p-3 bg-error-50 rounded-lg border border-error-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-error-900">
                      行 {error.row + 1} - {error.field}
                    </p>
                    <p className="text-xs text-error-700 mt-1">
                      {error.message}
                    </p>
                    {error.difference !== undefined && (
                      <p className="text-xs text-error-600 mt-1 font-mono">
                        差額: ¥{error.difference.toFixed(0)}
                      </p>
                    )}
                  </div>
                  <button
                    className="text-xs text-error-600 hover:text-error-800 font-medium"
                    onClick={() => {
                      // Jump to row (to be implemented)
                      console.log('Jump to row', error.row);
                    }}
                  >
                    移動 →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warning List */}
      {warnings.length > 0 && (
        <div className="card">
          <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle size={18} className="text-warning-600" />
            警告
          </h3>
          <div className="space-y-2">
            {warnings.map((warning, idx) => (
              <div
                key={idx}
                className="p-3 bg-warning-50 rounded-lg border border-warning-200"
              >
                <p className="text-sm font-medium text-warning-900">
                  行 {warning.row + 1}
                  {warning.field && ` - ${warning.field}`}
                </p>
                <p className="text-xs text-warning-700 mt-1">
                  {warning.message}
                </p>
                {warning.confidence !== undefined && (
                  <p className="text-xs text-warning-600 mt-1">
                    信頼度: {(warning.confidence * 100).toFixed(1)}%
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Processing Stats */}
      <div className="card">
        <h3 className="text-md font-semibold mb-3">処理統計</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">処理時間:</span>
            <span className="font-medium">
              {currentPage.processing_time?.toFixed(2)}秒
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">取引数:</span>
            <span className="font-medium">
              {currentPage.transactions.length}件
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">平均信頼度:</span>
            <span className={`font-medium ${
              (currentPage.confidence_score || 0) >= 0.8
                ? 'text-success-600'
                : (currentPage.confidence_score || 0) >= 0.6
                ? 'text-warning-600'
                : 'text-error-600'
            }`}>
              {((currentPage.confidence_score || 0) * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="card bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Info size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-blue-900 mb-2">
              ヒント
            </h3>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• 残高エラーは前の行の誤認識が原因の可能性があります</li>
              <li>• 信頼度が低い行は特に注意して確認してください</li>
              <li>• 修正内容は自動的に学習され、次回以降に活用されます</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
