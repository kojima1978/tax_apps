import type { CustomDocumentItem, DocChanges } from '../constants/documents';

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
    deletedDocuments?: Record<string, boolean>; // 後方互換（v1: 必須→v2: 廃止）
    customDocuments: CustomDocumentItem[];
    documentOrder: Record<string, string[]>;
    editedDocuments: Record<string, DocChanges>;
    canDelegateOverrides: Record<string, boolean>;
    specificDocNames?: Record<string, string[]>;
    checkedDocuments?: Record<string, boolean>;
    // 後方互換（旧データ読込用）
    strikethroughSpecificNames?: Record<string, boolean[]>;
    strikethroughDocuments?: Record<string, boolean>;
    strikethroughCategories?: Record<string, boolean>;
    personInCharge?: string;
    personInChargeContact?: string;
  };
}

// インポートデータの検証結果
interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// データをエクスポート用に整形
export function createExportData(params: {
  clientName: string;
  deceasedName: string;
  deadline: string;
  customDocuments: CustomDocumentItem[];
  documentOrder: Record<string, string[]>;
  editedDocuments: Record<string, DocChanges>;
  canDelegateOverrides: Record<string, boolean>;
  specificDocNames: Record<string, string[]>;
  checkedDocuments: Record<string, boolean>;
  personInCharge: string;
  personInChargeContact: string;
}): ExportData {
  return {
    version: DATA_VERSION,
    exportedAt: new Date().toISOString(),
    appName: 'inheritance-tax-docs',
    data: {
      clientName: params.clientName,
      deceasedName: params.deceasedName,
      deadline: params.deadline,
      customDocuments: params.customDocuments,
      documentOrder: params.documentOrder,
      editedDocuments: params.editedDocuments,
      canDelegateOverrides: params.canDelegateOverrides,
      specificDocNames: params.specificDocNames,
      checkedDocuments: params.checkedDocuments,
      personInCharge: params.personInCharge,
      personInChargeContact: params.personInChargeContact,
    },
  };
}

/** フィールドの型チェック（required=false の場合は undefined を許容） */
function validateField(
  obj: Record<string, unknown>,
  field: string,
  type: 'string' | 'object' | 'array',
  errorMsg: string,
  required: boolean,
): string | null {
  const val = obj[field];
  if (val === undefined) return required ? errorMsg : null;
  if (type === 'string' && typeof val !== 'string') return errorMsg;
  if (type === 'object' && (typeof val !== 'object' || val === null)) return errorMsg;
  if (type === 'array' && !Array.isArray(val)) return errorMsg;
  return null;
}

// JSONデータを検証
export function validateImportData(data: unknown): ValidationResult {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: '無効なJSONデータです。' };
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.version !== 'string') {
    return { isValid: false, error: 'バージョン情報がありません。' };
  }
  if (obj.appName !== 'inheritance-tax-docs') {
    return { isValid: false, error: 'このファイルは相続税必要書類リストアプリのデータではありません。' };
  }
  if (!obj.data || typeof obj.data !== 'object') {
    return { isValid: false, error: 'データが見つかりません。' };
  }

  const dataObj = obj.data as Record<string, unknown>;

  const fieldChecks: [string, 'string' | 'object' | 'array', string, boolean][] = [
    ['clientName', 'string', '顧客名データが不正です。', true],
    ['deceasedName', 'string', '被相続人名データが不正です。', true],
    ['deadline', 'string', '期限データが不正です。', true],
    ['customDocuments', 'array', 'カスタム書類データが不正です。', true],
    ['documentOrder', 'object', '書類順序データが不正です。', true],
    ['editedDocuments', 'object', '編集済み書類データが不正です。', true],
    ['canDelegateOverrides', 'object', '代行設定データが不正です。', true],
    ['deletedDocuments', 'object', '削除済み書類データが不正です。', false],
    ['specificDocNames', 'object', '具体的書類名データが不正です。', false],
    ['checkedDocuments', 'object', '提出済みデータが不正です。', false],
    ['strikethroughSpecificNames', 'object', '取消線データが不正です。', false],
    ['strikethroughDocuments', 'object', '書類取消線データが不正です。', false],
    ['strikethroughCategories', 'object', 'カテゴリ取消線データが不正です。', false],
    ['personInCharge', 'string', '担当者データが不正です。', false],
    ['personInChargeContact', 'string', '担当者連絡先データが不正です。', false],
  ];

  for (const [field, type, errorMsg, required] of fieldChecks) {
    const error = validateField(dataObj, field, type, errorMsg, required);
    if (error) return { isValid: false, error };
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
