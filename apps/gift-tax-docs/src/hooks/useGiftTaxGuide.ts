import { useState, useMemo, useCallback, useEffect } from 'react';
import { giftData, type DocumentGroup, type Step, type EditableDocumentList } from '@/constants';
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

    // 初期化：ストレージから読み込み
    useEffect(() => {
        const savedStaff = localStorage.getItem('gift_tax_staff_name');
        if (savedStaff) setStaffName(savedStaff);

        const savedPhone = localStorage.getItem('gift_tax_staff_phone');
        if (savedPhone) setStaffPhone(savedPhone);

        const savedCustomer = sessionStorage.getItem('gift_tax_customer_name');
        if (savedCustomer) setCustomerName(savedCustomer);
    }, []);

    // 変更検知：ストレージへ保存
    useEffect(() => {
        localStorage.setItem('gift_tax_staff_name', staffName);
    }, [staffName]);

    useEffect(() => {
        localStorage.setItem('gift_tax_staff_phone', staffPhone);
    }, [staffPhone]);

    useEffect(() => {
        sessionStorage.setItem('gift_tax_customer_name', customerName);
    }, [customerName]);

    // 状態リセット
    const resetToMenu = useCallback(() => {
        setStep('menu');
        setDocumentList(initializeEditableList());
        // 名前は保持する（ストレージ保存のため、リセットしない）
    }, []);

    // 結果リスト生成（メモ化）- 編集可能リストから変換
    const results = useMemo((): DocumentGroup[] => {
        return toDocumentGroups(documentList, showUncheckedInPrint);
    }, [documentList, showUncheckedInPrint]);

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
            showUncheckedInPrint,
            staffName,
            customerName
        );
    }, [results, currentDate, showUncheckedInPrint, staffName, customerName]);

    const togglePrintColumn = useCallback(() => {
        setIsTwoColumnPrint((prev: boolean) => !prev);
    }, []);

    const toggleShowUnchecked = useCallback(() => {
        setShowUncheckedInPrint((prev: boolean) => !prev);
    }, []);

    // 印刷用クラス生成
    const getPrintClass = useCallback((oneCol: string, twoCol: string) => {
        return isTwoColumnPrint ? twoCol : oneCol;
    }, [isTwoColumnPrint]);

    // チェック済み書類があるかどうか
    const hasCheckedDocuments = useMemo(() => {
        return documentList.some((cat) => cat.documents.some((doc) => doc.checked));
    }, [documentList]);

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
        hasCheckedDocuments,

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
