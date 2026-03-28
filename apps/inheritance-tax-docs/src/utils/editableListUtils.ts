import {
  CATEGORIES,
  SIMPLIFIED_CATEGORIES,
  UNLISTED_STOCK_CATEGORIES,
  type CategoryData,
  type DocListType,
  type EditableCategory,
  type EditableDocument,
  type EditableDocumentList,
} from '@/constants';

// 一意のIDを生成（HTTP環境でも動作するフォールバック付き）
export const generateId = (): string => {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c => {
    const n = Number(c);
    return (n ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (n / 4)))).toString(16);
  });
};

// カテゴリを更新するヘルパー（list.map + id比較パターンの共通化）
const updateCategory = (
  list: EditableDocumentList,
  categoryId: string,
  updater: (cat: EditableCategory) => EditableCategory
): EditableDocumentList => list.map(cat => cat.id === categoryId ? updater(cat) : cat);

// カテゴリ内の書類を更新するヘルパー
const updateDocument = (
  list: EditableDocumentList,
  categoryId: string,
  documentId: string,
  updater: (doc: EditableDocument) => EditableDocument
): EditableDocumentList => updateCategory(list, categoryId, cat => ({
  ...cat,
  documents: cat.documents.map(doc => doc.id === documentId ? updater(doc) : doc),
}));

// CategoryData[] を EditableDocumentList に変換
export const initializeFromCategoryData = (categories: CategoryData[]): EditableDocumentList =>
  categories.map(cat => ({
    id: generateId(),
    name: cat.name,
    documents: cat.documents.map(doc => ({
      id: generateId(),
      name: doc.name,
      description: doc.description,
      howToGet: doc.howToGet,
      canDelegate: doc.canDelegate ?? false,
      checked: false,
      excluded: false,
      urgent: false,
      specificNames: [],
      isCustom: false,
    })),
    isExpanded: true,
    isDisabled: false,
  }));

// 書類リスト種別に応じた編集可能なリストを初期化
export const initializeEditableList = (docListType: DocListType): EditableDocumentList => {
  switch (docListType) {
    case 'inheritance-tax':
      return initializeFromCategoryData(CATEGORIES);
    case 'simplified':
      return initializeFromCategoryData(SIMPLIFIED_CATEGORIES);
    case 'unlisted-stock':
      return initializeFromCategoryData(UNLISTED_STOCK_CATEGORIES);
  }
};

// カテゴリ内の書類を追加
export const addDocumentToCategory = (
  list: EditableDocumentList,
  categoryId: string,
  name: string,
  description: string,
  howToGet: string
): EditableDocumentList =>
  updateCategory(list, categoryId, cat => ({
    ...cat,
    documents: [...cat.documents, {
      id: generateId(),
      name,
      description,
      howToGet,
      canDelegate: false,
      checked: false,
      excluded: false,
      urgent: false,
      specificNames: [],
      isCustom: true,
    }],
  }));

// 書類を削除
export const removeDocument = (
  list: EditableDocumentList,
  categoryId: string,
  documentId: string
): EditableDocumentList =>
  updateCategory(list, categoryId, cat => ({
    ...cat,
    documents: cat.documents.filter(doc => doc.id !== documentId),
  }));

// 書類の各フィールドを更新
export const updateDocumentFields = (
  list: EditableDocumentList,
  categoryId: string,
  documentId: string,
  fields: Partial<EditableDocument>
): EditableDocumentList =>
  updateDocument(list, categoryId, documentId, doc => ({ ...doc, ...fields }));

// 書類のチェック状態を切り替え（日付も自動設定）
export const toggleDocumentCheck = (
  list: EditableDocumentList,
  categoryId: string,
  documentId: string
): EditableDocumentList =>
  updateDocument(list, categoryId, documentId, doc => ({
    ...doc,
    checked: !doc.checked,
    checkedDate: !doc.checked ? new Date().toISOString().split('T')[0] : undefined,
  }));

// カテゴリ内の全書類をチェック/アンチェック
export const toggleAllInCategory = (
  list: EditableDocumentList,
  categoryId: string,
  checked: boolean
): EditableDocumentList => {
  const today = new Date().toISOString().split('T')[0];
  return updateCategory(list, categoryId, cat => ({
    ...cat,
    documents: cat.documents.map(doc => ({
      ...doc,
      checked,
      checkedDate: checked ? (doc.checkedDate || today) : undefined,
    })),
  }));
};

// 書類の対象外フラグを切り替え
export const toggleDocumentExcluded = (
  list: EditableDocumentList,
  categoryId: string,
  documentId: string
): EditableDocumentList =>
  updateDocument(list, categoryId, documentId, doc => ({ ...doc, excluded: !doc.excluded }));

// 書類の緊急フラグを切り替え
export const toggleDocumentUrgent = (
  list: EditableDocumentList,
  categoryId: string,
  documentId: string
): EditableDocumentList =>
  updateDocument(list, categoryId, documentId, doc => ({ ...doc, urgent: !doc.urgent }));

// 書類の取得代行フラグを切り替え
export const toggleDocumentCanDelegate = (
  list: EditableDocumentList,
  categoryId: string,
  documentId: string
): EditableDocumentList =>
  updateDocument(list, categoryId, documentId, doc => ({ ...doc, canDelegate: !doc.canDelegate }));

// 個別名を追加
export const addSpecificName = (
  list: EditableDocumentList,
  categoryId: string,
  documentId: string,
  text: string
): EditableDocumentList =>
  updateDocument(list, categoryId, documentId, doc => ({
    ...doc,
    specificNames: [...doc.specificNames, { id: generateId(), text }],
  }));

// 個別名を削除
export const removeSpecificName = (
  list: EditableDocumentList,
  categoryId: string,
  documentId: string,
  nameId: string
): EditableDocumentList =>
  updateDocument(list, categoryId, documentId, doc => ({
    ...doc,
    specificNames: doc.specificNames.filter(sn => sn.id !== nameId),
  }));

// 個別名のテキストを更新
export const updateSpecificNameText = (
  list: EditableDocumentList,
  categoryId: string,
  documentId: string,
  nameId: string,
  text: string
): EditableDocumentList =>
  updateDocument(list, categoryId, documentId, doc => ({
    ...doc,
    specificNames: doc.specificNames.map(sn => sn.id === nameId ? { ...sn, text } : sn),
  }));

// カテゴリの展開/折りたたみを切り替え
export const toggleCategoryExpand = (
  list: EditableDocumentList,
  categoryId: string
): EditableDocumentList =>
  updateCategory(list, categoryId, cat => ({ ...cat, isExpanded: !cat.isExpanded }));

// 全カテゴリを展開/折りたたみ
export const expandAllCategories = (
  list: EditableDocumentList,
  isExpanded: boolean
): EditableDocumentList => list.map(cat => ({ ...cat, isExpanded }));

// カテゴリの無効フラグを切り替え
export const toggleCategoryDisabled = (
  list: EditableDocumentList,
  categoryId: string
): EditableDocumentList =>
  updateCategory(list, categoryId, cat => ({ ...cat, isDisabled: !cat.isDisabled }));

// カテゴリを追加
export const addCategory = (
  list: EditableDocumentList,
  name: string
): EditableDocumentList => [
  ...list,
  { id: generateId(), name, documents: [], isExpanded: true, isDisabled: false },
];

// カテゴリを削除
export const removeCategory = (
  list: EditableDocumentList,
  categoryId: string
): EditableDocumentList => list.filter(cat => cat.id !== categoryId);

// カテゴリ名を更新
export const updateCategoryName = (
  list: EditableDocumentList,
  categoryId: string,
  newName: string
): EditableDocumentList =>
  updateCategory(list, categoryId, cat => ({ ...cat, name: newName }));

// 書類IDからカテゴリIDを検索
export const findCategoryIdByDocumentId = (
  list: EditableDocumentList,
  documentId: string
): string | null => {
  for (const category of list) {
    if (category.documents.some(d => d.id === documentId)) {
      return category.id;
    }
  }
  return null;
};

// 配列内の要素を並び替える共通ヘルパー
const reorderArray = <T>(arr: T[], oldIndex: number, newIndex: number): T[] => {
  const result = [...arr];
  const [moved] = result.splice(oldIndex, 1);
  result.splice(newIndex, 0, moved);
  return result;
};

// カテゴリ内の書類を並び替え
export const reorderDocuments = (
  list: EditableDocumentList,
  categoryId: string,
  oldIndex: number,
  newIndex: number
): EditableDocumentList =>
  updateCategory(list, categoryId, cat => ({
    ...cat,
    documents: reorderArray(cat.documents, oldIndex, newIndex),
  }));

// カテゴリを並び替え
export const reorderCategories = (
  list: EditableDocumentList,
  oldIndex: number,
  newIndex: number
): EditableDocumentList => reorderArray(list, oldIndex, newIndex);
