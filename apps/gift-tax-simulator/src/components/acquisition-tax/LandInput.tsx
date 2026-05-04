import FormattedNumberInput from '@/components/shared/FormattedNumberInput';

type ShareInputProps = {
    numerator: string;
    denominator: string;
    onNumeratorChange: (v: string) => void;
    onDenominatorChange: (v: string) => void;
    disabled: boolean;
};

const ShareInput = ({ numerator, denominator, onNumeratorChange, onDenominatorChange, disabled }: ShareInputProps) => (
    <div className="input-item share-input-row">
        <label>持ち分</label>
        <div className="share-fraction">
            <input
                type="number"
                min="1"
                max="100"
                value={numerator}
                onChange={e => onNumeratorChange(e.target.value)}
                disabled={disabled}
            />
            <span>/</span>
            <input
                type="number"
                min="1"
                max="100"
                value={denominator}
                onChange={e => onDenominatorChange(e.target.value)}
                disabled={disabled}
            />
        </div>
    </div>
);

type LandInputProps = {
    disabled: boolean;
    resValuation: string;
    resArea: string;
    otherValuation: string;
    onResValuationChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onResAreaChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onOtherValuationChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    shareNumerator: string;
    shareDenominator: string;
    onShareNumeratorChange: (v: string) => void;
    onShareDenominatorChange: (v: string) => void;
};

const LandInput = ({
    disabled,
    resValuation,
    resArea,
    otherValuation,
    onResValuationChange,
    onResAreaChange,
    onOtherValuationChange,
    shareNumerator,
    shareDenominator,
    onShareNumeratorChange,
    onShareDenominatorChange,
}: LandInputProps) => (
    <div className={`re-column ${disabled ? 'disabled' : ''}`}>
        <h3 className="re-column-title">土地の情報</h3>

        <div className="land-subsection">
            <h4 className="land-subsection-title">宅地（特例あり）</h4>
            <FormattedNumberInput
                label="固定資産税評価額"
                placeholder="例: 15,000,000"
                value={resValuation}
                onChange={onResValuationChange}
                disabled={disabled}
            />
            <FormattedNumberInput
                label="土地面積 (m²)"
                placeholder="例: 100.00"
                value={resArea}
                onChange={onResAreaChange}
                disabled={disabled}
                hint="※税額軽減の計算に使用"
                decimal
            />
        </div>

        <div className="land-subsection">
            <h4 className="land-subsection-title other">その他（宅地以外）</h4>
            <FormattedNumberInput
                label="固定資産税評価額"
                placeholder="例: 5,000,000"
                value={otherValuation}
                onChange={onOtherValuationChange}
                disabled={disabled}
            />
        </div>

        <ShareInput
            numerator={shareNumerator}
            denominator={shareDenominator}
            onNumeratorChange={onShareNumeratorChange}
            onDenominatorChange={onShareDenominatorChange}
            disabled={disabled}
        />
    </div>
);

export default LandInput;
