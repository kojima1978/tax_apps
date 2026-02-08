/**
 * API Input Validation
 * アプリケーションCRUD操作の入力バリデーション
 */

import { AVAILABLE_ICONS } from './icons';

export const MAX_TITLE_LENGTH = 100;
export const MAX_DESCRIPTION_LENGTH = 500;
export const MAX_URL_LENGTH = 2000;

type ApplicationData = { title: string; description: string; url: string; icon: string };
type ValidationResult =
  | { valid: true; data: ApplicationData }
  | { valid: false; error: string };

function validateLength(value: string, max: number, fieldName: string): string | null {
  return value.length > max ? `${fieldName}は${max}文字以内で入力してください` : null;
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

  const lengthError =
    validateLength(trimmed.title, MAX_TITLE_LENGTH, 'タイトル') ??
    validateLength(trimmed.description, MAX_DESCRIPTION_LENGTH, '説明') ??
    validateLength(trimmed.url, MAX_URL_LENGTH, 'URL');
  if (lengthError) {
    return { valid: false, error: lengthError };
  }

  if (!AVAILABLE_ICONS.includes(trimmed.icon)) {
    return { valid: false, error: `無効なアイコン: ${trimmed.icon}` };
  }

  return { valid: true, data: trimmed };
}
