import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  STORAGE_KEYS,
  DOC_LIST_TYPE_LABELS,
  usesDeceasedName,
  getDataStorageKey,
  getTrashStorageKey,
  type DocListType,
  type EditableDocumentList,
  type Trash,
} from '@/constants';
import { initializeEditableList, initializeFromMasterData, type MasterCategoryPayload } from '@/utils/editableListUtils';
import { exportToExcel } from '@/utils/excelExporter';
import { useCompanyInfo } from '@/shared/staff-directory/company';

const getMasterKey = (type: DocListType, selectedCompanyId: number | null) =>
  `${type}:${selectedCompanyId ?? 'legacy'}`;

export const useInheritanceTaxGuide = () => {
  const { company, status: companyStatus } = useCompanyInfo();
  const companyId = company.id;
  const [isTwoColumnPrint, setIsTwoColumnPrint] = useState(false);
  const [hideSubmittedInPrint, setHideSubmittedInPrint] = useState(false);

  // 書類リスト種別
  const [docListType, setDocListType] = useState<DocListType>('inheritance-tax');
  const [targetYear, setTargetYear] = useState(() => new Date().getFullYear());

  // 編集可能な書類リスト
  const [documentList, setDocumentList] = useState<EditableDocumentList>(() =>
    initializeEditableList('inheritance-tax')
  );

  // ゴミ箱（削除した書類・カテゴリ）
  const [trash, setTrash] = useState<Trash>([]);

  // 担当者・お客様名
  const [clientName, setClientName] = useState('');
  const [deceasedName, setDeceasedName] = useState('');
  const [personInCharge, setPersonInCharge] = useState('');
  const [personInChargeContact, setPersonInChargeContact] = useState('');

  // 初期化完了フラグ
  const isInitialized = useRef(false);
  const masterDefaultsRef = useRef<Record<string, EditableDocumentList>>({});
  const masterRequestRef = useRef(0);

  const loadPublishedMaster = useCallback(async (
    type: DocListType,
    year: number,
    applyToCurrentList: boolean,
    selectedCompanyId: number | null,
  ) => {
    const requestId = ++masterRequestRef.current;
    try {
      const search = new URLSearchParams({ mode: 'published' });
      if (selectedCompanyId !== null) search.set('companyId', String(selectedCompanyId));
      const response = await fetch(`/inheritance-tax-docs/api/document-masters/${type}?${search.toString()}`);
      if (!response.ok) return;
      const data = await response.json() as { categories: MasterCategoryPayload[] };
      const list = initializeFromMasterData(data.categories, year);
      masterDefaultsRef.current[getMasterKey(type, selectedCompanyId)] = list;
      if (applyToCurrentList && requestId === masterRequestRef.current) setDocumentList(list);
    } catch { /* API停止時は組み込みマスタを使う */ }
  }, []);

  // 初期化：会社を確定してから、その会社専用のストレージと公開マスタを読み込む
  useEffect(() => {
    if (companyStatus === 'loading') return;
    const initialize = () => {
      try {
        const requestedType = new URLSearchParams(window.location.search).get('type') as DocListType | null;
        const legacyType = localStorage.getItem('tax_docs_tax_type') as DocListType | null;
        const savedType = requestedType ?? (localStorage.getItem(STORAGE_KEYS.docListType) as DocListType | null) ?? legacyType;
        const savedClient = localStorage.getItem(STORAGE_KEYS.clientName) ?? sessionStorage.getItem('tax_docs_customer_name');
        const savedDeceased = localStorage.getItem(STORAGE_KEYS.deceasedName);
        const savedCharge = localStorage.getItem(STORAGE_KEYS.personInCharge) ?? localStorage.getItem('tax_docs_staff_name');
        const savedContact = localStorage.getItem(STORAGE_KEYS.personInChargeContact) ?? localStorage.getItem('tax_docs_staff_phone');
        const savedYear = Number(localStorage.getItem(STORAGE_KEYS.targetYear) ?? localStorage.getItem('tax_docs_year'));

        const effectiveType: DocListType = savedType && ['income-tax', 'gift-tax', 'inheritance-tax', 'simplified', 'unlisted-stock'].includes(savedType)
          ? savedType
          : 'inheritance-tax';
        const effectiveYear = Number.isInteger(savedYear) && savedYear >= 2000 && savedYear <= 2100
          ? savedYear
          : new Date().getFullYear();

        if (savedType) setDocListType(effectiveType);
        if (savedClient) setClientName(savedClient);
        if (savedDeceased) setDeceasedName(savedDeceased);
        if (savedCharge) setPersonInCharge(savedCharge);
        if (savedContact) setPersonInChargeContact(savedContact);
        setTargetYear(effectiveYear);

        const selectedCompanyId = companyId;

      // ストレージからデータを復元
        const dataKey = getDataStorageKey(effectiveType, selectedCompanyId);
        const savedData = localStorage.getItem(dataKey);
        let hasValidSavedData = false;
        if (savedData) {
          try {
            const parsed = JSON.parse(savedData) as EditableDocumentList;
            if (Array.isArray(parsed) && parsed.length > 0) {
              setDocumentList(parsed);
              hasValidSavedData = true;
            } else {
              setDocumentList(initializeEditableList(effectiveType, effectiveYear));
            }
          } catch {
            setDocumentList(initializeEditableList(effectiveType, effectiveYear));
          }
        } else {
          setDocumentList(initializeEditableList(effectiveType, effectiveYear));
        }

        void loadPublishedMaster(effectiveType, effectiveYear, !hasValidSavedData, selectedCompanyId);

        // ストレージからゴミ箱を復元
        const savedTrash = localStorage.getItem(getTrashStorageKey(effectiveType, selectedCompanyId));
        if (savedTrash) {
          try {
            const parsedTrash = JSON.parse(savedTrash) as Trash;
            if (Array.isArray(parsedTrash)) setTrash(parsedTrash);
          } catch { /* ゴミ箱の破損データは無視 */ }
        }
      } catch { /* ストレージ使用不可時は無視 */ }

      isInitialized.current = true;
    };
    initialize();
  }, [companyId, companyStatus, loadPublishedMaster]);

  // 変更検知：メタ情報をストレージへ保存
  useEffect(() => {
    if (!isInitialized.current) return;
    try {
      localStorage.setItem(STORAGE_KEYS.docListType, docListType);
      localStorage.setItem(STORAGE_KEYS.clientName, clientName);
      localStorage.setItem(STORAGE_KEYS.deceasedName, deceasedName);
      localStorage.setItem(STORAGE_KEYS.personInCharge, personInCharge);
      localStorage.setItem(STORAGE_KEYS.personInChargeContact, personInChargeContact);
      localStorage.setItem(STORAGE_KEYS.targetYear, String(targetYear));
    } catch { /* ストレージ使用不可時は無視 */ }
  }, [docListType, companyId, clientName, deceasedName, personInCharge, personInChargeContact, targetYear]);

  // 変更検知：書類リストデータをストレージへ保存
  useEffect(() => {
    if (!isInitialized.current) return;
    try {
      const dataKey = getDataStorageKey(docListType, companyId);
      localStorage.setItem(dataKey, JSON.stringify(documentList));
    } catch { /* ストレージ使用不可時は無視 */ }
  }, [docListType, companyId, documentList]);

  // 変更検知：ゴミ箱をストレージへ保存
  useEffect(() => {
    if (!isInitialized.current) return;
    try {
      localStorage.setItem(getTrashStorageKey(docListType, companyId), JSON.stringify(trash));
    } catch { /* ストレージ使用不可時は無視 */ }
  }, [docListType, companyId, trash]);

  const restoreListForScope = useCallback((type: DocListType, selectedCompanyId: number | null) => {
    let hasSavedData = false;
    try {
      const savedTrash = localStorage.getItem(getTrashStorageKey(type, selectedCompanyId));
      const parsedTrash = savedTrash ? JSON.parse(savedTrash) : [];
      setTrash(Array.isArray(parsedTrash) ? parsedTrash : []);

      const savedData = localStorage.getItem(getDataStorageKey(type, selectedCompanyId));
      if (savedData) {
        const parsed = JSON.parse(savedData) as EditableDocumentList;
        if (Array.isArray(parsed) && parsed.length > 0) {
          setDocumentList(parsed);
          hasSavedData = true;
        }
      }
    } catch {
      setTrash([]);
    }

    if (!hasSavedData) {
      const fallback = initializeEditableList(type, targetYear);
      masterDefaultsRef.current[getMasterKey(type, selectedCompanyId)] = fallback;
      setDocumentList(fallback);
    }
    void loadPublishedMaster(type, targetYear, !hasSavedData, selectedCompanyId);
  }, [loadPublishedMaster, targetYear]);

  // 書類リスト種別変更 → リスト再初期化（別種別のデータがあれば復元）
  const handleDocListTypeChange = useCallback((newType: DocListType) => {
    setDocListType(newType);

    restoreListForScope(newType, companyId);
  }, [companyId, restoreListForScope]);

  const handleTargetYearChange = useCallback((newYear: number) => {
    if (!Number.isInteger(newYear) || newYear < 2000 || newYear > 2100) return;
    const oldReiwa = targetYear - 2018;
    const newReiwa = newYear - 2018;
    const oldLabel = oldReiwa === 1 ? '元' : String(oldReiwa);
    const newLabel = newReiwa === 1 ? '元' : String(newReiwa);
    setDocumentList((current) => current.map((category) => ({
      ...category,
      documents: category.documents.map((document) => ({
        ...document,
        name: document.name.replace(new RegExp(`令和${oldLabel}`, 'g'), `令和${newLabel}`),
        description: document.description.replace(new RegExp(`令和${oldLabel}`, 'g'), `令和${newLabel}`),
        howToGet: document.howToGet.replace(new RegExp(`令和${oldLabel}`, 'g'), `令和${newLabel}`),
      })),
    })));
    setTargetYear(newYear);
  }, [targetYear]);

  const resetToPublishedMaster = useCallback(() => {
    setDocumentList(masterDefaultsRef.current[getMasterKey(docListType, companyId)] ?? initializeEditableList(docListType, targetYear));
    setTrash([]);
  }, [companyId, docListType, targetYear]);

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
      deceasedName: usesDeceasedName(docListType) ? deceasedName : '',
      personInCharge,
      personInChargeContact,
      company,
      excelTitle: `${DOC_LIST_TYPE_LABELS[docListType]} 資料準備ガイド`,
      filenamePrefix: `${DOC_LIST_TYPE_LABELS[docListType]}必要書類`,
    });
  }, [documentList, clientName, deceasedName, personInCharge, personInChargeContact, docListType, company]);

  const togglePrintColumn = useCallback(() => { setIsTwoColumnPrint(prev => !prev); }, []);
  const toggleHideSubmitted = useCallback(() => { setHideSubmittedInPrint(prev => !prev); }, []);

  return {
    // State
    docListType,
    companyId,
    targetYear,
    isTwoColumnPrint,
    hideSubmittedInPrint,
    currentDate,
    clientName,
    deceasedName,
    personInCharge,
    personInChargeContact,
    documentList,
    trash,

    // Handlers
    handleDocListTypeChange,
    handleTargetYearChange,
    resetToPublishedMaster,
    handlePrint,
    handleExcelExport,
    togglePrintColumn,
    toggleHideSubmitted,
    setClientName,
    setDeceasedName,
    setPersonInCharge,
    setPersonInChargeContact,
    setDocumentList,
    setTrash,
    setDocListType,
    setTargetYear,
  };
};
