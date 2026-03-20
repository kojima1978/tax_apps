import { useState, useCallback, useMemo } from 'react';
import { type CategoryData, type CategoryDocuments, type DocumentItem, type CustomDocumentItem, type DocChanges } from '../constants/documents';
import { createExportData, downloadAsJson, type ExportData } from '../utils/jsonDataManager';
import { deleteKeys, createBooleanToggle, generateId, formatTimeNow } from '../utils/helpers';
import { useDocumentModal } from './useDocumentModal';

// 全カテゴリを展開状態で初期化
function initializeExpanded(categories: CategoryData[]) {
  const expanded: Record<string, boolean> = {};
  categories.forEach((category) => { expanded[category.id] = true; });
  return expanded;
}

// 初期の書類順序を生成
function initializeDocumentOrder(categories: CategoryData[]) {
  const order: Record<string, string[]> = {};
  categories.forEach((category) => {
    order[category.id] = category.documents.map((doc) => doc.id);
  });
  return order;
}

interface UseDocumentGuideParams {
  categories: CategoryData[];
  appName: string;
  filenamePrefix: string;
}

export function useDocumentGuide({ categories, appName, filenamePrefix }: UseDocumentGuideParams) {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => initializeExpanded(categories));
  const [customDocuments, setCustomDocuments] = useState<CustomDocumentItem[]>([]);
  const [documentOrder, setDocumentOrder] = useState<Record<string, string[]>>(() => initializeDocumentOrder(categories));
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
      categories.forEach((category) => { result[category.id] = value; });
      return result;
    });
  }, [categories]);
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
  const modal = useDocumentModal({ categories, editedDocuments, customDocuments, editDocument, addCustomDocument });

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
  const cleanupDocState = useCallback((keys: string[]) => {
    const cleanup = <T,>(setter: React.Dispatch<React.SetStateAction<Record<string, T>>>) =>
      setter((prev) => deleteKeys(prev, keys));
    cleanup(setEditedDocuments);
    cleanup(setCanDelegateOverrides);
    cleanup(setSpecificDocNames);
    cleanup(setCheckedDocuments);
    cleanup(setCheckedDates);
    cleanup(setDocumentMemos);
    cleanup(setExcludedDocuments);
    cleanup(setUrgentDocuments);
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
      appName,
      clientName, deceasedName, deadline,
      customDocuments, documentOrder,
      editedDocuments, canDelegateOverrides, specificDocNames, checkedDocuments,
      checkedDates, documentMemos, excludedDocuments, urgentDocuments, disabledCategories,
      personInCharge, personInChargeContact,
    });
    downloadAsJson(exportData, filenamePrefix);
    markClean();
  }, [appName, filenamePrefix, clientName, deceasedName, deadline, customDocuments, documentOrder, editedDocuments, canDelegateOverrides, specificDocNames, checkedDocuments, checkedDates, documentMemos, excludedDocuments, urgentDocuments, disabledCategories, personInCharge, personInChargeContact, markClean]);

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
    categories.forEach((category) => {
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
  }, [categories, customDocuments, documentOrder, editedDocuments, canDelegateOverrides]);

  const resetToDefault = useCallback(() => {
    setExpandedCategories(initializeExpanded(categories));
    setCustomDocuments([]);
    setDocumentOrder(initializeDocumentOrder(categories));
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
  }, [categories]);

  const hasCustomizations = useMemo((): boolean => {
    const totalCount = Object.values(documentOrder).reduce((acc, ids) => acc + ids.length, 0);
    const customCount = customDocuments.length;
    const initialBuiltInCount = categories.reduce((acc, cat) => acc + cat.documents.length, 0);
    const hasDeletedDocs = totalCount - customCount < initialBuiltInCount;
    const nonEmpty = (...records: Record<string, unknown>[]) => records.some(r => Object.keys(r).length > 0);
    return customCount > 0 || hasDeletedDocs || nonEmpty(
      editedDocuments, canDelegateOverrides, specificDocNames, checkedDocuments,
      excludedDocuments, urgentDocuments, disabledCategories, documentMemos,
    );
  }, [categories, documentOrder, customDocuments, editedDocuments, canDelegateOverrides, specificDocNames, checkedDocuments, excludedDocuments, urgentDocuments, disabledCategories, documentMemos]);

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
    clientName, deceasedName, deadline, personInCharge, personInChargeContact, hasCustomizations,
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
