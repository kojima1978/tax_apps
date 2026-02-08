/**
 * API Input Validation
 * アプリケーションCRUD操作の入力バリデーション
 */

import { AVAILABLE_ICONS } from './icons';

export const MAX_TITLE_LENGTH = 100;
export const MAX_DESCRIPTION_LENGTH = 500;
export const MAX_URL_LENGTH = 2000;

type ValidationResult = {
  valid: true;
  data: { title: string; description: string; url: string; icon: string };
} | {
  valid: false;
  error: string;
}

export function validateApplicationInput(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const { title, description, url, icon } = body as Record<string, unknown>;

  if (typeof title !== 'string' || typeof description !== 'string' ||
      typeof url !== 'string' || typeof icon !== 'string') {
    return { valid: false, error: 'All fields must be strings' };
  }

  const trimmed = {
    title: title.trim(),
    description: description.trim(),
    url: url.trim(),
    icon: icon.trim(),
  };

  if (!trimmed.title || !trimmed.description || !trimmed.url || !trimmed.icon) {
    return { valid: false, error: 'すべての項目を入力してください' };
  }

  if (trimmed.title.length > MAX_TITLE_LENGTH) {
    return { valid: false, error: `タイトルは${MAX_TITLE_LENGTH}文字以内で入力してください` };
  }

  if (trimmed.description.length > MAX_DESCRIPTION_LENGTH) {
    return { valid: false, error: `説明は${MAX_DESCRIPTION_LENGTH}文字以内で入力してください` };
  }

  if (trimmed.url.length > MAX_URL_LENGTH) {
    return { valid: false, error: `URLは${MAX_URL_LENGTH}文字以内で入力してください` };
  }

  if (!AVAILABLE_ICONS.includes(trimmed.icon)) {
    return { valid: false, error: `無効なアイコン: ${trimmed.icon}` };
  }

  return { valid: true, data: trimmed };
}
