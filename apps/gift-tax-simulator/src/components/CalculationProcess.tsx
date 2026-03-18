import { type CalculationResult, BASIC_DEDUCTION, PATTERN_COLORS } from '@/lib/tax-calculation';
import { formatCurrency } from '@/lib/utils';

type Props = {
    results: CalculationResult[];
};

const CalculationProcess = ({ results }: Props) => {
    return (
        <div className="calc-process-section">
            <h3 className="calc-process-heading">計算過程</h3>

            <div className="calc-steps-container">
                {results.map((res, i) => {
                    const d = res.detail;
                    const isTaxFree = d.taxableAmount <= 0;
                    const color = PATTERN_COLORS[i];

                    return (
                        <div
                            key={i}
                            className="calc-step-card"
                            style={{ '--pattern-color': color } as React.CSSProperties}
                        >
                            <h4 className="calc-step-title">
                                <span className="calc-step-dot" style={{ backgroundColor: color }} />
                                {res.name}
                                {res.div > 1 && (
                                    <span className="calc-step-badge">×{res.div}回</span>
                                )}
                            </h4>

                            <div className="calc-step-body">
                                <div className="calc-step-row">
                                    <span className="calc-step-label">① 1回あたりの贈与金額</span>
                                    <span className="calc-step-value">
                                        {formatCurrency(d.giftAmount)} 円
                                    </span>
                                </div>

                                <div className="calc-step-row">
                                    <span className="calc-step-label">② 基礎控除額</span>
                                    <span className="calc-step-value">
                                        △ {formatCurrency(BASIC_DEDUCTION)} 円
                                    </span>
                                </div>

                                <div className="calc-step-row calc-step-row-result">
                                    <span className="calc-step-label">③ 課税価格 （① − ②）</span>
                                    <span className="calc-step-value">
                                        {isTaxFree ? '0 円（非課税）' : `${formatCurrency(d.taxableAmount)} 円`}
                                    </span>
                                </div>

                                {!isTaxFree && (
                                    <>
                                        <div className="calc-step-formula">
                                            <span className="calc-step-label">④ 速算表を適用</span>
                                            <div className="calc-formula-box">
                                                <span>
                                                    {formatCurrency(d.taxableAmount)} × {(d.rate * 100).toFixed(0)}%
                                                    {d.deduction > 0 && <> − {formatCurrency(d.deduction)}</>}
                                                    = <strong>{formatCurrency(d.tax)} 円</strong>
                                                </span>
                                            </div>
                                        </div>

                                        {res.div > 1 && (
                                            <div className="calc-step-row calc-step-row-total">
                                                <span className="calc-step-label">
                                                    ⑤ トータル贈与税額 （④ × {res.div}回）
                                                </span>
                                                <span className="calc-step-value calc-step-total-value">
                                                    {formatCurrency(res.totalTax)} 円
                                                </span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CalculationProcess;
