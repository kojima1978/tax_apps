/**
 * 一意なIDを生成
 * crypto.randomUUID()を使用して衝突リスクを回避
 * @returns UUID形式のID文字列
 */
export function generateId(): string {
  // crypto.randomUUID()が利用可能な場合は使用
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // フォールバック: より安全なランダム生成
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
