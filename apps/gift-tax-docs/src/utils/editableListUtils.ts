import { giftData, type EditableCategory, type EditableDocumentList } from '@/constants';

// 一意のIDを生成
export const generateId = () => Math.random().toString(36).substring(2, 9);

// giftDataから編集可能なリストを初期化
export const initializeEditableList = (): EditableDocumentList => {
  const list: EditableCategory[] = [];

  // 基本必須書類
  giftData.baseRequired.forEach((base) => {
    list.push({
      id: generateId(),
      name: base.category,
      documents: base.documents.map((doc) => ({
        id: generateId(),
        text: doc,
        checked: true, // 基本書類はデフォルトでチェック済み
        subItems: [],
      })),
      isExpanded: true,
      isSpecial: false,
    });
  });

  // オプション（財産の種類）
  giftData.options.forEach((opt) => {
    const categoryName = opt.label
      .replace('をもらいましたか？', '')
      .replace('はありますか？', '');

    list.push({
      id: opt.id,
      name: categoryName,
      documents: opt.documents.map((doc) => ({
        id: generateId(),
        text: doc,
        checked: false,
        subItems: [],
      })),
      isExpanded: true,
      isSpecial: false,
    });
  });

  // 特例
  giftData.specials.forEach((sp) => {
    const categoryName = sp.label
      .replace('を選択しますか？', '')
      .replace('を適用しますか？', '')
      .replace('（婚姻期間20年以上）', '');

    list.push({
      id: sp.id,
      name: categoryName,
      documents: sp.documents.map((doc) => ({
        id: generateId(),
        text: doc,
        checked: false,
        subItems: [],
      })),
      note: sp.note,
      isExpanded: true,
      isSpecial: true,
    });
  });

  return list;
};

// カテゴリ内の書類を追加
export const addDocumentToCategory = (
  list: EditableDocumentList,
  categoryId: string,
  documentText: string
): EditableDocumentList => {
  return list.map((cat) => {
    if (cat.id === categoryId) {
      return {
        ...cat,
        documents: [
          ...cat.documents,
          {
            id: generateId(),
            text: documentText,
            checked: false,
            subItems: [],
          },
        ],
      };
    }
    return cat;
  });
};

// 書類を削除
export const removeDocument = (
  list: EditableDocumentList,
  categoryId: string,
  documentId: string
): EditableDocumentList => {
  return list.map((cat) => {
    if (cat.id === categoryId) {
      return {
        ...cat,
        documents: cat.documents.filter((doc) => doc.id !== documentId),
      };
    }
    return cat;
  });
};

// 書類のテキストを更新
export const updateDocumentText = (
  list: EditableDocumentList,
  categoryId: string,
  documentId: string,
  newText: string
): EditableDocumentList => {
  return list.map((cat) => {
    if (cat.id === categoryId) {
      return {
        ...cat,
        documents: cat.documents.map((doc) =>
          doc.id === documentId ? { ...doc, text: newText } : doc
        ),
      };
    }
    return cat;
  });
};

// 書類のチェック状態を切り替え
export const toggleDocumentCheck = (
  list: EditableDocumentList,
  categoryId: string,
  documentId: string
): EditableDocumentList => {
  return list.map((cat) => {
    if (cat.id === categoryId) {
      return {
        ...cat,
        documents: cat.documents.map((doc) =>
          doc.id === documentId ? { ...doc, checked: !doc.checked } : doc
        ),
      };
    }
    return cat;
  });
};

// 中項目を追加
export const addSubItem = (
  list: EditableDocumentList,
  categoryId: string,
  documentId: string,
  subItemText: string
): EditableDocumentList => {
  return list.map((cat) => {
    if (cat.id === categoryId) {
      return {
        ...cat,
        documents: cat.documents.map((doc) =>
          doc.id === documentId
            ? {
                ...doc,
                subItems: [
                  ...doc.subItems,
                  { id: generateId(), text: subItemText },
                ],
              }
            : doc
        ),
      };
    }
    return cat;
  });
};

// 中項目を削除
export const removeSubItem = (
  list: EditableDocumentList,
  categoryId: string,
  documentId: string,
  subItemId: string
): EditableDocumentList => {
  return list.map((cat) => {
    if (cat.id === categoryId) {
      return {
        ...cat,
        documents: cat.documents.map((doc) =>
          doc.id === documentId
            ? {
                ...doc,
                subItems: doc.subItems.filter((sub) => sub.id !== subItemId),
              }
            : doc
        ),
      };
    }
    return cat;
  });
};

// 中項目のテキストを更新
export const updateSubItemText = (
  list: EditableDocumentList,
  categoryId: string,
  documentId: string,
  subItemId: string,
  newText: string
): EditableDocumentList => {
  return list.map((cat) => {
    if (cat.id === categoryId) {
      return {
        ...cat,
        documents: cat.documents.map((doc) =>
          doc.id === documentId
            ? {
                ...doc,
                subItems: doc.subItems.map((sub) =>
                  sub.id === subItemId ? { ...sub, text: newText } : sub
                ),
              }
            : doc
        ),
      };
    }
    return cat;
  });
};

// カテゴリの展開/折りたたみを切り替え
export const toggleCategoryExpand = (
  list: EditableDocumentList,
  categoryId: string
): EditableDocumentList => {
  return list.map((cat) =>
    cat.id === categoryId ? { ...cat, isExpanded: !cat.isExpanded } : cat
  );
};

// カテゴリ内の全書類をチェック/アンチェック
export const toggleAllInCategory = (
  list: EditableDocumentList,
  categoryId: string,
  checked: boolean
): EditableDocumentList => {
  return list.map((cat) => {
    if (cat.id === categoryId) {
      return {
        ...cat,
        documents: cat.documents.map((doc) => ({ ...doc, checked })),
      };
    }
    return cat;
  });
};

// 全カテゴリを展開/折りたたみ
export const expandAllCategories = (
  list: EditableDocumentList,
  isExpanded: boolean
): EditableDocumentList => {
  return list.map((cat) => ({ ...cat, isExpanded }));
};

// カテゴリを追加
export const addCategory = (
  list: EditableDocumentList,
  name: string,
  isSpecial: boolean = false
): EditableDocumentList => {
  return [
    ...list,
    {
      id: generateId(),
      name,
      documents: [],
      isExpanded: true,
      isSpecial,
    },
  ];
};

// カテゴリを削除
export const removeCategory = (
  list: EditableDocumentList,
  categoryId: string
): EditableDocumentList => {
  return list.filter((cat) => cat.id !== categoryId);
};

// カテゴリ名を更新
export const updateCategoryName = (
  list: EditableDocumentList,
  categoryId: string,
  newName: string
): EditableDocumentList => {
  return list.map((cat) =>
    cat.id === categoryId ? { ...cat, name: newName } : cat
  );
};

// カテゴリの特例フラグを切り替え
export const toggleCategorySpecial = (
  list: EditableDocumentList,
  categoryId: string
): EditableDocumentList => {
  return list.map((cat) =>
    cat.id === categoryId ? { ...cat, isSpecial: !cat.isSpecial } : cat
  );
};

// カテゴリ内の書類を並び替え
export const reorderDocuments = (
  list: EditableDocumentList,
  categoryId: string,
  oldIndex: number,
  newIndex: number
): EditableDocumentList => {
  return list.map((cat) => {
    if (cat.id === categoryId) {
      const newDocuments = [...cat.documents];
      const [movedItem] = newDocuments.splice(oldIndex, 1);
      newDocuments.splice(newIndex, 0, movedItem);
      return { ...cat, documents: newDocuments };
    }
    return cat;
  });
};

// カテゴリを並び替え
export const reorderCategories = (
  list: EditableDocumentList,
  oldIndex: number,
  newIndex: number
): EditableDocumentList => {
  const newList = [...list];
  const [movedItem] = newList.splice(oldIndex, 1);
  newList.splice(newIndex, 0, movedItem);
  return newList;
};

// 中項目を並び替え
export const reorderSubItems = (
  list: EditableDocumentList,
  categoryId: string,
  documentId: string,
  oldIndex: number,
  newIndex: number
): EditableDocumentList => {
  return list.map((cat) => {
    if (cat.id === categoryId) {
      return {
        ...cat,
        documents: cat.documents.map((doc) => {
          if (doc.id === documentId) {
            const newSubItems = [...doc.subItems];
            const [movedItem] = newSubItems.splice(oldIndex, 1);
            newSubItems.splice(newIndex, 0, movedItem);
            return { ...doc, subItems: newSubItems };
          }
          return doc;
        }),
      };
    }
    return cat;
  });
};

// チェック済み書類のみでDocumentGroup形式に変換（印刷/出力用）
export const toDocumentGroups = (
  list: EditableDocumentList,
  includeUnchecked: boolean = false
) => {
  return list
    .filter((cat) => {
      const hasCheckedDocs = cat.documents.some((doc) => doc.checked);
      return includeUnchecked || hasCheckedDocs;
    })
    .map((cat) => ({
      category: cat.isSpecial ? `【特例】${cat.name}` : cat.name,
      documents: cat.documents
        .filter((doc) => includeUnchecked || doc.checked)
        .map((doc) => ({
          text: doc.text,
          subItems: doc.subItems.map((sub) => sub.text),
        })),
      note: cat.note,
    }));
};
