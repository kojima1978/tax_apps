import { fail, type ValidationResult } from './validation';

const MAX_VALUATION = 10_000_000_000;

export const validateRealEstateInput = (
    hasLandInput: boolean,
    hasBuildingInput: boolean,
    valuations: number[],
): ValidationResult => {
    if (!hasLandInput && !hasBuildingInput) {
        return fail('※土地または建物を選択し、固定資産税評価額を入力してください。');
    }
    if (valuations.some(v => v > MAX_VALUATION)) {
        return fail('※評価額は100億円以下で入力してください。');
    }
    return { ok: true };
};

export const validateResult = (total: number): string | null => {
    if (!isFinite(total) || isNaN(total) || total < 0) {
        return '※計算結果に異常が発生しました。入力値を確認してください。';
    }
    return null;
};

// R8.4.1(2026-04-01)以降は40㎡下限
export const validateBuildingArea = (area: number): string | null => {
    if (area <= 0) return null;
    if (area < 40 || area > 240)
        return `※建物床面積 ${area}㎡ は軽減措置の適用要件（40〜240㎡）外のため、軽減措置が適用されない場合があります。`;
    return null;
};
