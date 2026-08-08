type ShareInputProps = {
    numerator: string;
    denominator: string;
    onNumeratorChange: (v: string) => void;
    onDenominatorChange: (v: string) => void;
    disabled: boolean;
};

/** 土地・建物の持ち分入力（分子 / 分母）。取得税・登録免許税の両ページで共通 */
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

export default ShareInput;
