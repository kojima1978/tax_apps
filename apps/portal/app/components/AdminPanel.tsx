'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ApplicationForm from './ApplicationForm';
import ApplicationList from './ApplicationList';
import type { Application, ApplicationInput } from '@/types/application';
import { fetchApi } from '@/lib/client-api';

interface AdminPanelProps {
  applications: Application[];
}

export default function AdminPanel({ applications }: AdminPanelProps) {
  const router = useRouter();
  const [editingApp, setEditingApp] = useState<Application | null>(null);

  const handleAddApplication = async (data: ApplicationInput) => {
    await fetchApi('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }, 'アプリケーションの作成に失敗しました');
    router.refresh();
  };

  const handleUpdateApplication = async (data: ApplicationInput) => {
    if (!editingApp) return;
    await fetchApi(`/api/applications/${editingApp.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
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

  return (
    <div className="space-y-8">
      {/* Form Section */}
      <ApplicationForm
        application={editingApp || undefined}
        onSubmit={editingApp ? handleUpdateApplication : handleAddApplication}
        onCancel={editingApp ? handleCancelEdit : undefined}
      />

      {/* List Section */}
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-4">登録済みアプリケーション</h3>
        <ApplicationList
          applications={applications}
          onEdit={handleEdit}
          onDelete={handleDeleteApplication}
        />
      </div>
    </div>
  );
}
