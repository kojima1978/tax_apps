'use client';

import { useState } from 'react';

type DeleteTarget = { id: string; title: string } | null;

export function useDeleteConfirmation(onDelete: (id: string) => Promise<void>) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const { id } = deleteTarget;
    setDeleteTarget(null);
    setDeleteError(null);
    setDeletingId(id);
    try {
      await onDelete(id);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : '削除に失敗しました');
    } finally {
      setDeletingId(null);
    }
  };

  return {
    deleteTarget,
    setDeleteTarget,
    deletingId,
    deleteError,
    handleDeleteConfirm,
  };
}
