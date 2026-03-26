import { Plus, Trash2, Edit3, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type ActionButton = {
  key: string;
  onClick: () => void;
  Icon: LucideIcon;
  colorClass: string;
  title: string;
  ariaLabel: string;
};

export const getDocumentActions = (
  categoryId: string,
  docId: string,
  docText: string,
  handlers: {
    startAdd: (categoryId: string, docId: string) => void;
    startEdit: (categoryId: string, docId: string, currentText: string) => void;
    remove: (categoryId: string, docId: string) => void;
  },
): ActionButton[] => [
  { key: 'add', onClick: () => handlers.startAdd(categoryId, docId), Icon: Plus, colorClass: 'text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/50', title: '中項目を追加', ariaLabel: `${docText}に中項目を追加` },
  { key: 'edit', onClick: () => handlers.startEdit(categoryId, docId, docText), Icon: Edit3, colorClass: 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700', title: '編集', ariaLabel: `${docText}を編集` },
  { key: 'delete', onClick: () => handlers.remove(categoryId, docId), Icon: Trash2, colorClass: 'text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50', title: '削除', ariaLabel: `${docText}を削除` },
];

export const getSubItemActions = (
  categoryId: string,
  docId: string,
  subItemId: string,
  subItemText: string,
  handlers: {
    startEdit: (categoryId: string, docId: string, subItemId: string, text: string) => void;
    remove: (categoryId: string, docId: string, subItemId: string) => void;
  },
): ActionButton[] => [
  { key: 'edit', onClick: () => handlers.startEdit(categoryId, docId, subItemId, subItemText), Icon: Edit3, colorClass: 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700', title: '編集', ariaLabel: `${subItemText}を編集` },
  { key: 'delete', onClick: () => handlers.remove(categoryId, docId, subItemId), Icon: X, colorClass: 'text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50', title: '削除', ariaLabel: `${subItemText}を削除` },
];

export const getCategoryActions = (
  categoryId: string,
  categoryName: string,
  handlers: {
    startEdit: (id: string, name: string) => void;
    remove: (id: string) => void;
  },
): ActionButton[] => [
  { key: 'edit', onClick: () => handlers.startEdit(categoryId, categoryName), Icon: Edit3, colorClass: 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/10', title: 'カテゴリ名を編集', ariaLabel: `${categoryName}の名前を編集` },
  { key: 'delete', onClick: () => handlers.remove(categoryId), Icon: Trash2, colorClass: 'text-red-500 dark:text-red-400 hover:bg-red-100/50 dark:hover:bg-red-900/30', title: 'カテゴリを削除', ariaLabel: `${categoryName}を削除` },
];
