/** 409 Conflict エラーかどうかを判定する */
export function isConflictError(e: unknown): boolean {
    return e instanceof Error && 'status' in e && (e as { status: number }).status === 409
}

/** 409 Conflict 時の日本語メッセージ */
export const CONFLICT_MESSAGE = "他のユーザーが先に更新しました。画面を再読み込みしてください。"
