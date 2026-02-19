import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2, Check } from 'lucide-react';
import type { DocumentItem, CustomDocumentItem, DocChanges } from '../../constants/documents';
import { SpecificNamesList } from './SpecificNamesList';

const CheckboxIcon = ({ checked }: { checked: boolean }) => (
  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
    checked
      ? 'bg-emerald-500 border-emerald-500 text-white'
      : 'border-slate-300'
  }`}>
    {checked && <Check className="w-3.5 h-3.5" />}
  </div>
);

export interface EditableDocumentRowProps {
  doc: DocumentItem | CustomDocumentItem;
  categoryId: string;
  isCustom: boolean;
  editedValues?: DocChanges;
  canDelegate: boolean;
  specificNames: string[];
  rowIndex: number;
  onStartEdit: (docId: string) => void;
  onToggleCanDelegate: () => void;
  onAddSpecificName: (docId: string, name: string) => void;
  onEditSpecificName: (docId: string, index: number, name: string) => void;
  onRemoveSpecificName: (docId: string, index: number) => void;
  docNumber: string;
  isChecked: boolean;
  onToggleCheck: (docId: string) => void;
  onRemoveDocument: (docId: string, categoryId: string, name: string) => void;
  hideSubmittedInPrint: boolean;
}

interface RowContentProps extends EditableDocumentRowProps {
  containerRef?: (node: HTMLElement | null) => void;
  containerStyle?: React.CSSProperties;
  isDragging?: boolean;
  dragHandleProps?: Record<string, unknown>;
}

const RowContent = memo(function RowContent({
  doc,
  categoryId,
  isCustom,
  editedValues,
  canDelegate,
  specificNames,
  rowIndex,
  onStartEdit,
  onToggleCanDelegate,
  onAddSpecificName,
  onEditSpecificName,
  onRemoveSpecificName,
  docNumber,
  isChecked,
  onToggleCheck,
  onRemoveDocument,
  hideSubmittedInPrint,
  containerRef,
  containerStyle,
  isDragging = false,
  dragHandleProps,
}: RowContentProps) {
  const displayName = editedValues?.name ?? doc.name;
  const displayDescription = editedValues?.description ?? doc.description;
  const displayHowToGet = editedValues?.howToGet ?? doc.howToGet;
  const rowBg = isCustom ? 'bg-emerald-50/30' : rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/50';
  const checkedClass = isChecked ? 'line-through text-slate-400 print:line-through' : '';

  return (
    <tr
      ref={containerRef}
      style={containerStyle}
      className={`${rowBg} ${isChecked && hideSubmittedInPrint ? 'print:hidden' : ''} ${isDragging ? 'shadow-lg z-10 opacity-70' : ''} border-b border-slate-100 last:border-b-0`}
    >
      {/* 列1: DnDハンドル + チェックボックス / 印刷チェック */}
      <td className="w-10 px-1 py-2 text-center align-top print:py-0.5">
        <div className="flex flex-col items-center gap-0.5 print:hidden">
          {dragHandleProps ? (
            <button
              {...(dragHandleProps as React.HTMLAttributes<HTMLButtonElement>)}
              className="p-0.5 text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing touch-none"
              title="ドラッグして並べ替え"
            >
              <GripVertical className="w-4 h-4" />
            </button>
          ) : (
            <span className="inline-block p-0.5 text-slate-300">
              <GripVertical className="w-4 h-4" />
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleCheck(doc.id); }}
            className="p-0.5 transition-colors"
            role="checkbox"
            aria-checked={isChecked}
            title={isChecked ? '未提出に戻す' : '提出済みにする'}
          >
            <CheckboxIcon checked={isChecked} />
          </button>
        </div>
        {isChecked
          ? <span className="hidden print:inline-block text-slate-400 print:text-xs">☑</span>
          : <span className="hidden print:inline-block w-4 h-4 border-2 border-slate-400 rounded-sm print:w-3 print:h-3 print:border" />
        }
      </td>

      {/* 列2: 書類名 + バッジ + 具体名 */}
      <td className="px-3 py-2 align-top print:px-1 print:py-0.5">
        <div className="flex items-center flex-wrap gap-1 print:flex-nowrap print:gap-0.5 print:leading-tight">
          <span className="text-xs text-slate-400 font-mono mr-0.5 print:text-[11px] print:mr-0">{docNumber}</span>
          <span className={`font-medium doc-name print:text-[10px] ${isChecked ? checkedClass : 'text-slate-800'}`}>
            {displayName}
          </span>
          {isCustom && (
            <span className="px-1.5 py-0.5 text-xs bg-emerald-100 text-emerald-700 rounded print:border print:border-emerald-700 print:px-1 print:py-0 print:text-[8px]">
              追加
            </span>
          )}
          {editedValues && (
            <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded print:hidden">
              編集済
            </span>
          )}
        </div>
        {/* モバイル: description + howToGet inline */}
        <p className="text-xs text-slate-500 mt-1 md:hidden print:hidden doc-desc">{displayDescription}</p>
        {displayHowToGet && (
          <p className="text-xs text-slate-400 mt-0.5 lg:hidden print:hidden doc-how">{displayHowToGet}</p>
        )}
        {/* 具体的書類名 */}
        <SpecificNamesList
          docId={doc.id}
          names={specificNames}
          onAdd={onAddSpecificName}
          onEdit={onEditSpecificName}
          onRemove={onRemoveSpecificName}
        />
      </td>

      {/* 列3: 内容説明 */}
      <td className={`px-3 py-2 text-sm text-slate-600 hidden md:table-cell print:table-cell align-top print:px-1 print:py-0.5 print:text-[10px] doc-desc ${checkedClass}`}>
        {displayDescription}
      </td>

      {/* 列4: 取得方法 */}
      <td className={`px-3 py-2 text-xs text-slate-500 hidden lg:table-cell print:table-cell align-top print:px-1 print:py-0.5 print:text-[9px] doc-how ${checkedClass}`}>
        {displayHowToGet || '-'}
      </td>

      {/* 列5: 代行 */}
      <td className="w-16 px-2 py-2 text-center align-top print:px-1 print:py-0.5">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleCanDelegate(); }}
          className={`px-1.5 py-0.5 text-xs rounded transition-colors cursor-pointer print:hidden ${
            canDelegate
              ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
              : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
          }`}
          title={canDelegate ? '代行可をオフ' : '代行可をオン'}
        >
          {canDelegate ? '可' : '−'}
        </button>
        {canDelegate && (
          <span className="hidden print:inline-block px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded print:border print:border-amber-700 print:px-1 print:py-0 print:text-[8px]">
            可
          </span>
        )}
      </td>

      {/* 列6: 操作 */}
      <td className="w-20 px-1 py-2 text-center align-top print:hidden">
        <div className="flex items-center justify-center gap-0.5">
          {!isChecked && (
            <button
              onClick={() => onStartEdit(doc.id)}
              className="p-1.5 rounded text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
              title="編集"
              aria-label="編集"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onRemoveDocument(doc.id, categoryId, displayName)}
            className="p-1.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="削除"
            aria-label="削除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
});

/** ソート可能なテーブル行（DndContext内で使用） */
export function SortableDocumentRow(props: EditableDocumentRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.doc.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <RowContent
      {...props}
      containerRef={setNodeRef}
      containerStyle={style}
      isDragging={isDragging}
      dragHandleProps={{ ...attributes, ...listeners }}
    />
  );
}

/** 静的テーブル行（SSR用） */
export function StaticDocumentRow(props: EditableDocumentRowProps) {
  return <RowContent {...props} />;
}
