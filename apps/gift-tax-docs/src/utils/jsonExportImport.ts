import type { EditableDocumentList, SubItem } from '@/constants';

// インポートファイルの最大サイズ（5MB）
const MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024;

// エクスポートするデータの型
export interface ExportData {
  version: string;
  exportedAt: string;
  staffName: string;
  staffPhone: string;
  customerName: string;
  documentList: EditableDocumentList;
}

// JSONエクスポート
export const exportToJson = (
  documentList: EditableDocumentList,
  staffName: string,
  staffPhone: string,
  customerName: string
): void => {
  const exportData: ExportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    staffName,
    staffPhone,
    customerName,
    documentList,
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const customerPart = customerName ? `_${customerName}` : '';
  link.download = `贈与税申告_書類リスト${customerPart}_${date}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// JSONインポート（バリデーション付き）
export const parseImportedJson = (jsonString: string): ExportData | null => {
  try {
    const data = JSON.parse(jsonString);

    // 基本的なバリデーション
    if (!data.documentList || !Array.isArray(data.documentList)) {
      throw new Error('documentListが見つからないか、配列ではありません');
    }

    // カテゴリの構造をチェック・正規化
    const documentList: EditableDocumentList = data.documentList.map((category: Record<string, unknown>) => {
      if (!category.id || !category.name || !Array.isArray(category.documents)) {
        throw new Error('カテゴリの構造が不正です');
      }

      // 書類の構造をチェック・正規化
      const documents = (category.documents as Record<string, unknown>[]).map((doc) => {
        if (!doc.id || typeof doc.text !== 'string' || typeof doc.checked !== 'boolean') {
          throw new Error('書類の構造が不正です');
        }
        // 中項目の構造を正規化（id/textが揃っていない要素を除外）
        const subItems: SubItem[] = Array.isArray(doc.subItems)
          ? (doc.subItems as Record<string, unknown>[])
              .filter(sub => typeof sub.id === 'string' && typeof sub.text === 'string')
              .map(sub => ({ id: sub.id as string, text: sub.text as string }))
          : [];

        return {
          id: doc.id as string,
          text: doc.text,
          checked: doc.checked,
          subItems,
        };
      });

      return {
        id: category.id as string,
        name: category.name as string,
        documents,
        note: typeof category.note === 'string' ? category.note : undefined,
        isExpanded: typeof category.isExpanded === 'boolean' ? category.isExpanded : true,
        isSpecial: typeof category.isSpecial === 'boolean' ? category.isSpecial : false,
      };
    });

    return {
      version: data.version || '1.0',
      exportedAt: data.exportedAt || '',
      staffName: data.staffName || '',
      staffPhone: data.staffPhone || '',
      customerName: data.customerName || '',
      documentList,
    };
  } catch (error) {
    console.error('JSONパースエラー:', error);
    return null;
  }
};

// FileReaderをPromise化するヘルパー
const readAsText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });

// ファイルを読み込んでJSONをパース
export const readJsonFile = async (file: File): Promise<ExportData | null> => {
  if (file.size > MAX_IMPORT_FILE_SIZE) {
    console.error(`ファイルサイズが上限（${MAX_IMPORT_FILE_SIZE / 1024 / 1024}MB）を超えています`);
    return null;
  }

  try {
    const content = await readAsText(file);
    return parseImportedJson(content);
  } catch {
    console.error('ファイルの読み込みに失敗しました');
    return null;
  }
};
