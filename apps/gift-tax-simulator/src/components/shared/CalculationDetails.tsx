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

const SECTIONS: Record<TaxType, { key: 'land' | 'building'; label: string; includeKey: 'includeLand' | 'includeBuilding'; processKey: 'landAcq' | 'bldgAcq' | 'landReg' | 'bldgReg' }[]> = {
    acquisition: [
        { key: 'land', label: '土地 — 不動産取得税', includeKey: 'includeLand', processKey: 'landAcq' },
        { key: 'building', label: '建物 — 不動産取得税', includeKey: 'includeBuilding', processKey: 'bldgAcq' },
    ],
    registration: [
        { key: 'land', label: '土地 — 登録免許税', includeKey: 'includeLand', processKey: 'landReg' },
        { key: 'building', label: '建物 — 登録免許税', includeKey: 'includeBuilding', processKey: 'bldgReg' },
    ],
};

const CalculationDetails = ({
    results,
    includeLand,
    includeBuilding,
    showDetails,
    setShowDetails,
    taxType,
}: CalculationDetailsProps) => {
    const includes = { includeLand, includeBuilding };

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
                    {SECTIONS[taxType].map(({ key, label, includeKey, processKey }) => {
                        const steps = results.process[processKey];
                        return includes[includeKey] && steps.length > 0 && (
                            <div key={key} className="detail-section">
                                <ProcessList title={label} steps={steps} />
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );
};

export default CalculationDetails;
