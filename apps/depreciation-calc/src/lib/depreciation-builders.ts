/**
 * 減価償却スケジュール構築関数群
 * depreciation.ts から分離
 */
import { type DepreciationYearRow } from './depreciation';

type BuilderParams = {
    cost: number;
    rate: number;
    firstMonths: number;
    serviceStartDate: string;
    fiscalYearEndMonth: number;
    makePeriodLabel: (yearIndex: number) => string;
};

// ===== 定額法 (H19以後) =====
export function buildStraightLine(
    schedule: DepreciationYearRow[],
    params: BuilderParams,
) {
    const { cost, rate, firstMonths, makePeriodLabel } = params;
    const annualDep = Math.floor(cost * rate);
    let bookValue = cost;
    let year = 0;

    while (bookValue > 1) {
        const months = year === 0 ? firstMonths : 12;
        let dep: number;

        if (year === 0) {
            dep = Math.floor(annualDep * months / 12);
        } else {
            dep = annualDep;
        }

        if (bookValue - dep <= 1) {
            dep = bookValue - 1;
        }

        if (dep <= 0 && bookValue <= 1) break;
        if (dep <= 0) dep = 1;

        const endBV = bookValue - dep;

        schedule.push({
            year: year + 1,
            periodLabel: makePeriodLabel(year),
            beginningBookValue: bookValue,
            depreciationBase: cost,
            rate,
            months,
            depreciation: dep,
            endingBookValue: endBV,
            memo: year === 0 && months < 12 ? `月割 ${months}/12` : endBV === 1 ? '備忘価額1円' : '',
        });

        bookValue = endBV;
        year++;
        if (year > 150) break;
    }
}

// ===== 定率法 (H19以後) =====
export function buildDecliningBalance(
    schedule: DepreciationYearRow[],
    params: BuilderParams & { revisedRate: number; guaranteeAmount: number },
) {
    const { cost, rate, firstMonths, makePeriodLabel, revisedRate, guaranteeAmount } = params;
    let bookValue = cost;
    let year = 0;
    let switched = false;
    let revisedBase = 0;

    while (bookValue > 1) {
        const months = year === 0 ? firstMonths : 12;
        let dep: number;
        let currentRate: number;
        let memo = '';

        if (!switched) {
            currentRate = rate;
            let rawDep = Math.floor(bookValue * currentRate);
            if (year === 0) {
                rawDep = Math.floor(rawDep * months / 12);
            }

            const annualDep = Math.floor(bookValue * rate);
            if (year > 0 && annualDep < guaranteeAmount) {
                switched = true;
                revisedBase = bookValue;
                currentRate = revisedRate;
                dep = Math.floor(revisedBase * revisedRate);
                memo = '改定償却率に切替';
            } else {
                dep = rawDep;
            }
        } else {
            currentRate = revisedRate;
            dep = Math.floor(revisedBase * revisedRate);
        }

        if (bookValue - dep <= 1) {
            dep = bookValue - 1;
            memo = memo || '備忘価額1円';
        }

        if (dep <= 0 && bookValue <= 1) break;
        if (dep <= 0) dep = 1;

        const endBV = bookValue - dep;

        if (year === 0 && months < 12 && !memo) {
            memo = `月割 ${months}/12`;
        }

        schedule.push({
            year: year + 1,
            periodLabel: makePeriodLabel(year),
            beginningBookValue: bookValue,
            depreciationBase: switched ? revisedBase : bookValue,
            rate: currentRate,
            months,
            depreciation: dep,
            endingBookValue: endBV,
            memo,
        });

        bookValue = endBV;
        year++;
        if (year > 150) break;
    }
}

// ===== 旧定額法 (H19以前) =====
export function buildOldStraightLine(
    schedule: DepreciationYearRow[],
    params: BuilderParams,
) {
    const { cost, rate, firstMonths, makePeriodLabel } = params;
    const residualValue = Math.floor(cost * 0.1);
    const depBase = cost - residualValue;
    const annualDep = Math.floor(depBase * rate);
    const limit95 = Math.floor(cost * 0.95);
    let bookValue = cost;
    let totalDep = 0;
    let year = 0;
    let equalPhase = false;
    let equalAmount = 0;
    let equalYearsLeft = 0;

    while (bookValue > 1) {
        const months = year === 0 ? firstMonths : 12;
        let dep: number;
        let memo = '';

        if (equalPhase) {
            dep = equalAmount;
            if (bookValue - dep <= 1) {
                dep = bookValue - 1;
                memo = '備忘価額1円';
            }
            equalYearsLeft--;
        } else {
            if (year === 0) {
                dep = Math.floor(annualDep * months / 12);
                memo = months < 12 ? `月割 ${months}/12` : '';
            } else {
                dep = annualDep;
            }

            if (totalDep + dep >= limit95) {
                dep = limit95 - totalDep;
                if (dep < 0) dep = 0;
                memo = '償却可能限度額到達';
                equalPhase = true;
                const remaining = bookValue - dep - 1;
                equalAmount = Math.floor(remaining / 5);
                equalYearsLeft = 5;
            }
        }

        if (dep <= 0 && bookValue <= 1) break;
        if (dep <= 0) dep = 1;

        totalDep += dep;
        const endBV = bookValue - dep;

        schedule.push({
            year: year + 1,
            periodLabel: makePeriodLabel(year),
            beginningBookValue: bookValue,
            depreciationBase: equalPhase ? bookValue : depBase,
            rate: equalPhase ? 0 : rate,
            months,
            depreciation: dep,
            endingBookValue: endBV,
            memo: memo || (equalPhase ? '均等償却' : ''),
        });

        bookValue = endBV;
        year++;
        if (year > 150) break;
    }
}

// ===== 旧定率法 (H19以前) =====
export function buildOldDecliningBalance(
    schedule: DepreciationYearRow[],
    params: BuilderParams,
) {
    const { cost, rate, firstMonths, makePeriodLabel } = params;
    const limit95 = Math.floor(cost * 0.95);
    let bookValue = cost;
    let totalDep = 0;
    let year = 0;
    let equalPhase = false;
    let equalAmount = 0;

    while (bookValue > 1) {
        const months = year === 0 ? firstMonths : 12;
        let dep: number;
        let memo = '';

        if (equalPhase) {
            dep = equalAmount;
            if (bookValue - dep <= 1) {
                dep = bookValue - 1;
                memo = '備忘価額1円';
            }
        } else {
            dep = Math.floor(bookValue * rate);
            if (year === 0) {
                dep = Math.floor(dep * months / 12);
                memo = months < 12 ? `月割 ${months}/12` : '';
            }

            if (totalDep + dep >= limit95) {
                dep = limit95 - totalDep;
                if (dep < 0) dep = 0;
                memo = '償却可能限度額到達';
                equalPhase = true;
                const remaining = bookValue - dep - 1;
                equalAmount = Math.floor(remaining / 5);
            }
        }

        if (dep <= 0 && bookValue <= 1) break;
        if (dep <= 0) dep = 1;

        totalDep += dep;
        const endBV = bookValue - dep;

        schedule.push({
            year: year + 1,
            periodLabel: makePeriodLabel(year),
            beginningBookValue: bookValue,
            depreciationBase: bookValue,
            rate: equalPhase ? 0 : rate,
            months,
            depreciation: dep,
            endingBookValue: endBV,
            memo: memo || (equalPhase ? '均等償却' : ''),
        });

        bookValue = endBV;
        year++;
        if (year > 150) break;
    }
}
