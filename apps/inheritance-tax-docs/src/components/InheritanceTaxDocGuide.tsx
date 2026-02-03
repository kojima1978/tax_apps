'use client';

import { useState, useCallback, useMemo } from 'react';
import { CATEGORIES, type CategoryData, type DocumentItem, type CustomDocumentItem } from '../constants/documents';
import { SelectionScreen } from './SelectionScreen';
import { ResultScreen } from './ResultScreen';
import { createExportData, downloadAsJson, type ExportData } from '../utils/jsonDataManager';

type Step = 'select' | 'result';

// 全カテゴリを展開状態で初期化
function initializeExpanded() {
  const expanded: Record<string, boolean> = {};
  CATEGORIES.forEach((category) => {
    expanded[category.id] = true;
  });
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

// ユニークIDを生成
function generateId() {
  return `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export default function InheritanceTaxDocGuide() {
  const [step, setStep] = useState<Step>('select');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => initializeExpanded());
  const [deletedDocuments, setDeletedDocuments] = useState<Record<string, boolean>>({});
  const [customDocuments, setCustomDocuments] = useState<CustomDocumentItem[]>([]);
  const [documentOrder, setDocumentOrder] = useState<Record<string, string[]>>(() => initializeDocumentOrder());
  const [editedDocuments, setEditedDocuments] = useState<Record<string, { name?: string; description?: string; howToGet?: string }>>({});
  const [canDelegateOverrides, setCanDelegateOverrides] = useState<Record<string, boolean>>({});
  const [clientName, setClientName] = useState('');
  const [deceasedName, setDeceasedName] = useState('');
  const [deadline, setDeadline] = useState('');

  // 展開切り替え
  const toggleExpanded = useCallback((categoryId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  }, []);

  // 書類を削除（斜線表示）
  const deleteDocument = useCallback((docId: string) => {
    setDeletedDocuments((prev) => ({ ...prev, [docId]: true }));
  }, []);

  // 書類を復元
  const restoreDocument = useCallback((docId: string) => {
    setDeletedDocuments((prev) => {
      const newState = { ...prev };
      delete newState[docId];
      return newState;
    });
  }, []);

  // カスタム書類を追加
  const addCustomDocument = useCallback((categoryId: string, name: string, description: string, howToGet: string) => {
    const newDoc: CustomDocumentItem = {
      id: generateId(),
      categoryId,
      name,
      description,
      howToGet,
      isCustom: true,
    };
    setCustomDocuments((prev) => [...prev, newDoc]);
    // 順序にも追加
    setDocumentOrder((prev) => ({
      ...prev,
      [categoryId]: [...(prev[categoryId] || []), newDoc.id],
    }));
  }, []);

  // カスタム書類を削除（完全削除）
  const removeCustomDocument = useCallback((docId: string, categoryId: string) => {
    setCustomDocuments((prev) => prev.filter((doc) => doc.id !== docId));
    // 順序からも削除
    setDocumentOrder((prev) => ({
      ...prev,
      [categoryId]: (prev[categoryId] || []).filter((id) => id !== docId),
    }));
  }, []);

  // 書類の並び順を更新
  const reorderDocuments = useCallback((categoryId: string, newOrder: string[]) => {
    setDocumentOrder((prev) => ({
      ...prev,
      [categoryId]: newOrder,
    }));
  }, []);

  // 書類の内容を編集
  const editDocument = useCallback((docId: string, changes: { name?: string; description?: string; howToGet?: string }) => {
    setEditedDocuments((prev) => ({
      ...prev,
      [docId]: {
        ...prev[docId],
        ...changes,
      },
    }));
    // カスタム書類の場合は元データも更新
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

  // 取得代行可のオン/オフを切り替え
  const toggleCanDelegate = useCallback((docId: string, originalCanDelegate: boolean) => {
    setCanDelegateOverrides((prev) => {
      const currentOverride = prev[docId];
      // 現在の状態を取得（オーバーライドがあればそれを、なければ元の値）
      const currentValue = currentOverride !== undefined ? currentOverride : originalCanDelegate;
      // トグル
      const newValue = !currentValue;
      // 元の値と同じになったらオーバーライドを削除
      if (newValue === originalCanDelegate) {
        const newState = { ...prev };
        delete newState[docId];
        return newState;
      }
      return { ...prev, [docId]: newValue };
    });
  }, []);

  // データをJSONでエクスポート
  const exportToJson = useCallback(() => {
    const exportData = createExportData({
      clientName,
      deceasedName,
      deadline,
      deletedDocuments,
      customDocuments,
      documentOrder,
      editedDocuments,
      canDelegateOverrides,
    });
    downloadAsJson(exportData);
  }, [clientName, deceasedName, deadline, deletedDocuments, customDocuments, documentOrder, editedDocuments, canDelegateOverrides]);

  // JSONからデータをインポート
  const importFromJson = useCallback((data: ExportData) => {
    setClientName(data.data.clientName);
    setDeceasedName(data.data.deceasedName);
    setDeadline(data.data.deadline);
    setDeletedDocuments(data.data.deletedDocuments);
    setCustomDocuments(data.data.customDocuments);
    setDocumentOrder(data.data.documentOrder);
    setEditedDocuments(data.data.editedDocuments);
    setCanDelegateOverrides(data.data.canDelegateOverrides);
  }, []);

  // 選択された（削除されていない）書類を取得（順序付き、編集内容・canDelegate反映）
  const getSelectedDocuments = useCallback((): { category: CategoryData; documents: (DocumentItem | CustomDocumentItem)[] }[] => {
    const result: { category: CategoryData; documents: (DocumentItem | CustomDocumentItem)[] }[] = [];

    CATEGORIES.forEach((category) => {
      const order = documentOrder[category.id] || [];

      // 全書類をマップに格納（編集内容とcanDelegateを反映）
      const docMap = new Map<string, DocumentItem | CustomDocumentItem>();
      category.documents.forEach((doc) => {
        if (!deletedDocuments[doc.id]) {
          const edited = editedDocuments[doc.id];
          const canDelegateOverride = canDelegateOverrides[doc.id];
          const finalCanDelegate = canDelegateOverride !== undefined ? canDelegateOverride : doc.canDelegate;

          docMap.set(doc.id, {
            ...doc,
            name: edited?.name ?? doc.name,
            description: edited?.description ?? doc.description,
            howToGet: edited?.howToGet ?? doc.howToGet,
            canDelegate: finalCanDelegate,
          });
        }
      });
      customDocuments
        .filter((doc) => doc.categoryId === category.id)
        .forEach((doc) => {
          const canDelegateOverride = canDelegateOverrides[doc.id];
          // カスタム書類はデフォルトfalse
          const finalCanDelegate = canDelegateOverride !== undefined ? canDelegateOverride : false;
          docMap.set(doc.id, {
            ...doc,
            canDelegate: finalCanDelegate,
          } as CustomDocumentItem & { canDelegate: boolean });
        });

      // 順序に従ってソート
      const orderedDocs: (DocumentItem | CustomDocumentItem)[] = [];
      order.forEach((docId) => {
        const doc = docMap.get(docId);
        if (doc) {
          orderedDocs.push(doc);
          docMap.delete(docId);
        }
      });
      // 順序に含まれない書類を末尾に追加
      docMap.forEach((doc) => orderedDocs.push(doc));

      if (orderedDocs.length > 0) {
        result.push({ category, documents: orderedDocs });
      }
    });

    return result;
  }, [deletedDocuments, customDocuments, documentOrder, editedDocuments, canDelegateOverrides]);

  // 全復元
  const restoreAll = useCallback(() => {
    setDeletedDocuments({});
  }, []);

  // 統計情報を計算
  const stats = useMemo(() => {
    const totalBuiltIn = CATEGORIES.reduce((acc, cat) => acc + cat.documents.length, 0);
    const deletedCount = Object.keys(deletedDocuments).length;
    const customCount = customDocuments.length;
    const activeCount = totalBuiltIn - deletedCount + customCount;
    return { totalBuiltIn, deletedCount, customCount, activeCount };
  }, [deletedDocuments, customDocuments]);

  // 選択画面
  if (step === 'select') {
    return (
      <SelectionScreen
        clientName={clientName}
        deceasedName={deceasedName}
        deadline={deadline}
        expandedCategories={expandedCategories}
        deletedDocuments={deletedDocuments}
        customDocuments={customDocuments}
        documentOrder={documentOrder}
        editedDocuments={editedDocuments}
        canDelegateOverrides={canDelegateOverrides}
        stats={stats}
        onClientNameChange={setClientName}
        onDeceasedNameChange={setDeceasedName}
        onDeadlineChange={setDeadline}
        onToggleExpanded={toggleExpanded}
        onDeleteDocument={deleteDocument}
        onRestoreDocument={restoreDocument}
        onAddCustomDocument={addCustomDocument}
        onRemoveCustomDocument={removeCustomDocument}
        onReorderDocuments={reorderDocuments}
        onEditDocument={editDocument}
        onToggleCanDelegate={toggleCanDelegate}
        onRestoreAll={restoreAll}
        onPreview={() => setStep('result')}
        onExportJson={exportToJson}
        onImportJson={importFromJson}
      />
    );
  }

  // 結果画面（プレビュー/印刷用）
  const results = getSelectedDocuments();

  return (
    <ResultScreen
      results={results}
      isFullListMode={false}
      clientName={clientName}
      deceasedName={deceasedName}
      deadline={deadline}
      onBack={() => setStep('select')}
      onExportJson={exportToJson}
      onImportJson={importFromJson}
    />
  );
}
