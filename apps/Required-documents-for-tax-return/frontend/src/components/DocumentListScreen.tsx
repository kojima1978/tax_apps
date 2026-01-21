'use client';

import { useState, useEffect } from 'react';
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
import { ArrowLeft, Printer, Save, Download, Copy, Loader2, FileSpreadsheet, Check } from 'lucide-react';
import { exportToExcel } from '@/utils/exportExcel';
import { CategoryGroup } from '@/types';
import { SortableCategory } from './document-list/SortableCategory';
import { formatDate, generateReiwaYears } from '@/utils/date';
import { fetchStaff, fetchCustomerNames } from '@/utils/api';

interface DocumentListScreenProps {
  year: number;
  documentGroups: CategoryGroup[];
  onDocumentGroupsChange: (groups: CategoryGroup[]) => void;
  onBack: () => void;
  onYearChange: (year: number) => void;
  customerName: string;
  staffName: string;
  onCustomerNameChange: (name: string) => void;
  onStaffNameChange: (name: string) => void;
  onSave: () => Promise<void>;
  onLoad: () => Promise<void>;
  onCopyToNextYear: () => Promise<void>;
  isSaving: boolean;
  isLoading: boolean;
  lastSaved: Date | null;
}

export default function DocumentListScreen({
  year,
  documentGroups,
  onDocumentGroupsChange,
  onBack,
  onYearChange,
  customerName,
  staffName,
  onCustomerNameChange,
  onStaffNameChange,
  onSave,
  onLoad,
  onCopyToNextYear,
  isSaving,
  isLoading,
  lastSaved,
}: DocumentListScreenProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const expanded: Record<string, boolean> = {};
    documentGroups.forEach((group) => {
      expanded[group.id] = true;
    });
    return expanded;
  });
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [addingToGroupId, setAddingToGroupId] = useState<string | null>(null);
  const [newDocText, setNewDocText] = useState('');
  const [addingNewCategory, setAddingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  // サブアイテム用の状態
  const [editingSubItemId, setEditingSubItemId] = useState<string | null>(null);
  const [editSubItemText, setEditSubItemText] = useState('');
  const [addingSubItemToDocId, setAddingSubItemToDocId] = useState<string | null>(null);
  const [newSubItemText, setNewSubItemText] = useState('');

  // Staff list for dropdown
  const [staffList, setStaffList] = useState<{ id: number, staff_name: string }[]>([]);
  const [customerNames, setCustomerNames] = useState<string[]>([]);

  useEffect(() => {
    fetchStaff().then(data => setStaffList(data));
  }, []);

  useEffect(() => {
    if (staffName) {
      fetchCustomerNames(staffName).then(names => setCustomerNames(names));
    } else {
      setCustomerNames([]);
    }
  }, [staffName]);

  const currentDate = formatDate();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // カテゴリの並び替え
  const handleCategoryDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleCategoryDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

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

  // カテゴリの展開/折りたたみ
  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  // 書類のチェック状態を切り替え
  const toggleDocumentCheck = (groupId: string, docId: string) => {
    const newGroups = documentGroups.map((group) => {
      if (group.id === groupId) {
        return {
          ...group,
          documents: group.documents.map((doc) =>
            doc.id === docId ? { ...doc, checked: !doc.checked } : doc
          ),
        };
      }
      return group;
    });
    onDocumentGroupsChange(newGroups);
  };

  // 書類の編集開始
  const startEditDocument = (docId: string, currentText: string) => {
    setEditingDocId(docId);
    setEditText(currentText);
  };

  // 書類の編集保存
  const saveEditDocument = (groupId: string) => {
    if (!editText.trim()) return;
    const newGroups = documentGroups.map((group) => {
      if (group.id === groupId) {
        return {
          ...group,
          documents: group.documents.map((doc) =>
            doc.id === editingDocId ? { ...doc, text: editText } : doc
          ),
        };
      }
      return group;
    });
    onDocumentGroupsChange(newGroups);
    setEditingDocId(null);
    setEditText('');
  };

  // 書類の編集キャンセル
  const cancelEditDocument = () => {
    setEditingDocId(null);
    setEditText('');
  };

  // 書類の削除
  const deleteDocument = (groupId: string, docId: string) => {
    if (!confirm('この書類を削除してもよろしいですか？')) return;
    const newGroups = documentGroups.map((group) => {
      if (group.id === groupId) {
        return {
          ...group,
          documents: group.documents.filter((doc) => doc.id !== docId),
        };
      }
      return group;
    });
    onDocumentGroupsChange(newGroups);
  };

  // 書類の追加開始
  const startAddDocument = (groupId: string) => {
    setAddingToGroupId(groupId);
    setNewDocText('');
  };

  // 書類の追加
  const addDocument = (groupId: string) => {
    if (!newDocText.trim()) return;
    const newDocId = `doc_${Date.now()}`;
    const newGroups = documentGroups.map((group) => {
      if (group.id === groupId) {
        return {
          ...group,
          documents: [
            ...group.documents,
            { id: newDocId, text: newDocText, checked: false, subItems: [] },
          ],
        };
      }
      return group;
    });
    onDocumentGroupsChange(newGroups);
    setAddingToGroupId(null);
    setNewDocText('');
  };

  // 書類の追加キャンセル
  const cancelAddDocument = () => {
    setAddingToGroupId(null);
    setNewDocText('');
  };

  // カテゴリの追加
  const addCategory = () => {
    if (!newCategoryName.trim()) return;
    const newGroupId = `custom_${Date.now()}`;
    const newGroup: CategoryGroup = {
      id: newGroupId,
      category: newCategoryName,
      documents: [],
    };
    onDocumentGroupsChange([...documentGroups, newGroup]);
    setExpandedGroups((prev) => ({ ...prev, [newGroupId]: true }));
    setAddingNewCategory(false);
    setNewCategoryName('');
  };

  // カテゴリ名の編集開始
  const startEditCategory = (groupId: string, currentName: string) => {
    setEditingCategoryId(groupId);
    setEditCategoryName(currentName);
  };

  // カテゴリ名の編集保存
  const saveEditCategory = () => {
    if (!editCategoryName.trim()) return;
    const newGroups = documentGroups.map((group) => {
      if (group.id === editingCategoryId) {
        return { ...group, category: editCategoryName };
      }
      return group;
    });
    onDocumentGroupsChange(newGroups);
    setEditingCategoryId(null);
    setEditCategoryName('');
  };

  // カテゴリ名の編集キャンセル
  const cancelEditCategory = () => {
    setEditingCategoryId(null);
    setEditCategoryName('');
  };

  // カテゴリの削除
  const deleteCategory = (groupId: string) => {
    if (!confirm('このカテゴリとその中の全ての書類を削除してもよろしいですか？')) return;
    onDocumentGroupsChange(documentGroups.filter((g) => g.id !== groupId));
  };

  // 小項目のチェック切り替え
  const toggleSubItemCheck = (groupId: string, docId: string, subItemId: string) => {
    const newGroups = documentGroups.map((group) => {
      if (group.id === groupId) {
        return {
          ...group,
          documents: group.documents.map((doc) => {
            if (doc.id === docId && doc.subItems) {
              return {
                ...doc,
                subItems: doc.subItems.map((sub) =>
                  sub.id === subItemId ? { ...sub, checked: !sub.checked } : sub
                ),
              };
            }
            return doc;
          }),
        };
      }
      return group;
    });
    onDocumentGroupsChange(newGroups);
  };

  // 小項目の編集開始
  const startEditSubItem = (subItemId: string, currentText: string) => {
    setEditingSubItemId(subItemId);
    setEditSubItemText(currentText);
  };

  // 小項目の編集保存
  const saveEditSubItem = (groupId: string, docId: string) => {
    if (!editSubItemText.trim()) return;
    const newGroups = documentGroups.map((group) => {
      if (group.id === groupId) {
        return {
          ...group,
          documents: group.documents.map((doc) => {
            if (doc.id === docId && doc.subItems) {
              return {
                ...doc,
                subItems: doc.subItems.map((sub) =>
                  sub.id === editingSubItemId ? { ...sub, text: editSubItemText } : sub
                ),
              };
            }
            return doc;
          }),
        };
      }
      return group;
    });
    onDocumentGroupsChange(newGroups);
    setEditingSubItemId(null);
    setEditSubItemText('');
  };

  // 小項目の編集キャンセル
  const cancelEditSubItem = () => {
    setEditingSubItemId(null);
    setEditSubItemText('');
  };

  // 小項目の削除
  const deleteSubItem = (groupId: string, docId: string, subItemId: string) => {
    if (!confirm('この小項目を削除してもよろしいですか？')) return;
    const newGroups = documentGroups.map((group) => {
      if (group.id === groupId) {
        return {
          ...group,
          documents: group.documents.map((doc) => {
            if (doc.id === docId && doc.subItems) {
              return {
                ...doc,
                subItems: doc.subItems.filter((sub) => sub.id !== subItemId),
              };
            }
            return doc;
          }),
        };
      }
      return group;
    });
    onDocumentGroupsChange(newGroups);
  };

  // 小項目の追加開始
  const startAddSubItem = (docId: string) => {
    setAddingSubItemToDocId(docId);
    setNewSubItemText('');
  };

  // 小項目の追加
  const addSubItem = (groupId: string, docId: string) => {
    if (!newSubItemText.trim()) return;
    const newSubItemId = `sub_${Date.now()}`;
    const newGroups = documentGroups.map((group) => {
      if (group.id === groupId) {
        return {
          ...group,
          documents: group.documents.map((doc) => {
            if (doc.id === docId) {
              const currentSubItems = doc.subItems || [];
              return {
                ...doc,
                subItems: [
                  ...currentSubItems,
                  { id: newSubItemId, text: newSubItemText, checked: false },
                ],
              };
            }
            return doc;
          }),
        };
      }
      return group;
    });
    onDocumentGroupsChange(newGroups);
    setAddingSubItemToDocId(null);
    setNewSubItemText('');
  };

  // 小項目の追加キャンセル
  const cancelAddSubItem = () => {
    setAddingSubItemToDocId(null);
    setNewSubItemText('');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    exportToExcel(documentGroups, year, customerName, staffName);
  };

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
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold text-slate-800">必要書類リスト作成</h1>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={onLoad}
                disabled={isLoading || !customerName || !staffName}
                className="flex items-center px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium disabled:opacity-50"
              >
                <Download className="w-4 h-4 mr-2" />
                読込
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

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">対象年度</label>
                <select
                  value={year}
                  onChange={(e) => onYearChange(parseInt(e.target.value, 10))}
                  className="w-full md:w-auto px-3 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {generateReiwaYears().map((y) => (
                    <option key={y} value={y + 2018}>
                      令和{y}年分（{y + 2018}年）
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    担当者名 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={staffName}
                    onChange={(e) => onStaffNameChange(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="">選択してください</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.staff_name}>
                        {s.staff_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    お客様名 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={customerName}
                    onChange={(e) => onCustomerNameChange(e.target.value)}
                    disabled={!staffName}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
                  >
                    <option value="">選択してください</option>
                    {customerNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                  {!staffName && (
                    <p className="text-xs text-slate-400 mt-1">先に担当者を選択してください</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              {lastSaved ? (
                <span className="flex items-center text-emerald-600">
                  <Check className="w-3 h-3 mr-1" />
                  保存済み: {lastSaved.toLocaleTimeString()}
                </span>
              ) : (
                '未保存'
              )}
            </div>
            <div className="flex space-x-2">
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
            </div>
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
            <div className="space-y-6 print:space-y-4">
              {documentGroups.map((group) => (
                <SortableCategory
                  key={group.id}
                  group={group}
                  isExpanded={expandedGroups[group.id] || false}
                  onToggleExpand={() => toggleGroup(group.id)}
                  onToggleCheck={(docId) => toggleDocumentCheck(group.id, docId)}
                  onDeleteDocument={(docId) => deleteDocument(group.id, docId)}
                  onStartEditDocument={startEditDocument}
                  editingDocId={editingDocId}
                  editText={editText}
                  onEditTextChange={setEditText}
                  onSaveEditDocument={() => saveEditDocument(group.id)}
                  onCancelEditDocument={cancelEditDocument}
                  isOver={activeId !== null && activeId !== group.id}
                  onDocumentsReorder={(activeId, overId) =>
                    handleDocumentsReorder(group.id, activeId, overId)
                  }
                  addingToGroupId={addingToGroupId}
                  newDocText={newDocText}
                  onNewDocTextChange={setNewDocText}
                  onStartAddDocument={() => startAddDocument(group.id)}
                  onAddDocument={() => addDocument(group.id)}
                  onCancelAddDocument={cancelAddDocument}
                  onDeleteCategory={() => deleteCategory(group.id)}
                  onStartEditCategory={startEditCategory}
                  editingCategoryId={editingCategoryId}
                  editCategoryName={editCategoryName}
                  onEditCategoryNameChange={setEditCategoryName}
                  onSaveEditCategory={saveEditCategory}
                  onCancelEditCategory={cancelEditCategory}
                  // サブアイテム用props
                  onToggleSubItemCheck={(docId, subId) => toggleSubItemCheck(group.id, docId, subId)}
                  onStartEditSubItem={startEditSubItem}
                  editingSubItemId={editingSubItemId}
                  editSubItemText={editSubItemText}
                  onEditSubItemTextChange={setEditSubItemText}
                  onSaveEditSubItem={(docId) => saveEditSubItem(group.id, docId)}
                  onCancelEditSubItem={cancelEditSubItem}
                  onDeleteSubItem={(docId, subId) => deleteSubItem(group.id, docId, subId)}
                  onStartAddSubItem={startAddSubItem}
                  addingSubItemToDocId={addingSubItemToDocId}
                  newSubItemText={newSubItemText}
                  onNewSubItemTextChange={setNewSubItemText}
                  onAddSubItem={(docId) => addSubItem(group.id, docId)}
                  onCancelAddSubItem={cancelAddSubItem}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <div className="mt-8 pt-8 border-t border-slate-200 no-print">
          {addingNewCategory ? (
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm animate-fade-in">
              <h3 className="font-bold text-slate-700 mb-3">新しいカテゴリを追加</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="カテゴリ名（例: 給与所得）"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addCategory();
                    if (e.key === 'Escape') {
                      setAddingNewCategory(false);
                      setNewCategoryName('');
                    }
                  }}
                />
                <button
                  onClick={addCategory}
                  disabled={!newCategoryName.trim()}
                  className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 font-bold"
                >
                  追加
                </button>
                <button
                  onClick={() => {
                    setAddingNewCategory(false);
                    setNewCategoryName('');
                  }}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded hover:bg-slate-300"
                >
                  キャンセル
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingNewCategory(true)}
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
            <p>※ このリストは{year}年分の確定申告に必要な書類の目安です。</p>
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
