'use client';

import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import type { ApplicationInput } from '@/types/application';
import { AVAILABLE_ICONS } from '@/lib/icons';
import { MAX_TITLE_LENGTH, MAX_DESCRIPTION_LENGTH, MAX_URL_LENGTH } from '@/lib/validation';

const EMPTY_FORM: ApplicationInput = {
  title: '',
  description: '',
  url: '',
  icon: 'Package',
};

interface ApplicationFormProps {
  application?: ApplicationInput;
  onSubmit: (data: ApplicationInput) => Promise<void>;
  onCancel?: () => void;
}

export default function ApplicationForm({ application, onSubmit, onCancel }: ApplicationFormProps) {
  const [formData, setFormData] = useState<ApplicationInput>(application ?? EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 編集対象が切り替わった時にフォームデータを同期
  useEffect(() => {
    setFormData(application ?? EMPTY_FORM);
    setError('');
  }, [application]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.title || !formData.description || !formData.url || !formData.icon) {
      setError('すべての項目を入力してください');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      // Reset form if it's a new application
      if (!application) {
        setFormData(EMPTY_FORM);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'アプリケーションの保存に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-md border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          {application ? 'アプリケーションを編集' : '新規アプリケーションを追加'}
        </h2>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            タイトル
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
            placeholder="アプリケーション名"
            maxLength={MAX_TITLE_LENGTH}
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            説明
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 resize-none"
            placeholder="アプリケーションの簡単な説明"
            maxLength={MAX_DESCRIPTION_LENGTH}
            rows={3}
            required
          />
        </div>

        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
            URL
          </label>
          <input
            type="text"
            id="url"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
            placeholder="/app-path または https://example.com"
            maxLength={MAX_URL_LENGTH}
            required
          />
        </div>

        <div>
          <label htmlFor="icon" className="block text-sm font-medium text-gray-700 mb-1">
            アイコン
          </label>
          <select
            id="icon"
            value={formData.icon}
            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
            required
          >
            {AVAILABLE_ICONS.map((icon) => (
              <option key={icon} value={icon}>
                {icon}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            選択中: {formData.icon}
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            {isSubmitting ? '保存中...' : (application ? '更新' : '追加')}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
