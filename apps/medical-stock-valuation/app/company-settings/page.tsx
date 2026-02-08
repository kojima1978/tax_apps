'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Edit2, Save, X, Ban, Eye, RefreshCw, Trash2 } from 'lucide-react';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { BTN_CLASS, SMALL_BTN_CLASS, HOVER_CLASS } from '@/lib/button-styles';
import { handleDoubleClickToStep0, handleFormSubmit } from '@/lib/form-utils';
import { executeRecordAction } from '@/lib/record-actions';
import { ACTION_MESSAGES } from '@/lib/record-actions';
import ConfirmDialog from '@/components/ConfirmDialog';

type Company = {
  id: string;
  company_name: string;
  is_active: number;
  created_at: string;
  updated_at: string;
};

export default function CompanySettingsPage() {
  const router = useRouter();
  const toast = useToast();
  const [data, setData] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedId, setSelectedId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [pendingAction, setPendingAction] = useState<{id: string; name: string; action: 'activate' | 'deactivate' | 'delete'} | null>(null);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const url = showInactive ? '/medical/api/companies?showInactive=true' : '/medical/api/companies';
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
    loadCompanies();
  }, [showInactive]);

  const handleOpenCreateModal = () => {
    setFormMode('create');
    setSelectedId('');
    setCompanyName('');
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (record: Company) => {
    setFormMode('edit');
    setSelectedId(record.id);
    setCompanyName(record.company_name);
    setIsFormModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyName || !companyName.trim()) {
      toast.error('会社名を入力してください。');
      return;
    }

    const requestData = {
      id: selectedId,
      company_name: companyName,
    };

    const result = await handleFormSubmit(
      '/medical/api/companies',
      formMode === 'create' ? 'POST' : 'PUT',
      requestData
    );

    if (result.success) {
      toast.success(result.message);
      setIsFormModalOpen(false);
      loadCompanies();
    } else {
      toast.error(result.message);
    }
  };

  const handleDeactivate = (id: string, companyName: string) => {
    setPendingAction({ id, name: companyName, action: 'deactivate' });
  };

  const handleActivate = (id: string, companyName: string) => {
    setPendingAction({ id, name: companyName, action: 'activate' });
  };

  const handleDelete = (id: string, companyName: string) => {
    setPendingAction({ id, name: companyName, action: 'delete' });
  };

  const confirmPendingAction = () => {
    if (!pendingAction) return;
    executeRecordAction({
      id: pendingAction.id,
      action: pendingAction.action,
      apiEndpoint: '/medical/api/companies',
      onSuccess: loadCompanies,
      toast,
    });
    setPendingAction(null);
  };

  // 検索フィルター
  const filteredData = data.filter((company: Company) =>
    company.company_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <Header />
      <h1>会社マスタ設定</h1>

      <div className="card">
        <p className="mb-4">
          会社情報を管理します。
          <br />
          評価額計算時に選択できます。
        </p>
        <div className="flex gap-2">
          <button onClick={handleOpenCreateModal} className={`${BTN_CLASS} ${HOVER_CLASS}`}>
            <Plus size={20} />
            新規登録
          </button>
          <button
            onClick={() => setShowInactive(!showInactive)}
            className={`${BTN_CLASS} ${HOVER_CLASS}`}
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
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">会社名で絞り込み</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="会社名を入力..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchTerm && (
              <p className="text-sm text-gray-600 mt-2">
                {filteredData.length}件の会社が見つかりました
              </p>
            )}
          </div>
          <table>
            <thead>
              <tr>
                <th className="text-left">会社名</th>
                {showInactive && <th className="text-center">状態</th>}
                <th className="text-center">登録日時</th>
                <th className="text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={showInactive ? 4 : 3} className="text-center text-gray-500">
                    該当する会社が見つかりません
                  </td>
                </tr>
              ) : (
                filteredData.map((record) => (
                  <tr key={record.id} className={record.is_active === 0 ? 'bg-gray-100' : ''}>
                    <td
                      className="text-left cursor-pointer hover:bg-blue-50"
                      onDoubleClick={() =>
                        record.is_active === 1 &&
                        handleDoubleClickToStep0('companyName', record.company_name, router)
                      }
                      title={record.is_active === 1 ? 'ダブルクリックで選択してSTEP0に戻る' : '無効化されています'}
                    >
                      {record.company_name}
                      {record.is_active === 0 && (
                        <span className="ml-2 text-xs text-gray-500">(無効)</span>
                      )}
                    </td>
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
                              className={`${SMALL_BTN_CLASS} ${HOVER_CLASS}`}
                            >
                              <Edit2 size={16} />
                              修正
                            </button>
                            <button
                              onClick={() => handleDeactivate(record.id, record.company_name)}
                              className={`${SMALL_BTN_CLASS} ${HOVER_CLASS}`}
                            >
                              <Ban size={16} />
                              無効化
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleActivate(record.id, record.company_name)}
                              className={`${SMALL_BTN_CLASS} ${HOVER_CLASS}`}
                            >
                              <RefreshCw size={16} />
                              有効化
                            </button>
                            <button
                              onClick={() => handleDelete(record.id, record.company_name)}
                              className={`${SMALL_BTN_CLASS} ${HOVER_CLASS}`}
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
        <button onClick={() => router.push('/')} className={`${BTN_CLASS} ${HOVER_CLASS}`}>
          <ArrowLeft size={20} />
          入力画面へ戻る
        </button>
      </div>

      {/* フォームモーダル */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={formMode === 'create' ? '会社情報新規登録' : '会社情報修正'}
        minWidth="500px"
      >
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">会社名</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              placeholder="例：○○医療法人"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setIsFormModalOpen(false)}
              className={`${BTN_CLASS} ${HOVER_CLASS}`}
            >
              <X size={20} />
              キャンセル
            </button>
            <button type="submit" className={`${BTN_CLASS} ${HOVER_CLASS}`}>
              <Save size={20} />
              {formMode === 'create' ? '登録' : '更新'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!pendingAction}
        onConfirm={confirmPendingAction}
        onCancel={() => setPendingAction(null)}
        title={pendingAction ? ACTION_MESSAGES[pendingAction.action].title : ''}
        message={pendingAction ? ACTION_MESSAGES[pendingAction.action].confirm(pendingAction.name) : ''}
      />
    </div>
  );
}
