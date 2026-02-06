"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import PrintFooter from '@/components/PrintFooter';
import {
    calculateRealEstateTax,
    calculateBuildingDeduction,
    formatCurrency,
    getWareki,
    type TaxResults,
    type TransactionType,
    type LandType,
} from '@/lib/real-estate-tax';
import { normalizeNumberString } from '@/lib/utils';

const INITIAL_RESULTS: TaxResults = {
    total: 0,
    landAcq: 0,
    landReg: 0,
    bldgAcq: 0,
    bldgReg: 0,
    totalAcq: 0,
    totalReg: 0,
    process: { landAcq: [], landReg: [], bldgAcq: [], bldgReg: [] },
};

export default function RealEstatePage() {
    const formatValue = (val: string | number | null | undefined): string => {
        if (val === '' || val === null || val === undefined) return '';
        const str = normalizeNumberString(String(val));
        const parts = str.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return parts.length > 1 ? `${parts[0]}.${parts[1]}` : parts[0];
    };

    const parseNumber = (val: string): number => {
        if (!val) return 0;
        const normalized = normalizeNumberString(val);
        const num = parseFloat(normalized);
        return isNaN(num) ? 0 : num;
    };

    const yearOptions = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const years: number[] = [];
        for (let y = currentYear; y >= 1900; y--) {
            years.push(y);
        }
        return years;
    }, []);

    const [includeLand, setIncludeLand] = useState(true);
    const [includeBuilding, setIncludeBuilding] = useState(true);
    const [landValuation, setLandValuation] = useState('');
    const [buildingValuation, setBuildingValuation] = useState('');
    const [transactionType, setTransactionType] = useState<TransactionType>('purchase');
    const [landArea, setLandArea] = useState('');
    const [buildingArea, setBuildingArea] = useState('');

    const [selYear, setSelYear] = useState('');
    const [selMonth, setSelMonth] = useState('');
    const [selDay, setSelDay] = useState('');
    const [buildingDate, setBuildingDate] = useState('');

    const [landType, setLandType] = useState<LandType>('residential');
    const [isResidential, setIsResidential] = useState(true);
    const [hasHousingCertificate, setHasHousingCertificate] = useState(true);
    const [acquisitionDeduction, setAcquisitionDeduction] = useState('');

    const [showDetails, setShowDetails] = useState(false);
    const [deductionMessage, setDeductionMessage] = useState('');
    const [results, setResults] = useState<TaxResults>(INITIAL_RESULTS);

    const handleFormattedInput = (
        e: React.ChangeEvent<HTMLInputElement>,
        setter: React.Dispatch<React.SetStateAction<string>>
    ) => {
        setter(formatValue(e.target.value));
    };

    useEffect(() => {
        if (selYear && selMonth && selDay) {
            const m = selMonth.padStart(2, '0');
            const d = selDay.padStart(2, '0');
            setBuildingDate(`${selYear}-${m}-${d}`);
        } else {
            setBuildingDate('');
        }
    }, [selYear, selMonth, selDay]);

    useEffect(() => {
        const result = calculateBuildingDeduction(buildingDate, transactionType, isResidential);
        setAcquisitionDeduction(formatValue(result.deduction));
        if (result.deduction > 0) {
            setDeductionMessage(`建築時期により自動設定: ${formatCurrency(result.deduction)} (${result.message})`);
        } else {
            setDeductionMessage(result.message);
        }
    }, [buildingDate, transactionType, isResidential]);

    const calculateTax = useCallback(() => {
        const result = calculateRealEstateTax({
            includeLand,
            includeBuilding,
            landValuation: parseNumber(landValuation),
            buildingValuation: parseNumber(buildingValuation),
            transactionType,
            landType,
            landArea: parseNumber(landArea),
            buildingArea: parseNumber(buildingArea),
            isResidential,
            hasHousingCertificate,
            acquisitionDeduction: parseNumber(acquisitionDeduction),
        });
        setResults(result);
    }, [
        includeLand, includeBuilding, landValuation, buildingValuation,
        transactionType, landType, landArea, buildingArea,
        isResidential, hasHousingCertificate, acquisitionDeduction
    ]);

    useEffect(() => {
        calculateTax();
    }, [calculateTax]);

    return (
        <div className="container-custom real-estate-page">
            <header className="header-custom">
                <h1>間接税シミュレーター</h1>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Link href="/" className="btn-nav">贈与税</Link>
                    <Link href="/table" className="btn-nav">早見表</Link>
                    <span className="btn-nav active">間接税</span>
                    <button className="btn-print" style={{ marginLeft: '1rem' }} onClick={() => window.print()}>印刷</button>
                </div>
            </header>

            <div className="input-section">
                <div className="input-group-row">
                    <div className="input-item">
                        <label htmlFor="transactionType">登記原因 (取引種別)</label>
                        <select
                            id="transactionType"
                            value={transactionType}
                            onChange={(e) => setTransactionType(e.target.value as TransactionType)}
                        >
                            <option value="purchase">売買 (購入)</option>
                            <option value="new_build">新築 (建物の保存登記)</option>
                            <option value="inheritance">相続</option>
                            <option value="gift">贈与</option>
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
                {transactionType === 'inheritance' && (
                    <p style={{ color: 'var(--primary-color)', fontWeight: 'bold', marginTop: '0.5rem' }}>
                        ※ 相続の場合、不動産取得税は非課税です。
                    </p>
                )}
            </div>

            <div className="input-section" style={{ borderBottom: 'none' }}>
                <div className="re-two-column">
                    {/* 土地 */}
                    <div className={`re-column ${!includeLand ? 'disabled' : ''}`}>
                        <h3 className="re-column-title">土地の情報</h3>
                        <div className="input-item">
                            <label>固定資産税評価額</label>
                            <input
                                type="text"
                                inputMode="decimal"
                                placeholder="例: 15,000,000"
                                value={landValuation}
                                onChange={(e) => handleFormattedInput(e, setLandValuation)}
                                disabled={!includeLand}
                            />
                        </div>
                        <div className="input-item">
                            <label>土地面積 (m²)</label>
                            <input
                                type="text"
                                inputMode="decimal"
                                placeholder="例: 100"
                                value={landArea}
                                onChange={(e) => handleFormattedInput(e, setLandArea)}
                                disabled={!includeLand}
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
                                    disabled={!includeLand}
                                >
                                    宅地 (特例あり)
                                </button>
                                <button
                                    type="button"
                                    className={`toggle-btn ${landType === 'other' ? 'active' : ''}`}
                                    onClick={() => setLandType('other')}
                                    disabled={!includeLand}
                                >
                                    その他
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* 建物 */}
                    <div className={`re-column ${!includeBuilding ? 'disabled' : ''}`}>
                        <h3 className="re-column-title">建物の情報</h3>
                        <div className="input-item">
                            <label>固定資産税評価額</label>
                            <input
                                type="text"
                                inputMode="decimal"
                                placeholder="例: 10,000,000"
                                value={buildingValuation}
                                onChange={(e) => handleFormattedInput(e, setBuildingValuation)}
                                disabled={!includeBuilding}
                            />
                        </div>
                        <div className="input-item">
                            <label>建物床面積 (m²)</label>
                            <input
                                type="text"
                                inputMode="decimal"
                                placeholder="例: 90"
                                value={buildingArea}
                                onChange={(e) => handleFormattedInput(e, setBuildingArea)}
                                disabled={!includeBuilding}
                            />
                            <small>※土地の税額軽減にも影響</small>
                        </div>
                        <div className="input-item">
                            <label>建築年月日</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <select
                                    value={selYear}
                                    onChange={(e) => setSelYear(e.target.value)}
                                    disabled={!includeBuilding}
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
                                    disabled={!includeBuilding}
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
                                    disabled={!includeBuilding}
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
                                    disabled={!includeBuilding}
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
                                            disabled={!includeBuilding}
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
                                        onChange={(e) => handleFormattedInput(e, setAcquisitionDeduction)}
                                        disabled={!includeBuilding}
                                    />
                                    {deductionMessage && (
                                        <small style={{ color: 'var(--primary-color)' }}>{deductionMessage}</small>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="result-section">
                <div className="re-result-box">
                    <div className="re-result-row">
                        <div className="re-result-item">
                            <span className="re-result-label">不動産取得税</span>
                            <span className="re-result-sub">
                                {includeLand && `土地: ${formatCurrency(results.landAcq)}`}
                                {includeLand && includeBuilding && ' / '}
                                {includeBuilding && `建物: ${formatCurrency(results.bldgAcq)}`}
                            </span>
                            <span className="re-result-value">{formatCurrency(results.totalAcq)}</span>
                        </div>
                        <div className="re-result-item">
                            <span className="re-result-label">登録免許税</span>
                            <span className="re-result-sub">
                                {includeLand && `土地: ${formatCurrency(results.landReg)}`}
                                {includeLand && includeBuilding && ' / '}
                                {includeBuilding && `建物: ${formatCurrency(results.bldgReg)}`}
                            </span>
                            <span className="re-result-value">{formatCurrency(results.totalReg)}</span>
                        </div>
                    </div>
                    <div className="re-result-total">
                        <span>合計納税額</span>
                        <span className="total-value">{formatCurrency(results.total)}</span>
                    </div>
                </div>

                <button
                    className="details-toggle no-print"
                    onClick={() => setShowDetails(!showDetails)}
                >
                    {showDetails ? '▲ 計算過程を隠す' : '▼ 計算過程の詳細を表示'}
                </button>

                {showDetails && (
                    <div className="details-content">
                        {includeLand && results.process.landAcq.length > 0 && (
                            <div className="detail-section">
                                <h4>土地</h4>
                                <div className="detail-box">
                                    <strong>不動産取得税</strong>
                                    <ul>
                                        {results.process.landAcq.map((step, i) => <li key={i}>{step}</li>)}
                                    </ul>
                                </div>
                                <div className="detail-box">
                                    <strong>登録免許税</strong>
                                    <ul>
                                        {results.process.landReg.map((step, i) => <li key={i}>{step}</li>)}
                                    </ul>
                                </div>
                            </div>
                        )}
                        {includeBuilding && results.process.bldgAcq.length > 0 && (
                            <div className="detail-section">
                                <h4>建物</h4>
                                <div className="detail-box">
                                    <strong>不動産取得税</strong>
                                    <ul>
                                        {results.process.bldgAcq.map((step, i) => <li key={i}>{step}</li>)}
                                    </ul>
                                </div>
                                <div className="detail-box">
                                    <strong>登録免許税</strong>
                                    <ul>
                                        {results.process.bldgReg.map((step, i) => <li key={i}>{step}</li>)}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <p className="disclaimer no-print">
                    ※この計算は概算です。実際の税額は、自治体の条例や端数処理のルールにより異なる場合があります。
                </p>
            </div>

            <PrintFooter />
        </div>
    );
}
