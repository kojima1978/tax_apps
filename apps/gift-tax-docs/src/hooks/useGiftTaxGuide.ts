import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { giftData, STORAGE_KEYS, type DocumentGroup, type Step, type EditableDocumentList } from '@/constants';
import { generateGiftTaxExcel } from '@/utils/excelGenerator';
import { initializeEditableList, toDocumentGroups } from '@/utils/editableListUtils';

export const useGiftTaxGuide = () => {
    const [step, setStep] = useState<Step>('menu');
    const [isTwoColumnPrint, setIsTwoColumnPrint] = useState(false);
    const [showUncheckedInPrint, setShowUncheckedInPrint] = useState(false);

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

    // 状態リセット
    const resetToMenu = useCallback(() => {
        setStep('menu');
        setDocumentList(initializeEditableList());
    }, []);

    // 結果リスト生成（メモ化）- 編集可能リストから変換
    const results = useMemo((): DocumentGroup[] => {
        return toDocumentGroups(documentList, showUncheckedInPrint);
    }, [documentList, showUncheckedInPrint]);

    // 画面遷移時に日付を再計算（タブを長時間開いている場合の対策）
    const currentDate = useMemo(() => {
        return new Date().toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step]);

    const handlePrint = useCallback(() => {
        window.print();
    }, []);

    const handleExcelExport = useCallback(() => {
        generateGiftTaxExcel(
            giftData.title,
            results,
            currentDate,
            showUncheckedInPrint,
            staffName,
            staffPhone,
            customerName
        );
    }, [results, currentDate, showUncheckedInPrint, staffName, staffPhone, customerName]);

    const togglePrintColumn = useCallback(() => {
        setIsTwoColumnPrint(prev => !prev);
    }, []);

    const toggleShowUnchecked = useCallback(() => {
        setShowUncheckedInPrint(prev => !prev);
    }, []);

    // 印刷用クラス生成
    const getPrintClass = useCallback((oneCol: string, twoCol: string) => {
        return isTwoColumnPrint ? twoCol : oneCol;
    }, [isTwoColumnPrint]);

    return {
        // State
        step,
        setStep,
        isTwoColumnPrint,
        results,
        currentDate,
        staffName,
        staffPhone,
        customerName,
        documentList,
        showUncheckedInPrint,

        // Handlers
        resetToMenu,
        handlePrint,
        handleExcelExport,
        togglePrintColumn,
        toggleShowUnchecked,
        getPrintClass,
        setStaffName,
        setStaffPhone,
        setCustomerName,
        setDocumentList,
    }
};
