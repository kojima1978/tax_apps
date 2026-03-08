import { memo, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2, Check, MessageSquare, Ban, Calendar, AlertTriangle } from 'lucide-react';
import type { DocumentItem, CustomDocumentItem, DocChanges } from '../../constants/documents';
import { COLOR_ACCENT_MAP } from '../../utils/helpers';

/** メモ状態管理フック */
function useMemoState(docId: string, docMemo: string, onSetMemo: (docId: string, memo: string) => void) {
  const [showInput, setShowInput] = useState(false);
  const [value, setValue] = useState(docMemo);

  const save = () => { onSetMemo(docId, value); setShowInput(false); };
  const open = () => { setValue(docMemo); setShowInput(true); };
  const toggle = () => { setValue(docMemo); setShowInput(!showInput); };
  const close = () => setShowInput(false);
  const onKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') close(); };

  return { showInput, value, setValue, save, open, toggle, close, onKeyDown };
}

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
  categoryColor?: string;
  isCustom: boolean;
  editedValues?: DocChanges;
  canDelegate: boolean;
  specificNames: string[];
  rowIndex: number;
  onStartEdit: (docId: string) => void;
  onToggleCanDelegate: () => void;
  docNumber: string;
  isChecked: boolean;
  checkedDate?: string;
  memo: string;
  isExcluded: boolean;
  isUrgent: boolean;
  onToggleCheck: (docId: string) => void;
  onSetMemo: (docId: string, memo: string) => void;
  onToggleExcluded: (docId: string) => void;
  onToggleUrgent: (docId: string) => void;
  onRemoveDocument: (docId: string, categoryId: string, name: string) => void;
  hideSubmittedInPrint: boolean;
  isVisible: boolean;
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
  categoryColor,
  isCustom,
  editedValues,
  canDelegate,
  specificNames,
  rowIndex,
  onStartEdit,
  onToggleCanDelegate,
  docNumber,
  isChecked,
  checkedDate,
  memo: docMemo,
  isExcluded,
  isUrgent,
  onToggleCheck,
  onSetMemo,
  onToggleExcluded,
  onToggleUrgent,
  onRemoveDocument,
  hideSubmittedInPrint,
  isVisible,
  containerRef,
  containerStyle,
  isDragging = false,
  dragHandleProps,
}: RowContentProps) {
  const memo = useMemoState(doc.id, docMemo, onSetMemo);

  const displayName = editedValues?.name ?? doc.name;
  const displayDescription = editedValues?.description ?? doc.description;
  const displayHowToGet = editedValues?.howToGet ?? doc.howToGet;

  const colorAccent = categoryColor ? (COLOR_ACCENT_MAP[categoryColor] ?? '') : '';

  // C3: 対象外のスタイル
  const excludedClass = isExcluded ? 'opacity-40' : '';
  const rowBg = isExcluded
    ? 'bg-slate-100/50'
    : isCustom
    ? 'bg-emerald-50/30'
    : rowIndex % 2 === 0
    ? 'bg-white'
    : 'bg-slate-50/50';
  const checkedClass = isChecked && !isExcluded ? 'line-through text-slate-400 print:line-through' : '';

  // フィルターで非表示の場合（print時は常に表示）
  const hiddenClass = !isVisible ? 'hidden print:table-row' : '';

  return (
    <tr
      ref={containerRef}
      style={containerStyle}
      className={`${rowBg} ${hiddenClass} ${isChecked && hideSubmittedInPrint ? 'print:hidden' : ''} ${isDragging ? 'shadow-lg z-10 opacity-70' : ''} border-b border-slate-100 last:border-b-0 border-l-3 ${isUrgent && !isExcluded ? 'border-l-red-500' : colorAccent} ${excludedClass}`}
    >
      {/* 列1: DnDハンドル + チェックボックス / 印刷チェック */}
      <td className="w-10 px-1 py-2 text-center align-top print:py-1">
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
          ? <span className="hidden print:inline-block text-slate-400 print:text-sm">&#9745;</span>
          : <span className="hidden print:inline-block w-4 h-4 border-2 border-slate-400 rounded-sm print:w-3 print:h-3 print:border" />
        }
      </td>

      {/* 列2: 書類名 + バッジ + 具体名 + メモ */}
      <td className="px-3 py-2 align-top print:px-2 print:py-1">
        <div className="flex items-center flex-wrap gap-1 print:flex-nowrap print:gap-0.5 print:leading-tight">
          <span className="text-xs text-slate-400 font-mono mr-0.5 print:text-sm print:font-bold print:text-slate-700 print:mr-1">{docNumber}.</span>
          <span className={`font-medium doc-name ${isChecked ? checkedClass : isExcluded ? 'text-slate-400' : 'text-slate-800'}`}>
            {displayName}
          </span>
          {/* バッジ群 */}
          {([
            { show: isUrgent && !isExcluded, text: '急', className: 'text-xs bg-red-100 text-red-700 font-bold rounded print:border print:border-red-700 print:px-1 print:py-0 print:text-xs' },
            { show: specificNames.length > 0 && !isExcluded, text: `具体名 ${specificNames.length}件`, className: 'text-[10px] bg-blue-100 text-blue-600 rounded-full font-medium print:hidden' },
            { show: isExcluded, text: '対象外', className: 'text-xs bg-slate-200 text-slate-500 rounded print:border print:border-slate-500 print:px-1 print:py-0' },
            { show: isCustom, text: '追加', className: 'text-xs bg-emerald-100 text-emerald-700 rounded print:border print:border-emerald-700 print:px-1 print:py-0 print:text-xs' },
            { show: !!editedValues, text: '編集済', className: 'text-xs bg-blue-100 text-blue-700 rounded print:hidden' },
          ] as const).filter(b => b.show).map(({ text, className }) => (
            <span key={text} className={`px-1.5 py-0.5 ${className}`}>{text}</span>
          ))}
          {isChecked && checkedDate && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-xs text-emerald-600 print:hidden" title={`提出日: ${checkedDate}`}>
              <Calendar className="w-3 h-3" />
              {checkedDate}
            </span>
          )}
        </div>
        {/* モバイル: description + howToGet inline */}
        {!isExcluded && (
          <>
            <p className="text-xs text-slate-500 mt-1 md:hidden print:hidden doc-desc">{displayDescription}</p>
            {displayHowToGet && (
              <p className="text-xs text-slate-400 mt-0.5 lg:hidden print:hidden doc-how">{displayHowToGet}</p>
            )}
          </>
        )}
        {/* C2: メモ表示 */}
        {docMemo && !memo.showInput && (
          <div
            className="mt-1 flex items-start gap-1 text-xs text-blue-600 cursor-pointer hover:text-blue-800 print:hidden"
            onClick={memo.open}
            title="メモを編集"
          >
            <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span className="break-all">{docMemo}</span>
          </div>
        )}
        {docMemo && (
          <div className="hidden print:block mt-0.5 text-xs text-blue-600">
            <span>memo: {docMemo}</span>
          </div>
        )}
        {/* C2: メモ入力 */}
        {memo.showInput && (
          <div className="mt-1.5 flex items-center gap-1 print:hidden">
            <input
              type="text"
              value={memo.value}
              onChange={(e) => memo.setValue(e.target.value)}
              onKeyDown={memo.onKeyDown}
              placeholder="メモを入力..."
              className="flex-1 px-2 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
            <button onClick={memo.save} className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">保存</button>
            <button onClick={memo.close} className="px-2 py-1 text-xs bg-slate-200 text-slate-600 rounded hover:bg-slate-300">取消</button>
          </div>
        )}
      </td>

      {/* 列3: 内容説明 */}
      <td className={`px-3 py-2 text-sm text-slate-600 hidden md:table-cell print:table-cell align-top print:px-2 print:py-1 doc-desc ${checkedClass} ${isExcluded ? 'text-slate-400' : ''}`}>
        {isExcluded ? '-' : displayDescription}
      </td>

      {/* 列4: 取得方法 */}
      <td className={`px-3 py-2 text-xs text-slate-500 hidden lg:table-cell print:table-cell align-top print:px-2 print:py-1 doc-how ${checkedClass} ${isExcluded ? 'text-slate-400' : ''}`}>
        {isExcluded ? '-' : (displayHowToGet || '-')}
      </td>

      {/* 列5: 代行 */}
      <td className="w-16 px-2 py-2 text-center align-top print:px-2 print:py-1">
        {!isExcluded && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleCanDelegate(); }}
              className={`px-1.5 py-0.5 text-xs rounded transition-colors cursor-pointer print:hidden ${
                canDelegate
                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
              }`}
              title={canDelegate ? '代行可をオフ' : '代行可をオン'}
            >
              {canDelegate ? '可' : '-'}
            </button>
            {canDelegate && (
              <span className="hidden print:inline-block px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded print:border print:border-amber-700 print:px-1 print:py-0 print:text-xs">
                可
              </span>
            )}
          </>
        )}
      </td>

      {/* 列6: 操作 */}
      <td className="w-20 px-1 py-2 text-center align-top print:hidden">
        <div className="flex items-center justify-center gap-0.5">
          {([
            { icon: MessageSquare, onClick: memo.toggle, label: 'メモ', title: docMemo ? 'メモを編集' : 'メモを追加', active: !!docMemo, activeClass: 'text-blue-500 hover:text-blue-700 hover:bg-blue-50', inactiveClass: 'text-slate-400 hover:text-blue-500 hover:bg-blue-50' },
            { icon: AlertTriangle, onClick: () => onToggleUrgent(doc.id), label: '緊急', title: isUrgent ? '緊急を解除' : '緊急に設定', active: isUrgent, activeClass: 'text-red-500 hover:text-red-700 hover:bg-red-50', inactiveClass: 'text-slate-400 hover:text-red-500 hover:bg-red-50' },
            { icon: Ban, onClick: () => onToggleExcluded(doc.id), label: '対象外', title: isExcluded ? '対象外を解除' : '対象外にする', active: isExcluded, activeClass: 'text-slate-600 hover:text-slate-800 hover:bg-slate-200', inactiveClass: 'text-slate-400 hover:text-slate-600 hover:bg-slate-100' },
            ...(!isChecked && !isExcluded ? [{ icon: Pencil, onClick: () => onStartEdit(doc.id), label: '編集', title: '編集', active: false, activeClass: '', inactiveClass: 'text-slate-400 hover:text-blue-500 hover:bg-blue-50' }] : []),
            { icon: Trash2, onClick: () => onRemoveDocument(doc.id, categoryId, displayName), label: '削除', title: '削除', active: false, activeClass: '', inactiveClass: 'text-slate-400 hover:text-red-500 hover:bg-red-50' },
          ] as const).map(({ icon: Icon, onClick, label, title, active, activeClass, inactiveClass }) => (
            <button key={label} onClick={onClick} className={`p-1.5 rounded transition-colors ${active ? activeClass : inactiveClass}`} title={title} aria-label={label}>
              <Icon className="w-4 h-4" />
            </button>
          ))}
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
