import { memo, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Check,
  CornerDownRight,
  GripVertical,
  Info,
  Pencil,
  Plus,
  Trash2,
  UserCheck,
  AlertTriangle,
  EyeOff,
  ChevronDown,
  ChevronRight,
  X,
} from 'lucide-react';
import type { EditableDocument } from '@/constants';
import type { DocHandlers, SubItemEditState, SubItemHandlers } from '@/hooks/useDocumentEditing';
import { InlineEditInput, InlineAddInput } from './EditableInput';
import { formatCheckedDate } from '@/utils/helpers';

// ─── 番号バッジ共通スタイル ───

const docNumberClass = 'flex-shrink-0 mr-2 mt-0.5 text-sm font-semibold text-slate-500 dark:text-slate-400 min-w-[2rem] text-right';
const subItemNumberClass = 'flex-shrink-0 mr-2 text-xs font-medium text-slate-400 dark:text-slate-500 min-w-[2.5rem] text-right';

const CheckboxIcon = ({ checked }: { checked: boolean }) => (
  <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
    checked
      ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/30'
      : 'border-slate-300 dark:border-slate-600 hover:border-emerald-400'
  }`}>
    {checked && <Check className="w-4 h-4 animate-check-in" />}
  </div>
);

// ─── バッジコンポーネント ───

const Badge = ({ label, colorClass }: { label: string; colorClass: string }) => (
  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold leading-none ${colorClass}`}>
    {label}
  </span>
);

// ─── Props ───

type SortableDocumentItemProps = {
  doc: EditableDocument;
  categoryId: string;
  docNumber: string;
  docHandlers: DocHandlers;
  subItemEditState: SubItemEditState;
  subItemHandlers: SubItemHandlers;
};

// ─── ドラッグ可能な書類アイテム ───

export const SortableDocumentItem = memo(({
  doc,
  categoryId,
  docNumber,
  docHandlers,
  subItemEditState,
  subItemHandlers,
}: SortableDocumentItemProps) => {
  const { editingSubItem, editSubItemText, setEditSubItemText, addingSubItemTo, newSubItemText, setNewSubItemText } = subItemEditState;
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: doc.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hasDetail = doc.description || doc.howToGet;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? 'opacity-50' : ''}`}
    >
      {/* メインカード */}
      <div
        className={`flex items-start p-3 rounded-lg border transition-all ${
          doc.excluded
            ? 'bg-slate-50/30 dark:bg-slate-800/20 border-slate-200 dark:border-slate-700 opacity-50'
            : doc.checked
            ? 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-sm'
        } ${isDragging ? 'shadow-lg ring-2 ring-emerald-400' : ''}`}
      >
        {/* ドラッグハンドル */}
        <button
          {...attributes}
          {...listeners}
          className="flex-shrink-0 p-2 mr-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-grab active:cursor-grabbing touch-none rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          title="ドラッグして並び替え"
          aria-label={`${doc.name}を並び替え`}
          aria-roledescription="ドラッグ可能な書類"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {/* チェックボックス */}
        <button
          onClick={() => docHandlers.toggleCheck(categoryId, doc.id)}
          className="flex-shrink-0 mr-2 mt-0.5 transition-colors"
          role="checkbox"
          aria-checked={doc.checked}
          aria-label={`${doc.name}を${doc.checked ? '未提出に戻す' : '提出済みにする'}`}
        >
          <CheckboxIcon checked={doc.checked} />
        </button>

        {/* 番号 */}
        <span className={docNumberClass}>{docNumber}.</span>

        {/* 書類内容 */}
        <div className="flex-grow min-w-0">
          {/* 書類名 */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-medium ${
              doc.checked
                ? 'text-slate-400 dark:text-slate-500 line-through'
                : doc.excluded
                ? 'text-slate-400 dark:text-slate-500'
                : 'text-slate-700 dark:text-slate-200'
            }`}>
              {doc.name}
            </span>
          </div>

          {/* バッジ行 */}
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {doc.canDelegate && (
              <Badge label="委任可" colorClass="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300" />
            )}
            {doc.urgent && (
              <Badge label="急" colorClass="bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300" />
            )}
            {doc.excluded && (
              <Badge label="対象外" colorClass="bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 line-through" />
            )}
            {doc.checkedDate && (
              <Badge label={`済 ${formatCheckedDate(doc.checkedDate)}`} colorClass="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300" />
            )}
          </div>

          {/* 説明・取得方法（折りたたみ） */}
          {hasDetail && (
            <div className="mt-1">
              <button
                onClick={() => setIsDetailOpen(!isDetailOpen)}
                className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                {isDetailOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                詳細
              </button>
              {isDetailOpen && (
                <div className="mt-1 space-y-1 pl-1">
                  {doc.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">{doc.description}</p>
                  )}
                  {doc.howToGet && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 flex items-start gap-1">
                      <Info className="w-3 h-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
                      {doc.howToGet}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* アクションボタン */}
        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          <button
            onClick={() => docHandlers.toggleCanDelegate(categoryId, doc.id)}
            className={`p-1.5 rounded transition-colors ${
              doc.canDelegate
                ? 'text-blue-600 bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 dark:hover:bg-blue-900'
                : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
            title="委任可を切り替え"
            aria-label={`${doc.name}の委任可を${doc.canDelegate ? '解除' : '設定'}`}
          >
            <UserCheck className="w-4 h-4" />
          </button>
          <button
            onClick={() => docHandlers.toggleUrgent(categoryId, doc.id)}
            className={`p-1.5 rounded transition-colors ${
              doc.urgent
                ? 'text-red-600 bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-900'
                : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
            title="急を切り替え"
            aria-label={`${doc.name}の急を${doc.urgent ? '解除' : '設定'}`}
          >
            <AlertTriangle className="w-4 h-4" />
          </button>
          <button
            onClick={() => docHandlers.toggleExcluded(categoryId, doc.id)}
            className={`p-1.5 rounded transition-colors ${
              doc.excluded
                ? 'text-slate-600 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500'
                : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
            title="対象外を切り替え"
            aria-label={`${doc.name}の対象外を${doc.excluded ? '解除' : '設定'}`}
          >
            <EyeOff className="w-4 h-4" />
          </button>
          <button
            onClick={() => docHandlers.startEdit(categoryId, doc.id)}
            className="p-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
            title="書類を編集"
            aria-label={`${doc.name}を編集`}
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => subItemHandlers.startAdd(categoryId, doc.id)}
            className="p-1.5 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded transition-colors"
            title="個別名を追加"
            aria-label={`${doc.name}に個別名を追加`}
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => docHandlers.remove(categoryId, doc.id)}
            className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded transition-colors"
            title="書類を削除"
            aria-label={`${doc.name}を削除`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 個別名リスト */}
      {doc.specificNames.length > 0 && (
        <ul className="ml-9 mt-1 space-y-1">
          {doc.specificNames.map((sn, snIdx) => (
            <li
              key={sn.id}
              className="flex items-center p-2 pl-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border-l-2 border-emerald-300 dark:border-emerald-700 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors"
            >
              <span className={subItemNumberClass}>{docNumber}-{snIdx + 1}</span>
              <CornerDownRight className="w-3 h-3 text-slate-400 dark:text-slate-500 mr-2 flex-shrink-0" aria-hidden="true" />
              {editingSubItem?.nameId === sn.id ? (
                <div className="flex-grow">
                  <InlineEditInput
                    value={editSubItemText}
                    onChange={setEditSubItemText}
                    onConfirm={subItemHandlers.confirmEdit}
                    onCancel={subItemHandlers.cancelEdit}
                    ariaLabel="個別名を編集"
                    inputClass="flex-grow px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 dark:bg-slate-800 dark:text-slate-200"
                    color="blue"
                    iconSize="w-4 h-4"
                  />
                </div>
              ) : (
                <>
                  <span className="text-sm flex-grow text-slate-600 dark:text-slate-300">{sn.text}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => subItemHandlers.startEdit(categoryId, doc.id, sn.id, sn.text)}
                      className="p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                      title="個別名を編集"
                      aria-label={`${sn.text}を編集`}
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => subItemHandlers.remove(categoryId, doc.id, sn.id)}
                      className="p-1 text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 rounded transition-colors"
                      title="個別名を削除"
                      aria-label={`${sn.text}を削除`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* 個別名追加フォーム */}
      {addingSubItemTo?.categoryId === categoryId && addingSubItemTo?.docId === doc.id && (
        <div className="ml-9 mt-1 flex items-center gap-2">
          <CornerDownRight className="w-3 h-3 text-slate-400 flex-shrink-0" aria-hidden="true" />
          <InlineAddInput
            value={newSubItemText}
            onChange={setNewSubItemText}
            onConfirm={() => subItemHandlers.confirmAdd(categoryId, doc.id)}
            onCancel={subItemHandlers.cancelAdd}
            placeholder="個別名を入力..."
            ariaLabel="新しい個別名を入力"
            inputClass="flex-grow px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 dark:bg-slate-800 dark:text-slate-200"
            color="blue"
            buttonSize="sm"
          />
        </div>
      )}
    </li>
  );
});
SortableDocumentItem.displayName = 'SortableDocumentItem';

// ─── ドラッグオーバーレイ ───

export const DragOverlayItem = ({ doc, docNumber }: { doc: EditableDocument; docNumber?: string }) => (
  <div
    className={`flex items-start p-3 rounded-lg border shadow-2xl ${
      doc.checked
        ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600'
        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
    }`}
  >
    <GripVertical className="w-4 h-4 text-slate-400 mr-2" aria-hidden="true" />
    <div className="mr-2">
      <CheckboxIcon checked={doc.checked} />
    </div>
    {docNumber && (
      <span className={docNumberClass}>{docNumber}.</span>
    )}
    <span className={doc.checked ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-200'}>{doc.name}</span>
  </div>
);
