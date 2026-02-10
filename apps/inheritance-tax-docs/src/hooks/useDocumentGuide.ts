import { useState, useCallback, useMemo } from 'react';
import { CATEGORIES, type CategoryData, type DocumentItem, type CustomDocumentItem, type DocChanges } from '../constants/documents';
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

export function useDocumentGuide() {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => initializeExpanded());
  const [deletedDocuments, setDeletedDocuments] = useState<Record<string, boolean>>({});
  const [customDocuments, setCustomDocuments] = useState<CustomDocumentItem[]>([]);
  const [documentOrder, setDocumentOrder] = useState<Record<string, string[]>>(() => initializeDocumentOrder());
  const [editedDocuments, setEditedDocuments] = useState<Record<string, DocChanges>>({});
  const [canDelegateOverrides, setCanDelegateOverrides] = useState<Record<string, boolean>>({});
  const [specificDocNames, setSpecificDocNames] = useState<Record<string, string[]>>({});
  const [clientName, setClientName] = useState('');
  const [deceasedName, setDeceasedName] = useState('');
  const [deadline, setDeadline] = useState('');

  const toggleExpanded = useCallback((categoryId: string) => {
    setExpandedCategories((prev) => ({ ...prev, [categoryId]: !prev[categoryId] }));
  }, []);

  const deleteDocument = useCallback((docId: string) => {
    setDeletedDocuments((prev) => ({ ...prev, [docId]: true }));
  }, []);

  const restoreDocument = useCallback((docId: string) => {
    setDeletedDocuments((prev) => {
      const newState = { ...prev };
      delete newState[docId];
      return newState;
    });
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

  const removeCustomDocument = useCallback((docId: string, categoryId: string) => {
    setCustomDocuments((prev) => prev.filter((doc) => doc.id !== docId));
    setDocumentOrder((prev) => ({
      ...prev,
      [categoryId]: (prev[categoryId] || []).filter((id) => id !== docId),
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

  const exportToJson = useCallback(() => {
    const exportData = createExportData({
      clientName, deceasedName, deadline,
      deletedDocuments, customDocuments, documentOrder,
      editedDocuments, canDelegateOverrides, specificDocNames,
    });
    downloadAsJson(exportData);
  }, [clientName, deceasedName, deadline, deletedDocuments, customDocuments, documentOrder, editedDocuments, canDelegateOverrides, specificDocNames]);

  const importFromJson = useCallback((data: ExportData) => {
    setClientName(data.data.clientName);
    setDeceasedName(data.data.deceasedName);
    setDeadline(data.data.deadline);
    setDeletedDocuments(data.data.deletedDocuments);
    setCustomDocuments(data.data.customDocuments);
    setDocumentOrder(data.data.documentOrder);
    setEditedDocuments(data.data.editedDocuments);
    setCanDelegateOverrides(data.data.canDelegateOverrides);
    setSpecificDocNames(data.data.specificDocNames ?? {});
  }, []);

  const getSelectedDocuments = useCallback((): { category: CategoryData; documents: (DocumentItem | CustomDocumentItem)[] }[] => {
    const result: { category: CategoryData; documents: (DocumentItem | CustomDocumentItem)[] }[] = [];
    CATEGORIES.forEach((category) => {
      const order = documentOrder[category.id] || [];
      const docMap = new Map<string, DocumentItem | CustomDocumentItem>();
      category.documents.forEach((doc) => {
        if (!deletedDocuments[doc.id]) {
          const edited = editedDocuments[doc.id];
          const override = canDelegateOverrides[doc.id];
          docMap.set(doc.id, {
            ...doc,
            name: edited?.name ?? doc.name,
            description: edited?.description ?? doc.description,
            howToGet: edited?.howToGet ?? doc.howToGet,
            canDelegate: override !== undefined ? override : doc.canDelegate,
          });
        }
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
        if (doc) { orderedDocs.push(doc); docMap.delete(docId); }
      });
      docMap.forEach((doc) => orderedDocs.push(doc));
      if (orderedDocs.length > 0) result.push({ category, documents: orderedDocs });
    });
    return result;
  }, [deletedDocuments, customDocuments, documentOrder, editedDocuments, canDelegateOverrides]);

  const deleteAllInCategory = useCallback((categoryId: string) => {
    const category = CATEGORIES.find(c => c.id === categoryId);
    if (!category) return;
    setDeletedDocuments(prev => {
      const newState = { ...prev };
      category.documents.forEach(doc => { newState[doc.id] = true; });
      return newState;
    });
  }, []);

  const restoreAllInCategory = useCallback((categoryId: string) => {
    const category = CATEGORIES.find(c => c.id === categoryId);
    if (!category) return;
    setDeletedDocuments(prev => {
      const newState = { ...prev };
      category.documents.forEach(doc => { delete newState[doc.id]; });
      return newState;
    });
  }, []);

  const restoreAll = useCallback(() => { setDeletedDocuments({}); }, []);

  const stats = useMemo(() => {
    const totalBuiltIn = CATEGORIES.reduce((acc, cat) => acc + cat.documents.length, 0);
    const deletedCount = Object.keys(deletedDocuments).length;
    const customCount = customDocuments.length;
    return { totalBuiltIn, deletedCount, customCount, activeCount: totalBuiltIn - deletedCount + customCount };
  }, [deletedDocuments, customDocuments]);

  return {
    // state
    expandedCategories, deletedDocuments, customDocuments, documentOrder,
    editedDocuments, canDelegateOverrides, specificDocNames,
    clientName, deceasedName, deadline, stats,
    // モーダル
    ...modal,
    // handlers
    setClientName, setDeceasedName, setDeadline,
    toggleExpanded, deleteDocument, restoreDocument,
    addCustomDocument, removeCustomDocument, reorderDocuments,
    editDocument, toggleCanDelegate,
    addSpecificName, editSpecificName, removeSpecificName,
    deleteAllInCategory, restoreAllInCategory, restoreAll,
    exportToJson, importFromJson, getSelectedDocuments,
  };
}
