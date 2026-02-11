'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { handleFormSubmit } from '@/lib/form-utils';
import { executeRecordAction } from '@/lib/record-actions';

type PendingAction = {
  id: string;
  name: string;
  action: 'activate' | 'deactivate' | 'delete';
};

/**
 * マスタ設定ページ共通のCRUD状態管理フック
 * user-settings / company-settings / similar-industry-settings で共有
 */
export function useMasterSettings<T extends { id: string }>(apiEndpoint: string) {
  const toast = useToast();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedId, setSelectedId] = useState('');
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const url = showInactive ? `${apiEndpoint}?showInactive=true` : apiEndpoint;
      const response = await fetch(url);
      if (response.ok) {
        setData(await response.json());
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

  const openCreateModal = () => {
    setFormMode('create');
    setSelectedId('');
    setIsFormModalOpen(true);
  };

  const openEditModal = (id: string) => {
    setFormMode('edit');
    setSelectedId(id);
    setIsFormModalOpen(true);
  };

  const closeModal = () => setIsFormModalOpen(false);

  /** フォーム送信の共通処理（バリデーションは呼び出し元で行う） */
  const submitForm = async (requestData: Record<string, unknown>) => {
    const result = await handleFormSubmit(
      apiEndpoint,
      formMode === 'create' ? 'POST' : 'PUT',
      requestData
    );
    if (result.success) {
      toast.success(result.message);
      closeModal();
      loadData();
    } else {
      toast.error(result.message);
    }
    return result.success;
  };

  const requestAction = (id: string, name: string, action: PendingAction['action']) => {
    setPendingAction({ id, name, action });
  };

  const confirmPendingAction = () => {
    if (!pendingAction) return;
    executeRecordAction({
      id: pendingAction.id,
      action: pendingAction.action,
      apiEndpoint,
      onSuccess: loadData,
      toast,
    });
    setPendingAction(null);
  };

  const cancelPendingAction = () => setPendingAction(null);

  return {
    data,
    loading,
    showInactive,
    setShowInactive,
    isFormModalOpen,
    formMode,
    selectedId,
    pendingAction,
    toast,
    loadData,
    openCreateModal,
    openEditModal,
    closeModal,
    submitForm,
    requestAction,
    confirmPendingAction,
    cancelPendingAction,
  };
}
