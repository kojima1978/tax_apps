import { getWareki } from '@/lib/real-estate-tax';

type BuildingInputSectionProps = {
    disabled: boolean;
    valuation: string;
    area: string;
    selYear: string;
    selMonth: string;
    selDay: string;
    isResidential: boolean;
    hasHousingCertificate: boolean;
    acquisitionDeduction: string;
    deductionMessage: string;
    yearOptions: number[];
    onValuationChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onAreaChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    setSelYear: (v: string) => void;
    setSelMonth: (v: string) => void;
    setSelDay: (v: string) => void;
    setIsResidential: (v: boolean) => void;
    setHasHousingCertificate: (v: boolean) => void;
    onDeductionChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

const BuildingInputSection = ({
    disabled,
    valuation,
    area,
    selYear,
    selMonth,
    selDay,
    isResidential,
    hasHousingCertificate,
    acquisitionDeduction,
    deductionMessage,
    yearOptions,
    onValuationChange,
    onAreaChange,
    setSelYear,
    setSelMonth,
    setSelDay,
    setIsResidential,
    setHasHousingCertificate,
    onDeductionChange,
}: BuildingInputSectionProps) => (
    <div className={`re-column ${disabled ? 'disabled' : ''}`}>
        <h3 className="re-column-title">建物の情報</h3>
        <div className="input-item">
            <label>固定資産税評価額</label>
            <input
                type="text"
                inputMode="decimal"
                placeholder="例: 10,000,000"
                value={valuation}
                onChange={onValuationChange}
                disabled={disabled}
            />
        </div>
        <div className="input-item">
            <label>建物床面積 (m²)</label>
            <input
                type="text"
                inputMode="decimal"
                placeholder="例: 90"
                value={area}
                onChange={onAreaChange}
                disabled={disabled}
            />
            <small>※土地の税額軽減にも影響</small>
        </div>
        <div className="input-item">
            <label>建築年月日</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select
                    value={selYear}
                    onChange={(e) => setSelYear(e.target.value)}
                    disabled={disabled}
                    style={{ flex: 1 }}
                >
                    <option value="">年</option>
                    {yearOptions.map((y) => (
                        <option key={y} value={y}>{y}年 ({getWareki(y)})</option>
                    ))}
                </select>
                <select
                    value={selMonth}
                    onChange={(e) => setSelMonth(e.target.value)}
                    disabled={disabled}
                    style={{ flex: 1 }}
                >
                    <option value="">月</option>
                    {[...Array(12)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>{i + 1}月</option>
                    ))}
                </select>
                <select
                    value={selDay}
                    onChange={(e) => setSelDay(e.target.value)}
                    disabled={disabled}
                    style={{ flex: 1 }}
                >
                    <option value="">日</option>
                    {[...Array(31)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>{i + 1}日</option>
                    ))}
                </select>
            </div>
        </div>
        <div className="input-item">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                    type="checkbox"
                    checked={isResidential}
                    onChange={(e) => setIsResidential(e.target.checked)}
                    disabled={disabled}
                />
                居住用である
            </label>
        </div>
        {isResidential && (
            <>
                <div className="input-item">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                            type="checkbox"
                            checked={hasHousingCertificate}
                            onChange={(e) => setHasHousingCertificate(e.target.checked)}
                            disabled={disabled}
                        />
                        住宅用家屋証明書あり
                    </label>
                </div>
                <div className="input-item">
                    <label>建物不動産取得税の控除額</label>
                    <input
                        type="text"
                        inputMode="decimal"
                        placeholder="例: 12,000,000"
                        value={acquisitionDeduction}
                        onChange={onDeductionChange}
                        disabled={disabled}
                    />
                    {deductionMessage && (
                        <small style={{ color: 'var(--primary-color)' }}>{deductionMessage}</small>
                    )}
                </div>
            </>
        )}
    </div>
);

export default BuildingInputSection;
