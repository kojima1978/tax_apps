import { useState, useCallback } from 'react';
import { CategoryGroup } from '@/types';

// 編集状態の型定義
export interface EditingDoc {
  id: string | null;
  text: string;
}

export interface EditingSubItem {
  id: string | null;
  text: string;
}

export interface AddingSubItemTo {
  docId: string | null;
  text: string;
}

interface UseDocumentListEditingParams {
  documentGroups: CategoryGroup[];
  onDocumentGroupsChange: (groups: CategoryGroup[]) => void;
}

export function useDocumentListEditing({
  documentGroups,
  onDocumentGroupsChange,
}: UseDocumentListEditingParams) {
  // 書類編集
  const [editingDoc, setEditingDoc] = useState<EditingDoc>({ id: null, text: '' });
  const [addingToGroupId, setAddingToGroupId] = useState<string | null>(null);
  const [newDocText, setNewDocText] = useState('');

  // カテゴリ編集
  const [addingNewCategory, setAddingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');

  // サブアイテム編集
  const [editingSubItem, setEditingSubItem] = useState<EditingSubItem>({ id: null, text: '' });
  const [addingSubItemTo, setAddingSubItemTo] = useState<AddingSubItemTo>({ docId: null, text: '' });

  // 展開状態
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const expanded: Record<string, boolean> = {};
    documentGroups.forEach((group) => {
      expanded[group.id] = true;
    });
    return expanded;
  });

  // ドラッグ状態
  const [activeId, setActiveId] = useState<string | null>(null);

  // --- ユーティリティ ---
  const updateGroups = useCallback(
    (updater: (groups: CategoryGroup[]) => CategoryGroup[]) => {
      onDocumentGroupsChange(updater(documentGroups));
    },
    [documentGroups, onDocumentGroupsChange]
  );

  // --- カテゴリ操作 ---
  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  }, []);

  const startEditCategory = useCallback((groupId: string, currentName: string) => {
    setEditingCategoryId(groupId);
    setEditCategoryName(currentName);
  }, []);

  const saveEditCategory = useCallback(() => {
    if (!editCategoryName.trim()) return;
    updateGroups((groups) =>
      groups.map((g) =>
        g.id === editingCategoryId ? { ...g, category: editCategoryName } : g
      )
    );
    setEditingCategoryId(null);
    setEditCategoryName('');
  }, [editCategoryName, editingCategoryId, updateGroups]);

  const cancelEditCategory = useCallback(() => {
    setEditingCategoryId(null);
    setEditCategoryName('');
  }, []);

  const deleteCategory = useCallback(
    (groupId: string) => {
      if (!confirm('このカテゴリとその中の全ての書類を削除してもよろしいですか？')) return;
      onDocumentGroupsChange(documentGroups.filter((g) => g.id !== groupId));
    },
    [documentGroups, onDocumentGroupsChange]
  );

  const addCategory = useCallback(() => {
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
  }, [newCategoryName, documentGroups, onDocumentGroupsChange]);

  const restoreCategory = useCallback(
    (newGroup: CategoryGroup) => {
      onDocumentGroupsChange([...documentGroups, newGroup]);
      setExpandedGroups((prev) => ({ ...prev, [newGroup.id]: true }));
      setAddingNewCategory(false);
      setNewCategoryName('');
    },
    [documentGroups, onDocumentGroupsChange]
  );

  // --- 書類操作 ---
  const toggleDocumentCheck = useCallback(
    (groupId: string, docId: string) => {
      updateGroups((groups) =>
        groups.map((g) =>
          g.id === groupId
            ? {
                ...g,
                documents: g.documents.map((doc) =>
                  doc.id === docId ? { ...doc, checked: !doc.checked } : doc
                ),
              }
            : g
        )
      );
    },
    [updateGroups]
  );

  const startEditDocument = useCallback((docId: string, currentText: string) => {
    setEditingDoc({ id: docId, text: currentText });
  }, []);

  const saveEditDocument = useCallback(
    (groupId: string) => {
      if (!editingDoc.text.trim()) return;
      updateGroups((groups) =>
        groups.map((g) =>
          g.id === groupId
            ? {
                ...g,
                documents: g.documents.map((doc) =>
                  doc.id === editingDoc.id ? { ...doc, text: editingDoc.text } : doc
                ),
              }
            : g
        )
      );
      setEditingDoc({ id: null, text: '' });
    },
    [editingDoc, updateGroups]
  );

  const cancelEditDocument = useCallback(() => {
    setEditingDoc({ id: null, text: '' });
  }, []);

  const deleteDocument = useCallback(
    (groupId: string, docId: string) => {
      if (!confirm('この書類を削除してもよろしいですか？')) return;
      updateGroups((groups) =>
        groups.map((g) =>
          g.id === groupId
            ? { ...g, documents: g.documents.filter((doc) => doc.id !== docId) }
            : g
        )
      );
    },
    [updateGroups]
  );

  const startAddDocument = useCallback((groupId: string) => {
    setAddingToGroupId(groupId);
    setNewDocText('');
  }, []);

  const addDocument = useCallback(
    (groupId: string) => {
      if (!newDocText.trim()) return;
      const newDocId = `doc_${Date.now()}`;
      updateGroups((groups) =>
        groups.map((g) =>
          g.id === groupId
            ? {
                ...g,
                documents: [
                  ...g.documents,
                  { id: newDocId, text: newDocText, checked: false, subItems: [] },
                ],
              }
            : g
        )
      );
      setAddingToGroupId(null);
      setNewDocText('');
    },
    [newDocText, updateGroups]
  );

  const cancelAddDocument = useCallback(() => {
    setAddingToGroupId(null);
    setNewDocText('');
  }, []);

  // --- サブアイテム操作 ---
  const toggleSubItemCheck = useCallback(
    (groupId: string, docId: string, subItemId: string) => {
      updateGroups((groups) =>
        groups.map((g) =>
          g.id === groupId
            ? {
                ...g,
                documents: g.documents.map((doc) =>
                  doc.id === docId && doc.subItems
                    ? {
                        ...doc,
                        subItems: doc.subItems.map((sub) =>
                          sub.id === subItemId ? { ...sub, checked: !sub.checked } : sub
                        ),
                      }
                    : doc
                ),
              }
            : g
        )
      );
    },
    [updateGroups]
  );

  const startEditSubItem = useCallback((subItemId: string, currentText: string) => {
    setEditingSubItem({ id: subItemId, text: currentText });
  }, []);

  const saveEditSubItem = useCallback(
    (groupId: string, docId: string) => {
      if (!editingSubItem.text.trim()) return;
      updateGroups((groups) =>
        groups.map((g) =>
          g.id === groupId
            ? {
                ...g,
                documents: g.documents.map((doc) =>
                  doc.id === docId && doc.subItems
                    ? {
                        ...doc,
                        subItems: doc.subItems.map((sub) =>
                          sub.id === editingSubItem.id
                            ? { ...sub, text: editingSubItem.text }
                            : sub
                        ),
                      }
                    : doc
                ),
              }
            : g
        )
      );
      setEditingSubItem({ id: null, text: '' });
    },
    [editingSubItem, updateGroups]
  );

  const cancelEditSubItem = useCallback(() => {
    setEditingSubItem({ id: null, text: '' });
  }, []);

  const deleteSubItem = useCallback(
    (groupId: string, docId: string, subItemId: string) => {
      if (!confirm('この小項目を削除してもよろしいですか？')) return;
      updateGroups((groups) =>
        groups.map((g) =>
          g.id === groupId
            ? {
                ...g,
                documents: g.documents.map((doc) =>
                  doc.id === docId && doc.subItems
                    ? { ...doc, subItems: doc.subItems.filter((sub) => sub.id !== subItemId) }
                    : doc
                ),
              }
            : g
        )
      );
    },
    [updateGroups]
  );

  const startAddSubItem = useCallback((docId: string) => {
    setAddingSubItemTo({ docId, text: '' });
  }, []);

  const addSubItem = useCallback(
    (groupId: string, docId: string) => {
      if (!addingSubItemTo.text.trim()) return;
      const newSubItemId = `sub_${Date.now()}`;
      updateGroups((groups) =>
        groups.map((g) =>
          g.id === groupId
            ? {
                ...g,
                documents: g.documents.map((doc) =>
                  doc.id === docId
                    ? {
                        ...doc,
                        subItems: [
                          ...(doc.subItems || []),
                          { id: newSubItemId, text: addingSubItemTo.text, checked: false },
                        ],
                      }
                    : doc
                ),
              }
            : g
        )
      );
      setAddingSubItemTo({ docId: null, text: '' });
    },
    [addingSubItemTo.text, updateGroups]
  );

  const cancelAddSubItem = useCallback(() => {
    setAddingSubItemTo({ docId: null, text: '' });
  }, []);

  return {
    // カテゴリ編集状態
    expandedGroups,
    activeId,
    setActiveId,
    addingNewCategory,
    setAddingNewCategory,
    newCategoryName,
    setNewCategoryName,
    editingCategoryId,
    editCategoryName,
    setEditCategoryName: (name: string) => setEditCategoryName(name),

    // 書類編集状態
    editingDocId: editingDoc.id,
    editText: editingDoc.text,
    setEditText: (text: string) => setEditingDoc((prev) => ({ ...prev, text })),
    addingToGroupId,
    newDocText,
    setNewDocText,

    // サブアイテム編集状態
    editingSubItemId: editingSubItem.id,
    editSubItemText: editingSubItem.text,
    setEditSubItemText: (text: string) => setEditingSubItem((prev) => ({ ...prev, text })),
    addingSubItemToDocId: addingSubItemTo.docId,
    newSubItemText: addingSubItemTo.text,
    setNewSubItemText: (text: string) => setAddingSubItemTo((prev) => ({ ...prev, text })),

    // カテゴリ操作
    toggleGroup,
    startEditCategory,
    saveEditCategory,
    cancelEditCategory,
    deleteCategory,
    addCategory,
    restoreCategory,

    // 書類操作
    toggleDocumentCheck,
    startEditDocument,
    saveEditDocument,
    cancelEditDocument,
    deleteDocument,
    startAddDocument,
    addDocument,
    cancelAddDocument,

    // サブアイテム操作
    toggleSubItemCheck,
    startEditSubItem,
    saveEditSubItem,
    cancelEditSubItem,
    deleteSubItem,
    startAddSubItem,
    addSubItem,
    cancelAddSubItem,
  };
}
