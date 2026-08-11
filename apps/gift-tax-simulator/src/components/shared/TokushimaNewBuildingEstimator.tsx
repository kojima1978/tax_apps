import { Calculator } from 'lucide-react';
import {
    estimateTokushimaNewBuildingValue,
    getSupportedTokushimaStructures,
    getTokushimaUnitPrice,
    TOKUSHIMA_BUILDING_USES,
    type TokushimaBuildingStructure,
    type TokushimaBuildingUse,
} from '@/lib/tokushima-new-building';
import { formatInputValue, parseDecimalNumber } from '@/lib/utils';

type Props = {
    area: string;
    buildingUse: TokushimaBuildingUse;
    structure: TokushimaBuildingStructure;
    setBuildingUse: (value: TokushimaBuildingUse) => void;
    setStructure: (value: TokushimaBuildingStructure) => void;
    onApply: (value: number) => void;
    disabled?: boolean;
};

export default function TokushimaNewBuildingEstimator({
    area,
    buildingUse,
    structure,
    setBuildingUse,
    setStructure,
    onApply,
    disabled = false,
}: Props) {
    const areaValue = parseDecimalNumber(area);
    const unitPrice = getTokushimaUnitPrice(buildingUse, structure);
    const estimate = estimateTokushimaNewBuildingValue(areaValue, buildingUse, structure);
    const structures = getSupportedTokushimaStructures(buildingUse);

    const handleUseChange = (nextUse: TokushimaBuildingUse) => {
        setBuildingUse(nextUse);
        const supported = getSupportedTokushimaStructures(nextUse);
        if (!supported.some(({ value }) => value === structure) && supported[0]) {
            setStructure(supported[0].value);
        }
    };

    return (
        <section className="tokushima-building-estimator" aria-labelledby="tokushima-estimator-title">
            <div className="tokushima-estimator-heading">
                <Calculator size={18} aria-hidden="true" />
                <div>
                    <h4 id="tokushima-estimator-title">新築建物の評価額を概算</h4>
                    <p>徳島地方法務局・令和6年度基準</p>
                </div>
            </div>

            <div className="tokushima-estimator-selects">
                <label>
                    <span>建物用途</span>
                    <select
                        value={buildingUse}
                        onChange={(event) => handleUseChange(event.target.value as TokushimaBuildingUse)}
                        disabled={disabled}
                    >
                        {TOKUSHIMA_BUILDING_USES.map(({ value, label }) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                </label>
                <label>
                    <span>建物構造</span>
                    <select
                        value={structure}
                        onChange={(event) => setStructure(event.target.value as TokushimaBuildingStructure)}
                        disabled={disabled}
                    >
                        {structures.map(({ value, label }) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                </label>
            </div>

            <div className="tokushima-estimator-result" aria-live="polite">
                {estimate > 0 && unitPrice ? (
                    <>
                        <span className="tokushima-estimator-formula">
                            {formatInputValue(unitPrice)}円/㎡ × {areaValue.toLocaleString('ja-JP')}㎡
                        </span>
                        <strong>{formatInputValue(estimate)}円</strong>
                    </>
                ) : (
                    <span>建物床面積を入力すると概算できます</span>
                )}
                <button
                    type="button"
                    className="tokushima-estimator-apply"
                    onClick={() => onApply(estimate)}
                    disabled={disabled || estimate <= 0}
                >
                    共通評価額へ反映
                </button>
            </div>

            <small>
                登録免許税・不動産取得税の共通概算値として使用します。正式な固定資産税評価額が判明した場合は上書きしてください。
            </small>
        </section>
    );
}
