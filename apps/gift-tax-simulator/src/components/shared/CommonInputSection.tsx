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
                <div className="flex-row" role="group" aria-label="計算対象">
                    <button
                        type="button"
                        className={`toggle-btn ${includeLand ? 'active' : ''}`}
                        onClick={() => setIncludeLand(!includeLand)}
                        aria-pressed={includeLand}
                        data-calculation-target
                    >
                        土地
                    </button>
                    <button
                        type="button"
                        className={`toggle-btn ${includeBuilding ? 'active' : ''}`}
                        onClick={() => setIncludeBuilding(!includeBuilding)}
                        aria-pressed={includeBuilding}
                        data-calculation-target
                    >
                        建物
                    </button>
                </div>
                <small className="calculation-target-hint">
                    選択した対象の入力欄が有効になります（複数選択可）
                </small>
            </div>
        </div>
        {children}
    </div>
);

export default CommonInputSection;
