'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronDown,
  ChevronRight,
  Trash2,
  Edit3,
  Check,
  X,
  CheckSquare,
  Square,
  GripVertical,
} from 'lucide-react';
import type { EditableCategory } from '@/constants';
import { handleInlineKeyDown } from './EditableInput';
import { VerticalDivider } from './VerticalDivider';

// ─── カテゴリ編集状態の型 ───

type CategoryEditState = {
  editingId: string | null;
  editName: string;
  setEditName: (name: string) => void;
  confirm: () => void;
  cancel: () => void;
};

type CategoryHandlers = {
  toggleExpand: (id: string) => void;
  toggleSpecial: (id: string) => void;
  startEdit: (id: string, name: string) => void;
  remove: (id: string) => void;
  toggleAll: (id: string, checked: boolean) => void;
};

// ─── カテゴリ名 + カウンター表示（カード・オーバーレイ共通） ───

const CategoryNameDisplay = ({ category, checkedCount }: { category: EditableCategory; checkedCount: number }) => (
  <>
    <h3 className="font-bold text-slate-800">
      {category.isSpecial && <span className="text-purple-600">【特例】</span>}
      {category.name}
    </h3>
    <span className="px-2 py-0.5 bg-white rounded text-sm text-slate-600">
      {checkedCount}/{category.documents.length}
    </span>
  </>
);

// ─── カテゴリ用ソート可能フック ───

const useSortableCategory = (categoryId: string) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `category-${categoryId}` });

  return {
    setNodeRef,
    style: {
      transform: CSS.Transform.toString(transform),
      transition,
    } as React.CSSProperties,
    isDragging,
    dragHandleProps: { attributes, listeners },
  };
};

// ─── カテゴリカードコンポーネント（ドラッグ対応） ───

type SortableCategoryCardProps = {
  category: EditableCategory;
  editState: CategoryEditState;
  handlers: CategoryHandlers;
  children: React.ReactNode;
};

export const SortableCategoryCard = ({
  category,
  editState,
  handlers,
  children,
}: SortableCategoryCardProps) => {
  const { setNodeRef, style, isDragging, dragHandleProps } = useSortableCategory(category.id);
  const checkedCount = category.documents.filter((d) => d.checked).length;
  const allChecked = category.documents.length > 0 && checkedCount === category.documents.length;
  const someChecked = checkedCount > 0 && !allChecked;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-xl shadow-lg overflow-hidden ${isDragging ? 'opacity-50 ring-2 ring-emerald-400' : ''}`}
      role="region"
      aria-label={`カテゴリ: ${category.name}`}
    >
      {/* カテゴリヘッダー */}
      <div
        className={`flex items-center justify-between p-4 transition-colors ${
          category.isSpecial
            ? 'bg-purple-50 hover:bg-purple-100 border-l-4 border-purple-500'
            : 'bg-emerald-50 hover:bg-emerald-100 border-l-4 border-emerald-500'
        }`}
      >
        {/* ドラッグハンドル */}
        <button
          {...dragHandleProps.attributes}
          {...dragHandleProps.listeners}
          className="flex-shrink-0 p-1 mr-2 text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing touch-none"
          title="ドラッグして並び替え"
          aria-label={`${category.name}カテゴリを並び替え`}
          aria-roledescription="ドラッグ可能なカテゴリ"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-5 h-5" />
        </button>

        <div
          className="flex items-center gap-3 flex-grow cursor-pointer"
          onClick={() => handlers.toggleExpand(category.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handlers.toggleExpand(category.id);
            }
          }}
          role="button"
          tabIndex={0}
          aria-expanded={category.isExpanded}
          aria-label={`${category.name}を${category.isExpanded ? '折りたたむ' : '展開する'}`}
        >
          {category.isExpanded ? (
            <ChevronDown className="w-5 h-5 text-slate-500" aria-hidden="true" />
          ) : (
            <ChevronRight className="w-5 h-5 text-slate-500" aria-hidden="true" />
          )}
          {editState.editingId === category.id ? (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={editState.editName}
                onChange={(e) => editState.setEditName(e.target.value)}
                className="px-3 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                autoFocus
                aria-label="カテゴリ名を編集"
                onKeyDown={(e) => handleInlineKeyDown(e, editState.confirm, editState.cancel)}
              />
              <button
                onClick={editState.confirm}
                className="p-1 text-emerald-600 hover:bg-emerald-100 rounded"
                aria-label="編集を確定"
              >
                <Check className="w-5 h-5" />
              </button>
              <button
                onClick={editState.cancel}
                className="p-1 text-slate-400 hover:bg-slate-200 rounded"
                aria-label="編集をキャンセル"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <CategoryNameDisplay category={category} checkedCount={checkedCount} />
          )}
        </div>
        <div className="flex items-center gap-2">
          {editState.editingId !== category.id && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlers.toggleSpecial(category.id);
                }}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  category.isSpecial
                    ? 'bg-purple-200 text-purple-700 hover:bg-purple-300'
                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                }`}
                title="特例切り替え"
                aria-label={`${category.name}の特例を${category.isSpecial ? '解除' : '設定'}`}
                aria-pressed={category.isSpecial}
              >
                特例
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlers.startEdit(category.id, category.name);
                }}
                className="p-1.5 text-slate-500 hover:bg-white/50 rounded transition-colors"
                title="カテゴリ名を編集"
                aria-label={`${category.name}の名前を編集`}
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlers.remove(category.id);
                }}
                className="p-1.5 text-red-500 hover:bg-red-100/50 rounded transition-colors"
                title="カテゴリを削除"
                aria-label={`${category.name}を削除`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <VerticalDivider />
            </>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlers.toggleAll(category.id, !allChecked);
            }}
            className={`flex items-center px-3 py-1 rounded text-sm font-medium transition-colors ${
              allChecked
                ? 'bg-emerald-600 text-white'
                : someChecked
                ? 'bg-emerald-200 text-emerald-800'
                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
            }`}
            aria-label={allChecked ? `${category.name}の全済みを解除` : `${category.name}を全て提出済みにする`}
          >
            {allChecked
              ? <CheckSquare className="w-4 h-4 mr-1" aria-hidden="true" />
              : <Square className="w-4 h-4 mr-1" aria-hidden="true" />
            }
            全済み
          </button>
        </div>
      </div>

      {/* カテゴリコンテンツ */}
      {category.isExpanded && children}
    </div>
  );
};

// ─── カテゴリドラッグオーバーレイ ───

export const CategoryDragOverlay = ({ category }: { category: EditableCategory }) => {
  const checkedCount = category.documents.filter((d) => d.checked).length;
  return (
    <div
      className={`rounded-xl shadow-2xl overflow-hidden ${
        category.isSpecial
          ? 'bg-purple-50 border-l-4 border-purple-500'
          : 'bg-emerald-50 border-l-4 border-emerald-500'
      }`}
    >
      <div className="flex items-center gap-3 p-4">
        <GripVertical className="w-5 h-5 text-slate-400" aria-hidden="true" />
        <CategoryNameDisplay category={category} checkedCount={checkedCount} />
      </div>
    </div>
  );
};
