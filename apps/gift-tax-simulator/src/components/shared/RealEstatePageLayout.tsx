import { useEffect, useRef } from 'react';
import RotateCcw from 'lucide-react/icons/rotate-ccw';
import type { TransactionType, TaxResults } from '@/lib/real-estate-tax';
import PageLayout from '@/components/PageLayout';
import CommonInputSection from './CommonInputSection';
import ImportButton from './ImportButton';
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
    onCalculate: () => void;
    onReset: () => void;
    errorMsg: string;
    results: TaxResults | null;
    resultConfig: ResultConfig | null;
    showDetails: boolean;
    setShowDetails: (v: boolean) => void;
    printTitle: string;
    printReference?: React.ReactNode;
};

const RealEstatePageLayout = ({
    transactionType, setTransactionType,
    includeLand, setIncludeLand,
    includeBuilding, setIncludeBuilding,
    inputNotice,
    importConfig,
    inputColumns,
    onCalculate, onReset, errorMsg,
    results, resultConfig,
    showDetails, setShowDetails,
    printTitle,
    printReference,
}: Props) => {
    const formRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!errorMsg) return;
        const target = formRef.current?.querySelector<HTMLElement>(
            'input:not(:disabled), select:not(:disabled), [data-calculation-target]',
        ) ?? document.querySelector<HTMLElement>('[data-calculation-target]');
        target?.focus();
    }, [errorMsg]);

    return (
    <PageLayout className="real-estate-page" printTitle={printTitle}>
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

        {results !== null && resultConfig && (
            <div className="result-section">
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
                <p className="disclaimer no-print">{resultConfig.disclaimer}</p>
            </div>
        )}
        {printReference}
    </PageLayout>
    );
};

export default RealEstatePageLayout;
