'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ArrowLeft, Printer, Save, Copy, Loader2, FileSpreadsheet, FileJson, Upload, Check, RotateCcw, PlusCircle, RefreshCcw } from 'lucide-react';
import { exportToExcel } from '@/utils/exportExcel';
import { CategoryGroup } from '@/types';
import { SortableCategory } from './document-list/SortableCategory';
import { formatDate, toReiwa } from '@/utils/date';
import { fetchStaff } from '@/utils/api';
import { taxReturnData, replaceYearPlaceholder } from '@/data/taxReturnData';
import { generateInitialDocumentGroups } from '@/utils/documentUtils';
import { useDocumentListEditing } from '@/hooks/useDocumentListEditing';
import { exportCustomerJson, readJsonFile, validateCustomerImport, CustomerExport } from '@/utils/jsonExportImport';

interface DocumentListScreenProps {
  year: number;
  documentGroups: CategoryGroup[];
  onDocumentGroupsChange: (groups: CategoryGroup[]) => void;
  onBack: () => void;
  customerName: string;
  staffName: string;
  onSave: () => Promise<void>;
  onLoad: () => Promise<void>;
  onCopyToNextYear: () => Promise<void>;
  isSaving: boolean;
  isLoading: boolean;
  lastSaved: Date | null;
  saveError?: string | null;
}

export default function DocumentListScreen({
  year,
  documentGroups,
  onDocumentGroupsChange,
  onBack,
  customerName,
  staffName,
  onSave,
  onLoad,
  onCopyToNextYear,
  isSaving,
  isLoading,
  lastSaved,
  saveError,
}: DocumentListScreenProps) {
  const [printLayout, setPrintLayout] = useState<'single' | 'double'>('single');

  // Staff list for dropdown
  const [staffList, setStaffList] = useState<{ id: number; staff_name: string; mobile_number?: string | null }[]>([]);

  useEffect(() => {
    fetchStaff()
      .then((data) => setStaffList(data))
      .catch((e) => console.error('担当者リストの取得に失敗:', e));
  }, []);

  // 編集状態をhookに委譲
  const editing = useDocumentListEditing({ documentGroups, onDocumentGroupsChange });

  const currentDate = formatDate();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const reiwaYear = useMemo(() => toReiwa(year), [year]);

  // カテゴリの並び替え
  const handleCategoryDragStart = (event: DragStartEvent) => {
    editing.setActiveId(event.active.id as string);
  };

  const handleCategoryDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    editing.setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = documentGroups.findIndex((g) => g.id === active.id);
      const newIndex = documentGroups.findIndex((g) => g.id === over.id);
      onDocumentGroupsChange(arrayMove(documentGroups, oldIndex, newIndex));
    }
  };

  // 書類の並び替え
  const handleDocumentsReorder = (groupId: string, activeId: string, overId: string) => {
    const newGroups = documentGroups.map((group) => {
      if (group.id === groupId) {
        const oldIndex = group.documents.findIndex((d) => d.id === activeId);
        const newIndex = group.documents.findIndex((d) => d.id === overId);
        return {
          ...group,
          documents: arrayMove(group.documents, oldIndex, newIndex),
        };
      }
      return group;
    });
    onDocumentGroupsChange(newGroups);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const currentStaff = staffList.find((s) => s.staff_name === staffName);
    exportToExcel(documentGroups, year, customerName, staffName, currentStaff?.mobile_number || undefined);
  };

  // JSON入出力
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const [isJsonImporting, setIsJsonImporting] = useState(false);

  const handleExportJson = () => {
    exportCustomerJson(customerName, staffName, year, documentGroups);
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsJsonImporting(true);
    try {
      const rawData = await readJsonFile(file);
      const validation = validateCustomerImport(rawData);
      if (!validation.isValid) {
        alert(validation.error);
        return;
      }

      const parsed = rawData as CustomerExport;
      const importedData = parsed.data;

      if (!confirm(
        `「${importedData.customer_name}」の令和${toReiwa(importedData.year)}年のデータをインポートします。\n` +
        `現在の編集内容は上書きされます。よろしいですか？`
      )) return;

      onDocumentGroupsChange(importedData.document_groups);
      alert('JSONデータをインポートしました。保存ボタンを押すとデータベースに反映されます。');
    } catch (error) {
      alert('JSONインポートに失敗しました: ' + (error instanceof Error ? error.message : ''));
    } finally {
      setIsJsonImporting(false);
      if (jsonFileInputRef.current) jsonFileInputRef.current.value = '';
    }
  };

  const currentStaffMobile = useMemo(
    () => staffList.find((s) => s.staff_name === staffName)?.mobile_number,
    [staffList, staffName]
  );

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* 固定ヘッダー */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm no-print">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <button
                onClick={onBack}
                className="mr-3 p-2 rounded-full hover:bg-slate-100 text-slate-500"
                aria-label="メニューに戻る"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold text-slate-800">必要書類リスト作成</h1>
            </div>

            <div className="flex items-center space-x-2" role="toolbar" aria-label="操作ツールバー">
              <button
                onClick={onLoad}
                disabled={isLoading || !customerName || !staffName}
                className="flex items-center px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium disabled:opacity-50"
                title="保存されている状態に戻します"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                変更を破棄
              </button>
              <button
                onClick={() => {
                  if (confirm('標準の状態に戻しますか？現在の変更はすべて失われます。')) {
                    onDocumentGroupsChange(generateInitialDocumentGroups(year));
                  }
                }}
                className="flex items-center px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium disabled:opacity-50"
                title="初期状態（標準リスト）に戻します"
              >
                <RefreshCcw className="w-4 h-4 mr-2" />
                標準に戻す
              </button>
              <button
                onClick={onSave}
                disabled={isSaving || !customerName || !staffName}
                className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold shadow-sm disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    保存
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <div className="flex items-center">
                <span className="text-xs font-bold text-slate-500 mr-2">対象年度:</span>
                <span className="text-sm font-bold text-slate-800">令和{reiwaYear}年分</span>
              </div>
              <div className="flex items-center">
                <span className="text-xs font-bold text-slate-500 mr-2">お客様:</span>
                <span className="text-lg font-bold text-slate-800">{customerName}</span>
              </div>
              <div className="flex items-center">
                <span className="text-xs font-bold text-slate-500 mr-2">担当者:</span>
                <span className="text-sm font-bold text-slate-800">{staffName}</span>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-slate-500" aria-live="polite">
              {saveError ? (
                <span className="flex items-center text-red-600">
                  <span className="w-3 h-3 mr-1 font-bold">!</span>
                  保存エラー: {saveError}
                </span>
              ) : lastSaved ? (
                <span className="flex items-center text-emerald-600">
                  <Check className="w-3 h-3 mr-1" />
                  保存済み: {lastSaved.toLocaleTimeString()}
                </span>
              ) : (
                '未保存'
              )}
            </div>
            <div className="flex space-x-2">
              <div className="flex bg-white border border-slate-300 rounded overflow-hidden mr-2" role="radiogroup" aria-label="印刷レイアウト">
                <button
                  onClick={() => setPrintLayout('single')}
                  className={`px-3 py-1.5 text-xs font-medium ${printLayout === 'single' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}
                  role="radio"
                  aria-checked={printLayout === 'single'}
                  title="1列で印刷"
                >
                  1列
                </button>
                <div className="w-px bg-slate-300" aria-hidden="true"></div>
                <button
                  onClick={() => setPrintLayout('double')}
                  className={`px-3 py-1.5 text-xs font-medium ${printLayout === 'double' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}
                  role="radio"
                  aria-checked={printLayout === 'double'}
                  title="2列で印刷"
                >
                  2列
                </button>
              </div>
              <button
                onClick={onCopyToNextYear}
                disabled={isSaving || !customerName || !staffName}
                className="flex items-center px-3 py-1.5 text-xs bg-white border border-slate-300 text-slate-600 rounded hover:bg-slate-50 disabled:opacity-50"
                title="現在の内容を翌年度にコピーします"
              >
                <Copy className="w-3 h-3 mr-1" />
                翌年度へコピー
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center px-3 py-1.5 text-xs bg-slate-700 text-white rounded hover:bg-slate-800"
              >
                <Printer className="w-3 h-3 mr-1" />
                印刷
              </button>
              <button
                onClick={handleExportExcel}
                className="flex items-center px-3 py-1.5 text-xs bg-[#217346] text-white rounded hover:bg-[#1e6b41]"
              >
                <FileSpreadsheet className="w-3 h-3 mr-1" />
                Excel出力
              </button>
              <button
                onClick={handleExportJson}
                className="flex items-center px-3 py-1.5 text-xs bg-amber-600 text-white rounded hover:bg-amber-700"
                title="JSONファイルとしてエクスポート"
              >
                <FileJson className="w-3 h-3 mr-1" />
                JSON出力
              </button>
              <button
                onClick={() => jsonFileInputRef.current?.click()}
                disabled={isJsonImporting}
                className="flex items-center px-3 py-1.5 text-xs bg-white border border-slate-300 text-slate-600 rounded hover:bg-slate-50 disabled:opacity-50"
                title="JSONファイルからインポート"
              >
                <Upload className="w-3 h-3 mr-1" />
                {isJsonImporting ? '読込中...' : 'JSON読込'}
              </button>
              <input
                ref={jsonFileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportJson}
                className="hidden"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 印刷用ヘッダー */}
      <div className="hidden print:block border-b-2 border-slate-800 pb-2 mb-6 pt-8">
        <div className="flex justify-between items-end">
          <div className="flex flex-col">
            <div className="text-left mb-0.5">
              <p className="text-xs">対象年度: <span className="font-bold text-sm">令和{reiwaYear}年分</span></p>
            </div>
            <h1 className="text-2xl font-bold mb-1">確定申告 必要書類確認リスト</h1>
            <div className="flex items-end gap-2 mb-1">
              <p className="text-sm pb-1">お客様名:</p>
              <p className="text-xl font-bold underline decoration-slate-400 underline-offset-4">{customerName} 様</p>
            </div>
          </div>

          <div className="text-right text-xs text-slate-600 mb-1">
            <p className="font-bold text-sm text-slate-800">{taxReturnData.contactInfo.office}</p>
            <p>{taxReturnData.contactInfo.address}</p>
            <p>TEL: {taxReturnData.contactInfo.tel}</p>
            {currentStaffMobile && (
              <p>携帯: {currentStaffMobile}</p>
            )}
            <p className="mt-1 text-sm text-slate-800">担当者: <span className="font-bold">{staffName}</span></p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 pb-32 print:p-0 print:pb-0">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleCategoryDragEnd}
          onDragStart={handleCategoryDragStart}
        >
          <SortableContext
            items={documentGroups.map((g) => g.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className={`space-y-6 print:space-y-0 ${printLayout === 'double' ? 'print:grid print:grid-cols-2 print:gap-2 print:items-start' : 'print:space-y-0'}`}>
              {documentGroups.map((group) => (
                <div key={group.id} className="print:mb-1">
                  <SortableCategory
                    group={group}
                    isExpanded={editing.expandedGroups[group.id] || false}
                    onToggleExpand={() => editing.toggleGroup(group.id)}
                    onToggleDocumentCheck={(groupId, docId) => editing.toggleDocumentCheck(groupId, docId)}
                    onDeleteDocument={editing.deleteDocument}
                    onStartEditDocument={editing.startEditDocument}
                    editingDocId={editing.editingDocId}
                    editText={editing.editText}
                    onEditTextChange={editing.setEditText}
                    onSaveEditDocument={() => editing.saveEditDocument(group.id)}
                    onCancelEditDocument={editing.cancelEditDocument}
                    onDocumentsReorder={(activeId, overId) =>
                      handleDocumentsReorder(group.id, activeId, overId)}
                    addingToGroupId={editing.addingToGroupId}
                    newDocText={editing.newDocText}
                    onNewDocTextChange={editing.setNewDocText}
                    onStartAddDocument={() => editing.startAddDocument(group.id)}
                    onAddDocument={() => editing.addDocument(group.id)}
                    onCancelAddDocument={editing.cancelAddDocument}
                    onDeleteCategory={() => editing.deleteCategory(group.id)}
                    onStartEditCategory={() => editing.startEditCategory(group.id, group.category)}
                    editingCategoryId={editing.editingCategoryId}
                    editCategoryName={editing.editCategoryName}
                    onEditCategoryNameChange={editing.setEditCategoryName}
                    onSaveEditCategory={editing.saveEditCategory}
                    onCancelEditCategory={editing.cancelEditCategory}
                    onToggleSubItemCheck={(docId, subId) => editing.toggleSubItemCheck(group.id, docId, subId)}
                    onStartEditSubItem={editing.startEditSubItem}
                    editingSubItemId={editing.editingSubItemId}
                    editSubItemText={editing.editSubItemText}
                    onEditSubItemTextChange={editing.setEditSubItemText}
                    onSaveEditSubItem={editing.saveEditSubItem}
                    onCancelEditSubItem={editing.cancelEditSubItem}
                    onDeleteSubItem={editing.deleteSubItem}
                    onStartAddSubItem={editing.startAddSubItem}
                    addingSubItemToDocId={editing.addingSubItemToDocId}
                    newSubItemText={editing.newSubItemText}
                    onNewSubItemTextChange={editing.setNewSubItemText}
                    onAddSubItem={editing.addSubItem}
                    onCancelAddSubItem={editing.cancelAddSubItem}
                  />
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <div className="mt-8 pt-8 border-t border-slate-200 no-print">
          {editing.addingNewCategory ? (
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm animate-fade-in">
              <h3 className="font-bold text-slate-700 mb-3">新しいカテゴリを追加</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editing.newCategoryName}
                  onChange={(e) => editing.setNewCategoryName(e.target.value)}
                  placeholder="カテゴリ名（例: 給与所得）"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') editing.addCategory();
                    if (e.key === 'Escape') {
                      editing.setAddingNewCategory(false);
                      editing.setNewCategoryName('');
                    }
                  }}
                />
                <button
                  onClick={editing.addCategory}
                  disabled={!editing.newCategoryName.trim()}
                  className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 font-bold"
                >
                  追加
                </button>
                <button
                  onClick={() => {
                    editing.setAddingNewCategory(false);
                    editing.setNewCategoryName('');
                  }}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded hover:bg-slate-300"
                >
                  キャンセル
                </button>
              </div>

              {/* 復元可能なカテゴリのリスト */}
              <MissingCategoriesRestore
                documentGroups={documentGroups}
                year={year}
                onRestore={editing.restoreCategory}
              />
            </div>
          ) : (
            <button
              onClick={() => editing.setAddingNewCategory(true)}
              className="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 font-bold hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
            >
              + 新しいカテゴリを追加
            </button>
          )}
        </div>
      </div>

      {/* 印刷用フッター */}
      <div className="hidden print:block mt-8 pt-8 border-t border-slate-800 text-center text-xs">
        <div className="flex justify-between items-end">
          <div className="text-left">
            <p>※ このリストは令和{reiwaYear}年分の確定申告に必要な書類の目安です。</p>
            <p>※ 個別の事情により、追加の書類が必要になる場合があります。</p>
          </div>
          <div className="text-right">
            <p>作成日: {currentDate}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// 削除されたデフォルトカテゴリの復元コンポーネント
function MissingCategoriesRestore({
  documentGroups,
  year,
  onRestore,
}: {
  documentGroups: CategoryGroup[];
  year: number;
  onRestore: (group: CategoryGroup) => void;
}) {
  const currentGroupIds = useMemo(() => new Set(documentGroups.map((g) => g.id)), [documentGroups]);

  const missingDefaults = useMemo(() => {
    return [
      ...taxReturnData.baseRequired.map((g, i) => ({
        id: `base_${i}`,
        category: g.category,
        original: g,
        type: 'base' as const,
      })),
      ...taxReturnData.options.map((o) => ({
        id: `option_${o.id}`,
        category: `【所得】${o.label}`,
        original: o,
        type: 'option' as const,
      })),
      ...taxReturnData.deductions.map((d) => ({
        id: `deduction_${d.id}`,
        category: `【控除】${d.label}`,
        original: d,
        type: 'deduction' as const,
      })),
    ].filter((item) => !currentGroupIds.has(item.id));
  }, [currentGroupIds]);

  if (missingDefaults.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-slate-200">
      <p className="text-sm text-slate-500 font-bold mb-2 flex items-center">
        <RefreshCcw className="w-3 h-3 mr-1" />
        削除されたデフォルトカテゴリを復元:
      </p>
      <div className="flex flex-wrap gap-2">
        {missingDefaults.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              let documents: string[] = [];
              let note: string | undefined = undefined;

              if (item.type === 'base') {
                const original = item.original as { documents: string[]; note?: string };
                documents = original.documents;
                note = original.note;
              } else {
                const original = item.original as { documents: string[] };
                documents = original.documents;
              }

              const newGroup: CategoryGroup = {
                id: item.id,
                category: item.category,
                documents: documents.map((doc, idx) => ({
                  id: `doc_${Date.now()}_${idx}`,
                  text: replaceYearPlaceholder(doc, year),
                  checked: false,
                  subItems: [],
                })),
                note,
              };

              onRestore(newGroup);
            }}
            className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 text-xs rounded-full border border-slate-200 hover:border-emerald-200 transition-colors flex items-center"
          >
            <PlusCircle className="w-3 h-3 mr-1" />
            {item.category}
          </button>
        ))}
      </div>
    </div>
  );
}
