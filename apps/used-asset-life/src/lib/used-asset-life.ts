export const ASSET_TYPES = [
    { value: 'building', label: '建物' },
    { value: 'building_equipment', label: '建物附属設備' },
    { value: 'structure', label: '構築物' },
    { value: 'machinery', label: '機械装置' },
    { value: 'vehicle', label: '車両運搬具' },
    { value: 'tools', label: '器具備品' },
    { value: 'other', label: 'その他' },
] as const;

export type AssetType = typeof ASSET_TYPES[number]['value'];

export type UsedAssetInput = {
    assetType: AssetType;
    statutoryLife: number;
    elapsedYears: number;
    elapsedMonths: number;
    acquisitionCost: number;
    renovationCost: number;
};

export type FormulaType = 'simple_not_exceeded' | 'simple_exceeded' | 'statutory';

export type UsedAssetResult = {
    input: UsedAssetInput;
    totalElapsedMonths: number;
    exceededStatutoryLife: boolean;
    renovationRatio: number;
    is50PercentRule: boolean;
    formulaUsed: FormulaType;
    rawCalculation: number;
    usedAssetLife: number;
    calculationSteps: string[];
};

/** 資産種類ごとの代表的な法定耐用年数プリセット */
export const STATUTORY_LIFE_PRESETS: Record<AssetType, { label: string; years: number }[]> = {
    building: [
        { label: 'RC造', years: 47 },
        { label: '重量鉄骨', years: 34 },
        { label: '軽量鉄骨(3-4mm)', years: 27 },
        { label: '木造', years: 22 },
        { label: '木骨モルタル', years: 20 },
        { label: '軽量鉄骨(3mm以下)', years: 19 },
    ],
    building_equipment: [
        { label: 'エレベーター', years: 17 },
        { label: '電気設備', years: 15 },
        { label: '給排水・ガス設備', years: 15 },
        { label: '冷暖房設備', years: 15 },
    ],
    structure: [
        { label: 'コンクリート舗装', years: 15 },
        { label: 'アスファルト舗装', years: 10 },
        { label: '金属造フェンス', years: 10 },
        { label: '緑化施設', years: 20 },
    ],
    machinery: [
        { label: '食料品製造', years: 10 },
        { label: '金属製品製造', years: 10 },
        { label: '印刷', years: 10 },
        { label: '農業用', years: 7 },
    ],
    vehicle: [
        { label: '普通自動車', years: 6 },
        { label: '小型車(0.66L以下)', years: 4 },
        { label: '貨物(ダンプ)', years: 4 },
        { label: '二輪車', years: 3 },
    ],
    tools: [
        { label: '事務机・椅子(金属)', years: 15 },
        { label: '応接セット', years: 8 },
        { label: 'エアコン', years: 6 },
        { label: '冷蔵庫・洗濯機', years: 6 },
        { label: 'パソコン', years: 4 },
        { label: '看板', years: 3 },
    ],
    other: [],
};

export function getAssetTypeLabel(value: AssetType): string {
    return ASSET_TYPES.find(t => t.value === value)?.label ?? value;
}

/**
 * 中古資産の耐用年数を計算する（簡便法）
 * NTA No.5404 に基づく
 */
export function calcUsedAssetLife(input: UsedAssetInput): UsedAssetResult {
    const { statutoryLife, elapsedYears, elapsedMonths, acquisitionCost, renovationCost } = input;
    const totalElapsedMonths = elapsedYears * 12 + elapsedMonths;
    const statutoryLifeMonths = statutoryLife * 12;
    const exceededStatutoryLife = totalElapsedMonths >= statutoryLifeMonths;

    // 50%ルール判定
    const renovationRatio = acquisitionCost > 0 ? (renovationCost / acquisitionCost) * 100 : 0;
    const is50PercentRule = acquisitionCost > 0 && renovationCost > acquisitionCost * 0.5;

    const steps: string[] = [];

    // 50%ルールで法定耐用年数を使用する場合
    if (is50PercentRule) {
        steps.push(`取得価額: ${acquisitionCost.toLocaleString()}円`);
        steps.push(`改修・資本的支出額: ${renovationCost.toLocaleString()}円`);
        steps.push(`改修費の割合: ${renovationRatio.toFixed(1)}%（50%超）`);
        steps.push(`→ 簡便法は適用できないため、法定耐用年数をそのまま使用`);
        steps.push(`中古耐用年数 = ${statutoryLife}年`);

        return {
            input,
            totalElapsedMonths,
            exceededStatutoryLife,
            renovationRatio,
            is50PercentRule,
            formulaUsed: 'statutory',
            rawCalculation: statutoryLife,
            usedAssetLife: statutoryLife,
            calculationSteps: steps,
        };
    }

    let rawMonths: number;
    let formulaUsed: FormulaType;

    if (exceededStatutoryLife) {
        // 法定耐用年数を全部経過している場合
        formulaUsed = 'simple_exceeded';
        rawMonths = statutoryLifeMonths * 0.2;

        steps.push(`経過期間: ${formatElapsed(elapsedYears, elapsedMonths)}（法定耐用年数${statutoryLife}年を超過）`);
        steps.push(`算式: 法定耐用年数 × 20%`);
        steps.push(`= ${statutoryLife}年 × 12ヶ月 × 20%`);
        steps.push(`= ${statutoryLifeMonths} × 0.2`);
        steps.push(`= ${rawMonths}ヶ月`);
    } else {
        // 法定耐用年数の一部を経過している場合
        formulaUsed = 'simple_not_exceeded';
        rawMonths = (statutoryLifeMonths - totalElapsedMonths) + totalElapsedMonths * 0.2;

        steps.push(`経過期間: ${formatElapsed(elapsedYears, elapsedMonths)}（法定耐用年数${statutoryLife}年以内）`);
        steps.push(`算式: (法定耐用年数 - 経過年数) + 経過年数 × 20%`);
        steps.push(`= (${statutoryLifeMonths}ヶ月 - ${totalElapsedMonths}ヶ月) + ${totalElapsedMonths}ヶ月 × 20%`);
        steps.push(`= ${statutoryLifeMonths - totalElapsedMonths} + ${totalElapsedMonths * 0.2}`);
        steps.push(`= ${rawMonths}ヶ月`);
    }

    // 月を年に変換（端数切捨て）
    const rawYears = rawMonths / 12;
    let usedAssetLife = Math.floor(rawYears);

    steps.push(`= ${rawMonths}ヶ月 ÷ 12 = ${rawYears.toFixed(2)}年`);

    if (rawYears !== Math.floor(rawYears)) {
        steps.push(`→ 1年未満の端数切捨て: ${usedAssetLife}年`);
    }

    // 2年未満は2年に
    if (usedAssetLife < 2) {
        steps.push(`→ 2年未満のため、2年に切上げ`);
        usedAssetLife = 2;
    }

    steps.push(`中古耐用年数 = ${usedAssetLife}年`);

    return {
        input,
        totalElapsedMonths,
        exceededStatutoryLife,
        renovationRatio,
        is50PercentRule,
        formulaUsed,
        rawCalculation: rawYears,
        usedAssetLife,
        calculationSteps: steps,
    };
}

function formatElapsed(years: number, months: number): string {
    if (months === 0) return `${years}年`;
    if (years === 0) return `${months}ヶ月`;
    return `${years}年${months}ヶ月`;
}
