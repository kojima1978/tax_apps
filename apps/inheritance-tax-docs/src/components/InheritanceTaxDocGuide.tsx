import { useDocumentGuide } from '../hooks/useDocumentGuide';
import { UnifiedDocumentView } from './UnifiedDocumentView';
import { DocumentFormModal } from './ui/DocumentFormModal';

export default function InheritanceTaxDocGuide() {
  const {
    // state
    isDirty, lastSavedAt,
    expandedCategories, customDocuments, documentOrder,
    editedDocuments, canDelegateOverrides, specificDocNames, checkedDocuments,
    checkedDates, documentMemos, excludedDocuments, urgentDocuments, disabledCategories,
    deleteConfirmation,
    clientName, deceasedName, deadline, personInCharge, personInChargeContact, stats,
    // モーダル
    editingDocId, editingDocData, isModalOpen, modalVariant,
    // handlers
    setClientName, setDeceasedName, setDeadline, setPersonInCharge, setPersonInChargeContact,
    toggleExpanded, expandAll, collapseAll,
    reorderDocuments,
    toggleCanDelegate,
    addSpecificName, editSpecificName, removeSpecificName, reorderSpecificNames,
    toggleDocumentCheck, toggleAllInCategory,
    setDocumentMemo, toggleExcluded, toggleUrgent, toggleCategoryDisabled,
    requestDelete, requestDeleteCategory, confirmDelete, cancelDelete,
    resetToDefault,
    exportToJson, importFromJson, getSelectedDocuments,
    openEditModal, openAddModal, closeModal,
    handleEditSubmit, handleAddSubmit,
  } = useDocumentGuide();

  return (
    <>
      <UnifiedDocumentView
        isDirty={isDirty}
        lastSavedAt={lastSavedAt}
        clientName={clientName}
        deceasedName={deceasedName}
        deadline={deadline}
        personInCharge={personInCharge}
        personInChargeContact={personInChargeContact}
        expandedCategories={expandedCategories}
        customDocuments={customDocuments}
        documentOrder={documentOrder}
        editedDocuments={editedDocuments}
        canDelegateOverrides={canDelegateOverrides}
        specificDocNames={specificDocNames}
        checkedDocuments={checkedDocuments}
        checkedDates={checkedDates}
        documentMemos={documentMemos}
        excludedDocuments={excludedDocuments}
        urgentDocuments={urgentDocuments}
        disabledCategories={disabledCategories}
        deleteConfirmation={deleteConfirmation}
        stats={stats}
        onClientNameChange={setClientName}
        onDeceasedNameChange={setDeceasedName}
        onDeadlineChange={setDeadline}
        onPersonInChargeChange={setPersonInCharge}
        onPersonInChargeContactChange={setPersonInChargeContact}
        onToggleExpanded={toggleExpanded}
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
        onReorderDocuments={reorderDocuments}
        onToggleCanDelegate={toggleCanDelegate}
        onAddSpecificName={addSpecificName}
        onEditSpecificName={editSpecificName}
        onRemoveSpecificName={removeSpecificName}
        onReorderSpecificNames={reorderSpecificNames}
        onToggleDocumentCheck={toggleDocumentCheck}
        onToggleAllInCategory={toggleAllInCategory}
        onSetDocumentMemo={setDocumentMemo}
        onToggleExcluded={toggleExcluded}
        onToggleUrgent={toggleUrgent}
        onToggleCategoryDisabled={toggleCategoryDisabled}
        onRemoveDocument={requestDelete}
        onRemoveCategory={requestDeleteCategory}
        onConfirmDelete={confirmDelete}
        onCancelDelete={cancelDelete}
        onResetToDefault={resetToDefault}
        onExportJson={exportToJson}
        onImportJson={importFromJson}
        onOpenAddModal={openAddModal}
        onStartEdit={openEditModal}
        getSelectedDocuments={getSelectedDocuments}
      />
      <DocumentFormModal
        isOpen={isModalOpen}
        variant={modalVariant}
        initialValues={editingDocId ? editingDocData : undefined}
        onSubmit={editingDocId ? handleEditSubmit : handleAddSubmit}
        onClose={closeModal}
      />
    </>
  );
}
