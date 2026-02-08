'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Application, ApplicationInput } from '@/types/application';
import { fetchApi } from '@/lib/client-api';

const jsonHeaders = { 'Content-Type': 'application/json' } as const;

export function useApplicationMutations() {
  const router = useRouter();
  const [editingApp, setEditingApp] = useState<Application | null>(null);

  const handleAddApplication = async (data: ApplicationInput) => {
    await fetchApi('/api/applications', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(data),
    }, 'アプリケーションの作成に失敗しました');
    router.refresh();
  };

  const handleUpdateApplication = async (data: ApplicationInput) => {
    if (!editingApp) return;
    await fetchApi(`/api/applications/${editingApp.id}`, {
      method: 'PUT',
      headers: jsonHeaders,
      body: JSON.stringify(data),
    }, 'アプリケーションの更新に失敗しました');
    setEditingApp(null);
    router.refresh();
  };

  const handleDeleteApplication = async (id: string) => {
    await fetchApi(`/api/applications/${id}`, {
      method: 'DELETE',
    }, 'アプリケーションの削除に失敗しました');
    router.refresh();
  };

  const handleEdit = (app: Application) => {
    setEditingApp(app);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingApp(null);
  };

  return {
    editingApp,
    handleAddApplication,
    handleUpdateApplication,
    handleDeleteApplication,
    handleEdit,
    handleCancelEdit,
  };
}
