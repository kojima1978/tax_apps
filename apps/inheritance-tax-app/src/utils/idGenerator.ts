/**
 * 一意なIDを生成
 * @returns UUID形式のID文字列
 */
export function generateId(): string {
  return crypto.randomUUID();
}
