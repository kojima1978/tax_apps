'use client';

import { Upload, Trash2, X, ArrowLeft, Download } from 'lucide-react';
import Header from '@/components/Header';
import { toWareki } from '@/lib/date-utils';
import { BTN, SMALL_BTN } from '@/lib/button-styles';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useSavedData } from '@/hooks/useSavedData';

export default function SavedDataPage() {
  const sd = useSavedData();

  if (sd.loading) {
    return (
      <div>
        <Header />
        <h1>保存データ一覧</h1>
        <p>読み込み中...</p>
      </div>
    );
  }

  if (sd.error) {
    return (
      <div>
        <Header />
        <h1>保存データ一覧</h1>
        <div className="card">
          <p className="text-gray-600">{sd.error}</p>
          <button className={`${BTN} mt-4`} onClick={sd.goToInput}>
            戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <h1 className="mb-0">保存データ一覧</h1>
        <div className="flex gap-2">
          <button onClick={sd.handleExport} disabled={sd.exporting} className={SMALL_BTN}>
            <Download size={16} />
            {sd.exporting ? 'エクスポート中...' : 'バックアップ'}
          </button>
          <button onClick={sd.triggerFileInput} disabled={sd.importing} className={SMALL_BTN}>
            <Upload size={16} />
            {sd.importing ? '復元中...' : '復元'}
          </button>
          <input
            ref={sd.fileInputRef}
            type="file"
            accept=".json"
            onChange={sd.handleFileSelect}
            className="hidden"
          />
        </div>
      </div>

      {sd.data.length === 0 ? (
        <div className="card">
          <p className="mb-4">保存されたデータはありません。</p>
          <button className={BTN} onClick={sd.goToInput}>
            入力画面へ
          </button>
        </div>
      ) : (
        <>
          <div className="card">
            <h2 className="mt-0">絞り込み</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">年度</label>
                <select value={sd.filterYear} onChange={(e) => sd.setFilterYear(e.target.value)}>
                  <option value="">すべて</option>
                  {sd.availableYears.map((year) => (
                    <option key={year} value={year}>{toWareki(year)}年度</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">会社名</label>
                <input
                  type="text"
                  placeholder="会社名で検索"
                  value={sd.filterCompanyName}
                  onChange={(e) => sd.setFilterCompanyName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">担当者</label>
                <input
                  type="text"
                  placeholder="担当者名で検索"
                  value={sd.filterPersonInCharge}
                  onChange={(e) => sd.setFilterPersonInCharge(e.target.value)}
                />
              </div>
            </div>
            {sd.hasFilters && (
              <div className="mt-4 flex items-center gap-3">
                <span className="text-sm text-gray-600">
                  {sd.filteredData.length}件 / {sd.data.length}件中
                </span>
                <button onClick={sd.clearFilters} className={SMALL_BTN}>
                  <X size={16} />
                  クリア
                </button>
              </div>
            )}
          </div>

          <div className="card">
            <table>
              <thead>
                <tr>
                  <th className="text-left">会社名</th>
                  <th className="text-center cursor-pointer hover:bg-gray-200" onClick={() => sd.handleSort('fiscal_year')}>
                    年度{sd.getSortIndicator('fiscal_year')}
                  </th>
                  <th className="text-left cursor-pointer hover:bg-gray-200" onClick={() => sd.handleSort('person_in_charge')}>
                    担当者{sd.getSortIndicator('person_in_charge')}
                  </th>
                  <th className="text-center cursor-pointer hover:bg-gray-200" onClick={() => sd.handleSort('updated_at')}>
                    更新日時{sd.getSortIndicator('updated_at')}
                  </th>
                  <th className="text-center">操作</th>
                </tr>
              </thead>
              <tbody>
                {sd.sortedData.map((record) => (
                  <tr key={record.id}>
                    <td className="text-left">{record.companyName}</td>
                    <td className="text-center">{toWareki(record.fiscalYear)}年度</td>
                    <td className="text-left">{record.personInCharge}</td>
                    <td className="text-center">{new Date(record.updated_at).toLocaleString('ja-JP')}</td>
                    <td className="text-center">
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => sd.loadRecord(record)} className={SMALL_BTN}>
                          <Upload size={16} />
                          読込
                        </button>
                        <button onClick={() => sd.setDeleteTargetId(record.id)} className={SMALL_BTN}>
                          <Trash2 size={16} />
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6">
            <button onClick={sd.goToInput} className={BTN}>
              <ArrowLeft size={20} />
              入力画面へ戻る
            </button>
          </div>
        </>
      )}

      <ConfirmDialog
        isOpen={!!sd.deleteTargetId}
        onConfirm={sd.confirmDelete}
        onCancel={() => sd.setDeleteTargetId(null)}
        title="削除の確認"
        message="このデータを削除しますか？"
      />

      <ConfirmDialog
        isOpen={sd.showImportConfirm}
        onConfirm={sd.handleImportConfirm}
        onCancel={sd.cancelImport}
        title="復元の確認"
        message={"既存データを全て置換しますがよろしいですか？\nこの操作は取り消せません。"}
      />
    </div>
  );
}
