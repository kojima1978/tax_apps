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

export function useDocumentGuide() {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => initializeExpanded());
  const [customDocuments, setCustomDocuments] = useState<CustomDocumentItem[]>([]);
  const [documentOrder, setDocumentOrder] = useState<Record<string, string[]>>(() => initializeDocumentOrder());
  const [editedDocuments, setEditedDocuments] = useState<Record<string, DocChanges>>({});
  const [canDelegateOverrides, setCanDelegateOverrides] = useState<Record<string, boolean>>({});
  const [specificDocNames, setSpecificDocNames] = useState<Record<string, string[]>>({});
  const [checkedDocuments, setCheckedDocuments] = useState<Record<string, boolean>>({});
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

  const toggleExpanded = useCallback((categoryId: string) => {
    setExpandedCategories((prev) => ({ ...prev, [categoryId]: !prev[categoryId] }));
  }, []);

  const addCustomDocument = useCallback((categoryId: string, name: string, description: string, howToGet: string) => {
    const newDoc: CustomDocumentItem = {
      id: generateId(), categoryId, name, description, howToGet, isCustom: true,
    };
    setCustomDocuments((prev) => [...prev, newDoc]);
    setDocumentOrder((prev) => ({
      ...prev,
      [categoryId]: [...(prev[categoryId] || []), newDoc.id],
    }));
  }, []);

  const reorderDocuments = useCallback((categoryId: string, newOrder: string[]) => {
    setDocumentOrder((prev) => ({ ...prev, [categoryId]: newOrder }));
  }, []);

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
  }, []);

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
  }, []);

  const addSpecificName = useCallback((docId: string, name: string) => {
    setSpecificDocNames((prev) => ({ ...prev, [docId]: [...(prev[docId] || []), name] }));
  }, []);

  const editSpecificName = useCallback((docId: string, index: number, name: string) => {
    setSpecificDocNames((prev) => {
      const names = [...(prev[docId] || [])];
      names[index] = name;
      return { ...prev, [docId]: names };
    });
  }, []);

  const removeSpecificName = useCallback((docId: string, index: number) => {
    setSpecificDocNames((prev) => {
      const names = [...(prev[docId] || [])];
      names.splice(index, 1);
      const newState = { ...prev };
      if (names.length === 0) { delete newState[docId]; } else { newState[docId] = names; }
      return newState;
    });
  }, []);

  // 提出済みチェック切替
  const toggleDocumentCheck = useCallback((docId: string) => {
    setCheckedDocuments((prev) => {
      const newState = { ...prev };
      if (prev[docId]) { delete newState[docId]; } else { newState[docId] = true; }
      return newState;
    });
  }, []);

  // カテゴリ内全書類の一括チェック切替
  const toggleAllInCategory = useCallback((categoryId: string, checked: boolean) => {
    const order = documentOrder[categoryId] || [];
    setCheckedDocuments((prev) => {
      const newState = { ...prev };
      order.forEach(id => { if (checked) { newState[id] = true; } else { delete newState[id]; } });
      return newState;
    });
  }, [documentOrder]);

  /** 指定キーに紐づく関連 state をクリーンアップ */
  const cleanupDocState = useCallback((keys: string[]) => {
    setEditedDocuments((prev) => deleteKeys(prev, keys));
    setCanDelegateOverrides((prev) => deleteKeys(prev, keys));
    setSpecificDocNames((prev) => deleteKeys(prev, keys));
    setCheckedDocuments((prev) => deleteKeys(prev, keys));
  }, []);

  // 書類の永久削除
  const removeDocument = useCallback((docId: string, categoryId: string) => {
    setDocumentOrder((prev) => ({
      ...prev,
      [categoryId]: (prev[categoryId] || []).filter((id) => id !== docId),
    }));
    setCustomDocuments((prev) => prev.filter((doc) => doc.id !== docId));
    cleanupDocState([docId]);
  }, [cleanupDocState]);

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
  }, [documentOrder, cleanupDocState]);

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
      personInCharge, personInChargeContact,
    });
    downloadAsJson(exportData);
  }, [clientName, deceasedName, deadline, customDocuments, documentOrder, editedDocuments, canDelegateOverrides, specificDocNames, checkedDocuments, personInCharge, personInChargeContact]);

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
    setPersonInCharge(data.data.personInCharge ?? '');
    setPersonInChargeContact(data.data.personInChargeContact ?? '');
  }, []);

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
  }, []);

  const stats = useMemo((): Stats => {
    const totalCount = Object.values(documentOrder).reduce((acc, ids) => acc + ids.length, 0);
    const customCount = customDocuments.length;
    const editedCount = Object.keys(editedDocuments).length;
    const overrideCount = Object.keys(canDelegateOverrides).length;
    const specificCount = Object.keys(specificDocNames).length;
    const checkedCount = Object.keys(checkedDocuments).length;
    const initialBuiltInCount = CATEGORIES.reduce((acc, cat) => acc + cat.documents.length, 0);
    const hasDeletedDocs = totalCount - customCount < initialBuiltInCount;
    const hasCustomizations = customCount > 0 || editedCount > 0 || overrideCount > 0 || specificCount > 0 || checkedCount > 0 || hasDeletedDocs;
    return { totalCount, customCount, checkedCount, hasCustomizations };
  }, [documentOrder, customDocuments, editedDocuments, canDelegateOverrides, specificDocNames, checkedDocuments]);

  return {
    // state
    expandedCategories, customDocuments, documentOrder,
    editedDocuments, canDelegateOverrides, specificDocNames, checkedDocuments,
    deleteConfirmation,
    clientName, deceasedName, deadline, personInCharge, personInChargeContact, stats,
    // モーダル
    ...modal,
    // handlers
    setClientName, setDeceasedName, setDeadline, setPersonInCharge, setPersonInChargeContact,
    toggleExpanded,
    reorderDocuments, toggleCanDelegate,
    addSpecificName, editSpecificName, removeSpecificName,
    toggleDocumentCheck, toggleAllInCategory,
    requestDelete, requestDeleteCategory, confirmDelete, cancelDelete,
    resetToDefault,
    exportToJson, importFromJson, getSelectedDocuments,
  };
}
