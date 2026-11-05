import { memo, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Link } from 'react-router-dom';
import {
  Check,
  CornerDownRight,
  GripVertical,
  Info,
  Pencil,
  Plus,
  Trash2,
  Stamp,
  ChevronDown,
  ChevronRight,
  X,
  BookOpenCheck,
} from 'lucide-react';
import type { EditableDocument } from '@/constants';
import { isPowerOfAttorneyDocument } from '@/constants/documents';
import type { DocHandlers, SubItemEditState, SubItemHandlers } from '@/hooks/useDocumentEditing';
import { InlineEditInput, InlineAddInput } from './EditableInput';
import { formatCheckedDate } from '@/utils/helpers';
import { acquisitionGuideIdForDocument, type AcquisitionGuideId } from '@/constants/acquisitionGuides';

// ─── 番号バッジ共通スタイル ───

const docNumberClass = 'flex-shrink-0 mr-2 mt-0.5 text-sm font-semibold text-slate-500 dark:text-slate-400 min-w-[2rem] text-right';
const subItemNumberClass = 'flex-shrink-0 mr-2 text-xs font-medium text-slate-500 dark:text-slate-400 min-w-[2.5rem] text-right';

// モバイルでは44x44pxのタップ領域を確保し、PCでは既存の密度を維持する
const touchTargetClass = 'min-w-11 min-h-11 flex items-center justify-center sm:min-w-6 sm:min-h-6';

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

// ─── 状態の切り替え（文字付き。押されている間は色が付く） ───

type DocToggle = {
  flag: 'canDelegate' | 'urgent' | 'excluded';
  label: string;
  handler: 'toggleCanDelegate' | 'toggleUrgent' | 'toggleExcluded';
  title: string;
  onClass: string;
};

const DOC_TOGGLES: DocToggle[] = [
  { flag: 'canDelegate', label: '委任可', handler: 'toggleCanDelegate', title: '当事務所が代わりに取れる書類にする', onClass: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-900' },
  { flag: 'urgent', label: '急', handler: 'toggleUrgent', title: '急ぎの書類にする', onClass: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 hover:bg-red-200 dark:hover:bg-red-900' },
  { flag: 'excluded', label: '対象外', handler: 'toggleExcluded', title: 'この案件では要らない書類にする（印刷・Excel に載らない）', onClass: 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-100 border-slate-300 dark:border-slate-500 hover:bg-slate-300 dark:hover:bg-slate-500' },
];

// 押されていない間は文字だけ（56行に枠が並ぶとうるさいので、枠はマウスを乗せたときだけ）
const toggleOffClass = 'border-transparent text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700';

// ─── Props ───

type SortableDocumentItemProps = {
  doc: EditableDocument;
  categoryId: string;
  docNumber: string;
  docHandlers: DocHandlers;
  subItemEditState: SubItemEditState;
  subItemHandlers: SubItemHandlers;
  onOpenAcquisitionGuide?: (guideId: AcquisitionGuideId) => void;
};

// ─── ドラッグ可能な書類アイテム ───

export const SortableDocumentItem = memo(({
  doc,
  categoryId,
  docNumber,
  docHandlers,
  subItemEditState,
  subItemHandlers,
  onOpenAcquisitionGuide,
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
  const acquisitionGuideId = onOpenAcquisitionGuide ? acquisitionGuideIdForDocument(doc.id) : undefined;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? 'opacity-50' : ''}`}
    >
      {/* メインカード */}
      <div
        className={`flex flex-wrap items-center sm:items-start p-3 rounded-lg border transition-all ${
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
          className={`flex-shrink-0 p-2 mr-1 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-grab active:cursor-grabbing touch-none rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${touchTargetClass}`}
          title="ドラッグして並び替え"
          aria-label={`${doc.name}を並び替え`}
          aria-roledescription="ドラッグ可能な書類"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {/* チェックボックス */}
        <button
          onClick={() => docHandlers.toggleCheck(categoryId, doc.id)}
          className={`flex-shrink-0 mr-2 transition-colors sm:mt-0.5 ${touchTargetClass}`}
          role="checkbox"
          aria-checked={doc.checked}
          aria-label={`${doc.name}を${doc.checked ? '未提出に戻す' : '提出済みにする'}`}
        >
          <CheckboxIcon checked={doc.checked} />
        </button>

        {/* 番号 */}
        <span className={docNumberClass}>{docNumber}.</span>

        {/* 書類内容 — basis を確保し、狭幅ではアクション群を次行へ折り返させる */}
        <div className="flex-1 basis-48 min-w-0">
          {/* 書類名 */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-medium ${
              doc.checked
                ? 'text-slate-500 dark:text-slate-400 line-through'
                : doc.excluded
                ? 'text-slate-500 dark:text-slate-400'
                : 'text-slate-700 dark:text-slate-200'
            }`}>
              {doc.name}
            </span>
            {/* 委任状の行だけ、作る画面への入口。名前は委任状の画面がこの案件の保存値から写す */}
            {isPowerOfAttorneyDocument(doc) && (
              <Link
                to="/power-of-attorney"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/70 border border-emerald-200 dark:border-emerald-800 transition-colors"
                title="被相続人名と依頼者名を引き継いで委任状の画面を開きます"
              >
                <Stamp className="w-3.5 h-3.5" aria-hidden="true" />
                委任状を作る
              </Link>
            )}
            {acquisitionGuideId && (
              <button
                type="button"
                onClick={() => onOpenAcquisitionGuide?.(acquisitionGuideId)}
                className="inline-flex min-h-8 cursor-pointer items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
                aria-label={`${doc.name}の取得案内を開く`}
              >
                <BookOpenCheck className="h-3.5 w-3.5" aria-hidden="true" />取得案内
              </button>
            )}
          </div>

          {/* 提出日（委任可・急・対象外は右の切り替えに文字で出ている） */}
          {doc.checkedDate && (
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <Badge label={`済 ${formatCheckedDate(doc.checkedDate)}`} colorClass="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300" />
            </div>
          )}

          {/* 説明・取得方法（折りたたみ） */}
          {hasDetail && (
            <div className="mt-1">
              <button
                onClick={() => setIsDetailOpen(!isDetailOpen)}
                className="flex items-center gap-1 py-1 min-h-6 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                aria-expanded={isDetailOpen}
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
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1">
                      <Info className="w-3 h-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
                      {doc.howToGet}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 状態の切り替え＋直接操作 — 狭幅では2行目へ回して右寄せ */}
        <div className="flex items-center gap-1 w-full justify-end mt-1 border-t border-slate-100 dark:border-slate-700/50 pt-1 sm:w-auto sm:mt-0 sm:ml-2 sm:border-t-0 sm:pt-0 flex-shrink-0">
          {DOC_TOGGLES.map((toggle) => {
            const active = doc[toggle.flag];
            return (
              <button
                key={toggle.flag}
                type="button"
                onClick={() => docHandlers[toggle.handler](categoryId, doc.id)}
                className={`px-2 py-1 rounded border text-xs font-bold leading-none whitespace-nowrap transition-colors ${touchTargetClass} ${active ? toggle.onClass : toggleOffClass}`}
                title={toggle.title}
                aria-label={`${doc.name}の${toggle.label}`}
                aria-pressed={active}
              >
                {toggle.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => docHandlers.startEdit(categoryId, doc.id)}
            className={`rounded p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${touchTargetClass}`}
            title="書類を編集"
            aria-label={`${doc.name}を編集`}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => subItemHandlers.startAdd(categoryId, doc.id)}
            className={`rounded p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${touchTargetClass}`}
            title="個別名を追加"
            aria-label={`${doc.name}に個別名を追加`}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => docHandlers.remove(categoryId, doc.id)}
            className={`rounded p-1 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${touchTargetClass}`}
            title="書類を削除"
            aria-label={`${doc.name}を削除`}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
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
                      className={`p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors ${touchTargetClass}`}
                      title="個別名を編集"
                      aria-label={`${sn.text}を編集`}
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => subItemHandlers.remove(categoryId, doc.id, sn.id)}
                      className={`p-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 rounded transition-colors ${touchTargetClass}`}
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
