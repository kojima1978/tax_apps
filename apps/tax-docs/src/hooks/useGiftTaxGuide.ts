import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { STORAGE_KEYS, TAX_TYPE_LABELS, type TaxType, type DocumentGroup, type EditableDocumentList } from '@/constants';
import { generateGiftTaxExcel } from '@/utils/excelGenerator';
import { initializeEditableList, toDocumentGroups } from '@/utils/editableListUtils';
import { REIWA_OFFSET, getDefaultYear } from '@/utils/helpers';

export const useGiftTaxGuide = () => {
    const [isTwoColumnPrint, setIsTwoColumnPrint] = useState(false);
    const [hideSubmittedInPrint, setHideSubmittedInPrint] = useState(false);

    // 申告種別・年度
    const [taxType, setTaxType] = useState<TaxType>('income-tax');
    const [year, setYear] = useState(getDefaultYear);

    // 編集可能な書類リスト
    const [documentList, setDocumentList] = useState<EditableDocumentList>(() =>
        initializeEditableList('income-tax', getDefaultYear())
    );

    // 担当者・お客様名・連絡先
    const [staffName, setStaffName] = useState('');
    const [staffPhone, setStaffPhone] = useState('');
    const [customerName, setCustomerName] = useState('');

    // 初期化完了フラグ
    const isInitialized = useRef(false);

    // 初期化：ストレージから読み込み
    useEffect(() => {
        try {
            const savedTaxType = localStorage.getItem(STORAGE_KEYS.taxType) as TaxType | null;
            const savedYear = localStorage.getItem(STORAGE_KEYS.year);
            const savedStaff = localStorage.getItem(STORAGE_KEYS.staffName);
            const savedPhone = localStorage.getItem(STORAGE_KEYS.staffPhone);
            const savedCustomer = sessionStorage.getItem(STORAGE_KEYS.customerName);

            const effectiveTaxType = savedTaxType === 'income-tax' ? 'income-tax' : 'gift-tax';
            const effectiveYear = savedYear ? Number(savedYear) : getDefaultYear();

            if (savedTaxType) setTaxType(effectiveTaxType);
            if (savedYear) setYear(effectiveYear);
            if (savedStaff) setStaffName(savedStaff);
            if (savedPhone) setStaffPhone(savedPhone);
            if (savedCustomer) setCustomerName(savedCustomer);

            // ストレージの申告種別/年度でリストを再初期化
            if (savedTaxType || savedYear) {
                setDocumentList(initializeEditableList(effectiveTaxType, effectiveYear));
            }
        } catch { /* ストレージ使用不可時は無視 */ }

        isInitialized.current = true;
    }, []);

    // 変更検知：ストレージへ保存
    useEffect(() => {
        if (!isInitialized.current) return;
        try {
            localStorage.setItem(STORAGE_KEYS.taxType, taxType);
            localStorage.setItem(STORAGE_KEYS.year, String(year));
            localStorage.setItem(STORAGE_KEYS.staffName, staffName);
            localStorage.setItem(STORAGE_KEYS.staffPhone, staffPhone);
            sessionStorage.setItem(STORAGE_KEYS.customerName, customerName);
        } catch { /* ストレージ使用不可時は無視 */ }
    }, [taxType, year, staffName, staffPhone, customerName]);

    // 申告種別変更 → リスト再初期化
    const handleTaxTypeChange = useCallback((newType: TaxType) => {
        setTaxType(newType);
        setDocumentList(initializeEditableList(newType, year));
    }, [year]);

    // 年度変更 → 令和年テキスト自動置換
    const handleYearChange = useCallback((newYear: number) => {
        const oldReiwa = year - REIWA_OFFSET;
        const oldStr = oldReiwa === 1 ? '元' : String(oldReiwa);
        const newReiwa = newYear - REIWA_OFFSET;
        const newStr = newReiwa === 1 ? '元' : String(newReiwa);
        const pattern = new RegExp(`令和${oldStr}`, 'g');
        setDocumentList(prev =>
            prev.map(cat => ({
                ...cat,
                documents: cat.documents.map(doc => ({
                    ...doc,
                    text: doc.text.replace(pattern, `令和${newStr}`),
                })),
            }))
        );
        setYear(newYear);
    }, [year]);

    // 結果リスト生成（メモ化）
    const results = useMemo((): DocumentGroup[] => {
        return toDocumentGroups(documentList, hideSubmittedInPrint);
    }, [documentList, hideSubmittedInPrint]);

    const currentDate = useMemo(() => {
        return new Date().toLocaleDateString('ja-JP', {
            year: 'numeric', month: '2-digit', day: '2-digit',
        });
    }, []);

    const handlePrint = useCallback(() => { window.print(); }, []);

    const handleExcelExport = useCallback(() => {
        generateGiftTaxExcel(
            TAX_TYPE_LABELS[taxType] + ' 必要書類',
            results,
            currentDate,
            hideSubmittedInPrint,
            staffName,
            staffPhone,
            customerName,
            year
        );
    }, [taxType, results, currentDate, hideSubmittedInPrint, staffName, staffPhone, customerName, year]);

    const togglePrintColumn = useCallback(() => { setIsTwoColumnPrint(prev => !prev); }, []);
    const toggleHideSubmitted = useCallback(() => { setHideSubmittedInPrint(prev => !prev); }, []);

    return {
        // State
        taxType,
        year,
        isTwoColumnPrint,
        results,
        currentDate,
        staffName,
        staffPhone,
        customerName,
        documentList,
        hideSubmittedInPrint,

        // Handlers
        handleTaxTypeChange,
        handleYearChange,
        handlePrint,
        handleExcelExport,
        togglePrintColumn,
        toggleHideSubmitted,
        setStaffName,
        setStaffPhone,
        setCustomerName,
        setDocumentList,
    };
};
