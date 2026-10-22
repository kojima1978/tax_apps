// ひらがな・半角カナを全角カタカナへ（サーバの normalizeKana と同じ寄せ方）
export function toKatakana(s: string): string {
  return s.normalize('NFKC').replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));
}

// 検索語をサーバの保存形式（フリガナはカタカナ）に寄せる
export function normalizeQuery(q: string): string {
  return toKatakana(q).trim().toLowerCase();
}
