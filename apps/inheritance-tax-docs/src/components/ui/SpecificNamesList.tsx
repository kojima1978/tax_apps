import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Check, X, Pencil, Trash2, GripVertical } from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DND_ACTIVATION_DISTANCE_SMALL } from '../../utils/helpers';

export interface SpecificNamesTableRowsProps {
  docId: string;
  categoryId: string;
  docNumber: string;
  names: string[];
  colorAccent: string;
  isVisible: boolean;
  hideSubmittedInPrint: boolean;
  isChecked: boolean;
  onAdd: (docId: string, name: string) => void;
  onEdit: (docId: string, index: number, name: string) => void;
  onRemove: (docId: string, index: number) => void;
  onReorder: (docId: string, newNames: string[]) => void;
}

// カテゴリ別プレースホルダーヒント
const PLACEHOLDER_MAP: Record<string, string> = {
  identity: '例: 運転免許証、マイナンバーカード',
  family: '例: 被相続人の戸籍謄本',
  real_estate: '例: ○○市△△町1-2-3の土地',
  cash: '例: ○○銀行△△支店 普通預金',
  securities: '例: ○○証券 株式口座',
  insurance: '例: ○○生命 終身保険',
  debt: '例: 住宅ローン ○○銀行',
  unlisted: '例: ○○株式会社',
  other_assets: '例: 自動車、貴金属',
  gift: '例: 2024年贈与分',
  other: '例: 具体的な書類名を入力',
};

const MODE_STYLES = {
  add:  { bg: 'bg-emerald-50/40', input: 'border-emerald-300 focus:ring-emerald-400' },
  edit: { bg: 'bg-amber-50/40',   input: 'border-amber-300 focus:ring-amber-400' },
} as const;

/** 具体名の入力行（追加・編集共通） */
function NameInputRow({
  value, onChange, onKeyDown, onSubmit, onCancel, placeholder, colorAccent, label, inputRef, autoFocus, mode,
}: {
  value: string; onChange: (v: string) => void; onKeyDown: (e: React.KeyboardEvent) => void;
  onSubmit: () => void; onCancel: () => void;
  placeholder: string; colorAccent: string; label?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>; autoFocus?: boolean;
  mode: 'add' | 'edit';
}) {
  const rowRef = useRef<HTMLTableRowElement>(null);
  const { bg, input: inputBorder } = MODE_STYLES[mode];

  const handleBlur = (e: React.FocusEvent) => {
    // ボタンクリック時はblurを無視（relatedTargetが同じ行内なら処理しない）
    if (rowRef.current?.contains(e.relatedTarget as Node)) return;
    onSubmit();
  };

  return (
    <tr ref={rowRef} className={`border-b border-slate-100 border-l-3 ${colorAccent} ${bg}`}>
      <td className="w-10 px-1 py-1" />
      <td colSpan={3} className="px-3 py-1">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1">
            {label && <span className="text-slate-400 font-mono text-xs flex-shrink-0">{label}</span>}
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={onKeyDown}
              onBlur={handleBlur}
              placeholder={placeholder}
              autoFocus={autoFocus}
              className={`flex-1 px-2 py-0.5 border rounded text-xs focus:outline-none focus:ring-1 ${inputBorder}`}
            />
            <button onClick={onSubmit} className="p-0.5 px-1 flex items-center gap-0.5 rounded bg-emerald-500 text-white hover:bg-emerald-600 transition-colors" title="保存 (Enter)" aria-label="保存">
              <Check className="w-3 h-3" />
            </button>
            <button onClick={onCancel} className="p-0.5 px-1 flex items-center gap-0.5 rounded text-slate-500 hover:bg-red-50 hover:text-red-500 transition-colors" title="キャンセル (Esc)" aria-label="キャンセル">
              <X className="w-3 h-3" />
            </button>
          </div>
          <span className="text-xs text-slate-400 ml-auto">Enter: 保存 / Esc: キャンセル</span>
        </div>
      </td>
      <td className="w-16 px-2 py-1" />
      <td className="px-1 py-1 print:hidden hidden md:table-cell" />
    </tr>
  );
}

/** ソート可能なテーブルサブ行 */
function SortableNameRow({
  name, index, parentNumber, colorAccent, onStartEdit, onRemove,
}: {
  name: string; index: number; parentNumber: string; colorAccent: string;
  onStartEdit: (index: number) => void;
  onRemove: (index: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `sn-${index}` });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`bg-emerald-50/30 border-b border-slate-100 border-l-3 ${colorAccent} ${isDragging ? 'opacity-50 shadow-sm z-10' : ''}`}
    >
      {/* 列1: ドラッグハンドル + 番号 */}
      <td className="w-10 px-1 py-1 text-center align-middle print:py-0.5">
        <div className="flex items-center justify-center gap-0 print:hidden">
          <button
            {...attributes}
            {...listeners}
            className="p-0 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing touch-none"
            title="ドラッグして並べ替え"
          >
            <GripVertical className="w-3 h-3" />
          </button>
        </div>
      </td>
      {/* 列2: 具体名（3列をまたいで表示） */}
      <td colSpan={3} className="px-3 py-1 align-middle print:px-2 print:py-0.5">
        <div className="flex items-center gap-1">
          <span className="text-slate-400 font-mono text-xs flex-shrink-0 print:font-bold">{parentNumber}-{index + 1}</span>
          <span
            className="flex-1 text-xs text-slate-600 cursor-pointer hover:text-emerald-600 hover:underline transition-colors print:cursor-default print:hover:text-slate-600 print:no-underline print:text-sm"
            onClick={() => onStartEdit(index)}
            title="クリックで編集"
          >
            {name}
          </span>
          <span className="print:hidden flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={() => onStartEdit(index)}
              className="p-0.5 text-slate-400 hover:text-emerald-500 transition-colors"
              title="編集"
              aria-label="編集"
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              onClick={() => onRemove(index)}
              className="p-0.5 text-slate-400 hover:text-red-500 transition-colors"
              title="削除"
              aria-label="削除"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </span>
        </div>
      </td>
      {/* 列5: 代行（空） */}
      <td className="w-16 px-2 py-1 print:px-2 print:py-0.5" />
      {/* 列6: 操作（空） */}
      <td className="px-1 py-1 print:hidden hidden md:table-cell" />
    </tr>
  );
}

function SpecificNamesTableRowsComponent({
  docId, categoryId, docNumber, names, colorAccent, isVisible, hideSubmittedInPrint, isChecked,
  onAdd, onEdit, onRemove, onReorder,
}: SpecificNamesTableRowsProps) {
  const [addingName, setAddingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const addInputRef = useRef<HTMLInputElement>(null);

  const placeholder = PLACEHOLDER_MAP[categoryId] ?? PLACEHOLDER_MAP.other;

  useEffect(() => {
    if (addingName && addInputRef.current) addInputRef.current.focus();
  }, [addingName]);

  const closeAdd = () => { setNewName(''); setAddingName(false); };
  const cancelEdit = () => { setEditingIndex(null); setEditingValue(''); };

  const submitAdd = () => {
    const trimmed = newName.trim();
    if (trimmed) {
      onAdd(docId, trimmed);
    }
    closeAdd();
  };

  const submitEdit = () => {
    if (editingIndex !== null && editingValue.trim()) {
      onEdit(docId, editingIndex, editingValue.trim());
    }
    cancelEdit();
  };

  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); submitAdd(); }
    else if (e.key === 'Escape') closeAdd();
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); submitEdit(); }
    else if (e.key === 'Escape') cancelEdit();
  };

  const startEdit = useCallback((index: number) => {
    setEditingIndex(index);
    setEditingValue(names[index]);
  }, [names]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: DND_ACTIVATION_DISTANCE_SMALL }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = Number(String(active.id).replace('sn-', ''));
    const newIndex = Number(String(over.id).replace('sn-', ''));
    const reordered = arrayMove(names, oldIndex, newIndex);
    onReorder(docId, reordered);
  }, [docId, names, onReorder]);

  const itemIds = names.map((_, i) => `sn-${i}`);

  // フィルターで親が非表示 or 名前がない＋追加中でもない場合は非表示
  const hiddenClass = !isVisible ? 'hidden print:table-row' : '';
  const printHiddenClass = isChecked && hideSubmittedInPrint ? 'print:hidden' : '';

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} accessibility={{ container: document.body }}>
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        {names.map((name, i) => (
          editingIndex === i ? (
            <NameInputRow
              key={i}
              value={editingValue}
              onChange={setEditingValue}
              onKeyDown={handleEditKeyDown}
              onSubmit={submitEdit}
              onCancel={cancelEdit}
              placeholder={placeholder}
              colorAccent={`${colorAccent} ${hiddenClass} ${printHiddenClass}`}
              label={`${docNumber}-${i + 1}`}
              autoFocus
              mode="edit"
            />
          ) : (
            <SortableNameRow
              key={i}
              name={name}
              index={i}
              parentNumber={docNumber}
              colorAccent={`${colorAccent} ${hiddenClass} ${printHiddenClass}`}
              onStartEdit={startEdit}
              onRemove={(idx) => onRemove(docId, idx)}
            />
          )
        ))}
      </SortableContext>

      {/* 具体名追加行 */}
      {addingName ? (
        <NameInputRow
          value={newName}
          onChange={setNewName}
          onKeyDown={handleAddKeyDown}
          onSubmit={submitAdd}
          onCancel={closeAdd}
          placeholder={placeholder}
          colorAccent={`${colorAccent} print:hidden`}
          mode="add"
          inputRef={addInputRef}
        />
      ) : (
        <tr className={`border-b border-slate-100 border-l-3 ${colorAccent} print:hidden ${hiddenClass}`}>
          <td className="w-10 px-1 py-0.5" />
          <td colSpan={3} className="px-3 py-0.5">
            <button
              onClick={() => setAddingName(true)}
              className="flex items-center gap-0.5 text-xs text-emerald-500 hover:text-emerald-700 transition-colors"
            >
              <Plus className="w-3 h-3" />
              具体名追加
            </button>
          </td>
          <td className="w-16 px-2 py-0.5" />
          <td className="px-1 py-0.5 print:hidden hidden md:table-cell" />
        </tr>
      )}
    </DndContext>
  );
}

export const SpecificNamesTableRows = memo(SpecificNamesTableRowsComponent);
