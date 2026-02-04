import type { EditableDocumentList } from '@/constants';

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

    // カテゴリの構造をチェック
    for (const category of data.documentList) {
      if (!category.id || !category.name || !Array.isArray(category.documents)) {
        throw new Error('カテゴリの構造が不正です');
      }

      // 書類の構造をチェック
      for (const doc of category.documents) {
        if (!doc.id || typeof doc.text !== 'string' || typeof doc.checked !== 'boolean') {
          throw new Error('書類の構造が不正です');
        }

        // subItemsがなければ空配列を追加
        if (!doc.subItems) {
          doc.subItems = [];
        }
      }

      // isExpandedがなければtrueを設定
      if (typeof category.isExpanded !== 'boolean') {
        category.isExpanded = true;
      }

      // isSpecialがなければfalseを設定
      if (typeof category.isSpecial !== 'boolean') {
        category.isSpecial = false;
      }
    }

    return {
      version: data.version || '1.0',
      exportedAt: data.exportedAt || '',
      staffName: data.staffName || '',
      staffPhone: data.staffPhone || '',
      customerName: data.customerName || '',
      documentList: data.documentList,
    };
  } catch (error) {
    console.error('JSONパースエラー:', error);
    return null;
  }
};

// ファイルを読み込んでJSONをパース
export const readJsonFile = (file: File): Promise<ExportData | null> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const data = parseImportedJson(content);
      resolve(data);
    };
    reader.onerror = () => {
      resolve(null);
    };
    reader.readAsText(file);
  });
};
