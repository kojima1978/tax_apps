/**
 * 資産行の一意 ID。
 *
 * crypto.randomUUID は安全なコンテキスト（https・localhost）でしか使えず、
 * LAN の IP で開いた画面では例外になるので、時刻と乱数で作る。
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
