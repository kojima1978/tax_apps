/**
 * URL Utility
 * URL判定ヘルパー
 */

/** 外部URLかどうかを判定する */
export function isExternalUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}
