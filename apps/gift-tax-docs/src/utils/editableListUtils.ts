import { giftData, type DocumentGroup, type EditableCategory, type EditableDocument, type EditableDocumentList } from '@/constants';

// 一意のIDを生成（HTTP環境でも動作するフォールバック付き）
const generateId = (): string => {
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

// 書類文字列配列を EditableDocument[] に変換
const toEditableDocuments = (docs: string[], checked: boolean): EditableDocument[] =>
  docs.map(doc => ({ id: generateId(), text: doc, checked, subItems: [] }));

// giftDataから編集可能なリストを初期化
export const initializeEditableList = (): EditableDocumentList => [
  // 基本必須書類
  ...giftData.baseRequired.map((base): EditableCategory => ({
    id: generateId(),
    name: base.category,
    documents: toEditableDocuments(base.documents, false),
    isExpanded: true,
    isSpecial: false,
  })),
  // オプション（財産の種類）
  ...giftData.options.map((opt): EditableCategory => ({
    id: opt.id,
    name: opt.label.replace('をもらいましたか？', ''),
    documents: toEditableDocuments(opt.documents, false),
    isExpanded: true,
    isSpecial: false,
  })),
  // 特例
  ...giftData.specials.map((sp): EditableCategory => ({
    id: sp.id,
    name: sp.label.replace('を選択しますか？', '').replace('を適用しますか？', '').replace('（婚姻期間20年以上）', ''),
    documents: toEditableDocuments(sp.documents, false),
    note: sp.note,
    isExpanded: true,
    isSpecial: true,
  })),
];

// カテゴリ内の書類を追加
export const addDocumentToCategory = (
  list: EditableDocumentList,
  categoryId: string,
  documentText: string
): EditableDocumentList =>
  updateCategory(list, categoryId, cat => ({
    ...cat,
    documents: [...cat.documents, { id: generateId(), text: documentText, checked: false, subItems: [] }],
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

// 書類のテキストを更新
export const updateDocumentText = (
  list: EditableDocumentList,
  categoryId: string,
  documentId: string,
  newText: string
): EditableDocumentList =>
  updateDocument(list, categoryId, documentId, doc => ({ ...doc, text: newText }));

// 書類のチェック状態を切り替え
export const toggleDocumentCheck = (
  list: EditableDocumentList,
  categoryId: string,
  documentId: string
): EditableDocumentList =>
  updateDocument(list, categoryId, documentId, doc => ({ ...doc, checked: !doc.checked }));

// 中項目を追加
export const addSubItem = (
  list: EditableDocumentList,
  categoryId: string,
  documentId: string,
  subItemText: string
): EditableDocumentList =>
  updateDocument(list, categoryId, documentId, doc => ({
    ...doc,
    subItems: [...doc.subItems, { id: generateId(), text: subItemText }],
  }));

// 中項目を削除
export const removeSubItem = (
  list: EditableDocumentList,
  categoryId: string,
  documentId: string,
  subItemId: string
): EditableDocumentList =>
  updateDocument(list, categoryId, documentId, doc => ({
    ...doc,
    subItems: doc.subItems.filter(sub => sub.id !== subItemId),
  }));

// 中項目のテキストを更新
export const updateSubItemText = (
  list: EditableDocumentList,
  categoryId: string,
  documentId: string,
  subItemId: string,
  newText: string
): EditableDocumentList =>
  updateDocument(list, categoryId, documentId, doc => ({
    ...doc,
    subItems: doc.subItems.map(sub => sub.id === subItemId ? { ...sub, text: newText } : sub),
  }));

// カテゴリの展開/折りたたみを切り替え
export const toggleCategoryExpand = (
  list: EditableDocumentList,
  categoryId: string
): EditableDocumentList =>
  updateCategory(list, categoryId, cat => ({ ...cat, isExpanded: !cat.isExpanded }));

// カテゴリ内の全書類をチェック/アンチェック
export const toggleAllInCategory = (
  list: EditableDocumentList,
  categoryId: string,
  checked: boolean
): EditableDocumentList =>
  updateCategory(list, categoryId, cat => ({
    ...cat,
    documents: cat.documents.map(doc => ({ ...doc, checked })),
  }));

// 全カテゴリを展開/折りたたみ
export const expandAllCategories = (
  list: EditableDocumentList,
  isExpanded: boolean
): EditableDocumentList => list.map(cat => ({ ...cat, isExpanded }));

// カテゴリを追加
export const addCategory = (
  list: EditableDocumentList,
  name: string,
  isSpecial: boolean = false
): EditableDocumentList => [
  ...list,
  { id: generateId(), name, documents: [], isExpanded: true, isSpecial },
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

// カテゴリの特例フラグを切り替え
export const toggleCategorySpecial = (
  list: EditableDocumentList,
  categoryId: string
): EditableDocumentList =>
  updateCategory(list, categoryId, cat => ({ ...cat, isSpecial: !cat.isSpecial }));

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

// DocumentGroup形式に変換（印刷/出力用）
// hideSubmitted=true: 提出済み（checked）を除外し未提出のみ表示
export const toDocumentGroups = (
  list: EditableDocumentList,
  hideSubmitted: boolean = false
): DocumentGroup[] =>
  list
    .map(cat => ({
      category: cat.isSpecial ? `【特例】${cat.name}` : cat.name,
      documents: cat.documents
        .filter(doc => !hideSubmitted || !doc.checked)
        .map(doc => ({
          text: doc.text,
          checked: doc.checked,
          subItems: doc.subItems.map(sub => sub.text),
        })),
      note: cat.note,
    }))
    .filter(cat => cat.documents.length > 0);
