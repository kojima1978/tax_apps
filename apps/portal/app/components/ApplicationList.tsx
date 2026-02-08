'use client';

import { Edit2, Trash2, ExternalLink } from 'lucide-react';
import type { Application } from '@/types/application';
import { isExternalUrl } from '@/lib/url';
import { useDeleteConfirmation } from '@/hooks/useDeleteConfirmation';
import DeleteConfirmDialog from './ui/DeleteConfirmDialog';
import ErrorAlert from './ui/ErrorAlert';
import { glassPanelCard } from '@/lib/styles';

const thClassName = 'px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider';

interface ApplicationListProps {
  applications: Application[];
  onEdit: (application: Application) => void;
  onDelete: (id: string) => Promise<void>;
}

export default function ApplicationList({ applications, onEdit, onDelete }: ApplicationListProps) {
  const {
    deleteTarget,
    setDeleteTarget,
    deletingId,
    deleteError,
    handleDeleteConfirm,
  } = useDeleteConfirmation(onDelete);

  if (applications.length === 0) {
    return (
      <div className={`${glassPanelCard} p-12 text-center`}>
        <p className="text-gray-500 text-lg">アプリケーションがありません。上のフォームから最初のアプリケーションを追加してください。</p>
      </div>
    );
  }

  return (
    <div className={`${glassPanelCard} overflow-hidden`}>
      {deleteError && <ErrorAlert message={deleteError} className="m-4" />}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className={`${thClassName} text-left`}>
                アプリケーション
              </th>
              <th className={`${thClassName} text-left`}>
                URL
              </th>
              <th className={`${thClassName} text-left`}>
                アイコン
              </th>
              <th className={`${thClassName} text-right`}>
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {applications.map((app) => {
              const external = isExternalUrl(app.url);
              return (
              <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{app.title}</div>
                    <div className="text-sm text-gray-500">{app.description}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <a
                    href={app.url}
                    {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
                  >
                    {app.url}
                    {external && <ExternalLink className="w-3 h-3" />}
                  </a>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-900">{app.icon}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEdit(app)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="編集"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget({ id: app.id, title: app.title })}
                      disabled={deletingId === app.id}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <DeleteConfirmDialog
        isOpen={deleteTarget !== null}
        title={deleteTarget?.title ?? ''}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
