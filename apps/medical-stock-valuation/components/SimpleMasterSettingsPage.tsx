'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Edit2, Save, X, Ban, Eye, RefreshCw, Trash2 } from 'lucide-react';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { BTN, SMALL_BTN } from '@/lib/button-styles';
import { LABEL_CLASS } from '@/lib/constants';
import { handleDoubleClickToStep0 } from '@/lib/form-utils';
import { ACTION_MESSAGES } from '@/lib/record-actions';
import { useMasterSettings } from '@/hooks/useMasterSettings';

type BaseMasterRecord = {
  id: string;
  is_active: number;
  created_at: string;
  updated_at: string;
};

export interface SimpleMasterConfig<T extends BaseMasterRecord> {
  apiEndpoint: string;
  pageTitle: string;
  description: string;
  entityLabel: string;
  formLabel: string;
  formPlaceholder: string;
  searchLabel: string;
  searchPlaceholder: string;
  getName: (record: T) => string;
  nameField: string;
  step0Field: 'personInCharge' | 'companyName';
}

export function SimpleMasterSettingsPage<T extends BaseMasterRecord>({
  config,
}: {
  config: SimpleMasterConfig<T>;
}) {
  const router = useRouter();
  const ms = useMasterSettings<T>(config.apiEndpoint);
  const [name, setName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const handleOpenCreate = () => {
    setName('');
    ms.openCreateModal();
  };

  const handleOpenEdit = (record: T) => {
    setName(config.getName(record));
    ms.openEditModal(record.id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name?.trim()) {
      ms.toast.error(`${config.formLabel}を入力してください。`);
      return;
    }
    await ms.submitForm({ id: ms.selectedId, [config.nameField]: name });
  };

  const filteredData = ms.data.filter((r) =>
    config.getName(r).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <Header />
      <h1>{config.pageTitle}</h1>

      <div className="card">
        <p className="mb-4">
          {config.description}
          <br />
          評価額計算時に選択できます。
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
          <div className="mb-4">
            <label className={LABEL_CLASS}>{config.searchLabel}</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={config.searchPlaceholder}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchTerm && (
              <p className="text-sm text-gray-600 mt-2">
                {filteredData.length}件の{config.entityLabel}が見つかりました
              </p>
            )}
          </div>
          <table>
            <thead>
              <tr>
                <th className="text-left">{config.formLabel}</th>
                {ms.showInactive && <th className="text-center">状態</th>}
                <th className="text-center">登録日時</th>
                <th className="text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={ms.showInactive ? 4 : 3} className="text-center text-gray-500">
                    該当する{config.entityLabel}が見つかりません
                  </td>
                </tr>
              ) : (
                filteredData.map((record) => (
                  <tr key={record.id} className={record.is_active === 0 ? 'bg-gray-100' : ''}>
                    <td
                      className="text-left cursor-pointer hover:bg-blue-50"
                      onDoubleClick={() =>
                        record.is_active === 1 &&
                        handleDoubleClickToStep0(config.step0Field, config.getName(record), router)
                      }
                      title={record.is_active === 1 ? 'ダブルクリックで選択してSTEP0に戻る' : '無効化されています'}
                    >
                      {config.getName(record)}
                      {record.is_active === 0 && (
                        <span className="ml-2 text-xs text-gray-500">(無効)</span>
                      )}
                    </td>
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
                              onClick={() => ms.requestAction(record.id, config.getName(record), 'deactivate')}
                              className={SMALL_BTN}
                            >
                              <Ban size={16} />
                              無効化
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => ms.requestAction(record.id, config.getName(record), 'activate')}
                              className={SMALL_BTN}
                            >
                              <RefreshCw size={16} />
                              有効化
                            </button>
                            <button
                              onClick={() => ms.requestAction(record.id, config.getName(record), 'delete')}
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
        title={`${config.entityLabel}情報${ms.formMode === 'create' ? '新規登録' : '修正'}`}
        minWidth="500px"
      >
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className={LABEL_CLASS}>{config.formLabel}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder={config.formPlaceholder}
            />
          </div>
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
