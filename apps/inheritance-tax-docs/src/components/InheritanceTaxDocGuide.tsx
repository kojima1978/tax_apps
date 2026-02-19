import { useDocumentGuide } from '../hooks/useDocumentGuide';
import { UnifiedDocumentView } from './UnifiedDocumentView';
import { DocumentFormModal } from './ui/DocumentFormModal';

export default function InheritanceTaxDocGuide() {
  const {
    // state
    expandedCategories, customDocuments, documentOrder,
    editedDocuments, canDelegateOverrides, specificDocNames, checkedDocuments,
    deleteConfirmation,
    clientName, deceasedName, deadline, personInCharge, personInChargeContact, stats,
    // モーダル
    editingDocId, editingDocData, isModalOpen, modalVariant,
    // handlers
    setClientName, setDeceasedName, setDeadline, setPersonInCharge, setPersonInChargeContact,
    toggleExpanded,
    reorderDocuments,
    toggleCanDelegate,
    addSpecificName, editSpecificName, removeSpecificName,
    toggleDocumentCheck, toggleAllInCategory,
    requestDelete, requestDeleteCategory, confirmDelete, cancelDelete,
    resetToDefault,
    exportToJson, importFromJson, getSelectedDocuments,
    openEditModal, openAddModal, closeModal,
    handleEditSubmit, handleAddSubmit,
  } = useDocumentGuide();

  return (
    <>
      <UnifiedDocumentView
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
        deleteConfirmation={deleteConfirmation}
        stats={stats}
        onClientNameChange={setClientName}
        onDeceasedNameChange={setDeceasedName}
        onDeadlineChange={setDeadline}
        onPersonInChargeChange={setPersonInCharge}
        onPersonInChargeContactChange={setPersonInChargeContact}
        onToggleExpanded={toggleExpanded}
        onReorderDocuments={reorderDocuments}
        onToggleCanDelegate={toggleCanDelegate}
        onAddSpecificName={addSpecificName}
        onEditSpecificName={editSpecificName}
        onRemoveSpecificName={removeSpecificName}
        onToggleDocumentCheck={toggleDocumentCheck}
        onToggleAllInCategory={toggleAllInCategory}
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
