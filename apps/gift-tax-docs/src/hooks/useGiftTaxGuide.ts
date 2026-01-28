import { useState, useMemo, useCallback, useEffect } from 'react';
import { giftData, type OptionId, type OptionSelection, type DocumentGroup, type Step } from '@/constants';
import { generateGiftTaxExcel } from '@/utils/excelGenerator';

export const useGiftTaxGuide = () => {
    const [step, setStep] = useState<Step>('menu');
    const [selectedOptions, setSelectedOptions] = useState<OptionSelection>({});
    const [isFullListMode, setIsFullListMode] = useState(false);
    const [isTwoColumnPrint, setIsTwoColumnPrint] = useState(false);

    // 担当者・お客様名
    const [staffName, setStaffName] = useState('');
    const [customerName, setCustomerName] = useState('');

    // 初期化：ストレージから読み込み
    useEffect(() => {
        const savedStaff = localStorage.getItem('gift_tax_staff_name');
        if (savedStaff) setStaffName(savedStaff);

        const savedCustomer = sessionStorage.getItem('gift_tax_customer_name');
        if (savedCustomer) setCustomerName(savedCustomer);
    }, []);

    // 変更検知：ストレージへ保存
    useEffect(() => {
        localStorage.setItem('gift_tax_staff_name', staffName);
    }, [staffName]);

    useEffect(() => {
        sessionStorage.setItem('gift_tax_customer_name', customerName);
    }, [customerName]);

    // 状態リセット
    const resetToMenu = useCallback(() => {
        setStep('menu');
        setSelectedOptions({});
        setIsFullListMode(false);
        // 名前は保持する（ストレージ保存のため、リセットしない）
    }, []);

    const toggleOption = useCallback((id: string) => {
        setSelectedOptions((prev: OptionSelection) => ({
            ...prev,
            [id]: !prev[id as OptionId],
        }));
    }, []);

    // 結果リスト生成（メモ化）
    const results = useMemo((): DocumentGroup[] => {
        const list: DocumentGroup[] = [];

        list.push(...giftData.baseRequired);

        giftData.options.forEach((opt) => {
            if (isFullListMode || selectedOptions[opt.id]) {
                list.push({
                    category: opt.label
                        .replace('をもらいましたか？', '')
                        .replace('はありますか？', ''),
                    documents: opt.documents,
                });
            }
        });

        giftData.specials.forEach((sp) => {
            if (isFullListMode || selectedOptions[sp.id]) {
                list.push({
                    category: `【特例】${sp.label
                        .replace('を選択しますか？', '')
                        .replace('を適用しますか？', '')
                        .replace('（婚姻期間20年以上）', '')}`,
                    documents: sp.documents,
                    note: sp.note || undefined,
                });
            }
        });

        return list;
    }, [isFullListMode, selectedOptions]);

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
            isFullListMode,
            staffName,
            customerName
        );
    }, [results, currentDate, isFullListMode, staffName, customerName]);

    const togglePrintColumn = useCallback(() => {
        setIsTwoColumnPrint((prev: boolean) => !prev);
    }, []);

    // 印刷用クラス生成
    const getPrintClass = useCallback((oneCol: string, twoCol: string) => {
        return isTwoColumnPrint ? twoCol : oneCol;
    }, [isTwoColumnPrint]);

    return {
        // State
        step,
        setStep,
        selectedOptions,
        isFullListMode,
        setIsFullListMode,
        isTwoColumnPrint,
        results,
        currentDate,
        staffName,
        customerName,

        // Handlers
        resetToMenu,
        toggleOption,
        handlePrint,
        handleExcelExport,
        togglePrintColumn,
        getPrintClass,
        setSelectedOptions,
        setStaffName,
        setCustomerName,
    }
};
