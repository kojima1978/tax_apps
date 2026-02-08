'use client';

import type { TaxResults } from '@/lib/real-estate-tax';

type CalculationDetailsProps = {
    results: TaxResults;
    includeLand: boolean;
    includeBuilding: boolean;
    showDetails: boolean;
    setShowDetails: (v: boolean) => void;
};

const ProcessList = ({ title, steps }: { title: string; steps: string[] }) => (
    <div className="detail-box">
        <strong>{title}</strong>
        <ul>
            {steps.map((step, i) => <li key={i}>{step}</li>)}
        </ul>
    </div>
);

const CalculationDetails = ({
    results,
    includeLand,
    includeBuilding,
    showDetails,
    setShowDetails,
}: CalculationDetailsProps) => (
    <>
        <button
            className="details-toggle no-print"
            onClick={() => setShowDetails(!showDetails)}
        >
            {showDetails ? '▲ 計算過程を隠す' : '▼ 計算過程の詳細を表示'}
        </button>

        {showDetails && (
            <div className="details-content">
                {includeLand && results.process.landAcq.length > 0 && (
                    <div className="detail-section">
                        <h4>土地</h4>
                        <ProcessList title="不動産取得税" steps={results.process.landAcq} />
                        <ProcessList title="登録免許税" steps={results.process.landReg} />
                    </div>
                )}
                {includeBuilding && results.process.bldgAcq.length > 0 && (
                    <div className="detail-section">
                        <h4>建物</h4>
                        <ProcessList title="不動産取得税" steps={results.process.bldgAcq} />
                        <ProcessList title="登録免許税" steps={results.process.bldgReg} />
                    </div>
                )}
            </div>
        )}
    </>
);

export default CalculationDetails;
