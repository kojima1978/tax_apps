'use client';

import { useState, useRef, useEffect } from 'react';
import { usePassbookStore, Transaction } from '@/store/passbookStore';
import { AlertCircle, CheckCircle, Edit2 } from 'lucide-react';

export default function TransactionEditor() {
  const { currentPage, updateTransaction } = usePassbookStore();
  const [editingCell, setEditingCell] = useState<{ row: number; field: keyof Transaction } | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const startEdit = (row: number, field: keyof Transaction, currentValue: string) => {
    setEditingCell({ row, field });
    setEditValue(currentValue);
  };

  const saveEdit = async () => {
    if (!editingCell) return;

    try {
      await updateTransaction(editingCell.row, editingCell.field, editValue);
      setEditingCell(null);
    } catch (error) {
      console.error('Failed to save edit:', error);
    }
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  if (!currentPage) {
    return null;
  }

  const getRowValidationStatus = (rowIndex: number): 'valid' | 'warning' | 'error' => {
    if (!currentPage.validation_errors) return 'valid';

    const rowErrors = currentPage.validation_errors.filter(e => e.row === rowIndex);
    if (rowErrors.some(e => e.severity === 'error')) return 'error';
    if (rowErrors.some(e => e.severity === 'warning')) return 'warning';
    return 'valid';
  };

  const getFieldError = (rowIndex: number, field: string) => {
    if (!currentPage.validation_errors) return null;
    return currentPage.validation_errors.find(
      e => e.row === rowIndex && e.field === field
    );
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">
          取引データ編集 - ページ {currentPage.page_number}
        </h2>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">信頼度:</span>
          <span className={`font-semibold ${
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

      {/* Instructions */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-900">
        <p className="font-medium mb-1">操作方法:</p>
        <ul className="text-xs space-y-0.5 ml-4 list-disc">
          <li>セルをクリックして編集</li>
          <li>Enter: 保存 | Escape: キャンセル</li>
          <li>Tab: 次のエラー行へジャンプ（実装予定）</li>
        </ul>
      </div>

      {/* Transaction Table */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8">
                #
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                状態
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                日付
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                摘要
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                出金
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                入金
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                残高
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentPage.transactions.map((txn, idx) => {
              const rowStatus = getRowValidationStatus(idx);

              return (
                <tr
                  key={idx}
                  className={`
                    transition-colors
                    ${rowStatus === 'error' ? 'bg-error-50' : ''}
                    ${rowStatus === 'warning' ? 'bg-warning-50' : ''}
                  `}
                >
                  {/* Row Number */}
                  <td className="table-cell text-gray-500 text-center">
                    {idx + 1}
                  </td>

                  {/* Status Icon */}
                  <td className="table-cell">
                    {rowStatus === 'valid' && (
                      <CheckCircle size={18} className="text-success-600" />
                    )}
                    {rowStatus === 'warning' && (
                      <AlertCircle size={18} className="text-warning-600" />
                    )}
                    {rowStatus === 'error' && (
                      <AlertCircle size={18} className="text-error-600" />
                    )}
                  </td>

                  {/* Date */}
                  <td
                    className="table-cell-editable"
                    onClick={() => startEdit(idx, 'date', txn.date)}
                  >
                    {editingCell?.row === idx && editingCell?.field === 'date' ? (
                      <input
                        ref={inputRef}
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={saveEdit}
                        onKeyDown={handleKeyDown}
                        className="input-field w-full text-sm py-1"
                      />
                    ) : (
                      <div className="flex items-center gap-1">
                        <span>{txn.date}</span>
                        {getFieldError(idx, 'date') && (
                          <AlertCircle size={14} className="text-error-500" />
                        )}
                      </div>
                    )}
                  </td>

                  {/* Description */}
                  <td
                    className="table-cell-editable"
                    onClick={() => startEdit(idx, 'description', txn.description)}
                  >
                    {editingCell?.row === idx && editingCell?.field === 'description' ? (
                      <input
                        ref={inputRef}
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={saveEdit}
                        onKeyDown={handleKeyDown}
                        className="input-field w-full text-sm py-1"
                      />
                    ) : (
                      <span>{txn.description}</span>
                    )}
                  </td>

                  {/* Withdrawal */}
                  <td
                    className="table-cell-editable text-right"
                    onClick={() => startEdit(idx, 'withdrawal', txn.withdrawal)}
                  >
                    {editingCell?.row === idx && editingCell?.field === 'withdrawal' ? (
                      <input
                        ref={inputRef}
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={saveEdit}
                        onKeyDown={handleKeyDown}
                        className="input-field w-full text-sm py-1 text-right"
                      />
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-error-700 font-medium">
                          {txn.withdrawal ? `¥${txn.withdrawal}` : ''}
                        </span>
                        {getFieldError(idx, 'withdrawal') && (
                          <AlertCircle size={14} className="text-error-500" />
                        )}
                      </div>
                    )}
                  </td>

                  {/* Deposit */}
                  <td
                    className="table-cell-editable text-right"
                    onClick={() => startEdit(idx, 'deposit', txn.deposit)}
                  >
                    {editingCell?.row === idx && editingCell?.field === 'deposit' ? (
                      <input
                        ref={inputRef}
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={saveEdit}
                        onKeyDown={handleKeyDown}
                        className="input-field w-full text-sm py-1 text-right"
                      />
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-success-700 font-medium">
                          {txn.deposit ? `¥${txn.deposit}` : ''}
                        </span>
                        {getFieldError(idx, 'deposit') && (
                          <AlertCircle size={14} className="text-error-500" />
                        )}
                      </div>
                    )}
                  </td>

                  {/* Balance */}
                  <td
                    className="table-cell-editable text-right"
                    onClick={() => startEdit(idx, 'balance', txn.balance)}
                  >
                    {editingCell?.row === idx && editingCell?.field === 'balance' ? (
                      <input
                        ref={inputRef}
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={saveEdit}
                        onKeyDown={handleKeyDown}
                        className="input-field w-full text-sm py-1 text-right"
                      />
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <span className="font-semibold">
                          {txn.balance ? `¥${txn.balance}` : ''}
                        </span>
                        {getFieldError(idx, 'balance') && (
                          <AlertCircle size={14} className="text-error-500" />
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Confidence Scores */}
      {currentPage.transactions.some(t => t.confidence_avg !== undefined) && (
        <div className="mt-4 text-xs text-gray-500">
          <p>各行の信頼度が0.7未満の場合は確認をお勧めします</p>
        </div>
      )}
    </div>
  );
}
