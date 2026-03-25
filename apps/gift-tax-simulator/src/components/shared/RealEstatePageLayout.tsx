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
    errorMsg: string;
    results: TaxResults | null;
    resultConfig: ResultConfig | null;
    showDetails: boolean;
    setShowDetails: (v: boolean) => void;
};

const RealEstatePageLayout = ({
    transactionType, setTransactionType,
    includeLand, setIncludeLand,
    includeBuilding, setIncludeBuilding,
    inputNotice,
    importConfig,
    inputColumns,
    onCalculate, errorMsg,
    results, resultConfig,
    showDetails, setShowDetails,
}: Props) => (
    <PageLayout className="real-estate-page">
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

        <div className="input-section input-section-flat">
            <div className="re-two-column">
                {inputColumns}
            </div>
            <div className="calc-action-bar">
                <button className="btn-calc" onClick={onCalculate}>計算する</button>
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
    </PageLayout>
);

export default RealEstatePageLayout;
