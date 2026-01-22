'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Plus, Edit2, Save, X, Ban, Eye, RefreshCw, Trash2 } from 'lucide-react';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { toWareki } from '@/lib/date-utils';
import { buttonStyle, smallButtonStyle, btnHoverClass } from '@/lib/button-styles';
import { handleFormSubmit } from '@/lib/form-utils';
import { executeRecordAction } from '@/lib/record-actions';

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
  const toast = useToast();
  const searchParams = useSearchParams();
  const initialYear = searchParams.get('year');
  const [data, setData] = useState<SimilarIndustryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedId, setSelectedId] = useState('');
  const [selectedFields, setSelectedFields] = useState({
    fiscal_year: initialYear || '',
    profit_per_share: '',
    net_asset_per_share: '',
    average_stock_price: '',
  });
  const [showInactive, setShowInactive] = useState(false);

  // Update fiscal_year when initialYear changes (e.g. navigation)
  useEffect(() => {
    if (initialYear) {
      setSelectedFields(prev => ({ ...prev, fiscal_year: initialYear }));
    }
  }, [initialYear]);

  const loadData = async () => {
    try {
      setLoading(true);
      const url = showInactive ? '/medical/api/similar-industry?showInactive=true' : '/medical/api/similar-industry';
      const response = await fetch(url);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [showInactive]);

  const getRegisteredYears = (): string[] => {
    // アクティブなレコードのみから年度を取得
    const activeRecords = data.filter((record) => record.is_active === 1);
    return activeRecords.map((record) => record.fiscal_year).sort((a, b) => b.localeCompare(a));
  };

  const handleOpenCreateModal = () => {
    setFormMode('create');
    setSelectedId('');
    setSelectedFields({
      fiscal_year: initialYear || '',
      profit_per_share: '',
      net_asset_per_share: '',
      average_stock_price: '',
    });
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (record: SimilarIndustryData) => {
    setFormMode('edit');
    setSelectedId(record.id);
    setSelectedFields({
      fiscal_year: record.fiscal_year,
      profit_per_share: record.profit_per_share.toString(),
      net_asset_per_share: record.net_asset_per_share.toString(),
      average_stock_price: record.average_stock_price.toString(),
    });
    setIsFormModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFields.fiscal_year || !selectedFields.fiscal_year.trim()) {
      toast.error('年度を選択してください。');
      return;
    }

    if (
      !selectedFields.profit_per_share ||
      !selectedFields.net_asset_per_share ||
      !selectedFields.average_stock_price
    ) {
      toast.error('すべての項目を入力してください。');
      return;
    }

    const requestData = {
      id: selectedId,
      fiscal_year: selectedFields.fiscal_year,
      profit_per_share: parseFloat(selectedFields.profit_per_share),
      net_asset_per_share: parseFloat(selectedFields.net_asset_per_share),
      average_stock_price: parseFloat(selectedFields.average_stock_price),
    };

    const result = await handleFormSubmit(
      '/medical/api/similar-industry',
      formMode === 'create' ? 'POST' : 'PUT',
      requestData
    );

    if (result.success) {
      toast.success(result.message);
      setIsFormModalOpen(false);
      loadData();
    } else {
      toast.error(result.message);
    }
  };

  const handleDeactivate = (id: string, fiscal_year: string) => {
    executeRecordAction({
      id,
      name: fiscal_year,
      action: 'deactivate',
      apiEndpoint: '/medical/api/similar-industry',
      onSuccess: loadData,
      toast,
    });
  };

  const handleActivate = (id: string, fiscal_year: string) => {
    executeRecordAction({
      id,
      name: fiscal_year,
      action: 'activate',
      apiEndpoint: '/medical/api/similar-industry',
      onSuccess: loadData,
      toast,
    });
  };

  const handleDelete = (id: string, fiscal_year: string) => {
    executeRecordAction({
      id,
      name: fiscal_year,
      action: 'delete',
      apiEndpoint: '/medical/api/similar-industry',
      onSuccess: loadData,
      toast,
    });
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
          <button onClick={handleOpenCreateModal} className={btnHoverClass} style={buttonStyle}>
            <Plus size={20} />
            新規登録
          </button>
          <button
            onClick={() => setShowInactive(!showInactive)}
            className={btnHoverClass}
            style={buttonStyle}
          >
            <Eye size={20} />
            {showInactive ? '有効データのみ表示' : '無効化データを表示'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card">
          <p>読み込み中...</p>
        </div>
      ) : data.length === 0 ? (
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
                {showInactive && <th className="text-center">状態</th>}
                <th className="text-center">登録日時</th>
                <th className="text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={showInactive ? 7 : 6} className="text-center text-gray-500">
                    該当するデータが見つかりません
                  </td>
                </tr>
              ) : (
                data.map((record) => (
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
                    {showInactive && (
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
                              onClick={() => handleOpenEditModal(record)}
                              className={btnHoverClass}
                              style={smallButtonStyle}
                            >
                              <Edit2 size={16} />
                              修正
                            </button>
                            <button
                              onClick={() => handleDeactivate(record.id, record.fiscal_year)}
                              className={btnHoverClass}
                              style={smallButtonStyle}
                            >
                              <Ban size={16} />
                              無効化
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleActivate(record.id, record.fiscal_year)}
                              className={btnHoverClass}
                              style={smallButtonStyle}
                            >
                              <RefreshCw size={16} />
                              有効化
                            </button>
                            <button
                              onClick={() => handleDelete(record.id, record.fiscal_year)}
                              className={btnHoverClass}
                              style={smallButtonStyle}
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
        <button onClick={() => router.push('/')} className={btnHoverClass} style={buttonStyle}>
          <ArrowLeft size={20} />
          入力画面へ戻る
        </button>
      </div>

      {/* フォームモーダル */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={formMode === 'create' ? '類似業種データ新規登録' : '類似業種データ修正'}
        minWidth="500px"
      >
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">年度</label>
            {formMode === 'create' ? (
              <select
                value={selectedFields.fiscal_year}
                onChange={(e) =>
                  setSelectedFields({ ...selectedFields, fiscal_year: e.target.value })
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">選択してください</option>
                {(() => {
                  const currentYear = new Date().getFullYear();
                  const yearOptions = [];
                  for (let i = currentYear + 5; i >= currentYear - 5; i--) {
                    yearOptions.push(i);
                  }
                  return yearOptions.map((year) => {
                    const registeredYears = getRegisteredYears();
                    if (registeredYears.includes(year.toString())) {
                      return null;
                    }
                    return (
                      <option key={year} value={year.toString()}>
                        {toWareki(year)} ({year}年)
                      </option>
                    );
                  });
                })()}
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

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">C:利益金額（円）</label>
            <input
              type="number"
              step="0.01"
              value={selectedFields.profit_per_share}
              onChange={(e) =>
                setSelectedFields({ ...selectedFields, profit_per_share: e.target.value })
              }
              required
              placeholder="例：51"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">D:簿価純資産価格（円）</label>
            <input
              type="number"
              step="0.01"
              value={selectedFields.net_asset_per_share}
              onChange={(e) =>
                setSelectedFields({ ...selectedFields, net_asset_per_share: e.target.value })
              }
              required
              placeholder="例：395"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">A:平均株価（円）</label>
            <input
              type="number"
              step="0.01"
              value={selectedFields.average_stock_price}
              onChange={(e) =>
                setSelectedFields({ ...selectedFields, average_stock_price: e.target.value })
              }
              required
              placeholder="例：532"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setIsFormModalOpen(false)}
              className={btnHoverClass}
              style={buttonStyle}
            >
              <X size={20} />
              キャンセル
            </button>
            <button type="submit" className={btnHoverClass} style={buttonStyle}>
              <Save size={20} />
              {formMode === 'create' ? '登録' : '更新'}
            </button>
          </div>
        </form>
      </Modal>
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
