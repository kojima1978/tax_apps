import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { giftData, STORAGE_KEYS, type DocumentGroup, type EditableDocumentList } from '@/constants';
import { generateGiftTaxExcel } from '@/utils/excelGenerator';
import { initializeEditableList, toDocumentGroups } from '@/utils/editableListUtils';

export const useGiftTaxGuide = () => {
    const [isTwoColumnPrint, setIsTwoColumnPrint] = useState(false);
    const [hideSubmittedInPrint, setHideSubmittedInPrint] = useState(false);

    // 編集可能な書類リスト
    const [documentList, setDocumentList] = useState<EditableDocumentList>(() =>
        initializeEditableList()
    );

    // 担当者・お客様名・携帯番号
    const [staffName, setStaffName] = useState('');
    const [staffPhone, setStaffPhone] = useState('');
    const [customerName, setCustomerName] = useState('');

    // 初期化完了フラグ（保存effectが初期値''で上書きしないようにガード）
    const isInitialized = useRef(false);

    // 初期化：ストレージから読み込み
    useEffect(() => {
        try {
            const savedStaff = localStorage.getItem(STORAGE_KEYS.staffName);
            if (savedStaff) setStaffName(savedStaff);

            const savedPhone = localStorage.getItem(STORAGE_KEYS.staffPhone);
            if (savedPhone) setStaffPhone(savedPhone);

            const savedCustomer = sessionStorage.getItem(STORAGE_KEYS.customerName);
            if (savedCustomer) setCustomerName(savedCustomer);
        } catch {
            // プライベートブラウジング等でストレージが使用不可の場合は無視
        }

        isInitialized.current = true;
    }, []);

    // 変更検知：ストレージへ保存（初期化完了後のみ）
    useEffect(() => {
        if (!isInitialized.current) return;
        try {
            localStorage.setItem(STORAGE_KEYS.staffName, staffName);
            localStorage.setItem(STORAGE_KEYS.staffPhone, staffPhone);
            sessionStorage.setItem(STORAGE_KEYS.customerName, customerName);
        } catch { /* プライベートブラウジング等でストレージが使用不可の場合は無視 */ }
    }, [staffName, staffPhone, customerName]);

    // 結果リスト生成（メモ化）- 編集可能リストから変換
    const results = useMemo((): DocumentGroup[] => {
        return toDocumentGroups(documentList, hideSubmittedInPrint);
    }, [documentList, hideSubmittedInPrint]);

    // 現在日付（印刷用）
    const currentDate = useMemo(() => {
        return new Date().toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
    }, []);

    const handlePrint = useCallback(() => {
        window.print();
    }, []);

    const handleExcelExport = useCallback(() => {
        generateGiftTaxExcel(
            giftData.title,
            results,
            currentDate,
            hideSubmittedInPrint,
            staffName,
            staffPhone,
            customerName
        );
    }, [results, currentDate, hideSubmittedInPrint, staffName, staffPhone, customerName]);

    const togglePrintColumn = useCallback(() => {
        setIsTwoColumnPrint(prev => !prev);
    }, []);

    const toggleHideSubmitted = useCallback(() => {
        setHideSubmittedInPrint(prev => !prev);
    }, []);

    return {
        // State
        isTwoColumnPrint,
        results,
        currentDate,
        staffName,
        staffPhone,
        customerName,
        documentList,
        hideSubmittedInPrint,

        // Handlers
        handlePrint,
        handleExcelExport,
        togglePrintColumn,
        toggleHideSubmitted,
        setStaffName,
        setStaffPhone,
        setCustomerName,
        setDocumentList,
    }
};
