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
} from 'lucide-react';
import type { EditableCategory } from '@/constants';
import { getCategoryTheme } from '@/constants/categoryTheme';
import { getCategoryActions } from '@/constants/buttonConfigs';
import { toCircledNumber } from '@/utils/helpers';
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

// ─── カテゴリ名表示（カード・オーバーレイ共通） ───

const CategoryNameDisplay = ({ category, categoryNumber }: { category: EditableCategory; categoryNumber?: number }) => (
  <h3 className="font-bold text-slate-800 dark:text-slate-100">
    {category.isSpecial && <span className="text-purple-600 dark:text-purple-400">【特例】</span>}
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
  children: React.ReactNode;
};

export const SortableCategoryCard = ({
  category,
  categoryNumber,
  editState,
  handlers,
  children,
}: SortableCategoryCardProps) => {
  const { setNodeRef, style, isDragging, dragHandleProps } = useSortableCategory(category.id);
  const checkedCount = category.documents.filter((d) => d.checked).length;
  const allChecked = category.documents.length > 0 && checkedCount === category.documents.length;
  const someChecked = checkedCount > 0 && !allChecked;
  const theme = getCategoryTheme(category.isSpecial);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white dark:bg-slate-800 rounded-xl shadow-lg dark:shadow-slate-900/50 overflow-hidden transition-all hover:shadow-xl ${isDragging ? 'opacity-50 ring-2 ring-emerald-400' : ''}`}
      role="region"
      aria-label={`カテゴリ: ${category.name}`}
    >
      {/* カテゴリヘッダー */}
      <div
        className={`flex items-center justify-between p-4 transition-colors ${theme.header}`}
      >
        {/* ドラッグハンドル（タッチターゲット拡大） */}
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
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlers.toggleSpecial(category.id);
                }}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  category.isSpecial
                    ? 'bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-200 hover:bg-purple-300 dark:hover:bg-purple-700'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                }`}
                title="特例切り替え"
                aria-label={`${category.name}の特例を${category.isSpecial ? '解除' : '設定'}`}
                aria-pressed={category.isSpecial}
              >
                特例
              </button>
              {getCategoryActions(category.id, category.name, handlers).map(({ key, onClick, Icon, colorClass, title, ariaLabel }) => (
                <button
                  key={key}
                  onClick={(e) => { e.stopPropagation(); onClick(); }}
                  className={`p-1.5 ${colorClass} rounded transition-colors`}
                  title={title}
                  aria-label={ariaLabel}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
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
      {category.documents.length > 0 && (
        <div className="h-1 bg-slate-100 dark:bg-slate-700/50">
          <div
            className={`h-full animate-progress ${allChecked ? theme.progressDone : theme.progress}`}
            style={{ width: `${(checkedCount / category.documents.length) * 100}%` }}
          />
        </div>
      )}

      {/* カテゴリコンテンツ */}
      {category.isExpanded && children}
    </div>
  );
};

// ─── カテゴリドラッグオーバーレイ ───

export const CategoryDragOverlay = ({ category, categoryNumber }: { category: EditableCategory; categoryNumber?: number }) => {
  const theme = getCategoryTheme(category.isSpecial);
  return (
  <div
    className={`rounded-xl shadow-2xl overflow-hidden ${theme.overlay}`}
  >
    <div className="flex items-center gap-3 p-4">
      <GripVertical className="w-5 h-5 text-slate-400" aria-hidden="true" />
      <CategoryNameDisplay category={category} categoryNumber={categoryNumber} />
    </div>
  </div>
  );
};
