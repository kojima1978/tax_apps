import { normalizeNumberString } from './utils';
import { fail, type ValidationResult } from './validation';

const MAX_AMOUNT = 1_000_000_000;

export const validateGiftAmount = (raw: string): ValidationResult<{ amount: number }> => {
    const normalized = normalizeNumberString(raw);
    const amount = parseInt(normalized, 10);

    if (!amount || amount <= 0) {
        return fail('※贈与金額を正しく入力してください。');
    }
    if (amount > MAX_AMOUNT) {
        return fail('※贈与金額は10億円以下で入力してください。');
    }
    return { ok: true, amount };
};
