'use client';

import type { LandType } from '@/lib/real-estate-tax';

type LandInputSectionProps = {
    disabled: boolean;
    valuation: string;
    area: string;
    landType: LandType;
    setLandType: (v: LandType) => void;
    onValuationChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onAreaChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

const LandInputSection = ({
    disabled,
    valuation,
    area,
    landType,
    setLandType,
    onValuationChange,
    onAreaChange,
}: LandInputSectionProps) => (
    <div className={`re-column ${disabled ? 'disabled' : ''}`}>
        <h3 className="re-column-title">土地の情報</h3>
        <div className="input-item">
            <label>固定資産税評価額</label>
            <input
                type="text"
                inputMode="decimal"
                placeholder="例: 15,000,000"
                value={valuation}
                onChange={onValuationChange}
                disabled={disabled}
            />
        </div>
        <div className="input-item">
            <label>土地面積 (m²)</label>
            <input
                type="text"
                inputMode="decimal"
                placeholder="例: 100"
                value={area}
                onChange={onAreaChange}
                disabled={disabled}
            />
            <small>※税額軽減の計算に使用</small>
        </div>
        <div className="input-item">
            <label>地目</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                    type="button"
                    className={`toggle-btn ${landType === 'residential' ? 'active' : ''}`}
                    onClick={() => setLandType('residential')}
                    disabled={disabled}
                >
                    宅地 (特例あり)
                </button>
                <button
                    type="button"
                    className={`toggle-btn ${landType === 'other' ? 'active' : ''}`}
                    onClick={() => setLandType('other')}
                    disabled={disabled}
                >
                    その他
                </button>
            </div>
        </div>
    </div>
);

export default LandInputSection;
