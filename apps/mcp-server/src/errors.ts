/**
 * 呼び出し側（AI）の入力が辞書と噛み合っていないことを伝えるエラー。
 *
 * 想定外の不具合（接続できない・APIが500を返した等）と区別するために別の型にしてある。
 * 前者は文面をそのまま返して直してもらえばよく、後者は人が見る必要がある。
 */
export class InputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InputError';
  }
}

/** 株式評価明細書のAPIが返したエラー。 */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}
