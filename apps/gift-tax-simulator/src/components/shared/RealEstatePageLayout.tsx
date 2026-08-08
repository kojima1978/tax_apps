import { useEffect, useMemo, useRef } from 'react';
import ArrowRight from 'lucide-react/icons/arrow-right';
import RotateCcw from 'lucide-react/icons/rotate-ccw';
import type { TransactionType, TaxResults } from '@/lib/real-estate-tax';
import {
    compactGroups,
    compactRows,
    targetRow,
    transactionRow,
    type ConditionGroup,
} from '@/lib/print-conditions';
import PageLayout from '@/components/PageLayout';
import CommonInputSection from './CommonInputSection';
import ImportButton from './ImportButton';
import PrintConditionList from './PrintConditionList';
import TaxResultBox, { type ResultGroup, type ResultItem } from './TaxResultBox';
import CalculationDetails from './CalculationDetails';
import ErrorMessage from './ErrorMessage';

type ImportConfig = {
    sourceLabel: string;
    sourcePage: 'acquisition-tax' | 'registration-tax';
    onLandImport: () => void;
    onBuildingImport: () => void;
};

type ResultConfig = {
    items?: ResultItem[];
    groups?: ResultGroup[];
    totalLabel: string;
    totalValue: number;
    taxType: 'acquisition' | 'registration';
    disclaimer: string;
    shareNote?: string;
};

type Props = {
    transactionType: TransactionType;
    setTransactionType: (v: TransactionType) => void;
    includeLand: boolean;
    setIncludeLand: (v: boolean) => void;
    includeBuilding: boolean;
    setIncludeBuilding: (v: boolean) => void;
    inputNotice?: React.ReactNode;
    importConfig: ImportConfig;
    inputColumns: React.ReactNode;
    /** 印刷用「入力条件」の土地・建物グループ（共通条件はこの層で足す） */
    printConditionGroups: ConditionGroup[];
    onCalculate: () => void;
    onReset: () => void;
    errorMsg: string;
    results: TaxResults | null;
    resultConfig: ResultConfig | null;
    isStale: boolean;
    showDetails: boolean;
    setShowDetails: (v: boolean) => void;
    printTitle: string;
    reference?: React.ReactNode;
};

const RealEstatePageLayout = ({
    transactionType, setTransactionType,
    includeLand, setIncludeLand,
    includeBuilding, setIncludeBuilding,
    inputNotice,
    importConfig,
    inputColumns,
    printConditionGroups,
    onCalculate, onReset, errorMsg,
    results, resultConfig,
    isStale,
    showDetails, setShowDetails,
    printTitle,
    reference,
}: Props) => {
    const formRef = useRef<HTMLDivElement>(null);
    const resultRef = useRef<HTMLDivElement>(null);
    const hasResult = results !== null && resultConfig !== null;

    useEffect(() => {
        if (!errorMsg) return;
        const target = formRef.current?.querySelector<HTMLElement>(
            'input:not(:disabled), select:not(:disabled), [data-calculation-target]',
        ) ?? document.querySelector<HTMLElement>('[data-calculation-target]');
        target?.focus();
    }, [errorMsg]);

    // 結果は入力欄より下にあり、押しただけでは画面が変わらないので結果まで送る
    useEffect(() => {
        if (!hasResult || isStale) return;
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, [hasResult, isStale, results]);

    const conditionGroups = useMemo(() => compactGroups([
        {
            title: '共通条件',
            rows: compactRows([transactionRow(transactionType), targetRow(includeLand, includeBuilding)]),
        },
        ...printConditionGroups,
    ]), [transactionType, includeLand, includeBuilding, printConditionGroups]);

    return (
    <PageLayout className="real-estate-page" printTitle={printTitle}>
        {/* 画面では単なる縦積み。印刷時だけ「入力条件｜税額」の2カラムになる */}
        <div className="re-print-layout">
            <div className="re-input-column">
                <CommonInputSection
                    transactionType={transactionType}
                    setTransactionType={setTransactionType}
                    includeLand={includeLand}
                    setIncludeLand={setIncludeLand}
                    includeBuilding={includeBuilding}
                    setIncludeBuilding={setIncludeBuilding}
                >
                    {inputNotice}
                </CommonInputSection>

                <div className="import-bar-group no-print">
                    <ImportButton
                        sourceLabel={importConfig.sourceLabel}
                        sourcePage={importConfig.sourcePage}
                        field="land"
                        onImport={importConfig.onLandImport}
                    />
                    <ImportButton
                        sourceLabel={importConfig.sourceLabel}
                        sourcePage={importConfig.sourcePage}
                        field="building"
                        onImport={importConfig.onBuildingImport}
                    />
                </div>

                <div ref={formRef} className="input-section input-section-flat">
                    <div className="re-two-column">
                        {inputColumns}
                    </div>
                    <div className="calc-action-bar">
                        <button className="btn-calc" onClick={onCalculate}>計算する</button>
                        <button type="button" className="btn-input-helper no-print" onClick={onReset}>
                            <RotateCcw aria-hidden="true" />
                            入力を消す
                        </button>
                        <ErrorMessage message={errorMsg} />
                    </div>
                </div>

                {/* 入力欄は印刷しないので、条件はこのサマリで紙に残す */}
                <PrintConditionList groups={conditionGroups} />

                {hasResult && isStale && (
                    <p className="print-only print-stale-notice">
                        ※ 入力条件が変更されています。上記条件の税額は再計算してください。
                    </p>
                )}
            </div>

            {/* 紙の上で「条件 → 結果」の流れを示す。古い税額を出さない stale 時は結果ごと消す */}
            {hasResult && !isStale && (
                <div className="print-only re-print-arrow" aria-hidden="true">
                    <ArrowRight />
                </div>
            )}

            {results !== null && resultConfig && (
                <div ref={resultRef} className={`result-section${isStale ? ' result-stale' : ''}`}>
                    {isStale && (
                        <p className="result-stale-badge no-print">
                            入力が変更されました。「計算する」を押すと結果が更新されます。
                        </p>
                    )}
                    <TaxResultBox
                        items={resultConfig.items}
                        groups={resultConfig.groups}
                        totalLabel={resultConfig.totalLabel}
                        totalValue={resultConfig.totalValue}
                        shareNote={resultConfig.shareNote}
                    />
                    <CalculationDetails
                        results={results}
                        includeLand={includeLand}
                        includeBuilding={includeBuilding}
                        showDetails={showDetails}
                        setShowDetails={setShowDetails}
                        taxType={resultConfig.taxType}
                    />
                    <p className="disclaimer">{resultConfig.disclaimer}</p>
                </div>
            )}
        </div>
        {reference}
    </PageLayout>
    );
};

export default RealEstatePageLayout;
