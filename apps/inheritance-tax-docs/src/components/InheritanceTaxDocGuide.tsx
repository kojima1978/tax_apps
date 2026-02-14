'use client';

import { useDocumentGuide } from '../hooks/useDocumentGuide';
import { UnifiedDocumentView } from './UnifiedDocumentView';
import { DocumentFormModal } from './ui/DocumentFormModal';

export default function InheritanceTaxDocGuide() {
  const {
    // state
    expandedCategories, deletedDocuments, customDocuments, documentOrder,
    editedDocuments, canDelegateOverrides, specificDocNames,
    clientName, deceasedName, deadline, personInCharge, personInChargeContact, stats,
    // モーダル
    editingDocId, editingDocData, isModalOpen, modalVariant,
    // handlers
    setClientName, setDeceasedName, setDeadline, setPersonInCharge, setPersonInChargeContact,
    toggleExpanded, deleteDocument, restoreDocument,
    removeCustomDocument, reorderDocuments,
    toggleCanDelegate,
    addSpecificName, editSpecificName, removeSpecificName,
    deleteAllInCategory, restoreAllInCategory, restoreAll, resetToDefault,
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
        deletedDocuments={deletedDocuments}
        customDocuments={customDocuments}
        documentOrder={documentOrder}
        editedDocuments={editedDocuments}
        canDelegateOverrides={canDelegateOverrides}
        specificDocNames={specificDocNames}
        stats={stats}
        onClientNameChange={setClientName}
        onDeceasedNameChange={setDeceasedName}
        onDeadlineChange={setDeadline}
        onPersonInChargeChange={setPersonInCharge}
        onPersonInChargeContactChange={setPersonInChargeContact}
        onToggleExpanded={toggleExpanded}
        onDeleteDocument={deleteDocument}
        onRestoreDocument={restoreDocument}
        onDeleteAllInCategory={deleteAllInCategory}
        onRestoreAllInCategory={restoreAllInCategory}
        onRemoveCustomDocument={removeCustomDocument}
        onReorderDocuments={reorderDocuments}
        onToggleCanDelegate={toggleCanDelegate}
        onAddSpecificName={addSpecificName}
        onEditSpecificName={editSpecificName}
        onRemoveSpecificName={removeSpecificName}
        onRestoreAll={restoreAll}
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
