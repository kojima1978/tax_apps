import Sparkles from 'lucide-react/icons/sparkles';
import RotateCcw from 'lucide-react/icons/rotate-ccw';
import { type TransactionType, TRANSACTION_OPTIONS } from '@/lib/real-estate-tax';

type CommonInputSectionProps = {
    transactionType: TransactionType;
    setTransactionType: (v: TransactionType) => void;
    includeLand: boolean;
    setIncludeLand: (v: boolean) => void;
    includeBuilding: boolean;
    setIncludeBuilding: (v: boolean) => void;
    onSample: () => void;
    onReset: () => void;
    children?: React.ReactNode;
};

const CommonInputSection = ({
    transactionType,
    setTransactionType,
    includeLand,
    setIncludeLand,
    includeBuilding,
    setIncludeBuilding,
    onSample,
    onReset,
    children,
}: CommonInputSectionProps) => (
    <div className="input-section">
        <div className="input-group-row">
            <div className="input-item transaction-select">
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
                {/* 注記はラベルの右。下に置くと隣のセレクトと高さが揃わない */}
                <div className="label-with-hint">
                    <label>計算対象</label>
                    <small className="calculation-target-hint">
                        選択した対象の入力欄が有効になります（複数選択可）
                    </small>
                </div>
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
            </div>
        </div>
        {/* 入力を始める前に触るボタンなので、計算ボタンの隣ではなく条件のすぐ下に置く */}
        <div className="input-helper-actions no-print">
            <button type="button" className="btn-input-helper sample" onClick={onSample}>
                <Sparkles aria-hidden="true" />
                サンプルで試す
            </button>
            <button type="button" className="btn-input-helper" onClick={onReset}>
                <RotateCcw aria-hidden="true" />
                入力を消す
            </button>
        </div>
        {children}
    </div>
);

export default CommonInputSection;
