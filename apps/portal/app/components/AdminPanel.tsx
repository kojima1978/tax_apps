'use client';

import ApplicationForm from './ApplicationForm';
import ApplicationList from './ApplicationList';
import type { Application } from '@/types/application';
import { useApplicationMutations } from '@/hooks/useApplicationMutations';

interface AdminPanelProps {
  applications: Application[];
}

export default function AdminPanel({ applications }: AdminPanelProps) {
  const {
    editingApp,
    handleAddApplication,
    handleUpdateApplication,
    handleDeleteApplication,
    handleEdit,
    handleCancelEdit,
  } = useApplicationMutations();

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
