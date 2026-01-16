'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Edit2, Save, X, Ban, Eye, RefreshCw, Trash2 } from 'lucide-react';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { buttonStyle, smallButtonStyle, btnHoverClass } from '@/lib/button-styles';
import { handleDoubleClickToStep0, handleFormSubmit } from '@/lib/form-utils';
import { executeRecordAction } from '@/lib/record-actions';

type User = {
  id: string;
  name: string;
  is_active: number;
  created_at: string;
  updated_at: string;
};

export default function UserSettingsPage() {
  const router = useRouter();
  const toast = useToast();
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedId, setSelectedId] = useState('');
  const [userName, setUserName] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const url = showInactive ? '/api/users?showInactive=true' : '/api/users';
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
    loadUsers();
  }, [showInactive]);

  const handleOpenCreateModal = () => {
    setFormMode('create');
    setSelectedId('');
    setUserName('');
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (record: User) => {
    setFormMode('edit');
    setSelectedId(record.id);
    setUserName(record.name);
    setIsFormModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userName || !userName.trim()) {
      toast.error('担当者名を入力してください。');
      return;
    }

    const requestData = {
      id: selectedId,
      name: userName,
    };

    const result = await handleFormSubmit(
      '/api/users',
      formMode === 'create' ? 'POST' : 'PUT',
      requestData
    );

    if (result.success) {
      toast.success(result.message);
      setIsFormModalOpen(false);
      loadUsers();
    } else {
      toast.error(result.message);
    }
  };

  const handleDeactivate = (id: string, userName: string) => {
    executeRecordAction({
      id,
      name: userName,
      action: 'deactivate',
      apiEndpoint: '/api/users',
      onSuccess: loadUsers,
      toast,
    });
  };

  const handleActivate = (id: string, userName: string) => {
    executeRecordAction({
      id,
      name: userName,
      action: 'activate',
      apiEndpoint: '/api/users',
      onSuccess: loadUsers,
      toast,
    });
  };

  const handleDelete = (id: string, userName: string) => {
    executeRecordAction({
      id,
      name: userName,
      action: 'delete',
      apiEndpoint: '/api/users',
      onSuccess: loadUsers,
      toast,
    });
  };

  // 検索フィルター
  const filteredData = data.filter((user: User) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <Header />
      <h1>担当者マスタ設定</h1>

      <div className="card">
        <p className="mb-4">
          担当者情報を管理します。
          <br />
          評価額計算時に選択できます。
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
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">担当者名で絞り込み</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="担当者名を入力..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchTerm && (
              <p className="text-sm text-gray-600 mt-2">
                {filteredData.length}件の担当者が見つかりました
              </p>
            )}
          </div>
          <table>
            <thead>
              <tr>
                <th className="text-left">担当者名</th>
                {showInactive && <th className="text-center">状態</th>}
                <th className="text-center">登録日時</th>
                <th className="text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={showInactive ? 4 : 3} className="text-center text-gray-500">
                    該当する担当者が見つかりません
                  </td>
                </tr>
              ) : (
                filteredData.map((record) => (
                  <tr key={record.id} className={record.is_active === 0 ? 'bg-gray-100' : ''}>
                    <td
                      className="text-left cursor-pointer hover:bg-blue-50"
                      onDoubleClick={() =>
                        record.is_active === 1 &&
                        handleDoubleClickToStep0('personInCharge', record.name, router)
                      }
                      title={record.is_active === 1 ? 'ダブルクリックで選択してSTEP0に戻る' : '無効化されています'}
                    >
                      {record.name}
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
                              className={btnHoverClass}
                              style={smallButtonStyle}
                            >
                              <Edit2 size={16} />
                              修正
                            </button>
                            <button
                              onClick={() => handleDeactivate(record.id, record.name)}
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
                              onClick={() => handleActivate(record.id, record.name)}
                              className={btnHoverClass}
                              style={smallButtonStyle}
                            >
                              <RefreshCw size={16} />
                              有効化
                            </button>
                            <button
                              onClick={() => handleDelete(record.id, record.name)}
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
        title={formMode === 'create' ? '担当者情報新規登録' : '担当者情報修正'}
        minWidth="500px"
      >
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">担当者名</label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              required
              placeholder="例：山田太郎"
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
