import FormattedNumberInput from '@/components/shared/FormattedNumberInput';

type LandInputProps = {
    disabled: boolean;
    resValuation: string;
    resArea: string;
    otherValuation: string;
    onResValuationChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onResAreaChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onOtherValuationChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

const LandInput = ({
    disabled,
    resValuation,
    resArea,
    otherValuation,
    onResValuationChange,
    onResAreaChange,
    onOtherValuationChange,
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
                placeholder="例: 100"
                value={resArea}
                onChange={onResAreaChange}
                disabled={disabled}
                hint="※税額軽減の計算に使用"
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
    </div>
);

export default LandInput;
