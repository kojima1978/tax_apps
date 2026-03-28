import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronDown,
  ChevronRight,
  Check,
  X,
  CheckSquare,
  Square,
  GripVertical,
  Pencil,
  Trash2,
  Ban,
} from 'lucide-react';
import type { EditableCategory } from '@/constants';
import { toCircledNumber } from '@/utils/helpers';
import { handleInlineKeyDown } from './EditableInput';
import { VerticalDivider } from './VerticalDivider';

// ─── カテゴリ編集状態の型 ───

export type CategoryEditState = {
  editingId: string | null;
  editName: string;
  setEditName: (name: string) => void;
  confirm: () => void;
  cancel: () => void;
};

export type CategoryHandlers = {
  toggleExpand: (id: string) => void;
  toggleDisabled: (id: string) => void;
  startEdit: (id: string, name: string) => void;
  remove: (id: string) => void;
};

// ─── カテゴリ名表示（カード・オーバーレイ共通） ───

const CategoryNameDisplay = ({ category, categoryNumber }: { category: EditableCategory; categoryNumber?: number }) => (
  <h3 className={`font-bold ${category.isDisabled ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'}`}>
    {category.isDisabled && <span className="text-slate-400 dark:text-slate-500">【無効】</span>}
    {categoryNumber != null && (
      <span className="mr-1">{toCircledNumber(categoryNumber)}</span>
    )}
    {category.name}
  </h3>
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
  categoryNumber: number;
  editState: CategoryEditState;
  handlers: CategoryHandlers;
  toggleAll: (categoryId: string, checked: boolean) => void;
  children: React.ReactNode;
};

export const SortableCategoryCard = memo(({
  category,
  categoryNumber,
  editState,
  handlers,
  toggleAll,
  children,
}: SortableCategoryCardProps) => {
  const { setNodeRef, style, isDragging, dragHandleProps } = useSortableCategory(category.id);

  // 進捗計算（除外書類は分母から除く）
  const activeDocs = category.documents.filter((d) => !d.excluded);
  const checkedCount = activeDocs.filter((d) => d.checked).length;
  const totalCount = activeDocs.length;
  const allChecked = totalCount > 0 && checkedCount === totalCount;
  const someChecked = checkedCount > 0 && !allChecked;

  const headerBg = category.isDisabled
    ? 'bg-slate-100 dark:bg-slate-800/50'
    : 'bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/30';

  const progressBg = allChecked
    ? 'bg-emerald-500'
    : 'bg-emerald-400 dark:bg-emerald-600';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white dark:bg-slate-800 rounded-xl shadow-lg dark:shadow-slate-900/50 overflow-hidden transition-all hover:shadow-xl ${isDragging ? 'opacity-50 ring-2 ring-emerald-400' : ''} ${category.isDisabled ? 'opacity-60' : ''}`}
      role="region"
      aria-label={`カテゴリ: ${category.name}`}
    >
      {/* カテゴリヘッダー */}
      <div
        className={`flex items-center justify-between p-4 transition-colors ${headerBg}`}
      >
        {/* ドラッグハンドル */}
        <button
          {...dragHandleProps.attributes}
          {...dragHandleProps.listeners}
          className="flex-shrink-0 p-2 mr-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-grab active:cursor-grabbing touch-none rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
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
            <ChevronDown className="w-5 h-5 text-slate-500 dark:text-slate-400 transition-transform" aria-hidden="true" />
          ) : (
            <ChevronRight className="w-5 h-5 text-slate-500 dark:text-slate-400 transition-transform" aria-hidden="true" />
          )}
          {editState.editingId === category.id ? (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={editState.editName}
                onChange={(e) => editState.setEditName(e.target.value)}
                className="px-3 py-1 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold dark:bg-slate-800 dark:text-slate-200"
                autoFocus
                aria-label="カテゴリ名を編集"
                onKeyDown={(e) => handleInlineKeyDown(e, editState.confirm, editState.cancel)}
              />
              <button
                onClick={editState.confirm}
                className="p-1 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded"
                aria-label="編集を確定"
              >
                <Check className="w-5 h-5" />
              </button>
              <button
                onClick={editState.cancel}
                className="p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                aria-label="編集をキャンセル"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <CategoryNameDisplay category={category} categoryNumber={categoryNumber} />
          )}
        </div>
        <div className="flex items-center gap-2">
          {editState.editingId !== category.id && (
            <>
              {/* 無効切り替え */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlers.toggleDisabled(category.id);
                }}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  category.isDisabled
                    ? 'bg-slate-300 dark:bg-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-400 dark:hover:bg-slate-500'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                }`}
                title="無効切り替え"
                aria-label={`${category.name}を${category.isDisabled ? '有効' : '無効'}にする`}
                aria-pressed={category.isDisabled}
              >
                <Ban className="w-3.5 h-3.5" />
              </button>
              {/* 編集 */}
              <button
                onClick={(e) => { e.stopPropagation(); handlers.startEdit(category.id, category.name); }}
                className="p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                title="カテゴリ名を編集"
                aria-label={`${category.name}のカテゴリ名を編集`}
              >
                <Pencil className="w-4 h-4" />
              </button>
              {/* 削除 */}
              <button
                onClick={(e) => { e.stopPropagation(); handlers.remove(category.id); }}
                className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded transition-colors"
                title="カテゴリを削除"
                aria-label={`${category.name}カテゴリを削除`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <VerticalDivider />
            </>
          )}
          {/* 全チェック */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleAll(category.id, !allChecked);
            }}
            className={`flex items-center px-3 py-1 rounded text-sm font-medium transition-colors ${
              allChecked
                ? 'bg-emerald-600 text-white'
                : someChecked
                ? 'bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
            }`}
            aria-label={allChecked ? `${category.name}の全済みを解除` : `${category.name}を全て提出済みにする`}
          >
            {allChecked
              ? <CheckSquare className="w-4 h-4" aria-hidden="true" />
              : <Square className="w-4 h-4" aria-hidden="true" />
            }
          </button>
        </div>
      </div>

      {/* 進捗バー */}
      {totalCount > 0 && (
        <div className="h-1 bg-slate-100 dark:bg-slate-700/50">
          <div
            className={`h-full transition-all ${progressBg}`}
            style={{ width: `${(checkedCount / totalCount) * 100}%` }}
          />
        </div>
      )}

      {/* カテゴリコンテンツ */}
      {category.isExpanded && children}
    </div>
  );
});
SortableCategoryCard.displayName = 'SortableCategoryCard';

// ─── カテゴリドラッグオーバーレイ ───

export const CategoryDragOverlay = ({ category, categoryNumber }: { category: EditableCategory; categoryNumber?: number }) => (
  <div className="rounded-xl shadow-2xl overflow-hidden bg-white/95 dark:bg-slate-800/95 border border-emerald-300 dark:border-emerald-700">
    <div className="flex items-center gap-3 p-4">
      <GripVertical className="w-5 h-5 text-slate-400" aria-hidden="true" />
      <CategoryNameDisplay category={category} categoryNumber={categoryNumber} />
    </div>
  </div>
);
