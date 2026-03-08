import type React from 'react';
import { useState, useCallback, useMemo } from 'react';
import { CATEGORIES, type CategoryDocuments, type DocumentItem, type CustomDocumentItem, type DocChanges, type Stats } from '../constants/documents';
import { createExportData, downloadAsJson, type ExportData } from '../utils/jsonDataManager';
import { useDocumentModal } from './useDocumentModal';

// 全カテゴリを展開状態で初期化
function initializeExpanded() {
  const expanded: Record<string, boolean> = {};
  CATEGORIES.forEach((category) => { expanded[category.id] = true; });
  return expanded;
}

// 初期の書類順序を生成
function initializeDocumentOrder() {
  const order: Record<string, string[]> = {};
  CATEGORIES.forEach((category) => {
    order[category.id] = category.documents.map((doc) => doc.id);
  });
  return order;
}

function generateId() {
  return `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/** Record から指定キーを削除して新しいオブジェクトを返す */
function deleteKeys<T>(record: Record<string, T>, keys: string[]): Record<string, T> {
  const result = { ...record };
  keys.forEach(key => delete result[key]);
  return result;
}

/** boolean Record の指定キーをトグルする汎用 setState ハンドラを生成 */
function createBooleanToggle(setter: React.Dispatch<React.SetStateAction<Record<string, boolean>>>, onChange?: () => void) {
  return (key: string) => {
    setter((prev) => {
      const newState = { ...prev };
      if (prev[key]) { delete newState[key]; } else { newState[key] = true; }
      return newState;
    });
    onChange?.();
  };
}

/** 現在時刻を HH:MM 形式で返す */
function formatTimeNow(): string {
  return new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

export function useDocumentGuide() {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => initializeExpanded());
  const [customDocuments, setCustomDocuments] = useState<CustomDocumentItem[]>([]);
  const [documentOrder, setDocumentOrder] = useState<Record<string, string[]>>(() => initializeDocumentOrder());
  const [editedDocuments, setEditedDocuments] = useState<Record<string, DocChanges>>({});
  const [canDelegateOverrides, setCanDelegateOverrides] = useState<Record<string, boolean>>({});
  const [specificDocNames, setSpecificDocNames] = useState<Record<string, string[]>>({});
  const [checkedDocuments, setCheckedDocuments] = useState<Record<string, boolean>>({});
  const [checkedDates, setCheckedDates] = useState<Record<string, string>>({});
  const [documentMemos, setDocumentMemos] = useState<Record<string, string>>({});
  const [excludedDocuments, setExcludedDocuments] = useState<Record<string, boolean>>({});
  const [urgentDocuments, setUrgentDocuments] = useState<Record<string, boolean>>({});
  const [disabledCategories, setDisabledCategories] = useState<Record<string, boolean>>({});
  const [deleteConfirmation, setDeleteConfirmation] = useState<
    | { type: 'document'; docId: string; categoryId: string; name: string }
    | { type: 'category'; categoryId: string; name: string }
    | null
  >(null);
  const [clientName, setClientName] = useState('');
  const [deceasedName, setDeceasedName] = useState('');
  const [deadline, setDeadline] = useState('');
  const [personInCharge, setPersonInCharge] = useState('');
  const [personInChargeContact, setPersonInChargeContact] = useState('');

  // 未保存変更の追跡
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const markDirty = useCallback(() => setIsDirty(true), []);
  const markClean = useCallback(() => { setIsDirty(false); setLastSavedAt(formatTimeNow()); }, []);

  const toggleExpanded = useCallback((categoryId: string) => {
    setExpandedCategories((prev) => ({ ...prev, [categoryId]: !prev[categoryId] }));
  }, []);

  const setAllExpanded = useCallback((value: boolean) => {
    setExpandedCategories(() => {
      const result: Record<string, boolean> = {};
      CATEGORIES.forEach((category) => { result[category.id] = value; });
      return result;
    });
  }, []);
  const expandAll = useCallback(() => setAllExpanded(true), [setAllExpanded]);
  const collapseAll = useCallback(() => setAllExpanded(false), [setAllExpanded]);

  const addCustomDocument = useCallback((categoryId: string, name: string, description: string, howToGet: string) => {
    const newDoc: CustomDocumentItem = {
      id: generateId(), categoryId, name, description, howToGet, isCustom: true,
    };
    setCustomDocuments((prev) => [...prev, newDoc]);
    setDocumentOrder((prev) => ({
      ...prev,
      [categoryId]: [...(prev[categoryId] || []), newDoc.id],
    }));
    markDirty();
  }, [markDirty]);

  const reorderDocuments = useCallback((categoryId: string, newOrder: string[]) => {
    setDocumentOrder((prev) => ({ ...prev, [categoryId]: newOrder }));
    markDirty();
  }, [markDirty]);

  const editDocument = useCallback((docId: string, changes: DocChanges) => {
    setEditedDocuments((prev) => ({ ...prev, [docId]: { ...prev[docId], ...changes } }));
    setCustomDocuments((prev) =>
      prev.map((doc) =>
        doc.id === docId
          ? {
              ...doc,
              ...(changes.name !== undefined && { name: changes.name }),
              ...(changes.description !== undefined && { description: changes.description }),
              ...(changes.howToGet !== undefined && { howToGet: changes.howToGet }),
            }
          : doc
      )
    );
    markDirty();
  }, [markDirty]);

  // モーダル
  const modal = useDocumentModal({ editedDocuments, customDocuments, editDocument, addCustomDocument });

  const toggleCanDelegate = useCallback((docId: string, originalCanDelegate: boolean) => {
    setCanDelegateOverrides((prev) => {
      const currentValue = prev[docId] !== undefined ? prev[docId] : originalCanDelegate;
      const newValue = !currentValue;
      if (newValue === originalCanDelegate) {
        const newState = { ...prev };
        delete newState[docId];
        return newState;
      }
      return { ...prev, [docId]: newValue };
    });
    markDirty();
  }, [markDirty]);

  const addSpecificName = useCallback((docId: string, name: string) => {
    setSpecificDocNames((prev) => ({ ...prev, [docId]: [...(prev[docId] || []), name] }));
    markDirty();
  }, [markDirty]);

  const editSpecificName = useCallback((docId: string, index: number, name: string) => {
    setSpecificDocNames((prev) => {
      const names = [...(prev[docId] || [])];
      names[index] = name;
      return { ...prev, [docId]: names };
    });
    markDirty();
  }, [markDirty]);

  const removeSpecificName = useCallback((docId: string, index: number) => {
    setSpecificDocNames((prev) => {
      const names = [...(prev[docId] || [])];
      names.splice(index, 1);
      const newState = { ...prev };
      if (names.length === 0) { delete newState[docId]; } else { newState[docId] = names; }
      return newState;
    });
    markDirty();
  }, [markDirty]);

  // 具体名の並び替え
  const reorderSpecificNames = useCallback((docId: string, newNames: string[]) => {
    setSpecificDocNames((prev) => {
      const newState = { ...prev };
      if (newNames.length === 0) { delete newState[docId]; } else { newState[docId] = newNames; }
      return newState;
    });
    markDirty();
  }, [markDirty]);

  // 提出済みチェック切替（日付自動記録）
  const toggleDocumentCheck = useCallback((docId: string) => {
    setCheckedDocuments((prev) => {
      const newState = { ...prev };
      if (prev[docId]) { delete newState[docId]; } else { newState[docId] = true; }
      return newState;
    });
    setCheckedDates((prev) => {
      const newState = { ...prev };
      if (prev[docId]) {
        delete newState[docId];
      } else {
        newState[docId] = new Date().toISOString().split('T')[0];
      }
      return newState;
    });
    markDirty();
  }, [markDirty]);

  // カテゴリ内全書類の一括チェック切替
  const toggleAllInCategory = useCallback((categoryId: string, checked: boolean) => {
    const order = documentOrder[categoryId] || [];
    const today = new Date().toISOString().split('T')[0];
    setCheckedDocuments((prev) => {
      const newState = { ...prev };
      order.forEach(id => { if (checked) { newState[id] = true; } else { delete newState[id]; } });
      return newState;
    });
    setCheckedDates((prev) => {
      const newState = { ...prev };
      order.forEach(id => {
        if (checked) { if (!newState[id]) newState[id] = today; }
        else { delete newState[id]; }
      });
      return newState;
    });
    markDirty();
  }, [documentOrder, markDirty]);

  // メモの設定
  const setDocumentMemo = useCallback((docId: string, memo: string) => {
    setDocumentMemos((prev) => {
      const newState = { ...prev };
      if (memo.trim() === '') { delete newState[docId]; } else { newState[docId] = memo; }
      return newState;
    });
    markDirty();
  }, [markDirty]);

  // 対象外・緊急・カテゴリON/OFFの切替
  const toggleExcluded = useCallback(createBooleanToggle(setExcludedDocuments, markDirty), [markDirty]);
  const toggleUrgent = useCallback(createBooleanToggle(setUrgentDocuments, markDirty), [markDirty]);
  const toggleCategoryDisabled = useCallback(createBooleanToggle(setDisabledCategories, markDirty), [markDirty]);

  /** 指定キーに紐づく関連 state をクリーンアップ */
  const docStateSetters = [setEditedDocuments, setCanDelegateOverrides, setSpecificDocNames, setCheckedDocuments, setCheckedDates, setDocumentMemos, setExcludedDocuments, setUrgentDocuments] as const;
  const cleanupDocState = useCallback((keys: string[]) => {
    docStateSetters.forEach(setter => setter((prev: Record<string, unknown>) => deleteKeys(prev, keys)));
  }, []);

  // 書類の永久削除
  const removeDocument = useCallback((docId: string, categoryId: string) => {
    setDocumentOrder((prev) => ({
      ...prev,
      [categoryId]: (prev[categoryId] || []).filter((id) => id !== docId),
    }));
    setCustomDocuments((prev) => prev.filter((doc) => doc.id !== docId));
    cleanupDocState([docId]);
    markDirty();
  }, [cleanupDocState, markDirty]);

  // 削除確認ダイアログ
  const requestDelete = useCallback((docId: string, categoryId: string, name: string) => {
    setDeleteConfirmation({ type: 'document', docId, categoryId, name });
  }, []);
  const requestDeleteCategory = useCallback((categoryId: string, name: string) => {
    setDeleteConfirmation({ type: 'category', categoryId, name });
  }, []);

  // カテゴリの永久削除
  const removeCategory = useCallback((categoryId: string) => {
    const docIds = documentOrder[categoryId] || [];
    setDocumentOrder((prev) => ({ ...prev, [categoryId]: [] }));
    setCustomDocuments((prev) => prev.filter((doc) => doc.categoryId !== categoryId));
    cleanupDocState(docIds);
    markDirty();
  }, [documentOrder, cleanupDocState, markDirty]);

  const confirmDelete = useCallback(() => {
    if (!deleteConfirmation) return;
    if (deleteConfirmation.type === 'document') {
      removeDocument(deleteConfirmation.docId, deleteConfirmation.categoryId);
    } else {
      removeCategory(deleteConfirmation.categoryId);
    }
    setDeleteConfirmation(null);
  }, [deleteConfirmation, removeDocument, removeCategory]);
  const cancelDelete = useCallback(() => { setDeleteConfirmation(null); }, []);

  const exportToJson = useCallback(() => {
    const exportData = createExportData({
      clientName, deceasedName, deadline,
      customDocuments, documentOrder,
      editedDocuments, canDelegateOverrides, specificDocNames, checkedDocuments,
      checkedDates, documentMemos, excludedDocuments, urgentDocuments, disabledCategories,
      personInCharge, personInChargeContact,
    });
    downloadAsJson(exportData);
    markClean();
  }, [clientName, deceasedName, deadline, customDocuments, documentOrder, editedDocuments, canDelegateOverrides, specificDocNames, checkedDocuments, checkedDates, documentMemos, excludedDocuments, urgentDocuments, disabledCategories, personInCharge, personInChargeContact, markClean]);

  const importFromJson = useCallback((data: ExportData) => {
    setClientName(data.data.clientName);
    setDeceasedName(data.data.deceasedName);
    setDeadline(data.data.deadline);
    setCustomDocuments(data.data.customDocuments);
    setDocumentOrder(data.data.documentOrder);
    setEditedDocuments(data.data.editedDocuments);
    setCanDelegateOverrides(data.data.canDelegateOverrides);
    setSpecificDocNames(data.data.specificDocNames ?? {});
    // 後方互換: 旧 strikethroughDocuments → checkedDocuments に移行
    setCheckedDocuments(data.data.checkedDocuments ?? data.data.strikethroughDocuments ?? {});
    setCheckedDates(data.data.checkedDates ?? {});
    setDocumentMemos(data.data.documentMemos ?? {});
    setExcludedDocuments(data.data.excludedDocuments ?? {});
    setUrgentDocuments(data.data.urgentDocuments ?? {});
    setDisabledCategories(data.data.disabledCategories ?? {});
    setPersonInCharge(data.data.personInCharge ?? '');
    setPersonInChargeContact(data.data.personInChargeContact ?? '');
    markClean();
  }, [markClean]);

  const getSelectedDocuments = useCallback((): CategoryDocuments[] => {
    const result: CategoryDocuments[] = [];
    CATEGORIES.forEach((category) => {
      const order = documentOrder[category.id] || [];
      const docMap = new Map<string, DocumentItem | CustomDocumentItem>();
      category.documents.forEach((doc) => {
        const edited = editedDocuments[doc.id];
        const override = canDelegateOverrides[doc.id];
        docMap.set(doc.id, {
          ...doc,
          name: edited?.name ?? doc.name,
          description: edited?.description ?? doc.description,
          howToGet: edited?.howToGet ?? doc.howToGet,
          canDelegate: override !== undefined ? override : doc.canDelegate,
        });
      });
      customDocuments
        .filter((doc) => doc.categoryId === category.id)
        .forEach((doc) => {
          const override = canDelegateOverrides[doc.id];
          docMap.set(doc.id, { ...doc, canDelegate: override !== undefined ? override : false });
        });
      const orderedDocs: (DocumentItem | CustomDocumentItem)[] = [];
      order.forEach((docId) => {
        const doc = docMap.get(docId);
        if (doc) orderedDocs.push(doc);
      });
      if (orderedDocs.length > 0) result.push({ category, documents: orderedDocs });
    });
    return result;
  }, [customDocuments, documentOrder, editedDocuments, canDelegateOverrides]);

  const resetToDefault = useCallback(() => {
    setExpandedCategories(initializeExpanded());
    setCustomDocuments([]);
    setDocumentOrder(initializeDocumentOrder());
    setEditedDocuments({});
    setCanDelegateOverrides({});
    setSpecificDocNames({});
    setCheckedDocuments({});
    setCheckedDates({});
    setDocumentMemos({});
    setExcludedDocuments({});
    setUrgentDocuments({});
    setDisabledCategories({});
    setIsDirty(false);
    setLastSavedAt(null);
  }, []);

  const stats = useMemo((): Stats => {
    const totalCount = Object.values(documentOrder).reduce((acc, ids) => acc + ids.length, 0);
    const customCount = customDocuments.length;
    const editedCount = Object.keys(editedDocuments).length;
    const overrideCount = Object.keys(canDelegateOverrides).length;
    const specificCount = Object.keys(specificDocNames).length;
    const checkedCount = Object.keys(checkedDocuments).length;
    const excludedCount = Object.keys(excludedDocuments).length;
    const urgentCount = Object.keys(urgentDocuments).length;
    const disabledCount = Object.keys(disabledCategories).length;
    const memoCount = Object.keys(documentMemos).length;
    const initialBuiltInCount = CATEGORIES.reduce((acc, cat) => acc + cat.documents.length, 0);
    const hasDeletedDocs = totalCount - customCount < initialBuiltInCount;
    const hasCustomizations = customCount > 0 || editedCount > 0 || overrideCount > 0 || specificCount > 0 || checkedCount > 0 || hasDeletedDocs || excludedCount > 0 || urgentCount > 0 || disabledCount > 0 || memoCount > 0;
    return { totalCount, customCount, checkedCount, excludedCount, urgentCount, hasCustomizations };
  }, [documentOrder, customDocuments, editedDocuments, canDelegateOverrides, specificDocNames, checkedDocuments, excludedDocuments, urgentDocuments, disabledCategories, documentMemos]);

  // 文字列state変更時にも dirty マーク（ファクトリ）
  const withDirty = useCallback(
    (setter: React.Dispatch<React.SetStateAction<string>>) => (v: string) => { setter(v); markDirty(); },
    [markDirty]
  );
  const setClientNameDirty = useMemo(() => withDirty(setClientName), [withDirty]);
  const setDeceasedNameDirty = useMemo(() => withDirty(setDeceasedName), [withDirty]);
  const setDeadlineDirty = useMemo(() => withDirty(setDeadline), [withDirty]);
  const setPersonInChargeDirty = useMemo(() => withDirty(setPersonInCharge), [withDirty]);
  const setPersonInChargeContactDirty = useMemo(() => withDirty(setPersonInChargeContact), [withDirty]);

  return {
    // state
    isDirty, lastSavedAt,
    expandedCategories, customDocuments, documentOrder,
    editedDocuments, canDelegateOverrides, specificDocNames, checkedDocuments,
    checkedDates, documentMemos, excludedDocuments, urgentDocuments, disabledCategories,
    deleteConfirmation,
    clientName, deceasedName, deadline, personInCharge, personInChargeContact, stats,
    // モーダル
    ...modal,
    // handlers
    setClientName: setClientNameDirty, setDeceasedName: setDeceasedNameDirty,
    setDeadline: setDeadlineDirty, setPersonInCharge: setPersonInChargeDirty,
    setPersonInChargeContact: setPersonInChargeContactDirty,
    toggleExpanded, expandAll, collapseAll,
    reorderDocuments, toggleCanDelegate,
    addSpecificName, editSpecificName, removeSpecificName, reorderSpecificNames,
    toggleDocumentCheck, toggleAllInCategory,
    setDocumentMemo, toggleExcluded, toggleUrgent, toggleCategoryDisabled,
    requestDelete, requestDeleteCategory, confirmDelete, cancelDelete,
    resetToDefault,
    exportToJson, importFromJson, getSelectedDocuments,
  };
}
