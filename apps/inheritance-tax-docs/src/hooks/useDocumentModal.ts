import { useState, useCallback, useMemo } from 'react';
import { CATEGORIES, type CustomDocumentItem, type DocChanges } from '../constants/documents';

interface UseDocumentModalParams {
  editedDocuments: Record<string, DocChanges>;
  customDocuments: CustomDocumentItem[];
  editDocument: (docId: string, changes: DocChanges) => void;
  addCustomDocument: (categoryId: string, name: string, description: string, howToGet: string) => void;
}

export function useDocumentModal({
  editedDocuments,
  customDocuments,
  editDocument,
  addCustomDocument,
}: UseDocumentModalParams) {
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [addingToCategoryId, setAddingToCategoryId] = useState<string | null>(null);

  const editingDocData = useMemo(() => {
    if (!editingDocId) return undefined;
    const edited = editedDocuments[editingDocId];
    for (const cat of CATEGORIES) {
      const doc = cat.documents.find((d) => d.id === editingDocId);
      if (doc) {
        return {
          name: edited?.name ?? doc.name,
          description: edited?.description ?? doc.description,
          howToGet: edited?.howToGet ?? doc.howToGet,
        };
      }
    }
    const customDoc = customDocuments.find((d) => d.id === editingDocId);
    if (customDoc) {
      return {
        name: edited?.name ?? customDoc.name,
        description: edited?.description ?? customDoc.description,
        howToGet: edited?.howToGet ?? customDoc.howToGet,
      };
    }
    return undefined;
  }, [editingDocId, editedDocuments, customDocuments]);

  const openEditModal = useCallback((docId: string) => { setEditingDocId(docId); }, []);
  const openAddModal = useCallback((categoryId: string) => { setAddingToCategoryId(categoryId); }, []);
  const closeModal = useCallback(() => { setEditingDocId(null); setAddingToCategoryId(null); }, []);

  const handleEditSubmit = useCallback((values: { name: string; description: string; howToGet: string }) => {
    if (editingDocId) editDocument(editingDocId, values);
    closeModal();
  }, [editingDocId, editDocument, closeModal]);

  const handleAddSubmit = useCallback((values: { name: string; description: string; howToGet: string }) => {
    if (addingToCategoryId) addCustomDocument(addingToCategoryId, values.name, values.description, values.howToGet);
    closeModal();
  }, [addingToCategoryId, addCustomDocument, closeModal]);

  return {
    editingDocId,
    editingDocData,
    isModalOpen: editingDocId !== null || addingToCategoryId !== null,
    modalVariant: (editingDocId ? 'edit' : 'add') as 'edit' | 'add',
    openEditModal,
    openAddModal,
    closeModal,
    handleEditSubmit,
    handleAddSubmit,
  };
}
