import { useState, useEffect, useMemo, useCallback } from 'react';
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
import { exportToExcel } from '@/utils/exportExcel';
import { CategoryGroup } from '@/types';
import { SortableCategory } from './document-list/SortableCategory';
import { fetchStaff } from '@/utils/api';
import { generateInitialDocumentGroups } from '@/utils/documentUtils';
import { useDocumentListEditing } from '@/hooks/useDocumentListEditing';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { EditorToolbar } from './document-list/EditorToolbar';
import { PrintHeader } from './document-list/PrintHeader';
import { PrintFooter } from './document-list/PrintFooter';
import { AddCategorySection } from './document-list/AddCategorySection';
import { buildCategoryHandlers, buildDocHandlers, buildSubItemHandlers } from './document-list/buildHandlers';

interface DocumentListScreenProps {
  customerId: number;
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
  customerId,
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
  const [staffList, setStaffList] = useState<{ id: number; staff_name: string; mobile_number?: string | null }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchStaff()
      .then((data) => setStaffList(data))
      .catch(() => { /* staff list is optional, fail silently */ });
  }, []);

  const editing = useDocumentListEditing({ documentGroups, onDocumentGroupsChange });
  const subItemHandlers = buildSubItemHandlers(editing);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 検索フィルタ: マッチするグループIDのセット
  const searchMatchGroups = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.trim().toLowerCase();
    const matchingIds = new Set<string>();
    documentGroups.forEach((group) => {
      if (group.category.toLowerCase().includes(q)) {
        matchingIds.add(group.id);
        return;
      }
      const hasMatchingDoc = group.documents.some(
        (doc) =>
          doc.text.toLowerCase().includes(q) ||
          doc.subItems?.some((s) => s.text.toLowerCase().includes(q))
      );
      if (hasMatchingDoc) matchingIds.add(group.id);
    });
    return matchingIds;
  }, [searchQuery, documentGroups]);

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

  const handleDocumentsReorder = (groupId: string, activeId: string, overId: string) => {
    const newGroups = documentGroups.map((group) => {
      if (group.id === groupId) {
        const oldIndex = group.documents.findIndex((d) => d.id === activeId);
        const newIndex = group.documents.findIndex((d) => d.id === overId);
        return { ...group, documents: arrayMove(group.documents, oldIndex, newIndex) };
      }
      return group;
    });
    onDocumentGroupsChange(newGroups);
  };

  const handleExportExcel = () => {
    const currentStaff = staffList.find((s) => s.staff_name === staffName);
    exportToExcel(documentGroups, year, customerName, staffName, currentStaff?.mobile_number || undefined);
  };

  const resetDialog = useConfirmDialog();

  const handleResetToDefault = useCallback(() => {
    resetDialog.open();
  }, [resetDialog]);

  const confirmReset = useCallback(() => {
    resetDialog.close();
    onDocumentGroupsChange(generateInitialDocumentGroups(year));
  }, [onDocumentGroupsChange, year, resetDialog]);

  const currentStaffMobile = useMemo(
    () => staffList.find((s) => s.staff_name === staffName)?.mobile_number,
    [staffList, staffName]
  );

  return (
    <main className="bg-slate-50 min-h-screen">
      <EditorToolbar
        customerId={customerId}
        year={year}
        customerName={customerName}
        staffName={staffName}
        documentGroups={documentGroups}
        onDocumentGroupsChange={onDocumentGroupsChange}
        onBack={onBack}
        onSave={onSave}
        onLoad={onLoad}
        onCopyToNextYear={onCopyToNextYear}
        onResetToDefault={handleResetToDefault}
        onExportExcel={handleExportExcel}
        isSaving={isSaving}
        isLoading={isLoading}
        lastSaved={lastSaved}
        saveError={saveError}
        printLayout={printLayout}
        onPrintLayoutChange={setPrintLayout}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onExpandAll={editing.expandAll}
        onCollapseAll={editing.collapseAll}
      />

      <PrintHeader
        year={year}
        customerName={customerName}
        staffName={staffName}
        staffMobile={currentStaffMobile}
      />

      <div className="max-w-7xl mx-auto px-4 py-8 pb-32 print:p-0 print:pb-0">
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
              {documentGroups.map((group) => {
                if (searchMatchGroups !== null && !searchMatchGroups.has(group.id)) return null;

                return (
                  <div key={group.id} className="print:mb-1">
                    <SortableCategory
                      group={group}
                      isExpanded={editing.expandedGroups[group.id] || false}
                      onToggleExpand={() => editing.toggleGroup(group.id)}
                      onToggleCheckAll={() => editing.toggleCategoryCheckAll(group.id)}
                      searchQuery={searchQuery}
                      categoryHandlers={buildCategoryHandlers(editing, group)}
                      docHandlers={buildDocHandlers(editing, (activeId, overId) =>
                        handleDocumentsReorder(group.id, activeId, overId)
                      )}
                      subItemHandlers={subItemHandlers}
                    />
                  </div>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>

        {searchMatchGroups !== null && searchMatchGroups.size === 0 && (
          <div className="text-center py-12 text-slate-500">
            「{searchQuery}」に一致する書類が見つかりません
          </div>
        )}

        <div className="mt-8 pt-8 border-t border-slate-200 no-print">
          <AddCategorySection
            addingNewCategory={editing.addingNewCategory}
            newCategoryName={editing.newCategoryName}
            onNewCategoryNameChange={editing.setNewCategoryName}
            onStartAdd={() => editing.setAddingNewCategory(true)}
            onAdd={editing.addCategory}
            onCancel={() => {
              editing.setAddingNewCategory(false);
              editing.setNewCategoryName('');
            }}
            onRestore={editing.restoreCategory}
            documentGroups={documentGroups}
            year={year}
          />
        </div>
      </div>

      <PrintFooter year={year} />

      <ConfirmDialog
        open={resetDialog.isOpen}
        title="標準リストに戻す"
        message="標準の状態に戻しますか？現在の変更はすべて失われます。"
        confirmLabel="リセット"
        variant="danger"
        onConfirm={confirmReset}
        onCancel={resetDialog.close}
      />
    </main>
  );
}
