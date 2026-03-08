import { normalizeNumberString } from './utils';

const MAX_AMOUNT = 1_000_000_000;

type ValidationResult =
    | { ok: true; amount: number }
    | { ok: false; error: string };

export const validateGiftAmount = (raw: string): ValidationResult => {
    const normalized = normalizeNumberString(raw);
    const amount = parseInt(normalized, 10);

    if (!amount || amount <= 0) {
        return { ok: false, error: '※贈与金額を正しく入力してください。' };
    }
    if (amount > MAX_AMOUNT) {
        return { ok: false, error: '※贈与金額は10億円以下で入力してください。' };
    }
    return { ok: true, amount };
};
