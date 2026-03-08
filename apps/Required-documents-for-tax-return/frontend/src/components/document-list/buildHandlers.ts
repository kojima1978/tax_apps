import type { useDocumentListEditing } from '@/hooks/useDocumentListEditing';
import type { CategoryEditHandlers, DocHandlers } from './SortableCategory';
import type { SubItemHandlers } from './SortableDocumentItem';

type Editing = ReturnType<typeof useDocumentListEditing>;

export function buildCategoryHandlers(
  editing: Editing,
  group: { id: string; category: string }
): CategoryEditHandlers {
  return {
    editingCategoryId: editing.editingCategoryId,
    editCategoryName: editing.editCategoryName,
    onEditCategoryNameChange: editing.setEditCategoryName,
    onSaveEditCategory: editing.saveEditCategory,
    onCancelEditCategory: editing.cancelEditCategory,
    onStartEditCategory: () => editing.startEditCategory(group.id, group.category),
    onDeleteCategory: () => editing.deleteCategory(group.id),
  };
}

export function buildDocHandlers(
  editing: Editing,
  onReorder: (activeId: string, overId: string) => void
): DocHandlers {
  return {
    editingDocId: editing.editingDocId,
    editText: editing.editText,
    onEditTextChange: editing.setEditText,
    onSaveEditDocument: editing.saveEditDocument,
    onCancelEditDocument: editing.cancelEditDocument,
    onStartEditDocument: editing.startEditDocument,
    onToggleDocumentCheck: editing.toggleDocumentCheck,
    onDeleteDocument: editing.deleteDocument,
    addingToGroupId: editing.addingToGroupId,
    newDocText: editing.newDocText,
    onNewDocTextChange: editing.setNewDocText,
    onStartAddDocument: editing.startAddDocument,
    onAddDocument: editing.addDocument,
    onCancelAddDocument: editing.cancelAddDocument,
    onDocumentsReorder: onReorder,
  };
}

export function buildSubItemHandlers(editing: Editing): SubItemHandlers {
  return {
    editingSubItemId: editing.editingSubItemId,
    editSubItemText: editing.editSubItemText,
    onEditSubItemTextChange: editing.setEditSubItemText,
    onStartEditSubItem: editing.startEditSubItem,
    onSaveEditSubItem: editing.saveEditSubItem,
    onCancelEditSubItem: editing.cancelEditSubItem,
    onToggleSubItemCheck: editing.toggleSubItemCheck,
    onDeleteSubItem: editing.deleteSubItem,
    addingSubItemToDocId: editing.addingSubItemToDocId,
    newSubItemText: editing.newSubItemText,
    onNewSubItemTextChange: editing.setNewSubItemText,
    onAddSubItem: editing.addSubItem,
    onStartAddSubItem: editing.startAddSubItem,
    onCancelAddSubItem: editing.cancelAddSubItem,
  };
}
