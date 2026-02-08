'use client';

import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import type { ApplicationInput } from '@/types/application';
import { AVAILABLE_ICONS } from '@/lib/icons';
import { MAX_TITLE_LENGTH, MAX_DESCRIPTION_LENGTH, MAX_URL_LENGTH } from '@/lib/validation';
import FormField from './ui/FormField';
import ErrorAlert from './ui/ErrorAlert';
import { glassPanelCard, gradientBtn, cancelBtn } from '@/lib/styles';

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
    <form onSubmit={handleSubmit} className={`${glassPanelCard} p-6`}>
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

      {error && <ErrorAlert message={error} className="mb-4" />}

      <div className="space-y-4">
        <FormField
          label="タイトル"
          id="title"
          value={formData.title}
          onChange={(v) => setFormData({ ...formData, title: v })}
          placeholder="アプリケーション名"
          maxLength={MAX_TITLE_LENGTH}
          required
        />

        <FormField
          label="説明"
          id="description"
          type="textarea"
          value={formData.description}
          onChange={(v) => setFormData({ ...formData, description: v })}
          placeholder="アプリケーションの簡単な説明"
          maxLength={MAX_DESCRIPTION_LENGTH}
          rows={3}
          required
        />

        <FormField
          label="URL"
          id="url"
          value={formData.url}
          onChange={(v) => setFormData({ ...formData, url: v })}
          placeholder="/app-path または https://example.com"
          maxLength={MAX_URL_LENGTH}
          required
        />

        <FormField
          label="アイコン"
          id="icon"
          type="select"
          value={formData.icon}
          onChange={(v) => setFormData({ ...formData, icon: v })}
          options={AVAILABLE_ICONS}
          hint={`選択中: ${formData.icon}`}
          required
        />

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 ${gradientBtn} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Plus className="w-4 h-4" />
            {isSubmitting ? '保存中...' : (application ? '更新' : '追加')}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className={cancelBtn}
            >
              キャンセル
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
