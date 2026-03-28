import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  STORAGE_KEYS,
  DOC_LIST_TYPE_LABELS,
  getDataStorageKey,
  type DocListType,
  type EditableDocumentList,
} from '@/constants';
import { initializeEditableList } from '@/utils/editableListUtils';
import { exportToExcel } from '@/utils/excelExporter';

export const useInheritanceTaxGuide = () => {
  const [isTwoColumnPrint, setIsTwoColumnPrint] = useState(false);
  const [hideSubmittedInPrint, setHideSubmittedInPrint] = useState(false);

  // 書類リスト種別
  const [docListType, setDocListType] = useState<DocListType>('inheritance-tax');

  // 編集可能な書類リスト
  const [documentList, setDocumentList] = useState<EditableDocumentList>(() =>
    initializeEditableList('inheritance-tax')
  );

  // 担当者・お客様名
  const [clientName, setClientName] = useState('');
  const [deceasedName, setDeceasedName] = useState('');
  const [personInCharge, setPersonInCharge] = useState('');
  const [personInChargeContact, setPersonInChargeContact] = useState('');

  // 初期化完了フラグ
  const isInitialized = useRef(false);

  // 初期化：ストレージから読み込み
  useEffect(() => {
    try {
      const savedType = localStorage.getItem(STORAGE_KEYS.docListType) as DocListType | null;
      const savedClient = localStorage.getItem(STORAGE_KEYS.clientName);
      const savedDeceased = localStorage.getItem(STORAGE_KEYS.deceasedName);
      const savedCharge = localStorage.getItem(STORAGE_KEYS.personInCharge);
      const savedContact = localStorage.getItem(STORAGE_KEYS.personInChargeContact);

      const effectiveType: DocListType = savedType && ['inheritance-tax', 'simplified', 'unlisted-stock'].includes(savedType)
        ? savedType
        : 'inheritance-tax';

      if (savedType) setDocListType(effectiveType);
      if (savedClient) setClientName(savedClient);
      if (savedDeceased) setDeceasedName(savedDeceased);
      if (savedCharge) setPersonInCharge(savedCharge);
      if (savedContact) setPersonInChargeContact(savedContact);

      // ストレージからデータを復元
      const dataKey = getDataStorageKey(effectiveType);
      const savedData = localStorage.getItem(dataKey);
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData) as EditableDocumentList;
          if (Array.isArray(parsed) && parsed.length > 0) {
            setDocumentList(parsed);
          } else {
            setDocumentList(initializeEditableList(effectiveType));
          }
        } catch {
          setDocumentList(initializeEditableList(effectiveType));
        }
      } else {
        setDocumentList(initializeEditableList(effectiveType));
      }
    } catch { /* ストレージ使用不可時は無視 */ }

    isInitialized.current = true;
  }, []);

  // 変更検知：メタ情報をストレージへ保存
  useEffect(() => {
    if (!isInitialized.current) return;
    try {
      localStorage.setItem(STORAGE_KEYS.docListType, docListType);
      localStorage.setItem(STORAGE_KEYS.clientName, clientName);
      localStorage.setItem(STORAGE_KEYS.deceasedName, deceasedName);
      localStorage.setItem(STORAGE_KEYS.personInCharge, personInCharge);
      localStorage.setItem(STORAGE_KEYS.personInChargeContact, personInChargeContact);
    } catch { /* ストレージ使用不可時は無視 */ }
  }, [docListType, clientName, deceasedName, personInCharge, personInChargeContact]);

  // 変更検知：書類リストデータをストレージへ保存
  useEffect(() => {
    if (!isInitialized.current) return;
    try {
      const dataKey = getDataStorageKey(docListType);
      localStorage.setItem(dataKey, JSON.stringify(documentList));
    } catch { /* ストレージ使用不可時は無視 */ }
  }, [docListType, documentList]);

  // 書類リスト種別変更 → リスト再初期化（別種別のデータがあれば復元）
  const handleDocListTypeChange = useCallback((newType: DocListType) => {
    setDocListType(newType);

    // 切り替え先のデータをストレージから復元
    try {
      const dataKey = getDataStorageKey(newType);
      const savedData = localStorage.getItem(dataKey);
      if (savedData) {
        const parsed = JSON.parse(savedData) as EditableDocumentList;
        if (Array.isArray(parsed) && parsed.length > 0) {
          setDocumentList(parsed);
          return;
        }
      }
    } catch { /* ignore */ }

    // ストレージにデータがなければ初期化
    setDocumentList(initializeEditableList(newType));
  }, []);

  // 現在の日付（セッション中不変）
  const currentDate = useMemo(() => new Date().toLocaleDateString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  }), []);

  const handlePrint = useCallback(() => { window.print(); }, []);

  const handleExcelExport = useCallback(() => {
    // 有効なカテゴリ・書類だけを抽出してExcelエクスポート
    exportToExcel({
      documentList,
      clientName,
      deceasedName,
      personInCharge,
      personInChargeContact,
      excelTitle: `${DOC_LIST_TYPE_LABELS[docListType]} 資料準備ガイド`,
      filenamePrefix: `${DOC_LIST_TYPE_LABELS[docListType]}_必要書類`,
    });
  }, [documentList, clientName, deceasedName, personInCharge, personInChargeContact, docListType]);

  const togglePrintColumn = useCallback(() => { setIsTwoColumnPrint(prev => !prev); }, []);
  const toggleHideSubmitted = useCallback(() => { setHideSubmittedInPrint(prev => !prev); }, []);

  return {
    // State
    docListType,
    isTwoColumnPrint,
    hideSubmittedInPrint,
    currentDate,
    clientName,
    deceasedName,
    personInCharge,
    personInChargeContact,
    documentList,

    // Handlers
    handleDocListTypeChange,
    handlePrint,
    handleExcelExport,
    togglePrintColumn,
    toggleHideSubmitted,
    setClientName,
    setDeceasedName,
    setPersonInCharge,
    setPersonInChargeContact,
    setDocumentList,
  };
};
