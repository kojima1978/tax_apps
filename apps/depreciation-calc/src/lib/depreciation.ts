/**
 * 減価償却計算ロジック
 * 国税庁 No.2100, 2105, 2106 に基づく
 */
import { getDepreciationRates } from './depreciation-rates';
import {
    buildStraightLine,
    buildDecliningBalance,
    buildOldStraightLine,
    buildOldDecliningBalance,
} from './depreciation-builders';

export type DepreciationMethod = 'straight_line' | 'declining_balance' | 'old_straight_line' | 'old_declining_balance';

export type AcquisitionPeriod = 'before_h19' | 'h19_to_h24' | 'after_h24';

export type DepreciationInput = {
    acquisitionCost: number;
    usefulLife: number;
    method: DepreciationMethod;
    acquisitionDate: string;       // YYYY-MM-DD
    serviceStartDate: string;      // YYYY-MM-DD
    fiscalYearEndMonth: number;    // 1-12
    targetDate?: string;           // YYYY-MM-DD
};

export type DepreciationYearRow = {
    year: number;
    periodLabel: string;
    beginningBookValue: number;
    depreciationBase: number;
    rate: number;
    months: number;
    depreciation: number;
    endingBookValue: number;
    memo: string;
};

export type DepreciationResult = {
    input: DepreciationInput;
    acquisitionPeriod: AcquisitionPeriod;
    methodLabel: string;
    appliedRate: number;
    revisedRate?: number;
    guaranteeAmount?: number;
    schedule: DepreciationYearRow[];
    bookValueAtTarget?: number;
    targetPeriodLabel?: string;
};

export const DEPRECIATION_METHODS: { value: DepreciationMethod; label: string; period: AcquisitionPeriod[] }[] = [
    { value: 'straight_line', label: '定額法', period: ['h19_to_h24', 'after_h24'] },
    { value: 'declining_balance', label: '定率法', period: ['h19_to_h24', 'after_h24'] },
    { value: 'old_straight_line', label: '旧定額法', period: ['before_h19'] },
    { value: 'old_declining_balance', label: '旧定率法', period: ['before_h19'] },
];

export function getMethodLabel(method: DepreciationMethod, period: AcquisitionPeriod): string {
    const base = DEPRECIATION_METHODS.find(m => m.value === method)?.label ?? method;
    if (method === 'declining_balance') {
        return period === 'after_h24' ? `${base}（200%）` : `${base}（250%）`;
    }
    return base;
}

export function determineAcquisitionPeriod(acquisitionDate: string): AcquisitionPeriod {
    const d = new Date(acquisitionDate);
    const h19Boundary = new Date('2007-04-01');
    const h24Boundary = new Date('2012-04-01');
    if (d < h19Boundary) return 'before_h19';
    if (d < h24Boundary) return 'h19_to_h24';
    return 'after_h24';
}

export type MethodWithSuggestion = {
    value: DepreciationMethod;
    label: string;
    suggested: boolean;
};

/**
 * 全償却方法を返す（取得日がある場合は推奨フラグ付き）
 */
export function getAllMethodsWithSuggestion(acquisitionDate?: string): MethodWithSuggestion[] {
    const period = acquisitionDate ? determineAcquisitionPeriod(acquisitionDate) : undefined;

    return DEPRECIATION_METHODS.map(m => {
        let label = m.label;
        if (m.value === 'declining_balance' && period) {
            label = period === 'after_h24' ? `${m.label}（200%）` : `${m.label}（250%）`;
        }
        const suggested = period ? m.period.includes(period) : false;
        return { value: m.value, label, suggested };
    });
}

/**
 * 推奨方法のラベルを取得する（アラート表示用）
 */
export function getSuggestedMethodLabels(acquisitionDate: string): string {
    const methods = getAllMethodsWithSuggestion(acquisitionDate);
    return methods.filter(m => m.suggested).map(m => m.label).join('・');
}

/**
 * 初年度の月数を計算する（事業供用月〜決算月）
 */
function calcFirstYearMonths(serviceStartDate: string, fiscalYearEndMonth: number): number {
    const d = new Date(serviceStartDate);
    const serviceMonth = d.getMonth() + 1; // 1-12

    // 事業供用月の属する事業年度の決算月までの月数
    // 供用月から決算月まで（供用月自体を含む）
    let months: number;
    if (serviceMonth <= fiscalYearEndMonth) {
        months = fiscalYearEndMonth - serviceMonth + 1;
    } else {
        months = (12 - serviceMonth) + fiscalYearEndMonth + 1;
    }
    return Math.min(months, 12);
}

/**
 * 事業年度のラベルを生成する
 */
function makePeriodLabel(yearIndex: number, serviceStartDate: string, fiscalYearEndMonth: number): string {
    const d = new Date(serviceStartDate);
    const serviceYear = d.getFullYear();
    const serviceMonth = d.getMonth() + 1;

    if (yearIndex === 0) {
        // 初年度
        const startY = serviceYear;
        const startM = serviceMonth;
        let endM = fiscalYearEndMonth;
        let endY = startY;
        if (endM < startM) {
            endY = startY + 1;
        }
        return `${startY}/${String(startM).padStart(2, '0')}〜${endY}/${String(endM).padStart(2, '0')}`;
    }

    let firstYearEndYear = serviceYear;
    if (fiscalYearEndMonth < serviceMonth) {
        firstYearEndYear = serviceYear + 1;
    }

    const sYear = firstYearEndYear + (yearIndex - 1);
    const sMonth = fiscalYearEndMonth === 12 ? 1 : fiscalYearEndMonth + 1;
    const eYear = sYear + (sMonth > fiscalYearEndMonth ? 1 : 0);

    return `${sYear}/${String(sMonth).padStart(2, '0')}〜${eYear}/${String(fiscalYearEndMonth).padStart(2, '0')}`;
}

/**
 * 指定日が何期目に属するかを判定する
 */
function findTargetPeriodIndex(
    targetDate: string,
    serviceStartDate: string,
    fiscalYearEndMonth: number,
): number {
    const target = new Date(targetDate);
    const service = new Date(serviceStartDate);
    const serviceMonth = service.getMonth() + 1;
    const serviceYear = service.getFullYear();

    // 初年度の決算日
    let firstEndYear = serviceYear;
    if (fiscalYearEndMonth < serviceMonth) {
        firstEndYear = serviceYear + 1;
    }
    // 初年度の決算日の末日
    const firstEndDate = new Date(firstEndYear, fiscalYearEndMonth, 0); // 月末

    if (target <= firstEndDate) return 0;

    let idx = 1;
    while (idx < 200) {
        const nextEndDate = new Date(firstEndYear + idx, fiscalYearEndMonth, 0);
        if (target <= nextEndDate) return idx;
        idx++;
    }
    return idx;
}

/**
 * 減価償却スケジュールを計算する
 */
export function calcDepreciationSchedule(input: DepreciationInput): DepreciationResult {
    const { acquisitionCost, usefulLife, method, serviceStartDate, fiscalYearEndMonth, targetDate } = input;
    const period = determineAcquisitionPeriod(input.acquisitionDate);
    const rates = getDepreciationRates(usefulLife);
    const firstYearMonths = calcFirstYearMonths(serviceStartDate, fiscalYearEndMonth);

    const schedule: DepreciationYearRow[] = [];
    let appliedRate = 0;
    let revisedRate: number | undefined;
    let guaranteeAmount: number | undefined;

    const baseParams = {
        cost: acquisitionCost,
        rate: 0,
        firstMonths: firstYearMonths,
        serviceStartDate,
        fiscalYearEndMonth,
        makePeriodLabel: (yearIndex: number) => makePeriodLabel(yearIndex, serviceStartDate, fiscalYearEndMonth),
    };

    switch (method) {
        case 'straight_line':
            appliedRate = rates.straightLine;
            buildStraightLine(schedule, { ...baseParams, rate: appliedRate });
            break;
        case 'declining_balance': {
            const is200 = period === 'after_h24';
            appliedRate = is200 ? rates.db200 : rates.db250;
            revisedRate = is200 ? rates.db200Revised : rates.db250Revised;
            const guaranteeRate = is200 ? rates.db200Guarantee : rates.db250Guarantee;
            guaranteeAmount = Math.floor(acquisitionCost * guaranteeRate);
            buildDecliningBalance(schedule, { ...baseParams, rate: appliedRate, revisedRate, guaranteeAmount });
            break;
        }
        case 'old_straight_line':
            appliedRate = rates.oldStraightLine;
            buildOldStraightLine(schedule, { ...baseParams, rate: appliedRate });
            break;
        case 'old_declining_balance':
            appliedRate = rates.oldDeclining;
            buildOldDecliningBalance(schedule, { ...baseParams, rate: appliedRate });
            break;
    }

    // 基準日の簿価を取得
    let bookValueAtTarget: number | undefined;
    let targetPeriodLabel: string | undefined;
    if (targetDate) {
        const targetIdx = findTargetPeriodIndex(targetDate, serviceStartDate, fiscalYearEndMonth);
        if (targetIdx < schedule.length) {
            bookValueAtTarget = schedule[targetIdx].endingBookValue;
            targetPeriodLabel = schedule[targetIdx].periodLabel;
        } else if (schedule.length > 0) {
            bookValueAtTarget = schedule[schedule.length - 1].endingBookValue;
            targetPeriodLabel = schedule[schedule.length - 1].periodLabel;
        }
    }

    return {
        input,
        acquisitionPeriod: period,
        methodLabel: getMethodLabel(method, period),
        appliedRate,
        revisedRate,
        guaranteeAmount,
        schedule,
        bookValueAtTarget,
        targetPeriodLabel,
    };
}

