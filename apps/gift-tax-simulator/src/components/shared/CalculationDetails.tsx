import type { TaxResults } from '@/lib/real-estate-tax';

type TaxType = 'acquisition' | 'registration';

type CalculationDetailsProps = {
    results: TaxResults;
    includeLand: boolean;
    includeBuilding: boolean;
    showDetails: boolean;
    setShowDetails: (v: boolean) => void;
    taxType: TaxType;
};

const ProcessList = ({ title, steps }: { title: string; steps: string[] }) => (
    <div className="detail-box">
        <strong>{title}</strong>
        <ul>
            {steps.map((step, i) => <li key={i}>{step}</li>)}
        </ul>
    </div>
);

const LABELS: Record<TaxType, { land: string; building: string }> = {
    acquisition: { land: '土地 — 不動産取得税', building: '建物 — 不動産取得税' },
    registration: { land: '土地 — 登録免許税', building: '建物 — 登録免許税' },
};

const getProcess = (results: TaxResults, taxType: TaxType) => ({
    land: taxType === 'acquisition' ? results.process.landAcq : results.process.landReg,
    building: taxType === 'acquisition' ? results.process.bldgAcq : results.process.bldgReg,
});

const CalculationDetails = ({
    results,
    includeLand,
    includeBuilding,
    showDetails,
    setShowDetails,
    taxType,
}: CalculationDetailsProps) => {
    const process = getProcess(results, taxType);
    const labels = LABELS[taxType];

    return (
        <>
            <button
                className="details-toggle no-print"
                onClick={() => setShowDetails(!showDetails)}
            >
                {showDetails ? '▲ 計算過程を隠す' : '▼ 計算過程の詳細を表示'}
            </button>

            {showDetails && (
                <div className="details-content">
                    {includeLand && process.land.length > 0 && (
                        <div className="detail-section">
                            <ProcessList title={labels.land} steps={process.land} />
                        </div>
                    )}
                    {includeBuilding && process.building.length > 0 && (
                        <div className="detail-section">
                            <ProcessList title={labels.building} steps={process.building} />
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

export default CalculationDetails;
