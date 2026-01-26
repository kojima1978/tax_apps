import { useState, useMemo, useCallback } from 'react';
import { giftData, type OptionId, type OptionSelection, type DocumentGroup, type Step } from '@/constants';
import { generateGiftTaxExcel } from '@/utils/excelGenerator';

export const useGiftTaxGuide = () => {
    const [step, setStep] = useState<Step>('menu');
    const [selectedOptions, setSelectedOptions] = useState<OptionSelection>({});
    const [isFullListMode, setIsFullListMode] = useState(false);
    const [isTwoColumnPrint, setIsTwoColumnPrint] = useState(false);

    // 状態リセット
    const resetToMenu = useCallback(() => {
        setStep('menu');
        setSelectedOptions({});
        setIsFullListMode(false);
    }, []);

    const toggleOption = useCallback((id: string) => {
        setSelectedOptions((prev) => ({
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
            isFullListMode
        );
    }, [results, currentDate, isFullListMode]);

    const togglePrintColumn = useCallback(() => {
        setIsTwoColumnPrint((prev) => !prev);
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

        // Handlers
        resetToMenu,
        toggleOption,
        handlePrint,
        handleExcelExport,
        togglePrintColumn,
        getPrintClass,
        setSelectedOptions,
    }
};
