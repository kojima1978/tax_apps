import { calculateRealEstateTax, type TaxResults, type TransactionType } from './real-estate-tax';

/** 土地を「宅地」「その他」に分けた不動産取得税の内訳 */
export type AcquisitionResults = TaxResults & {
    resLandAcq: number;
    otherLandAcq: number;
};

export type AcquisitionBreakdownInput = {
    includeLand: boolean;
    includeBuilding: boolean;
    /** 宅地の固定資産税評価額 */
    resLandValuation: number;
    /** 宅地以外（雑種地・農地など）の固定資産税評価額 */
    otherLandValuation: number;
    resLandArea: number;
    buildingValuation: number;
    buildingArea: number;
    transactionType: TransactionType;
    isResidential: boolean;
    /** 建物の控除額（建築年月日から自動判定した値） */
    acquisitionDeduction: number;
    landShare: { n: number; d: number };
    buildingShare: { n: number; d: number };
};

/**
 * 不動産取得税を「宅地」「その他の土地」「建物」の3本立てで計算して合算する。
 * 宅地の1/2特例と住宅用地の軽減は宅地だけに掛かるため、
 * 1回の calculateRealEstateTax では表現できず対象ごとに分けて呼んでいる。
 * 不動産取得税ページとまとめ計算ページで共有する。
 */
export const calculateAcquisitionBreakdown = (input: AcquisitionBreakdownInput): AcquisitionResults => {
    const {
        includeLand, includeBuilding,
        resLandValuation, otherLandValuation, resLandArea,
        buildingValuation, buildingArea,
        transactionType, isResidential, acquisitionDeduction,
        landShare, buildingShare,
    } = input;

    // 宅地（1/2特例・住宅用地の軽減あり）
    const resResult = (includeLand && resLandValuation > 0) ? calculateRealEstateTax({
        includeLand: true,
        includeBuilding: false,
        landValuation: resLandValuation,
        buildingValuation: 0,
        transactionType,
        landType: 'residential',
        landArea: resLandArea,
        buildingArea,
        isResidential: true,
        hasHousingCertificate: false,
        acquisitionDeduction: 0,
        landShare,
    }) : null;

    // その他（宅地以外）
    const otherResult = (includeLand && otherLandValuation > 0) ? calculateRealEstateTax({
        includeLand: true,
        includeBuilding: false,
        landValuation: otherLandValuation,
        buildingValuation: 0,
        transactionType,
        landType: 'other',
        landArea: 0,
        buildingArea: 0,
        isResidential: false,
        hasHousingCertificate: false,
        acquisitionDeduction: 0,
        landShare,
    }) : null;

    // 建物
    const bldgResult = (includeBuilding && buildingValuation > 0) ? calculateRealEstateTax({
        includeLand: false,
        includeBuilding: true,
        landValuation: 0,
        buildingValuation,
        transactionType,
        landType: 'residential',
        landArea: 0,
        buildingArea,
        isResidential,
        hasHousingCertificate: false,
        acquisitionDeduction,
        buildingShare,
    }) : null;

    const resLandAcq = resResult?.landAcq ?? 0;
    const otherLandAcq = otherResult?.landAcq ?? 0;
    const bldgAcq = bldgResult?.bldgAcq ?? 0;

    // 計算過程を結合
    const landAcqProcess: string[] = [];
    if (resResult && resResult.process.landAcq.length > 0) {
        landAcqProcess.push('【宅地（特例あり）】');
        landAcqProcess.push(...resResult.process.landAcq);
    }
    if (otherResult && otherResult.process.landAcq.length > 0) {
        if (landAcqProcess.length > 0) landAcqProcess.push('');
        landAcqProcess.push('【その他（宅地以外）】');
        landAcqProcess.push(...otherResult.process.landAcq);
    }

    const total = resLandAcq + otherLandAcq + bldgAcq;

    return {
        landAcq: resLandAcq + otherLandAcq,
        bldgAcq,
        landReg: 0,
        bldgReg: 0,
        totalAcq: total,
        totalReg: 0,
        total,
        process: {
            landAcq: landAcqProcess,
            bldgAcq: bldgResult?.process.bldgAcq ?? [],
            landReg: [],
            bldgReg: [],
        },
        resLandAcq,
        otherLandAcq,
    };
};
