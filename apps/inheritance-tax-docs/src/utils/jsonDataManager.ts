import { CustomDocumentItem } from '../constants/documents';

// JSONデータのバージョン
const DATA_VERSION = '1.0.0';

// エクスポートするデータの型
export interface ExportData {
  version: string;
  exportedAt: string;
  appName: string;
  data: {
    clientName: string;
    deceasedName: string;
    deadline: string;
    deletedDocuments: Record<string, boolean>;
    customDocuments: CustomDocumentItem[];
    documentOrder: Record<string, string[]>;
    editedDocuments: Record<string, { name?: string; description?: string; howToGet?: string }>;
    canDelegateOverrides: Record<string, boolean>;
  };
}

// インポートデータの検証結果
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// データをエクスポート用に整形
export function createExportData(params: {
  clientName: string;
  deceasedName: string;
  deadline: string;
  deletedDocuments: Record<string, boolean>;
  customDocuments: CustomDocumentItem[];
  documentOrder: Record<string, string[]>;
  editedDocuments: Record<string, { name?: string; description?: string; howToGet?: string }>;
  canDelegateOverrides: Record<string, boolean>;
}): ExportData {
  return {
    version: DATA_VERSION,
    exportedAt: new Date().toISOString(),
    appName: 'inheritance-tax-docs',
    data: {
      clientName: params.clientName,
      deceasedName: params.deceasedName,
      deadline: params.deadline,
      deletedDocuments: params.deletedDocuments,
      customDocuments: params.customDocuments,
      documentOrder: params.documentOrder,
      editedDocuments: params.editedDocuments,
      canDelegateOverrides: params.canDelegateOverrides,
    },
  };
}

// JSONデータを検証
export function validateImportData(data: unknown): ValidationResult {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: '無効なJSONデータです。' };
  }

  const obj = data as Record<string, unknown>;

  // バージョンチェック
  if (typeof obj.version !== 'string') {
    return { isValid: false, error: 'バージョン情報がありません。' };
  }

  // アプリ名チェック
  if (obj.appName !== 'inheritance-tax-docs') {
    return { isValid: false, error: 'このファイルは相続税必要書類リストアプリのデータではありません。' };
  }

  // データオブジェクトチェック
  if (!obj.data || typeof obj.data !== 'object') {
    return { isValid: false, error: 'データが見つかりません。' };
  }

  const dataObj = obj.data as Record<string, unknown>;

  // 必須フィールドのチェック
  if (typeof dataObj.clientName !== 'string') {
    return { isValid: false, error: '顧客名データが不正です。' };
  }
  if (typeof dataObj.deceasedName !== 'string') {
    return { isValid: false, error: '被相続人名データが不正です。' };
  }
  if (typeof dataObj.deadline !== 'string') {
    return { isValid: false, error: '期限データが不正です。' };
  }

  // オブジェクト型フィールドのチェック
  if (typeof dataObj.deletedDocuments !== 'object' || dataObj.deletedDocuments === null) {
    return { isValid: false, error: '削除済み書類データが不正です。' };
  }
  if (!Array.isArray(dataObj.customDocuments)) {
    return { isValid: false, error: 'カスタム書類データが不正です。' };
  }
  if (typeof dataObj.documentOrder !== 'object' || dataObj.documentOrder === null) {
    return { isValid: false, error: '書類順序データが不正です。' };
  }
  if (typeof dataObj.editedDocuments !== 'object' || dataObj.editedDocuments === null) {
    return { isValid: false, error: '編集済み書類データが不正です。' };
  }
  if (typeof dataObj.canDelegateOverrides !== 'object' || dataObj.canDelegateOverrides === null) {
    return { isValid: false, error: '代行設定データが不正です。' };
  }

  return { isValid: true };
}

// ファイルとしてダウンロード
export function downloadAsJson(data: ExportData, filename?: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const date = new Date().toISOString().split('T')[0];
  const defaultFilename = `inheritance-tax-docs-${date}.json`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename || defaultFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ファイルを読み込み
export function readJsonFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        resolve(data);
      } catch {
        reject(new Error('JSONファイルの解析に失敗しました。'));
      }
    };
    reader.onerror = () => {
      reject(new Error('ファイルの読み込みに失敗しました。'));
    };
    reader.readAsText(file);
  });
}
