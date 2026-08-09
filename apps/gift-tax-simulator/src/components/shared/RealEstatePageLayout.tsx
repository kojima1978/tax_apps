import { useEffect, useMemo, useRef } from 'react';
import ArrowRight from 'lucide-react/icons/arrow-right';
import type { TransactionType, TaxResults } from '@/lib/real-estate-tax';
import {
    compactGroups,
    compactRows,
    targetRow,
    transactionRow,
    type ConditionGroup,
} from '@/lib/print-conditions';
import { IMPORT_FIELDS, type ImportField, type PageKey } from '@/lib/real-estate-input-storage';
import PageLayout from '@/components/PageLayout';
import CommonInputSection from './CommonInputSection';
import ImportButton from './ImportButton';
import PrintConditionList from './PrintConditionList';
import TaxResultBox, { type ResultGroup, type ResultItem } from './TaxResultBox';
import CalculationDetails from './CalculationDetails';
import ErrorMessage from './ErrorMessage';

type ImportConfig = {
    /** 引用元ページ。実際に入力が残っているものだけボタンが出る */
    sources: PageKey[];
    onImport: (page: PageKey, field: ImportField) => void;
};

/** 税額の枠1つ分。まとめページでは取得税・免許税の2つを並べる */
type ResultSection = {
    key: string;
    /** 紙の枠見出し。省略時は「計算結果」 */
    printTitle?: string;
    items?: ResultItem[];
    groups?: ResultGroup[];
    totalLabel: string;
    totalValue: number;
    shareNote?: string;
    /** 計算過程の折りたたみ。省くと折りたたみ自体を出さない */
    details?: { results: TaxResults; taxType: 'acquisition' | 'registration' };
};

type Props = {
    transactionType: TransactionType;
    setTransactionType: (v: TransactionType) => void;
    includeLand: boolean;
    setIncludeLand: (v: boolean) => void;
    includeBuilding: boolean;
    setIncludeBuilding: (v: boolean) => void;
    inputNotice?: React.ReactNode;
    /** 他ページからの評価額取り込み。1ページで完結する画面では省く */
    importConfig?: ImportConfig;
    inputColumns: React.ReactNode;
    /** 印刷用「入力条件」の土地・建物グループ（共通条件はこの層で足す） */
    printConditionGroups: ConditionGroup[];
    onCalculate: () => void;
    onSample: () => void;
    onReset: () => void;
    errorMsg: string;
    /** 空配列なら結果ブロックごと出さない */
    resultSections: ResultSection[];
    /** 税額の枠の下に置く総額など */
    resultFooter?: React.ReactNode;
    disclaimer: string;
    isStale: boolean;
    showDetails: boolean;
    setShowDetails: (v: boolean) => void;
    printTitle: string;
    className?: string;
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
    onCalculate, onSample, onReset, errorMsg,
    resultSections, resultFooter, disclaimer,
    isStale,
    showDetails, setShowDetails,
    printTitle,
    className,
    reference,
}: Props) => {
    const formRef = useRef<HTMLDivElement>(null);
    const resultRef = useRef<HTMLDivElement>(null);
    const hasResult = resultSections.length > 0;
    // 計算過程を載せるページは印刷レイアウトが変わる（左=条件+結果 / 右=計算過程）
    const hasDetails = resultSections.some((section) => section.details);

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
    }, [hasResult, isStale, resultSections]);

    const conditionGroups = useMemo(() => compactGroups([
        {
            title: '共通条件',
            rows: compactRows([transactionRow(transactionType), targetRow(includeLand, includeBuilding)]),
        },
        ...printConditionGroups,
    ]), [transactionType, includeLand, includeBuilding, printConditionGroups]);

    return (
    <PageLayout className={`real-estate-page ${className ?? ''}`} printTitle={printTitle}>
        {/* 画面では単なる縦積み。印刷時だけ「入力条件｜税額」の横並びになる */}
        <div className={`re-print-layout${hasDetails ? ' re-print-with-details' : ''}`}>
            <div className="re-input-column">
                <CommonInputSection
                    transactionType={transactionType}
                    setTransactionType={setTransactionType}
                    includeLand={includeLand}
                    setIncludeLand={setIncludeLand}
                    includeBuilding={includeBuilding}
                    setIncludeBuilding={setIncludeBuilding}
                    onSample={onSample}
                    onReset={onReset}
                >
                    {inputNotice}
                </CommonInputSection>

                {importConfig && (
                    <div className="import-bar-group no-print">
                        {importConfig.sources.flatMap((page) => IMPORT_FIELDS.map((field) => (
                            <ImportButton
                                key={`${page}-${field}`}
                                sourcePage={page}
                                field={field}
                                onImport={() => importConfig.onImport(page, field)}
                            />
                        )))}
                    </div>
                )}

                <div ref={formRef} className="input-section input-section-flat">
                    <div className="re-two-column">
                        {inputColumns}
                    </div>
                    <div className="calc-action-bar">
                        <button className="btn-calc" onClick={onCalculate}>計算する</button>
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

            {/* 紙の上で「条件 → 結果」の流れを示す。古い税額を出さない stale 時は結果ごと消す。
                計算過程を載せるページは条件と結果が左カラムで縦に続くので矢印は置かない */}
            {hasResult && !isStale && !hasDetails && (
                <div className="print-only re-print-arrow" aria-hidden="true">
                    <ArrowRight />
                </div>
            )}

            {hasResult && (
                <div ref={resultRef} className={`result-section${isStale ? ' result-stale' : ''}`}>
                    {isStale && (
                        <p className="result-stale-badge no-print">
                            入力が変更されました。「計算する」を押すと結果が更新されます。
                        </p>
                    )}
                    {resultSections.map((section) => (
                        <TaxResultBox
                            key={section.key}
                            printTitle={section.printTitle}
                            items={section.items}
                            groups={section.groups}
                            totalLabel={section.totalLabel}
                            totalValue={section.totalValue}
                            shareNote={section.shareNote}
                        />
                    ))}
                    {resultFooter}
                    {/* 印刷では計算過程が右カラムそのものになるので、複数あっても1つの
                        グリッド項目にまとめる（配置指定が枠の数に左右されなくなる） */}
                    {hasDetails && (
                        <div className="details-column">
                            {resultSections.map((section, i) => section.details && (
                                <CalculationDetails
                                    key={`${section.key}-details`}
                                    results={section.details.results}
                                    includeLand={includeLand}
                                    includeBuilding={includeBuilding}
                                    showDetails={showDetails}
                                    setShowDetails={setShowDetails}
                                    taxType={section.details.taxType}
                                    showToggle={i === 0}
                                />
                            ))}
                        </div>
                    )}
                    <p className="disclaimer">{disclaimer}</p>
                </div>
            )}
        </div>
        {reference}
    </PageLayout>
    );
};

export default RealEstatePageLayout;
