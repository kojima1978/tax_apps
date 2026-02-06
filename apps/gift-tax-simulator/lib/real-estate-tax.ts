// 不動産税計算ロジック
// 不動産取得税と登録免許税の計算

export type TransactionType = 'purchase' | 'new_build' | 'inheritance' | 'gift';
export type LandType = 'residential' | 'other';

export interface TaxResults {
    total: number;
    landAcq: number;
    landReg: number;
    bldgAcq: number;
    bldgReg: number;
    totalAcq: number;
    totalReg: number;
    process: {
        landAcq: string[];
        landReg: string[];
        bldgAcq: string[];
        bldgReg: string[];
    };
}

export interface RealEstateTaxInput {
    includeLand: boolean;
    includeBuilding: boolean;
    landValuation: number;
    buildingValuation: number;
    transactionType: TransactionType;
    landType: LandType;
    landArea: number;
    buildingArea: number;
    isResidential: boolean;
    hasHousingCertificate: boolean;
    acquisitionDeduction: number;
}

// 通貨フォーマット
export const formatCurrency = (num: number): string => {
    return new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: 'JPY',
    }).format(num);
};

// 和暦取得
export const getWareki = (year: number): string => {
    if (year >= 2019) return `令和${year - 2018}年`;
    if (year >= 1989) return `平成${year - 1988}年`;
    if (year >= 1926) return `昭和${year - 1925}年`;
    if (year >= 1912) return `大正${year - 1911}年`;
    return `明治${year - 1867}年`;
};

// 建築年月日から控除額を計算
export const calculateBuildingDeduction = (
    buildingDate: string,
    transactionType: TransactionType,
    isResidential: boolean
): { deduction: number; message: string } => {
    if (!isResidential) {
        return { deduction: 0, message: '住宅用ではないため控除なし' };
    }
    if (transactionType === 'new_build') {
        return { deduction: 12_000_000, message: '新築住宅 (原則1,200万円控除)' };
    }
    if (!buildingDate) {
        return { deduction: 0, message: '建築年月日を指定すると自動判定します' };
    }

    const date = new Date(buildingDate);
    const d1997 = new Date('1997-04-01');
    const d1989 = new Date('1989-04-01');
    const d1985 = new Date('1985-07-01');
    const d1981 = new Date('1981-07-01');
    const d1976 = new Date('1976-01-01');

    if (date >= d1997) {
        return { deduction: 12_000_000, message: '1997年4月1日以降 (1,200万円控除)' };
    } else if (date >= d1989) {
        return { deduction: 10_000_000, message: '1989年4月1日～ (1,000万円控除)' };
    } else if (date >= d1985) {
        return { deduction: 4_500_000, message: '1985年7月1日～ (450万円控除)' };
    } else if (date >= d1981) {
        return { deduction: 4_200_000, message: '1981年7月1日～ (420万円控除)' };
    } else if (date >= d1976) {
        return { deduction: 3_500_000, message: '1976年1月1日～ (350万円控除)' };
    }
    return { deduction: 0, message: '1975年以前' };
};

// 不動産税計算メイン関数
export const calculateRealEstateTax = (input: RealEstateTaxInput): TaxResults => {
    const {
        includeLand,
        includeBuilding,
        landValuation,
        buildingValuation,
        transactionType,
        landType,
        landArea,
        buildingArea,
        isResidential,
        hasHousingCertificate,
        acquisitionDeduction,
    } = input;

    const result: TaxResults = {
        landAcq: 0,
        landReg: 0,
        bldgAcq: 0,
        bldgReg: 0,
        totalAcq: 0,
        totalReg: 0,
        total: 0,
        process: { landAcq: [], landReg: [], bldgAcq: [], bldgReg: [] },
    };

    // --- 土地の計算 ---
    if (includeLand && landValuation > 0) {
        // 不動産取得税
        if (transactionType === 'inheritance') {
            result.landAcq = 0;
            result.process.landAcq.push('相続のため不動産取得税は非課税 (0円)');
        } else {
            let landAcqBase = landValuation;
            let landBaseNote = '';
            if (landType === 'residential') {
                landAcqBase = Math.floor(landValuation / 2);
                landBaseNote = ' (宅地特例 1/2)';
            }

            const landAcqRate = 0.03;
            const originalTax = Math.floor(landAcqBase * landAcqRate);

            result.process.landAcq.push(`評価額: ${formatCurrency(landValuation)}`);
            if (landType === 'residential') {
                result.process.landAcq.push(
                    `課税標準額: ${formatCurrency(landAcqBase)}${landBaseNote}`
                );
            }
            result.process.landAcq.push(
                `計算上の税額: ${formatCurrency(landAcqBase)} × 3% = ${formatCurrency(originalTax)}`
            );

            let reductionAmount = 0;

            if (isResidential && landArea > 0 && buildingArea > 0) {
                const reductionA = 45_000;
                const unitPrice = landAcqBase / landArea;
                const cappedArea = Math.min(buildingArea * 2, 200);
                const reductionB = Math.floor(unitPrice * cappedArea * 0.03);

                reductionAmount = Math.max(reductionA, reductionB);

                result.process.landAcq.push(`--- 税額軽減 (住宅用地) ---`);
                result.process.landAcq.push(
                    `土地1m²あたりの課税標準額: ${Math.floor(unitPrice).toLocaleString()}円`
                );
                result.process.landAcq.push(
                    `控除対象面積 (床面積×2, 上限200m²): ${cappedArea}m²`
                );
                result.process.landAcq.push(
                    `控除額計算 B: ${Math.floor(unitPrice).toLocaleString()} × ${cappedArea} × 3% = ${formatCurrency(reductionB)}`
                );
                result.process.landAcq.push(
                    `適用控除額 (45,000円と比較し大きい方): ${formatCurrency(reductionAmount)}`
                );
            } else if (isResidential && (landArea <= 0 || buildingArea <= 0)) {
                result.process.landAcq.push(
                    `※土地面積と建物床面積を入力すると、税額軽減（最大45,000円等）が計算されます`
                );
            }

            result.landAcq = Math.max(0, originalTax - reductionAmount);
            if (reductionAmount > 0) {
                result.process.landAcq.push(
                    `納付税額: ${formatCurrency(originalTax)} - ${formatCurrency(reductionAmount)} = ${formatCurrency(result.landAcq)}`
                );
            }
        }

        // 登録免許税
        const landRegBase = Math.floor(landValuation / 1000) * 1000;
        let landRegRate = 0.02;
        let landRegRateNote = '本則税率';

        if (transactionType === 'purchase') {
            landRegRate = 0.015;
            landRegRateNote = '売買の特例税率';
        } else if (transactionType === 'inheritance') {
            landRegRate = 0.004;
            landRegRateNote = '相続';
        } else if (transactionType === 'gift') {
            landRegRate = 0.02;
            landRegRateNote = '贈与';
        } else if (transactionType === 'new_build') {
            landRegRate = 0.004;
            landRegRateNote = '所有権移転(仮)';
        }

        const rawLandReg = Math.floor(landRegBase * landRegRate);
        result.landReg = Math.floor(rawLandReg / 100) * 100;
        if (result.landReg < 1000) result.landReg = 1000;

        result.process.landReg.push(`課税標準額: ${formatCurrency(landRegBase)}`);
        result.process.landReg.push(
            `税額: ${formatCurrency(landRegBase)} × ${(landRegRate * 100).toFixed(2)}% (${landRegRateNote}) = ${formatCurrency(rawLandReg)} → ${formatCurrency(result.landReg)}`
        );
    }

    // --- 建物の計算 ---
    if (includeBuilding && buildingValuation > 0) {
        // 不動産取得税
        if (transactionType === 'inheritance') {
            result.bldgAcq = 0;
            result.process.bldgAcq.push('相続のため不動産取得税は非課税 (0円)');
        } else {
            const bldgAcqBase = Math.max(0, buildingValuation - acquisitionDeduction);
            const bldgAcqRate = isResidential ? 0.03 : 0.04;
            const bldgRateNote = isResidential ? '住宅用' : '非住宅';

            result.bldgAcq = Math.floor(bldgAcqBase * bldgAcqRate);

            result.process.bldgAcq.push(`評価額: ${formatCurrency(buildingValuation)}`);
            if (acquisitionDeduction > 0) {
                result.process.bldgAcq.push(
                    `課税標準額: ${formatCurrency(buildingValuation)} - ${formatCurrency(acquisitionDeduction)}(控除) = ${formatCurrency(bldgAcqBase)}`
                );
            } else {
                result.process.bldgAcq.push(`課税標準額: ${formatCurrency(bldgAcqBase)}`);
            }
            result.process.bldgAcq.push(
                `税額: ${formatCurrency(bldgAcqBase)} × ${(bldgAcqRate * 100).toFixed(0)}% (${bldgRateNote}) = ${formatCurrency(result.bldgAcq)}`
            );
        }

        // 登録免許税
        const bldgRegBase = Math.floor(buildingValuation / 1000) * 1000;
        let bldgRegRate = 0.02;
        let bldgRegRateNote = '本則';

        if (transactionType === 'purchase') {
            if (isResidential && hasHousingCertificate) {
                bldgRegRate = 0.003;
                bldgRegRateNote = '住宅用家屋証明あり';
            } else {
                bldgRegRate = 0.02;
            }
        } else if (transactionType === 'new_build') {
            if (isResidential && hasHousingCertificate) {
                bldgRegRate = 0.0015;
                bldgRegRateNote = '住宅用家屋証明あり';
            } else {
                bldgRegRate = 0.004;
                bldgRegRateNote = '本則(保存)';
            }
        } else if (transactionType === 'inheritance') {
            bldgRegRate = 0.004;
            bldgRegRateNote = '相続';
        } else if (transactionType === 'gift') {
            bldgRegRate = 0.02;
            bldgRegRateNote = '贈与';
        }

        const rawBldgReg = Math.floor(bldgRegBase * bldgRegRate);
        result.bldgReg = Math.floor(rawBldgReg / 100) * 100;
        if (result.bldgReg < 1000) result.bldgReg = 1000;

        result.process.bldgReg.push(`課税標準額: ${formatCurrency(bldgRegBase)}`);
        result.process.bldgReg.push(
            `税額: ${formatCurrency(bldgRegBase)} × ${(bldgRegRate * 100).toFixed(2)}% (${bldgRegRateNote}) = ${formatCurrency(rawBldgReg)} → ${formatCurrency(result.bldgReg)}`
        );
    }

    result.totalAcq = result.landAcq + result.bldgAcq;
    result.totalReg = result.landReg + result.bldgReg;
    result.total = result.totalAcq + result.totalReg;

    return result;
};
