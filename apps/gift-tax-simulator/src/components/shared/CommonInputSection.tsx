import { type TransactionType, TRANSACTION_OPTIONS } from '@/lib/real-estate-tax';

type CommonInputSectionProps = {
    transactionType: TransactionType;
    setTransactionType: (v: TransactionType) => void;
    includeLand: boolean;
    setIncludeLand: (v: boolean) => void;
    includeBuilding: boolean;
    setIncludeBuilding: (v: boolean) => void;
    children?: React.ReactNode;
};

const CommonInputSection = ({
    transactionType,
    setTransactionType,
    includeLand,
    setIncludeLand,
    includeBuilding,
    setIncludeBuilding,
    children,
}: CommonInputSectionProps) => (
    <div className="input-section">
        <div className="input-group-row">
            <div className="input-item">
                <label htmlFor="transactionType">登記原因 (取引種別)</label>
                <select
                    id="transactionType"
                    value={transactionType}
                    onChange={(e) => setTransactionType(e.target.value as TransactionType)}
                >
                    {TRANSACTION_OPTIONS.map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                    ))}
                </select>
            </div>
            <div className="input-item toggle-buttons">
                <label>計算対象</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        type="button"
                        className={`toggle-btn ${includeLand ? 'active' : ''}`}
                        onClick={() => setIncludeLand(!includeLand)}
                    >
                        土地
                    </button>
                    <button
                        type="button"
                        className={`toggle-btn ${includeBuilding ? 'active' : ''}`}
                        onClick={() => setIncludeBuilding(!includeBuilding)}
                    >
                        建物
                    </button>
                </div>
            </div>
        </div>
        {children}
    </div>
);

export default CommonInputSection;
