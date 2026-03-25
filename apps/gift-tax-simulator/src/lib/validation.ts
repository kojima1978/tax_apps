/** バリデーション成功（データ付き） */
export type ValidationOk<T = void> = T extends void
    ? { ok: true }
    : { ok: true } & T;

/** バリデーション失敗 */
export type ValidationError = { ok: false; error: string };

/** バリデーション結果の共通型 */
export type ValidationResult<T = void> = ValidationOk<T> | ValidationError;

/** 失敗結果を生成 */
export const fail = (error: string): ValidationError => ({ ok: false, error });
