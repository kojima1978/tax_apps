'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Plus, Edit2, Save, X, Ban, Eye, RefreshCw, Trash2 } from 'lucide-react';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { toWareki, generateYearRange } from '@/lib/date-utils';
import { BTN, SMALL_BTN } from '@/lib/button-styles';
import { LABEL_CLASS } from '@/lib/constants';
import { ACTION_MESSAGES } from '@/lib/record-actions';
import { useMasterSettings } from '@/hooks/useMasterSettings';

type SimilarIndustryData = {
  id: string;
  fiscal_year: string;
  profit_per_share: number;
  net_asset_per_share: number;
  average_stock_price: number;
  is_active: number;
  created_at: string;
  updated_at: string;
};

function SimilarIndustrySettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialYear = searchParams.get('year');
  const ms = useMasterSettings<SimilarIndustryData>('/medical/api/similar-industry');
  const [selectedFields, setSelectedFields] = useState(() => ({
    fiscal_year: initialYear || '',
    profit_per_share: '',
    net_asset_per_share: '',
    average_stock_price: '',
  }));

  useEffect(() => {
    if (initialYear) {
      setSelectedFields(prev => ({ ...prev, fiscal_year: initialYear }));
    }
  }, [initialYear]);

  const getRegisteredYears = (): string[] => {
    const activeRecords = ms.data.filter((record) => record.is_active === 1);
    return activeRecords.map((record) => record.fiscal_year).sort((a, b) => b.localeCompare(a));
  };

  const handleOpenCreate = () => {
    setSelectedFields({
      fiscal_year: initialYear || '',
      profit_per_share: '',
      net_asset_per_share: '',
      average_stock_price: '',
    });
    ms.openCreateModal();
  };

  const handleOpenEdit = (record: SimilarIndustryData) => {
    setSelectedFields({
      fiscal_year: record.fiscal_year,
      profit_per_share: record.profit_per_share.toString(),
      net_asset_per_share: record.net_asset_per_share.toString(),
      average_stock_price: record.average_stock_price.toString(),
    });
    ms.openEditModal(record.id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFields.fiscal_year?.trim()) {
      ms.toast.error('年度を選択してください。');
      return;
    }
    if (!selectedFields.profit_per_share || !selectedFields.net_asset_per_share || !selectedFields.average_stock_price) {
      ms.toast.error('すべての項目を入力してください。');
      return;
    }
    await ms.submitForm({
      id: ms.selectedId,
      fiscal_year: selectedFields.fiscal_year,
      profit_per_share: parseFloat(selectedFields.profit_per_share),
      net_asset_per_share: parseFloat(selectedFields.net_asset_per_share),
      average_stock_price: parseFloat(selectedFields.average_stock_price),
    });
  };

  const updateField = (key: keyof typeof selectedFields, value: string) => {
    setSelectedFields(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div>
      <Header />
      <h1>類似業種データ設定（業種目を「その他の産業」として評価）</h1>

      <div className="card">
        <p className="mb-4">
          類似業種データを管理します。
          <br />
          評価額計算時に使用されます。
        </p>
        <div className="flex gap-2">
          <button onClick={handleOpenCreate} className={BTN}>
            <Plus size={20} />
            新規登録
          </button>
          <button
            onClick={() => ms.setShowInactive(!ms.showInactive)}
            className={BTN}
          >
            <Eye size={20} />
            {ms.showInactive ? '有効データのみ表示' : '無効化データを表示'}
          </button>
        </div>
      </div>

      {ms.loading ? (
        <div className="card">
          <p>読み込み中...</p>
        </div>
      ) : ms.data.length === 0 ? (
        <div className="card">
          <p>登録されたデータはありません。</p>
        </div>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th className="text-left">年度</th>
                <th className="text-center">C:利益金額（円）</th>
                <th className="text-center">D:簿価純資産価格（円）</th>
                <th className="text-center">A:平均株価（円）</th>
                {ms.showInactive && <th className="text-center">状態</th>}
                <th className="text-center">登録日時</th>
                <th className="text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {ms.data.length === 0 ? (
                <tr>
                  <td colSpan={ms.showInactive ? 7 : 6} className="text-center text-gray-500">
                    該当するデータが見つかりません
                  </td>
                </tr>
              ) : (
                ms.data.map((record) => (
                  <tr key={record.id} className={record.is_active === 0 ? 'bg-gray-100' : ''}>
                    <td className="text-left">
                      {toWareki(parseInt(record.fiscal_year))} ({record.fiscal_year}年)
                      {record.is_active === 0 && (
                        <span className="ml-2 text-xs text-gray-500">(無効)</span>
                      )}
                    </td>
                    <td className="text-center">{record.profit_per_share.toLocaleString()}</td>
                    <td className="text-center">{record.net_asset_per_share.toLocaleString()}</td>
                    <td className="text-center">{record.average_stock_price.toLocaleString()}</td>
                    {ms.showInactive && (
                      <td className="text-center">
                        {record.is_active === 1 ? (
                          <span className="text-black font-medium">有効</span>
                        ) : (
                          <span className="text-gray-500 font-medium">無効</span>
                        )}
                      </td>
                    )}
                    <td className="text-center">
                      {new Date(record.created_at).toLocaleString('ja-JP')}
                    </td>
                    <td className="text-center">
                      <div className="flex gap-2 justify-center">
                        {record.is_active === 1 ? (
                          <>
                            <button
                              onClick={() => handleOpenEdit(record)}
                              className={SMALL_BTN}
                            >
                              <Edit2 size={16} />
                              修正
                            </button>
                            <button
                              onClick={() => ms.requestAction(record.id, record.fiscal_year, 'deactivate')}
                              className={SMALL_BTN}
                            >
                              <Ban size={16} />
                              無効化
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => ms.requestAction(record.id, record.fiscal_year, 'activate')}
                              className={SMALL_BTN}
                            >
                              <RefreshCw size={16} />
                              有効化
                            </button>
                            <button
                              onClick={() => ms.requestAction(record.id, record.fiscal_year, 'delete')}
                              className={SMALL_BTN}
                            >
                              <Trash2 size={16} />
                              削除
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6">
        <button onClick={() => router.push('/')} className={BTN}>
          <ArrowLeft size={20} />
          入力画面へ戻る
        </button>
      </div>

      <Modal
        isOpen={ms.isFormModalOpen}
        onClose={ms.closeModal}
        title={ms.formMode === 'create' ? '類似業種データ新規登録' : '類似業種データ修正'}
        minWidth="500px"
      >
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className={LABEL_CLASS}>年度</label>
            {ms.formMode === 'create' ? (
              <select
                value={selectedFields.fiscal_year}
                onChange={(e) => updateField('fiscal_year', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">選択してください</option>
                {generateYearRange()
                  .filter((year) => !getRegisteredYears().includes(year.toString()))
                  .map((year) => (
                    <option key={year} value={year.toString()}>
                      {toWareki(year)} ({year}年)
                    </option>
                  ))}
              </select>
            ) : (
              <input
                type="text"
                value={`${toWareki(parseInt(selectedFields.fiscal_year))} (${selectedFields.fiscal_year}年)`}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
              />
            )}
          </div>

          {[
            { key: 'profit_per_share' as const, label: 'C:利益金額（円）', placeholder: '例：51' },
            { key: 'net_asset_per_share' as const, label: 'D:簿価純資産価格（円）', placeholder: '例：395' },
            { key: 'average_stock_price' as const, label: 'A:平均株価（円）', placeholder: '例：532' },
          ].map(({ key, label, placeholder }) => (
            <div key={key} className="mb-4">
              <label className={LABEL_CLASS}>{label}</label>
              <input
                type="number"
                step="0.01"
                value={selectedFields[key]}
                onChange={(e) => updateField(key, e.target.value)}
                required
                placeholder={placeholder}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          ))}

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={ms.closeModal} className={BTN}>
              <X size={20} />
              キャンセル
            </button>
            <button type="submit" className={BTN}>
              <Save size={20} />
              {ms.formMode === 'create' ? '登録' : '更新'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!ms.pendingAction}
        onConfirm={ms.confirmPendingAction}
        onCancel={ms.cancelPendingAction}
        title={ms.pendingAction ? ACTION_MESSAGES[ms.pendingAction.action].title : ''}
        message={ms.pendingAction ? ACTION_MESSAGES[ms.pendingAction.action].confirm(ms.pendingAction.name) : ''}
      />
    </div>
  );
}

export default function SimilarIndustrySettingsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SimilarIndustrySettingsContent />
    </Suspense>
  );
}
