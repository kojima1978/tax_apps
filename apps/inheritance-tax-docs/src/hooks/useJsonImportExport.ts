import { useState, useCallback } from 'react';
import type { EditableDocumentList, EditableDocument, EditableCategory, DocListType, SpecificName, Trash } from '@/constants';
import { DOC_LIST_TYPE_LABELS } from '@/constants';
import { generateId } from '@/utils/editableListUtils';
import { exportFileName } from '@/utils/exportFileName';

type SetDocumentList = React.Dispatch<React.SetStateAction<EditableDocumentList>>;
type SetTrash = React.Dispatch<React.SetStateAction<Trash>>;

// エクスポートするデータの型
export interface ExportData {
  version: string;
  exportedAt: string;
  docListType: DocListType;
  targetYear?: number;
  clientName: string;
  deceasedName: string;
  personInCharge: string;
  personInChargeContact: string;
  documentList: EditableDocumentList;
  trash?: Trash;
}

/** 統合前の tax-docs が書き出した v2 JSON */
interface LegacyTaxDocsExportData {
  version: string;
  exportedAt: string;
  taxType?: 'income-tax' | 'gift-tax';
  year?: number;
  staffName?: string;
  staffPhone?: string;
  customerName?: string;
  documentList: Array<{
    id: string;
    name: string;
    isExpanded?: boolean;
    documents: Array<{
      id: string;
      text: string;
      checked: boolean;
      subItems?: Array<{ id: string; text: string }>;
    }>;
  }>;
}

// インポートファイルの最大サイズ（5MB）
const MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024;

/** 旧形式のExportData（overlay maps形式） */
interface LegacyExportData {
  version: string;
  exportedAt: string;
  appName: string;
  data: {
    clientName: string;
    deceasedName: string;
    deadline: string;
    customDocuments: { id: string; categoryId: string; name: string; description: string; howToGet: string; isCustom: true; canDelegate?: boolean }[];
    documentOrder: Record<string, string[]>;
    editedDocuments: Record<string, { name?: string; description?: string; howToGet?: string }>;
    canDelegateOverrides: Record<string, boolean>;
    specificDocNames?: Record<string, string[]>;
    checkedDocuments?: Record<string, boolean>;
    strikethroughDocuments?: Record<string, boolean>;
    checkedDates?: Record<string, string>;
    documentMemos?: Record<string, string>;
    excludedDocuments?: Record<string, boolean>;
    urgentDocuments?: Record<string, boolean>;
    disabledCategories?: Record<string, boolean>;
    personInCharge?: string;
    personInChargeContact?: string;
  };
}

// 旧 appName → DocListType マッピング
const LEGACY_APP_NAME_MAP: Record<string, DocListType> = {
  'inheritance-tax-docs': 'inheritance-tax',
  'inheritance-tax-docs-simplified': 'simplified',
  'unlisted-stock-docs': 'unlisted-stock',
};

/** 旧形式かどうか判定 */
function isLegacyFormat(data: unknown): data is LegacyExportData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'appName' in data &&
    'data' in data &&
    typeof (data as Record<string, unknown>).data === 'object'
  );
}

function isLegacyTaxDocsFormat(data: unknown): data is LegacyTaxDocsExportData {
  if (!data || typeof data !== 'object' || !('documentList' in data) || 'docListType' in data || 'appName' in data) return false;
  const list = (data as { documentList?: unknown }).documentList;
  if (!Array.isArray(list) || list.length === 0) return false;
  return list.every((category) => {
    if (!category || typeof category !== 'object' || !Array.isArray((category as { documents?: unknown }).documents)) return false;
    return ((category as { documents: unknown[] }).documents).every((document) =>
      !!document && typeof document === 'object' && typeof (document as { text?: unknown }).text === 'string');
  });
}

function convertLegacyTaxDocsData(legacy: LegacyTaxDocsExportData): ExportData {
  const docListType: DocListType = legacy.taxType === 'gift-tax' ? 'gift-tax' : 'income-tax';
  const targetYear = Number.isInteger(legacy.year) && legacy.year! >= 2000 && legacy.year! <= 2100
    ? legacy.year
    : undefined;
  return {
    version: '2.0',
    exportedAt: legacy.exportedAt || '',
    docListType,
    targetYear,
    clientName: legacy.customerName ?? '',
    deceasedName: '',
    personInCharge: legacy.staffName ?? '',
    personInChargeContact: legacy.staffPhone ?? '',
    documentList: legacy.documentList.map((category) => ({
      id: category.id,
      name: category.name,
      isExpanded: category.isExpanded ?? true,
      isDisabled: false,
      documents: category.documents.map((document) => ({
        id: document.id,
        name: document.text,
        description: '',
        howToGet: '',
        canDelegate: false,
        checked: document.checked,
        excluded: false,
        urgent: false,
        specificNames: (document.subItems ?? []).map((item) => ({ id: item.id, text: item.text })),
        isCustom: false,
      })),
    })),
    trash: [],
  };
}

/** 旧形式から新形式へ変換 */
function convertLegacyData(legacy: LegacyExportData): ExportData | null {
  const docListType = LEGACY_APP_NAME_MAP[legacy.appName];
  if (!docListType) return null;

  const d = legacy.data;
  const checked = d.checkedDocuments ?? d.strikethroughDocuments ?? {};

  // overlay maps を使ってカテゴリ・書類を再構築する
  // 旧形式にはカテゴリ構造がないので、シンプルにフラットにインポートする
  // documentOrder のキーがカテゴリID、値が書類IDの配列
  const categories: EditableCategory[] = Object.entries(d.documentOrder).map(([catId, docIds]) => ({
    id: generateId(),
    name: catId, // カテゴリ名は後から解決が必要だが、旧形式では保持されていない
    documents: docIds.map((docId): EditableDocument => {
      const custom = d.customDocuments.find(c => c.id === docId);
      const edited = d.editedDocuments[docId];
      const specificNames: SpecificName[] = (d.specificDocNames?.[docId] ?? []).map(text => ({
        id: generateId(),
        text,
      }));

      if (custom) {
        return {
          id: generateId(),
          name: edited?.name ?? custom.name,
          description: edited?.description ?? custom.description,
          howToGet: edited?.howToGet ?? custom.howToGet,
          canDelegate: d.canDelegateOverrides[docId] ?? custom.canDelegate ?? false,
          checked: checked[docId] ?? false,
          checkedDate: d.checkedDates?.[docId],
          excluded: d.excludedDocuments?.[docId] ?? false,
          urgent: d.urgentDocuments?.[docId] ?? false,
          specificNames,
          isCustom: true,
        };
      }

      // 組み込み書類の場合（名前は旧形式では元データから引くが、ここではIDのみ）
      return {
        id: generateId(),
        name: edited?.name ?? docId,
        description: edited?.description ?? '',
        howToGet: edited?.howToGet ?? '',
        canDelegate: d.canDelegateOverrides[docId] ?? false,
        checked: checked[docId] ?? false,
        checkedDate: d.checkedDates?.[docId],
        excluded: d.excludedDocuments?.[docId] ?? false,
        urgent: d.urgentDocuments?.[docId] ?? false,
        specificNames,
        isCustom: false,
      };
    }),
    isExpanded: true,
    isDisabled: d.disabledCategories?.[catId] ?? false,
  }));

  return {
    version: '2.0',
    exportedAt: legacy.exportedAt,
    docListType,
    clientName: d.clientName,
    deceasedName: d.deceasedName,
    personInCharge: d.personInCharge ?? '',
    personInChargeContact: d.personInChargeContact ?? '',
    documentList: categories,
  };
}

/** 新形式のバリデーション・正規化 */
function parseNewFormat(data: Record<string, unknown>): ExportData | null {
  try {
    if (!data.documentList || !Array.isArray(data.documentList)) return null;

    const documentList: EditableDocumentList = (data.documentList as Record<string, unknown>[]).map((cat) => {
      if (!cat.id || !cat.name || !Array.isArray(cat.documents)) {
        throw new Error('カテゴリの構造が不正です');
      }

      const documents: EditableDocument[] = (cat.documents as Record<string, unknown>[]).map((doc) => {
        if (!doc.id || typeof doc.name !== 'string') {
          throw new Error('書類の構造が不正です');
        }

        const specificNames: SpecificName[] = Array.isArray(doc.specificNames)
          ? (doc.specificNames as Record<string, unknown>[])
              .filter(sn => typeof sn.id === 'string' && typeof sn.text === 'string')
              .map(sn => ({ id: sn.id as string, text: sn.text as string }))
          : [];

        return {
          id: doc.id as string,
          name: doc.name as string,
          description: (doc.description as string) || '',
          howToGet: (doc.howToGet as string) || '',
          canDelegate: typeof doc.canDelegate === 'boolean' ? doc.canDelegate : false,
          checked: typeof doc.checked === 'boolean' ? doc.checked : false,
          checkedDate: typeof doc.checkedDate === 'string' ? doc.checkedDate : undefined,
          excluded: typeof doc.excluded === 'boolean' ? doc.excluded : false,
          urgent: typeof doc.urgent === 'boolean' ? doc.urgent : false,
          specificNames,
          isCustom: typeof doc.isCustom === 'boolean' ? doc.isCustom : false,
        };
      });

      return {
        id: cat.id as string,
        name: cat.name as string,
        documents,
        isExpanded: typeof cat.isExpanded === 'boolean' ? cat.isExpanded : true,
        isDisabled: typeof cat.isDisabled === 'boolean' ? cat.isDisabled : false,
      };
    });

    // ゴミ箱（任意・後方互換）。不正な要素は除外する
    const trash: Trash = Array.isArray(data.trash)
      ? ((data.trash as Record<string, unknown>[]).filter(t =>
          typeof t?.trashId === 'string' &&
          ((t.kind === 'document' && typeof t.document === 'object' && t.document !== null) ||
            (t.kind === 'category' && typeof t.category === 'object' && t.category !== null))
        ) as unknown as Trash)
      : [];

    return {
      version: (data.version as string) || '2.0',
      exportedAt: (data.exportedAt as string) || '',
      docListType: (data.docListType as DocListType) || 'inheritance-tax',
      targetYear: typeof data.targetYear === 'number' ? data.targetYear : undefined,
      clientName: (data.clientName as string) || '',
      deceasedName: (data.deceasedName as string) || '',
      personInCharge: (data.personInCharge as string) || '',
      personInChargeContact: (data.personInChargeContact as string) || '',
      documentList,
      trash,
    };
  } catch {
    return null;
  }
}

export const parseImportText = (content: string): ExportData | null => {
  try {
    const data = JSON.parse(content) as unknown;
    if (isLegacyFormat(data)) return convertLegacyData(data);
    if (isLegacyTaxDocsFormat(data)) return convertLegacyTaxDocsData(data);
    return parseNewFormat(data as Record<string, unknown>);
  } catch {
    return null;
  }
};

/** FileReaderをPromise化するヘルパー */
const readAsText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });

/** ファイルを読み込んでJSONをパース（旧形式にも対応） */
export const readJsonFile = async (file: File): Promise<ExportData | null> => {
  if (file.size > MAX_IMPORT_FILE_SIZE) {
    console.error(`ファイルサイズが上限（${MAX_IMPORT_FILE_SIZE / 1024 / 1024}MB）を超えています`);
    return null;
  }

  try {
    const content = await readAsText(file);
    return parseImportText(content);
  } catch {
    console.error('ファイルの読み込みに失敗しました');
    return null;
  }
};

type UseJsonImportExportArgs = {
  documentList: EditableDocumentList;
  setDocumentList: SetDocumentList;
  trash: Trash;
  setTrash: SetTrash;
  clientName: string;
  setClientName: (name: string) => void;
  deceasedName: string;
  setDeceasedName: (name: string) => void;
  personInCharge: string;
  setPersonInCharge: (name: string) => void;
  personInChargeContact: string;
  setPersonInChargeContact: (contact: string) => void;
  docListType: DocListType;
  setDocListType: (type: DocListType) => void;
  targetYear: number;
  setTargetYear: (year: number) => void;
};

export const useJsonImportExport = ({
  documentList,
  setDocumentList,
  trash,
  setTrash,
  clientName,
  setClientName,
  deceasedName,
  setDeceasedName,
  personInCharge,
  setPersonInCharge,
  personInChargeContact,
  setPersonInChargeContact,
  docListType,
  setDocListType,
  targetYear,
  setTargetYear,
}: UseJsonImportExportArgs) => {
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importPreview, setImportPreview] = useState<ExportData | null>(null);
  const [importError, setImportError] = useState(false);

  const handleJsonExport = useCallback(() => {
    const exportData: ExportData = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      docListType,
      targetYear,
      clientName,
      deceasedName,
      personInCharge,
      personInChargeContact,
      documentList,
      trash,
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = exportFileName([clientName, `${DOC_LIST_TYPE_LABELS[docListType]}書類リスト`], 'json');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [documentList, trash, clientName, deceasedName, personInCharge, personInChargeContact, docListType, targetYear]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const data = await readJsonFile(file);
    if (data) {
      setImportPreview(data);
      setShowImportDialog(true);
    } else {
      setImportError(true);
    }

    e.target.value = '';
  }, []);

  const confirmImport = useCallback(() => {
    if (importPreview) {
      setDocListType(importPreview.docListType);
      if (importPreview.targetYear) setTargetYear(importPreview.targetYear);
      setDocumentList(importPreview.documentList);
      setTrash(importPreview.trash ?? []);
      if (importPreview.clientName) setClientName(importPreview.clientName);
      if (importPreview.deceasedName) setDeceasedName(importPreview.deceasedName);
      if (importPreview.personInCharge) setPersonInCharge(importPreview.personInCharge);
      if (importPreview.personInChargeContact) setPersonInChargeContact(importPreview.personInChargeContact);
      setShowImportDialog(false);
      setImportPreview(null);
    }
  }, [importPreview, setDocListType, setTargetYear, setDocumentList, setTrash, setClientName, setDeceasedName, setPersonInCharge, setPersonInChargeContact]);

  const cancelImport = useCallback(() => {
    setShowImportDialog(false);
    setImportPreview(null);
  }, []);

  const dismissImportError = useCallback(() => {
    setImportError(false);
  }, []);

  return {
    showImportDialog,
    importPreview,
    importError,
    handleJsonExport,
    handleFileSelect,
    confirmImport,
    cancelImport,
    dismissImportError,
  };
};
