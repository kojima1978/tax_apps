import type React from 'react';
import type { DocumentItem, CustomDocumentItem } from '../constants/documents';

/** カスタム書類かどうかを判定 */
export function isCustomDocument(doc: DocumentItem | CustomDocumentItem): doc is CustomDocumentItem {
  return 'isCustom' in doc && doc.isCustom === true;
}

/** 日付を日本語形式でフォーマット（YYYY/MM/DD） */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/** 数値を丸囲み数字に変換（①②③...⑳、21以上は(21)形式） */
const CIRCLED_NUMBERS = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
export function toCircledNumber(n: number): string {
  if (n >= 1 && n <= 20) return CIRCLED_NUMBERS[n - 1];
  return `(${n})`;
}

/** カテゴリカラー → 左ボーダーアクセントのマッピング */
export const COLOR_ACCENT_MAP: Record<string, string> = {
  'text-blue-700': 'border-l-blue-400',
  'text-emerald-700': 'border-l-emerald-400',
  'text-amber-700': 'border-l-amber-400',
  'text-green-700': 'border-l-green-400',
  'text-purple-700': 'border-l-purple-400',
  'text-rose-700': 'border-l-rose-400',
  'text-red-700': 'border-l-red-400',
  'text-indigo-700': 'border-l-indigo-400',
  'text-slate-700': 'border-l-slate-400',
  'text-pink-700': 'border-l-pink-400',
  'text-gray-700': 'border-l-gray-400',
};

/** 期限日を日本語形式でフォーマット（YYYY年M月D日） */
export function formatDeadline(deadline: string): string {
  return new Date(deadline).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// --- Record 操作ユーティリティ ---

/** Record から指定キーを削除して新しいオブジェクトを返す */
export function deleteKeys<T>(record: Record<string, T>, keys: string[]): Record<string, T> {
  const result = { ...record };
  keys.forEach(key => delete result[key]);
  return result;
}

/** boolean Record の指定キーをトグルする汎用 setState ハンドラを生成 */
export function createBooleanToggle(
  setter: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
  onChange?: () => void,
) {
  return (key: string) => {
    setter((prev) => {
      const newState = { ...prev };
      if (prev[key]) { delete newState[key]; } else { newState[key] = true; }
      return newState;
    });
    onChange?.();
  };
}

/** 一意IDを生成 */
export function generateId(): string {
  return `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/** 現在時刻を HH:MM 形式で返す */
export function formatTimeNow(): string {
  return new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

/** 今日の日付を YYYY-MM-DD 形式で返す */
export function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/** DnD PointerSensor の activationConstraint 距離 */
export const DND_ACTIVATION_DISTANCE = { distance: 8 } as const;

/** DnD PointerSensor の activationConstraint 距離（具体名など細かい要素用） */
export const DND_ACTIVATION_DISTANCE_SMALL = { distance: 3 } as const;
